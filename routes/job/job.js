import express from 'express';
import { createJob, getJobs, getJob, updateJob, deleteJob, submitReport } from '../../controllers/job/job.js';
import { extractJobDataFromMessage } from '../../controllers/job/aiExtraction.js';
import auth from '../../middleware/auth.js';

const router = express.Router();

router.post('/', auth, createJob);
router.get('/', auth, getJobs);
router.get('/:id', auth, getJob);
router.patch('/:id', auth, updateJob);
router.delete('/:id', auth, deleteJob);
router.post('/:id/report', auth, submitReport);
router.post('/extract-from-message', auth, extractJobDataFromMessage);

export default router; 