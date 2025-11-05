import WorkerStatus from '../../models/workerStatus.js';
import Worker from '../../models/worker.js';

// Get worker status
export const getWorkerStatus = async (req, res) => {
  try {
    const { workerId } = req.params;
    
    let status = await WorkerStatus.findOne({ workerId });
    
    // If no status exists, create default one
    if (!status) {
      status = await WorkerStatus.create({
        workerId,
        status: 'available',
        companyId: req.user.id
      });
    }
    
    // Populate worker info
    const worker = await Worker.findById(workerId);
    
    res.status(200).json({
      ...status.toObject(),
      worker: {
        firstName: worker.firstName,
        lastName: worker.lastName,
        email: worker.email
      }
    });
  } catch (error) {
    console.error('Error getting worker status:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update worker status
export const updateWorkerStatus = async (req, res) => {
  try {
    const { workerId } = req.params;
    const { status, currentJobId, location, notes } = req.body;
    
    console.log('🔄 Updating worker status:');
    console.log('  Worker ID:', workerId);
    console.log('  Status:', status);
    console.log('  Job ID:', currentJobId);
    console.log('  Location:', location);
    console.log('  Notes:', notes);
    
    const updatedStatus = await WorkerStatus.findOneAndUpdate(
      { workerId },
      { 
        status,
        currentJobId,
        location,
        notes,
        lastUpdated: new Date(),
        companyId: req.user.id // Add companyId
      },
      { new: true, upsert: true }
    );
    
    console.log('✅ Worker status updated:', updatedStatus);
    
    // Emit WebSocket event for worker status update
    const io = req.app.get('io');
    if (io) {
      const { workerId } = req.params;
      const WorkerModel = (await import('../../models/worker.js')).default;
      const worker = await WorkerModel.findById(workerId);
      
      if (worker && worker.companyId) {
        const CompanyModel = (await import('../auth/company.js')).default;
        const company = await CompanyModel.findById(worker.companyId);
        if (company && company.businessType) {
          io.to(`company_${company.businessType}`).emit('worker_status_changed', {
            workerId,
            status,
            currentJobId,
            location,
            notes,
            companyId: worker.companyId
          });
          console.log('👷 Emitted worker_status_changed via WebSocket');
        }
      }
    }
    
    res.status(200).json(updatedStatus);
  } catch (error) {
    console.error('💥 Error updating worker status:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all workers status for company
export const getAllWorkersStatus = async (req, res) => {
  try {
    const companyId = req.user.id;
    
    console.log('👥 Getting all workers status for company:', companyId);
    
    const workersStatus = await WorkerStatus.find({ companyId })
      .populate('workerId', 'firstName lastName email')
      .populate('currentJobId', 'issueDescription serviceDate scheduledTime clientName')
      .sort({ lastUpdated: -1 });
    
    console.log('✅ Found workers status:', workersStatus.length);
    
    res.status(200).json(workersStatus);
  } catch (error) {
    console.error('💥 Error getting all workers status:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get worker status by worker (for worker dashboard)
export const getMyStatus = async (req, res) => {
  try {
    const workerId = req.user.id; // Assuming worker is authenticated
    
    console.log('👤 Getting my status for worker:', workerId);
    
    let status = await WorkerStatus.findOne({ workerId });
    
    if (!status) {
      status = await WorkerStatus.create({
        workerId,
        status: 'available',
        companyId: req.user.companyId
      });
    }
    
    console.log('✅ My status:', status);
    
    res.status(200).json(status);
  } catch (error) {
    console.error('💥 Error getting my status:', error);
    res.status(500).json({ message: error.message });
  }
};
