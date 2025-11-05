import SubscriptionPayment from '../../models/subscriptionPayment.js';
import Company from '../../models/auth/company.js';
import mongoose from 'mongoose';

// Generate payment number
const generatePaymentNumber = async (companyId) => {
  const year = new Date().getFullYear();
  const count = await SubscriptionPayment.countDocuments({ 
    companyId,
    paymentDate: {
      $gte: new Date(year, 0, 1),
      $lt: new Date(year + 1, 0, 1)
    }
  });
  return `SUB-${year}-${String(count + 1).padStart(4, '0')}`;
};

// Generate reference number
const generateReferenceNumber = (companyId) => {
  // Format: SUB-{companyId}-{timestamp}
  const timestamp = Date.now().toString().slice(-6);
  const companyShort = companyId.toString().slice(-4);
  return `SUB-${companyShort}-${timestamp}`;
};

// Get subscription payment info (your account info)
const getSubscriptionPaymentInfo = () => {
  // TODO: Dodaj svoje podatke ovde ili u environment variables
  return {
    recipientBankName: process.env.SUBSCRIPTION_BANK_NAME || 'Tvoja Banka',
    recipientAccountNumber: process.env.SUBSCRIPTION_ACCOUNT_NUMBER || '265-0000000000000-05',
    recipientAccountHolder: process.env.SUBSCRIPTION_ACCOUNT_HOLDER || 'Tvoje Ime/Kompanija',
    model: '97',
    purpose: 'Pretplata SpinTasker'
  };
};

