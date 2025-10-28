import JobModal from "../../models/job.js";

export const createJob = async (req, res) => {
  try {
    const job = await JobModal.create(req.body);
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getJobs = async (req, res) => {
  try {
    const { startDate, endDate, businessType } = req.query;
    let query = {};
    
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
    
    const jobs = await JobModal.find(query);
    res.status(200).json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getJob = async (req, res) => {
  try {
    const job = await JobModal.findById(req.params.id);
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
    const job = await JobModal.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    res.status(200).json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteJob = async (req, res) => {
  try {
    const job = await JobModal.findByIdAndDelete(req.params.id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    res.status(200).json({ message: "Job deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const submitReport = async (req, res) => {
  try {
    const { id } = req.params;
    const reportData = req.body;
    
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
    
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    
    res.status(200).json({ 
      message: "Report submitted successfully", 
      job 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 