import express from 'express';
import { createWorker, getWorkers, getWorker, updateWorker, deleteWorker, setWorkerPassword, workerLogin } from '../../controllers/worker/worker.js';

const router = express.Router();

router.post('/', createWorker);
router.get('/', getWorkers);
router.get('/:id', getWorker);
router.patch('/:id', updateWorker);
router.delete('/:id', deleteWorker);
router.post('/:id/set-password', setWorkerPassword);
router.post('/login', workerLogin); // Worker login endpoint

export default router; 