import CompanyModel from '../../models/auth/company.js';
import NotificationModel from '../../models/notification.js';
import bcrypt from 'bcryptjs';

// Get super admin dashboard statistics
export const getSuperAdminStats = async (req, res) => {
  try {
    const totalCompanies = await CompanyModel.countDocuments();
    const companiesWithSubscription = await CompanyModel.countDocuments({
      subscriptionActive: true
    });
    
    const subscriptionStats = await CompanyModel.aggregate([
      {
        $group: {
          _id: '$subscriptionPackage',
          count: { $sum: 1 },
          totalRevenue: { 
            $sum: { 
              $cond: [{ $eq: ['$subscriptionActive', true] }, '$subscriptionPrice', 0] 
            } 
          }
        }
      }
    ]);

    const packageBreakdown = {
      free: subscriptionStats.find(s => s._id === 'free')?.count || 0,
      standard: subscriptionStats.find(s => s._id === 'standard')?.count || 0,
      business: subscriptionStats.find(s => s._id === 'business')?.count || 0,
      premium: subscriptionStats.find(s => s._id === 'premium')?.count || 0
    };

    const totalRevenue = subscriptionStats.reduce((sum, stat) => sum + (stat.totalRevenue || 0), 0);

    res.status(200).json({
      totalCompanies,
      companiesWithSubscription,
      companiesWithoutSubscription: totalCompanies - companiesWithSubscription,
      packageBreakdown,
      totalRevenue,
      statsByPackage: subscriptionStats
    });
  } catch (error) {
    console.error('Error fetching super admin stats:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all companies (limited info for privacy)
export const getAllCompanies = async (req, res) => {
  try {
    const companies = await CompanyModel.find(
      {},
      'companyName email subscriptionPackage subscriptionPrice subscriptionActive subscriptionStartDate subscriptionEndDate role createdAt'
    ).sort({ createdAt: -1 });

    res.status(200).json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ message: error.message });
  }
};

// Send notification to all users
export const sendGlobalNotification = async (req, res) => {
  try {
    const { title, message, type, priority, targetAudience } = req.body;
    const senderId = req.user?.id;

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    if (!senderId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Verify sender is superadmin
    const sender = await CompanyModel.findById(senderId);
    if (!sender || sender.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only super admin can send global notifications' });
    }

    const notification = await NotificationModel.create({
      title,
      message,
      type: type || 'info',
      priority: priority || 'medium',
      targetAudience: targetAudience || 'all',
      senderId,
      senderRole: 'superadmin'
    });

    // Emit WebSocket event to notify all users about new notification
    const io = req.app.get('io');
    if (io) {
      // Send to all connected clients
      io.emit('new_global_notification', {
        notification: {
          _id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          targetAudience: notification.targetAudience,
          createdAt: notification.createdAt
        }
      });
      console.log('📢 Emitted new_global_notification via WebSocket');
    }

    res.status(201).json({
      message: 'Notification sent successfully',
      notification
    });
  } catch (error) {
    console.error('Error sending global notification:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get sent notifications
export const getSentNotifications = async (req, res) => {
  try {
    const senderId = req.user?.id;
    
    if (!senderId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const sender = await CompanyModel.findById(senderId);
    if (!sender || sender.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only super admin can view sent notifications' });
    }

    const notifications = await NotificationModel.find({ senderId })
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching sent notifications:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create super admin account (public - for first super admin)
export const createSuperAdminPublic = async (req, res) => {
  try {
    // Check if any super admin already exists
    const existingSuperAdmin = await CompanyModel.findOne({ role: 'superadmin' });
    
    // If super admin exists, require authentication
    if (existingSuperAdmin) {
      const senderId = req.user?.id;
      
      if (!senderId) {
        return res.status(401).json({ message: 'Super admin already exists. Authentication required.' });
      }

      const sender = await CompanyModel.findById(senderId);
      if (!sender || sender.role !== 'superadmin') {
        return res.status(403).json({ message: 'Only super admin can create super admin accounts' });
      }
    }

    const {
      email,
      password,
      ownerName,
      companyName,
      phone,
      city,
      address,
      businessType
    } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if email already exists
    const existingCompany = await CompanyModel.findOne({ email });
    if (existingCompany) {
      // Check if the company has a valid password (if password is missing or invalid, allow recreation)
      if (!existingCompany.password || existingCompany.password.trim() === '') {
        console.log('Company exists but has no password. Deleting and recreating...');
        await CompanyModel.findByIdAndDelete(existingCompany._id);
      } else {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Extract country code from phone
    const getCountryCodeFromPhone = (phone) => {
      if (!phone) return 'rs';
      const numberOnly = phone.replace(/^\+/, '');
      const COUNTRY_PREFIXES = {
        '381': 'rs', '387': 'ba', '385': 'hr', '382': 'me', '389': 'mk', '386': 'si'
      };
      for (const [prefix, code] of Object.entries(COUNTRY_PREFIXES)) {
        if (numberOnly.startsWith(prefix)) return code;
      }
      return 'rs';
    };

    // Create company document
    const companyData = {
      email,
      password: hashedPassword,
      ownerName: ownerName || 'Super Admin',
      companyName: companyName || 'SpinTasker Admin',
      phone: phone || '+381600000000',
      countryCode: getCountryCodeFromPhone(phone || '+381600000000'),
      city: city || 'Beograd',
      address: address || 'N/A',
      businessType: businessType || 'Home Appliance Technician',
      role: 'superadmin'
    };

    const newCompany = await CompanyModel.create(companyData);

    res.status(201).json({
      message: 'Super admin account created successfully',
      company: {
        _id: newCompany._id,
        email: newCompany.email,
        companyName: newCompany.companyName,
        role: newCompany.role
      }
    });
  } catch (error) {
    console.error('Error creating super admin:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: error.message });
  }
};

// Create super admin account (protected - requires existing super admin)
export const createSuperAdmin = async (req, res) => {
  try {
    const senderId = req.user?.id;
    
    if (!senderId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const sender = await CompanyModel.findById(senderId);
    if (!sender || sender.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only super admin can create super admin accounts' });
    }

    const {
      email,
      password,
      ownerName,
      companyName,
      phone,
      city,
      address,
      businessType
    } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if email already exists
    const existingCompany = await CompanyModel.findOne({ email });
    if (existingCompany) {
      // Check if the company has a valid password (if password is missing or invalid, allow recreation)
      if (!existingCompany.password || existingCompany.password.trim() === '') {
        console.log('Company exists but has no password. Deleting and recreating...');
        await CompanyModel.findByIdAndDelete(existingCompany._id);
      } else {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Extract country code from phone
    const getCountryCodeFromPhone = (phone) => {
      if (!phone) return 'rs';
      const numberOnly = phone.replace(/^\+/, '');
      const COUNTRY_PREFIXES = {
        '381': 'rs', '387': 'ba', '385': 'hr', '382': 'me', '389': 'mk', '386': 'si'
      };
      for (const [prefix, code] of Object.entries(COUNTRY_PREFIXES)) {
        if (numberOnly.startsWith(prefix)) return code;
      }
      return 'rs';
    };

    // Create company document
    const companyData = {
      email,
      password: hashedPassword,
      ownerName: ownerName || 'Super Admin',
      companyName: companyName || 'SpinTasker Admin',
      phone: phone || '+381600000000',
      countryCode: getCountryCodeFromPhone(phone || '+381600000000'),
      city: city || 'Beograd',
      address: address || 'N/A',
      businessType: businessType || 'Home Appliance Technician',
      role: 'superadmin'
    };

    const newCompany = await CompanyModel.create(companyData);

    res.status(201).json({
      message: 'Super admin account created successfully',
      company: {
        _id: newCompany._id,
        email: newCompany.email,
        companyName: newCompany.companyName,
        role: newCompany.role
      }
    });
  } catch (error) {
    console.error('Error creating super admin:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: error.message });
  }
};

