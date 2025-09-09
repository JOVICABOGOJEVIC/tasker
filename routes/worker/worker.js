import express from 'express';
import { createWorker, getWorkers, getWorker, updateWorker, deleteWorker } from '../../controllers/worker/worker.js';

const router = express.Router();

router.post('/', createWorker);
router.get('/', getWorkers);
router.get('/:id', getWorker);
router.patch('/:id', updateWorker);
router.delete('/:id', deleteWorker);

export default router; 