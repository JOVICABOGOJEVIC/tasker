import WorkerModal from "../../models/worker.js";
import bcrypt from 'bcryptjs';

// Mapping specialization to coefficient
const getSpecializationCoefficient = (specialization) => {
  const mapping = {
    'pomocni radnik': 1,
    'junior': 2,
    'medior': 3,
    'senior': 4,
    'leader': 5
  };
  return mapping[specialization] || 1;
};

export const createWorker = async (req, res) => {
  try {
    // Automatically set specializationCoefficient if not provided
    if (req.body.specialization && !req.body.specializationCoefficient) {
      req.body.specializationCoefficient = getSpecializationCoefficient(req.body.specialization);
    }
    
    const worker = await WorkerModal.create(req.body);
    res.status(201).json(worker);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getWorkers = async (req, res) => {
  try {
    const workers = await WorkerModal.find();
    res.status(200).json(workers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getWorker = async (req, res) => {
  try {
    const worker = await WorkerModal.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }
    res.status(200).json(worker);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateWorker = async (req, res) => {
  try {
    console.log('🔄 Worker Update Request:');
    console.log('  Worker ID:', req.params.id);
    console.log('  Update data:', req.body);
    
    // Automatically set specializationCoefficient if specialization changed
    if (req.body.specialization && !req.body.specializationCoefficient) {
      req.body.specializationCoefficient = getSpecializationCoefficient(req.body.specialization);
    }
    
    const worker = await WorkerModal.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!worker) {
      console.log('  ❌ Worker not found');
      return res.status(404).json({ message: "Worker not found" });
    }
    
    console.log('  ✅ Worker updated successfully');
    console.log('  New hasAccess:', worker.hasAccess);
    
    res.status(200).json(worker);
  } catch (error) {
    console.error('💥 Error updating worker:', error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteWorker = async (req, res) => {
  try {
    const worker = await WorkerModal.findByIdAndDelete(req.params.id);
    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }
    res.status(200).json({ message: "Worker deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Set password for worker login
export const setWorkerPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update worker with hashed password
    const worker = await WorkerModal.findByIdAndUpdate(
      id,
      { 
        password: hashedPassword,
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }

    // Don't send password in response
    const { password: _, ...workerData } = worker.toObject();
    res.status(200).json(workerData);
  } catch (error) {
    console.error('Error setting worker password:', error);
    res.status(500).json({ message: error.message });
  }
};

// Worker login
export const workerLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Worker Login Attempt:');
    console.log('  Email:', email);
    console.log('  Password provided:', password ? 'Yes' : 'No');

    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find worker by email
    const worker = await WorkerModal.findOne({ email: email.toLowerCase() });

    console.log('👤 Worker lookup result:');
    if (!worker) {
      console.log('  ❌ Worker not found in database');
      return res.status(404).json({ message: "Worker not found" });
    }
    
    console.log('  ✅ Worker found:', worker.firstName, worker.lastName);
    console.log('  📧 Email:', worker.email);
    console.log('  🔓 Has Access:', worker.hasAccess);
    console.log('  🔑 Password Set:', worker.password ? 'Yes' : 'No');

    // Check if worker has access
    if (!worker.hasAccess) {
      console.log('  ❌ Access denied - hasAccess is false');
      return res.status(403).json({ message: "Access denied. Contact your administrator." });
    }

    // Check if password is set
    if (!worker.password) {
      console.log('  ❌ Password not set in database');
      return res.status(403).json({ message: "Password not set. Contact your administrator." });
    }

    // Verify password
    console.log('  🔍 Verifying password...');
    const isPasswordCorrect = await bcrypt.compare(password, worker.password);
    console.log('  Password match:', isPasswordCorrect ? '✅ Yes' : '❌ No');

    if (!isPasswordCorrect) {
      console.log('  ❌ Invalid password');
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Create token (similar to user login)
    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign(
      { 
        email: worker.email, 
        id: worker._id,
        type: 'worker', // Important: distinguish from regular users
        role: worker.role,
        permissions: worker.permissions
      }, 
      process.env.JWT_SECRET || 'test', 
      { expiresIn: '7d' }
    );

    // Don't send password in response
    const { password: _, ...workerData } = worker.toObject();

    console.log('  ✅ Login successful!');
    console.log('  🎫 Token generated');
    
    res.status(200).json({ 
      result: workerData, 
      token,
      userType: 'worker' // To distinguish from company users
    });
  } catch (error) {
    console.error('💥 Error during worker login:', error);
    res.status(500).json({ message: error.message });
  }
}; 