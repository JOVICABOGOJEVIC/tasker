import jwt from 'jsonwebtoken';

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Verify the token
    const decodedData = jwt.verify(token, 'test'); // Replace 'test' with your actual secret key
    
    console.log('🔐 Auth Middleware: Token decoded successfully');
    console.log('  Decoded data:', decodedData);
    console.log('  User ID:', decodedData?.id);
    console.log('  Email:', decodedData?.email);
    console.log('  Type:', decodedData?.type);

    // Add the user ID to the request object
    req.user = {
      id: decodedData?.id,
      email: decodedData?.email,
      type: decodedData?.type || 'company'
    };
    
    // Also add userId for backward compatibility with existing controllers
    req.userId = decodedData?.id;
    
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