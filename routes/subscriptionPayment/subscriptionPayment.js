import express from 'express';
import {
  getSubscriptionPayments,
  getSubscriptionPayment,
  createSubscriptionPayment,
  markPaymentAsPaid,
  verifyPayment,
  getPaymentInfo,
  getSubscriptionStats
} from '../../controllers/subscriptionPayment/subscriptionPayment.js';
import { auth } from '../../middleware/auth.js';

const router = express.Router();

// Get payment info (your account details)
router.get('/info', auth, getPaymentInfo);

// Get subscription statistics
router.get('/stats', auth, getSubscriptionStats);

// Get all subscription payments
router.get('/', auth, getSubscriptionPayments);

// Get single subscription payment
router.get('/:id', auth, getSubscriptionPayment);

// Create subscription payment request
router.post('/', auth, createSubscriptionPayment);

// Mark payment as paid (user reports payment)
router.patch('/:id/paid', auth, markPaymentAsPaid);

// Verify payment (superadmin only)
router.patch('/:id/verify', auth, verifyPayment);

export default router;

