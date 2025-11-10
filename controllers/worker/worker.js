import mongoose from 'mongoose';
import WorkerModal from "../../models/worker.js";
import CompanyModel from "../../models/auth/company.js";
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

const normalizeObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return null;
};

const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

const resolveCompanyContext = async (req, res, { allowWorker = false } = {}) => {
  const user = req.user;

  if (!user?.id) {
    res.status(401).json({ message: 'Authentication required.' });
    return null;
  }

  const fallbackEmail = normalizeEmail(user.email);

  if (user.type === 'worker') {
    if (!allowWorker) {
      res.status(403).json({ message: 'Radnici nemaju dozvolu za ovu akciju.' });
      return null;
    }

    const worker = await WorkerModal.findById(user.id).select('companyId createdBy companyEmail createdByEmail');
    if (!worker || !worker.companyId) {
      res.status(403).json({ message: 'Radnik nije povezan sa kompanijom.' });
      return null;
    }

    const companyEmailFromWorker = normalizeEmail(worker.companyEmail || worker.createdByEmail);
    let resolvedEmail = companyEmailFromWorker || fallbackEmail;

    if (!resolvedEmail) {
      const companyDoc = await CompanyModel.findById(worker.companyId).select('email');
      resolvedEmail = normalizeEmail(companyDoc?.email) || fallbackEmail;
    }

    return {
      companyId: worker.companyId.toString(),
      actingAsWorker: true,
      currentWorker: worker,
      email: resolvedEmail
    };
  }

  const companyDoc = await CompanyModel.findById(user.id).select('email');
  const resolvedEmail = normalizeEmail(companyDoc?.email) || fallbackEmail;

  return {
    companyId: user.id,
    actingAsWorker: false,
    currentWorker: null,
    email: resolvedEmail
  };
};