// Get all subscription payments
export const getSubscriptionPayments = async (req, res) => {
  try {
    const companyId = req.user.id;
    const { status, paymentType, period } = req.query;
    
    const query = { companyId };
    
    if (status) {
      query.status = status;
    }
    
    if (paymentType) {
      query.paymentType = paymentType;
    }
    
    if (period) {
      query.period = period;
    }
    
    const payments = await SubscriptionPayment.find(query)
      .populate('companyId', 'companyName email')
      .sort({ paymentDate: -1 })
      .lean();
    
    res.status(200).json(payments);
  } catch (error) {
    console.error('Error fetching subscription payments:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get single subscription payment
export const getSubscriptionPayment = async (req, res) => {
  try {
    const companyId = req.user.id;
    const { id } = req.params;
    
    const payment = await SubscriptionPayment.findOne({ _id: id, companyId })
      .populate('companyId')
      .lean();
    
    if (!payment) {
      return res.status(404).json({ message: 'Plaćanje nije pronađeno' });
    }
    
    res.status(200).json(payment);
  } catch (error) {
    console.error('Error fetching subscription payment:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create subscription payment request
export const createSubscriptionPayment = async (req, res) => {
  try {
    const companyId = req.user.id;
    const paymentData = req.body;
    
    // Get company info
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Kompanija nije pronađena' });
    }
    
    // Generate payment number and reference
    const paymentNumber = await generatePaymentNumber(companyId);
    const referenceNumber = generateReferenceNumber(companyId);
    
    // Get your account info
    const accountInfo = getSubscriptionPaymentInfo();
    
    // Determine payment type
    const paymentType = paymentData.paymentType || 'DONATION'; // Default to donation for beta
    
    // Get package price
    const packagePrices = {
      free: 0,
      standard: 29, // €29
      business: 79, // €79
      premium: 199  // €199
    };
    
    const amount = paymentData.amount || packagePrices[paymentData.subscriptionPackage] || 0;
    
    // Calculate subscription dates
    const subscriptionStartDate = new Date();
    const subscriptionEndDate = new Date(subscriptionStartDate);
    if (paymentData.period === 'MONTHLY') {
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
    } else {
      // Beta month - 1 month
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
    }
    
    const payment = await SubscriptionPayment.create({
      ...paymentData,
      paymentNumber,
      companyId,
      paymentType,
      amount,
      subscriptionStartDate,
      subscriptionEndDate,
      wireTransfer: {
        ...accountInfo,
        referenceNumber
      },
      subscriptionPackage: paymentData.subscriptionPackage || company.subscriptionPackage || 'free'
    });
    
    const populatedPayment = await SubscriptionPayment.findById(payment._id)
      .populate('companyId', 'companyName email')
      .lean();
    
    res.status(201).json(populatedPayment);
  } catch (error) {
    console.error('Error creating subscription payment:', error);
    res.status(500).json({ message: error.message });
  }
};

// Mark payment as paid (user reports payment)
export const markPaymentAsPaid = async (req, res) => {
  try {
    const companyId = req.user.id;
    const { id } = req.params;
    const { paymentReference, paymentNote, paidDate } = req.body;
    
    const payment = await SubscriptionPayment.findOne({ _id: id, companyId });
    if (!payment) {
      return res.status(404).json({ message: 'Plaćanje nije pronađeno' });
    }
    
    payment.status = 'PAID';
    payment.payment = {
      paidDate: paidDate ? new Date(paidDate) : new Date(),
      paymentReference: paymentReference || '',
      paymentNote: paymentNote || '',
      paidBy: req.user.companyName || req.user.email
    };
    
    await payment.save();
    
    const updatedPayment = await SubscriptionPayment.findById(payment._id)
      .populate('companyId', 'companyName email')
      .lean();
    
    res.status(200).json(updatedPayment);
  } catch (error) {
    console.error('Error marking payment as paid:', error);
    res.status(500).json({ message: error.message });
  }
};

// Verify payment (admin/superadmin verifies that payment was received)
export const verifyPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { verified } = req.body;
    
    // Check if user is super admin
    const isSuperAdmin = req.user.role === 'superadmin';
    if (!isSuperAdmin) {
      return res.status(403).json({ message: 'Samo super admin može verifikovati plaćanja' });
    }
    
    const payment = await SubscriptionPayment.findById(id)
      .populate('companyId');
    
    if (!payment) {
      return res.status(404).json({ message: 'Plaćanje nije pronađeno' });
    }
    
    if (verified) {
      payment.status = 'VERIFIED';
      payment.payment.verifiedDate = new Date();
      payment.payment.verifiedBy = req.user.email || 'Super Admin';
      
      // Automatski aktiviraj subscription
      const company = await Company.findById(payment.companyId._id);
      if (company) {
        company.subscriptionPackage = payment.subscriptionPackage;
        company.subscriptionPrice = payment.amount;
        company.subscriptionStartDate = payment.subscriptionStartDate || new Date();
        company.subscriptionEndDate = payment.subscriptionEndDate;
        company.subscriptionActive = true;
        await company.save();
      }
    } else {
      payment.status = 'PENDING';
    }
    
    await payment.save();
    
    const updatedPayment = await SubscriptionPayment.findById(payment._id)
      .populate('companyId', 'companyName email')
      .lean();
    
    res.status(200).json(updatedPayment);
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get subscription payment info (your account details)
export const getPaymentInfo = async (req, res) => {
  try {
    const accountInfo = getSubscriptionPaymentInfo();
    res.status(200).json(accountInfo);
  } catch (error) {
    console.error('Error fetching payment info:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get subscription statistics
export const getSubscriptionStats = async (req, res) => {
  try {
    const companyId = req.user.id;
    
    const stats = await SubscriptionPayment.aggregate([
      { $match: { companyId: new mongoose.Types.ObjectId(companyId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
    
    const totalStats = await SubscriptionPayment.aggregate([
      { $match: { companyId: new mongoose.Types.ObjectId(companyId) } },
      {
        $group: {
          _id: null,
          totalPayments: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          paidAmount: { 
            $sum: { 
              $cond: [{ $in: ['$status', ['PAID', 'VERIFIED']] }, '$amount', 0] 
            } 
          }
        }
      }
    ]);
    
    res.status(200).json({
      byStatus: stats,
      totals: totalStats[0] || {
        totalPayments: 0,
        totalAmount: 0,
        paidAmount: 0
      }
    });
  } catch (error) {
    console.error('Error fetching subscription stats:', error);
    res.status(500).json({ message: error.message });
  }
};

