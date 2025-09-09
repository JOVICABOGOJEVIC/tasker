import express from 'express';
import { signup, signin } from '../../controllers/auth/user.js';
import { registerCompany } from '../../controllers/auth/company.js';

const router = express.Router();

// User routes
router.post('/signup', signup);
router.post('/signin', signin);

// Company routes
router.post('/registercompany', registerCompany);

export default router;