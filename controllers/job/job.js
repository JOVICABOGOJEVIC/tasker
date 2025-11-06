import JobModal from "../../models/job.js";

export const createJob = async (req, res) => {
  try {
    // Get companyId from authenticated user
    const companyId = req.user?.id || req.userId;
    if (!companyId) {
      return res.status(401).json({ message: "Unauthorized - Company ID required" });
    }
    
    // Add companyId to job data
    const jobData = {
      ...req.body,
      companyId: companyId
    };
    
    const job = await JobModal.create(jobData);
    
    // Emit WebSocket event for new job
    const io = req.app.get('io');
    if (io && job.businessType) {
      io.to(`company_${job.businessType}`).emit('job_created', { job });
      console.log('📋 Emitted job_created via WebSocket');
    }
    
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getJobs = async (req, res) => {
  try {
    // Get companyId from authenticated user
    const companyId = req.user?.id || req.userId;
    if (!companyId) {
      return res.status(401).json({ message: "Unauthorized - Company ID required" });
    }
    
    const { startDate, endDate, businessType } = req.query;
    let query = {
      companyId: companyId // Always filter by companyId - only return jobs that belong to this company
    };
    
    // Filter by businessType if provided
    if (businessType) {
      query.businessType = businessType;
    }
    
    if (startDate && endDate) {
      query.serviceDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Only return jobs that have companyId matching the user's companyId
    // This ensures that jobs without companyId (old jobs) are not returned
    const jobs = await JobModal.find(query);
    res.status(200).json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getJob = async (req, res) => {
  try {
    // Get companyId from authenticated user
    const companyId = req.user?.id || req.userId;
    if (!companyId) {
      return res.status(401).json({ message: "Unauthorized - Company ID required" });
    }
    
    const job = await JobModal.findOne({ 
      _id: req.params.id,
      companyId: companyId 
    });
    
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    res.status(200).json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateJob = async (req, res) => {
  try {
    // Get companyId from authenticated user
    const companyId = req.user?.id || req.userId;
    if (!companyId) {
      return res.status(401).json({ message: "Unauthorized - Company ID required" });
    }
    
    // First check if job exists and belongs to company
    const existingJob = await JobModal.findOne({ 
      _id: req.params.id,
      companyId: companyId 
    });
    
    if (!existingJob) {
      return res.status(404).json({ message: "Job not found" });
    }
    
    const job = await JobModal.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    
    // Emit WebSocket event for job update
    const io = req.app.get('io');
    if (io && job.businessType) {
      io.to(`company_${job.businessType}`).emit('job_updated', { 
        jobId: job._id,
        job,
        status: job.status,
        businessType: job.businessType
      });
      console.log('📋 Emitted job_updated via WebSocket');
    }
    
    res.status(200).json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteJob = async (req, res) => {
  try {
    // Get companyId from authenticated user
    const companyId = req.user?.id || req.userId;
    if (!companyId) {
      return res.status(401).json({ message: "Unauthorized - Company ID required" });
    }
    
    // First check if job exists and belongs to company
    const job = await JobModal.findOne({ 
      _id: req.params.id,
      companyId: companyId 
    });
    
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    
    // Delete the job
    await JobModal.findByIdAndDelete(req.params.id);
    
    // Emit WebSocket event for job deletion
    const io = req.app.get('io');
    if (io && job.businessType) {
      io.to(`company_${job.businessType}`).emit('job_deleted', { 
        jobId: job._id,
        businessType: job.businessType
      });
      console.log('📋 Emitted job_deleted via WebSocket');
    }
    
    res.status(200).json({ message: "Job deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const submitReport = async (req, res) => {
  try {
    // Get companyId from authenticated user
    const companyId = req.user?.id || req.userId;
    if (!companyId) {
      return res.status(401).json({ message: "Unauthorized - Company ID required" });
    }
    
    const { id } = req.params;
    const reportData = req.body;
    
    // First check if job exists and belongs to company
    const existingJob = await JobModal.findOne({ 
      _id: id,
      companyId: companyId 
    });
    
    if (!existingJob) {
      return res.status(404).json({ message: "Job not found" });
    }
    
    // Update job with report data and set status to Completed
    const job = await JobModal.findByIdAndUpdate(
      id,
      { 
        report: reportData,
        status: 'Completed',
        updatedAt: Date.now()
      },
      { new: true }
    );
    
    res.status(200).json({ 
      message: "Report submitted successfully", 
      job 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 