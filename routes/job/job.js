import express from 'express';
import { createJob, getJobs, getJob, updateJob, deleteJob, submitReport } from '../../controllers/job/job.js';

const router = express.Router();

router.post('/', createJob);
router.get('/', getJobs);
router.get('/:id', getJob);
router.patch('/:id', updateJob);
router.delete('/:id', deleteJob);
router.post('/:id/report', submitReport);

export default router; 