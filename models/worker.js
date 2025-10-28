import mongoose from "mongoose";

const workerSchema = mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  specialization: { 
    type: String, 
    enum: ['pomocni radnik', 'junior', 'medior', 'senior', 'leader'],
    required: true,
    default: 'junior'
  },
  specializationCoefficient: { 
    type: Number, 
    min: 1, 
    max: 5, 
    required: true,
    default: 1
  },
  experience: { type: Number, required: true },
  active: { type: Boolean, default: true },
  currentStatus: { 
    type: String, 
    enum: ['available', 'on_break', 'offline'], 
    default: 'available' 
  },
  // Login credentials for worker access
  password: { type: String, required: false }, // Hashed password
  hasAccess: { type: Boolean, default: false }, // Can worker login?
  role: { 
    type: String, 
    enum: ['worker', 'coordinator'], 
    default: 'worker' 
  },
  // Permissions
  permissions: {
    canViewAllJobs: { type: Boolean, default: false },
    canEditJobs: { type: Boolean, default: false },
    canDeleteJobs: { type: Boolean, default: false },
    canViewClients: { type: Boolean, default: false },
    canEditClients: { type: Boolean, default: false },
    canViewWorkers: { type: Boolean, default: false },
    canViewStatus: { type: Boolean, default: true }
  },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // Link to company
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("Worker", workerSchema); 