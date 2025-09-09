import express from 'express';
const router = express.Router();

import {signupCompany, signinCompany} from '../../controllers/auth/company.js';

router.post("/company/register", signupCompany);
router.post("/company/signin", signinCompany);

export default router;