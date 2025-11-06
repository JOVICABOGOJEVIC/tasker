import express from 'express';
const router = express.Router();

import {
    signupCompany, 
    signinCompany, 
    verifyEmail, 
    resendVerificationEmail,
    forgotPassword,
    resetPassword
} from '../../controllers/auth/company.js';

router.post("/company/register", signupCompany);
router.post("/company/signin", signinCompany);
router.get("/company/verify-email", verifyEmail);
router.post("/company/resend-verification", resendVerificationEmail);
router.post("/company/forgot-password", forgotPassword);
router.post("/company/reset-password", resetPassword);

export default router;