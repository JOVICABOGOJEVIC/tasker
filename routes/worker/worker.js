import express from 'express';
import auth from '../../middleware/auth.js';
import { createWorker, getWorkers, getWorker, updateWorker, deleteWorker, setWorkerPassword, workerLogin } from '../../controllers/worker/worker.js';

const router = express.Router();

// Public route for worker login
router.post('/login', workerLogin);

// All routes below require authentication
router.use(auth);

router.post('/', createWorker);
router.get('/', getWorkers);
router.get('/:id', getWorker);
router.patch('/:id', updateWorker);
router.delete('/:id', deleteWorker);
router.post('/:id/set-password', setWorkerPassword);

export default router; 