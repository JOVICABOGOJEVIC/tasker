import express from 'express';
import { 
  getWorkerStatus, 
  updateWorkerStatus, 
  getAllWorkersStatus,
  getMyStatus 
} from '../../controllers/worker/workerStatus.js';
import auth from '../../middleware/auth.js';

const router = express.Router();

// Worker status routes
router.get('/my-status', auth, getMyStatus);
router.get('/:workerId/status', auth, getWorkerStatus);
router.put('/:workerId/status', auth, updateWorkerStatus);
router.get('/status/all', auth, getAllWorkersStatus);

export default router;
