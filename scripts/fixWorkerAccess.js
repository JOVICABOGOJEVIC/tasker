import mongoose from 'mongoose';
import Worker from '../models/worker.js';

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/spinTasker', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const fixWorkerAccess = async () => {
  try {
    await connectDB();
    
    const email = process.argv[2];
    
    if (!email) {
      console.log('❌ Usage: node fixWorkerAccess.js worker@email.com');
      process.exit(1);
    }
    
    console.log(`🔍 Looking for worker: ${email}`);
    
    const worker = await Worker.findOne({ email: email.toLowerCase() });
    
    if (!worker) {
      console.log('❌ Worker not found!');
      process.exit(1);
    }
    
    console.log('👤 Worker found:');
    console.log(`  Name: ${worker.firstName} ${worker.lastName}`);
    console.log(`  Email: ${worker.email}`);
    console.log(`  Current hasAccess: ${worker.hasAccess}`);
    
    // Update hasAccess to true
    await Worker.updateOne(
      { email: email.toLowerCase() },
      { $set: { hasAccess: true } }
    );
    
    console.log('✅ Worker access enabled!');
    console.log('🎉 Worker can now login');
    
    process.exit(0);
  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
};

fixWorkerAccess();
