import express from 'express';
const router = express.Router();

import {
    signupCompany, 
    signinCompany, 
    verifyEmail, 
    resendVerificationEmail 
} from '../../controllers/auth/company.js';

router.post("/company/register", signupCompany);
router.post("/company/signin", signinCompany);
router.get("/company/verify-email", verifyEmail);
router.post("/company/resend-verification", resendVerificationEmail);

export default router;