import jwt from 'jsonwebtoken';
import CompanyModel from '../models/auth/company.js';

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Verify the token
    const secret = process.env.JWT_SECRET || 'test';
    const decodedData = jwt.verify(token, secret);
    
    console.log('🔐 Auth Middleware: Token decoded successfully');
    console.log('  Decoded data:', decodedData);
    console.log('  User ID:', decodedData?.id);
    console.log('  Email:', decodedData?.email);
    console.log('  Type:', decodedData?.type);
    console.log('  Role:', decodedData?.role);

    // Add the user ID to the request object
    req.user = {
      id: decodedData?.id || decodedData?._id || decodedData?.sub || decodedData?.userId || null,
      email: decodedData?.email,
      type: decodedData?.type || decodedData?.role || 'company',
      role: decodedData?.role || decodedData?.type || 'company'
    };
    
    if (!req.user.id) {
      console.warn('⚠️ Auth Middleware: Token decoded but user ID missing in payload.');
    }
    
    if (req.user.id) {
      try {
        const dbUser = await CompanyModel.findById(req.user.id).select('role');
        if (dbUser?.role) {
          req.user.role = dbUser.role;
          if (dbUser.role === 'superadmin') {
            req.user.type = 'superadmin';
          }
        }
      } catch (dbError) {
        console.error('⚠️ Auth Middleware: Error fetching user role from database:', dbError);
      }
    }
    
    // Also add userId for backward compatibility with existing controllers
    req.userId = req.user.id;
    
    console.log('🔐 Auth Middleware: Request object updated');
    console.log('  req.user:', req.user);
    console.log('  req.userId:', req.userId);
    
    next();
  } catch (error) {
    console.log(error);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default auth;
export { auth }; 