import CompanyModel from '../models/auth/company.js';

export const requireSuperAdmin = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await CompanyModel.findById(userId);
    
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied. Super admin privileges required.' });
    }

    next();
  } catch (error) {
    console.error('Error in super admin middleware:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

