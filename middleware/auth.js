import jwt from 'jsonwebtoken';

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Verify the token
    const decodedData = jwt.verify(token, 'test'); // Replace 'test' with your actual secret key

    // Add the user ID to the request object
    req.userId = decodedData?.id;
    req.userEmail = decodedData?.email;
    
    next();
  } catch (error) {
    console.log(error);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default auth; 