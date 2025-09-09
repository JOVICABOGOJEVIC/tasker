import WorkerModal from "../../models/worker.js";

export const createWorker = async (req, res) => {
  try {
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
    const worker = await WorkerModal.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }
    res.status(200).json(worker);
  } catch (error) {
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