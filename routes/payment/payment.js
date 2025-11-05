import express from 'express';
import {
  getPayments,
  getPayment,
  createPayment,
  updatePayment,
  markPaymentAsPaid,
  deletePayment,
  getPaymentStats
} from '../../controllers/payment/payment.js';
import { auth } from '../../middleware/auth.js';

const router = express.Router();

// Get all payments
router.get('/', auth, getPayments);

// Get payment statistics
router.get('/stats', auth, getPaymentStats);

// Get single payment
router.get('/:id', auth, getPayment);

// Create payment
router.post('/', auth, createPayment);

// Update payment
router.put('/:id', auth, updatePayment);

// Mark payment as paid
router.patch('/:id/paid', auth, markPaymentAsPaid);

// Delete payment
router.delete('/:id', auth, deletePayment);

export default router;

