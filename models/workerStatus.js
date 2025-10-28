import mongoose from 'mongoose';

const workerStatusSchema = new mongoose.Schema({
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'on_the_road', 'at_client', 'on_break', 'offline', 'completed'],
    default: 'available'
  },
  currentJobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: false
  },
  location: {
    type: String,
    required: false
  },
  notes: {
    type: String,
    required: false
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
workerStatusSchema.index({ workerId: 1, companyId: 1 });

export default mongoose.model('WorkerStatus', workerStatusSchema);