export const createWorker = async (req, res) => {
  try {
    const context = await resolveCompanyContext(req, res, { allowWorker: false });
    if (!context) return;

    const companyObjectId = normalizeObjectId(context.companyId);
    if (!companyObjectId) {
      return res.status(400).json({ message: 'Nevažeći identifikator kompanije.' });
    }

    // Automatically set specializationCoefficient if not provided
    if (req.body.specialization && !req.body.specializationCoefficient) {
      req.body.specializationCoefficient = getSpecializationCoefficient(req.body.specialization);
    }

    const creatorEmail = context.email || normalizeEmail(req.user?.email);

    const workerPayload = {
      ...req.body,
      companyId: companyObjectId,
      createdBy: companyObjectId,
      companyEmail: creatorEmail,
      createdByEmail: creatorEmail,
    };

    const worker = await WorkerModal.create(workerPayload);

    // Emit WebSocket event for new worker
    const io = req.app.get('io');
    if (io && worker.companyId) {
      const company = await CompanyModel.findById(worker.companyId);
      if (company && company.businessType) {
        io.to(`company_${company.businessType}`).emit('worker_created', { worker });
        console.log('👷 Emitted worker_created via WebSocket');
      }
    }

    res.status(201).json(worker);
  } catch (error) {
    console.error('💥 Error creating worker:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getWorkers = async (req, res) => {
  try {
    const context = await resolveCompanyContext(req, res, { allowWorker: true });
    if (!context) return;

    const companyObjectId = normalizeObjectId(context.companyId);
    const requesterEmail = normalizeEmail(context.email || req.user?.email);

    const queryClauses = [];
    if (companyObjectId) {
      queryClauses.push({ companyId: companyObjectId }, { createdBy: companyObjectId });
    }
    if (requesterEmail) {
      queryClauses.push({ companyEmail: requesterEmail }, { createdByEmail: requesterEmail });
    }

    if (queryClauses.length === 0) {
      return res.status(200).json([]);
    }

    const workers = await WorkerModal.find({ $or: queryClauses }).sort({ createdAt: -1 });
    res.status(200).json(workers);
  } catch (error) {
    console.error('💥 Error fetching workers:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getWorker = async (req, res) => {
  try {
    const context = await resolveCompanyContext(req, res, { allowWorker: true });
    if (!context) return;

    const worker = await WorkerModal.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }

    const companyObjectId = normalizeObjectId(context.companyId);
    const requesterEmail = normalizeEmail(context.email || req.user?.email);

    const ownsWorker = (companyObjectId && ((worker.companyId && worker.companyId.equals(companyObjectId)) || (worker.createdBy && worker.createdBy.equals(companyObjectId))))
      || (requesterEmail && [normalizeEmail(worker.companyEmail), normalizeEmail(worker.createdByEmail)].includes(requesterEmail));

    if (!ownsWorker) {
      return res.status(404).json({ message: "Worker not found" });
    }

    res.status(200).json(worker);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateWorker = async (req, res) => {
  try {
    const context = await resolveCompanyContext(req, res, { allowWorker: true });
    if (!context) return;

    console.log('🔄 Worker Update Request:');
    console.log('  Worker ID:', req.params.id);
    console.log('  Update data:', req.body);

    // Automatically set specializationCoefficient if specialization changed
    if (req.body.specialization && !req.body.specializationCoefficient) {
      req.body.specializationCoefficient = getSpecializationCoefficient(req.body.specialization);
    }

    const existing = await WorkerModal.findById(req.params.id);
    if (!existing) {
      console.log('  ❌ Worker not found');
      return res.status(404).json({ message: "Worker not found" });
    }

    const companyObjectId = normalizeObjectId(context.companyId);
    const requesterEmail = normalizeEmail(context.email || req.user?.email);
    const ownsWorker = (companyObjectId && ((existing.companyId && existing.companyId.equals(companyObjectId)) || (existing.createdBy && existing.createdBy.equals(companyObjectId))))
      || (requesterEmail && [normalizeEmail(existing.companyEmail), normalizeEmail(existing.createdByEmail)].includes(requesterEmail));

    if (!ownsWorker) {
      console.log('  ❌ Unauthorized update attempt');
      return res.status(404).json({ message: "Worker not found" });
    }

    if (context.actingAsWorker && existing._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Radnici mogu menjati samo sopstveni profil.' });
    }

    const {
      companyId: _ignoreCompanyId,
      createdBy: _ignoreCreatedBy,
      companyEmail: _ignoreCompanyEmail,
      createdByEmail: _ignoreCreatedByEmail,
      ...updates
    } = req.body;

    Object.assign(existing, updates, { updatedAt: Date.now() });
    await existing.save();

    console.log('  ✅ Worker updated successfully');
    console.log('  New hasAccess:', existing.hasAccess);

    // Emit WebSocket event for worker update
    const io = req.app.get('io');
    if (io && existing.companyId) {
      const company = await CompanyModel.findById(existing.companyId);
      if (company && company.businessType) {
        io.to(`company_${company.businessType}`).emit('worker_updated', { worker: existing });
        console.log('👷 Emitted worker_updated via WebSocket');
      }
    }

    res.status(200).json(existing);
  } catch (error) {
    console.error('💥 Error updating worker:', error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteWorker = async (req, res) => {
  try {
    const context = await resolveCompanyContext(req, res, { allowWorker: false });
    if (!context) return;

    const companyObjectId = normalizeObjectId(context.companyId);
    const requesterEmail = normalizeEmail(context.email || req.user?.email);

    const deletionQuery = {
      _id: req.params.id,
      $or: []
    };

    if (companyObjectId) {
      deletionQuery.$or.push({ companyId: companyObjectId }, { createdBy: companyObjectId });
    }
    if (requesterEmail) {
      deletionQuery.$or.push({ companyEmail: requesterEmail }, { createdByEmail: requesterEmail });
    }

    if (deletionQuery.$or.length === 0) {
      return res.status(404).json({ message: "Worker not found" });
    }

    const worker = await WorkerModal.findOneAndDelete(deletionQuery);

    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }

    // Emit WebSocket event for worker deletion
    const io = req.app.get('io');
    if (io && worker.companyId) {
      const company = await CompanyModel.findById(worker.companyId);
      if (company && company.businessType) {
        io.to(`company_${company.businessType}`).emit('worker_deleted', { 
          workerId: worker._id,
          companyId: worker.companyId
        });
        console.log('👷 Emitted worker_deleted via WebSocket');
      }
    }

    res.status(200).json({ message: "Worker deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Set password for worker login
export const setWorkerPassword = async (req, res) => {
  try {
    const context = await resolveCompanyContext(req, res, { allowWorker: true });
    if (!context) return;

    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const worker = await WorkerModal.findById(id);
    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }

    const companyObjectId = normalizeObjectId(context.companyId);
    const requesterEmail = normalizeEmail(context.email || req.user?.email);
    const ownsWorker = (companyObjectId && ((worker.companyId && worker.companyId.equals(companyObjectId)) || (worker.createdBy && worker.createdBy.equals(companyObjectId))))
      || (requesterEmail && [normalizeEmail(worker.companyEmail), normalizeEmail(worker.createdByEmail)].includes(requesterEmail));

    if (!ownsWorker) {
      return res.status(404).json({ message: "Worker not found" });
    }

    if (context.actingAsWorker && worker._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Radnici mogu podesiti lozinku samo za sopstveni nalog.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    worker.password = hashedPassword;
    worker.updatedAt = Date.now();
    await worker.save();

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
