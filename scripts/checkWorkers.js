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

const checkWorkers = async () => {
  try {
    await connectDB();
    
    console.log('👥 All Workers in Database:');
    console.log('========================');
    
    const workers = await Worker.find({});
    
    workers.forEach((worker, index) => {
      console.log(`\n${index + 1}. ${worker.firstName} ${worker.lastName}`);
      console.log(`   📧 Email: ${worker.email}`);
      console.log(`   🔓 Has Access: ${worker.hasAccess}`);
      console.log(`   🔑 Password Set: ${worker.password ? 'Yes' : 'No'}`);
      console.log(`   🆔 ID: ${worker._id}`);
    });
    
    console.log('\n🔍 Workers with hasAccess: false:');
    const noAccessWorkers = workers.filter(w => !w.hasAccess);
    if (noAccessWorkers.length === 0) {
      console.log('   ✅ All workers have access!');
    } else {
      noAccessWorkers.forEach(worker => {
        console.log(`   ❌ ${worker.firstName} ${worker.lastName} (${worker.email})`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
};

checkWorkers();
