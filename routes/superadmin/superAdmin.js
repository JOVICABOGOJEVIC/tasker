import express from 'express';
import { requireSuperAdmin } from '../../middleware/superAdmin.js';
import {
  getSuperAdminStats,
  getAllCompanies,
  sendGlobalNotification,
  getSentNotifications,
  createSuperAdmin,
  createSuperAdminPublic
} from '../../controllers/superadmin/superAdmin.js';
import auth from '../../middleware/auth.js';

const router = express.Router();

// Public route for creating first super admin (no auth required)
router.post('/create-admin-public', createSuperAdminPublic);

// All other routes require authentication and super admin role
router.use(auth);
router.use(requireSuperAdmin);

router.get('/stats', getSuperAdminStats);
router.get('/companies', getAllCompanies);
router.post('/notifications', sendGlobalNotification);
router.get('/notifications', getSentNotifications);
router.post('/create-admin', createSuperAdmin);

export default router;

