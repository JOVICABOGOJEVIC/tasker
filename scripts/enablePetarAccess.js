import mongoose from 'mongoose';
import Worker from '../models/worker.js';

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/spinTasker');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const enablePetarAccess = async () => {
  try {
    await connectDB();
    
    console.log('🔍 Looking for Petar Petrovic...');
    
    const worker = await Worker.findById('68f9d045d50e0236d478c6b1');
    
    if (!worker) {
      console.log('❌ Worker not found!');
      process.exit(1);
    }
    
    console.log('👤 Worker found:');
    console.log(`  Name: ${worker.firstName} ${worker.lastName}`);
    console.log(`  Email: ${worker.email}`);
    console.log(`  Current hasAccess: ${worker.hasAccess}`);
    
    // Update hasAccess to true
    await Worker.findByIdAndUpdate(
      '68f9d045d50e0236d478c6b1',
      { $set: { hasAccess: true } }
    );
    
    console.log('✅ Petar access enabled!');
    console.log('🎉 Petar can now login with petar@gmail.com');
    
    process.exit(0);
  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
};

enablePetarAccess();
