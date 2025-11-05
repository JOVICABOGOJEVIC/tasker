import Payment from '../../models/payment.js';
import Job from '../../models/job.js';
import mongoose from 'mongoose';

// Generate payment number
const generatePaymentNumber = async (companyId) => {
  const year = new Date().getFullYear();
  const count = await Payment.countDocuments({ 
    companyId,
    paymentDate: {
      $gte: new Date(year, 0, 1),
      $lt: new Date(year + 1, 0, 1)
    }
  });
  return `RAC-${year}-${String(count + 1).padStart(4, '0')}`;
};

// Get all payments
export const getPayments = async (req, res) => {
  try {
    const companyId = req.user.id;
    const { status, jobId, startDate, endDate, paymentType } = req.query;
    
    const query = { companyId };
    
    if (status) {
      query.status = status;
    }
    
    if (jobId) {
      query.jobId = new mongoose.Types.ObjectId(jobId);
    }
    
    if (paymentType) {
      query.paymentType = paymentType;
    }
    
    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) {
        query.paymentDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.paymentDate.$lte = new Date(endDate);
      }
    }
    
    const payments = await Payment.find(query)
      .populate('jobId', 'clientName clientPhone deviceType status')
      .sort({ paymentDate: -1 })
      .lean();
    
    res.status(200).json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get single payment
export const getPayment = async (req, res) => {
  try {
    const companyId = req.user.id;
    const { id } = req.params;
    
    const payment = await Payment.findOne({ _id: id, companyId })
      .populate('jobId')
      .lean();
    
    if (!payment) {
      return res.status(404).json({ message: 'Plaćanje nije pronađeno' });
    }
    
    res.status(200).json(payment);
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create payment
export const createPayment = async (req, res) => {
  try {
    const companyId = req.user.id;
    const paymentData = req.body;
    
    // Validate job exists
    const job = await Job.findOne({ _id: paymentData.jobId, businessType: req.user.businessType });
    if (!job) {
      return res.status(404).json({ message: 'Posao nije pronađen' });
    }
    
    // Generate payment number
    const paymentNumber = await generatePaymentNumber(companyId);
    
    // Calculate VAT if not provided
    if (!paymentData.vatAmount && paymentData.subtotal) {
      const vatRate = paymentData.vatRate || 20;
      paymentData.vatAmount = (paymentData.subtotal * vatRate) / 100;
    }
    
    // Calculate total if not provided
    if (!paymentData.totalAmount && paymentData.subtotal) {
      paymentData.totalAmount = paymentData.subtotal + (paymentData.vatAmount || 0);
    }
    
    // Set remaining amount
    paymentData.remainingAmount = paymentData.totalAmount - (paymentData.paidAmount || 0);
    
    // Get client info from job if not provided
    if (!paymentData.clientName) {
      paymentData.clientName = job.clientName;
      paymentData.clientPhone = job.clientPhone;
      paymentData.clientEmail = job.clientEmail;
      paymentData.clientAddress = job.clientAddress;
    }
    
    const payment = await Payment.create({
      ...paymentData,
      paymentNumber,
      companyId,
      createdBy: companyId
    });
    
    const populatedPayment = await Payment.findById(payment._id)
      .populate('jobId')
      .lean();
    
    res.status(201).json(populatedPayment);
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update payment
export const updatePayment = async (req, res) => {
  try {
    const companyId = req.user.id;
    const { id } = req.params;
    const updateData = req.body;
    
    const payment = await Payment.findOne({ _id: id, companyId });
    if (!payment) {
      return res.status(404).json({ message: 'Plaćanje nije pronađeno' });
    }
    
    // Recalculate if amounts changed
    if (updateData.subtotal !== undefined || updateData.vatRate !== undefined) {
      const subtotal = updateData.subtotal ?? payment.subtotal;
      const vatRate = updateData.vatRate ?? payment.vatRate;
      updateData.vatAmount = (subtotal * vatRate) / 100;
      updateData.totalAmount = subtotal + updateData.vatAmount;
    }
    
    // Update remaining amount if paid amount changed
    if (updateData.paidAmount !== undefined) {
      updateData.remainingAmount = (updateData.totalAmount ?? payment.totalAmount) - updateData.paidAmount;
    }
    
    Object.assign(payment, updateData);
    await payment.save();
    
    const updatedPayment = await Payment.findById(payment._id)
      .populate('jobId')
      .lean();
    
    res.status(200).json(updatedPayment);
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ message: error.message });
  }
};

// Mark payment as paid
export const markPaymentAsPaid = async (req, res) => {
  try {
    const companyId = req.user.id;
    const { id } = req.params;
    const { paidAmount, paymentReference, paymentNote, paidDate } = req.body;
    
    const payment = await Payment.findOne({ _id: id, companyId });
    if (!payment) {
      return res.status(404).json({ message: 'Plaćanje nije pronađeno' });
    }
    
    const newPaidAmount = paidAmount ?? payment.totalAmount;
    
    payment.paidAmount = newPaidAmount;
    payment.remainingAmount = payment.totalAmount - newPaidAmount;
    payment.status = newPaidAmount >= payment.totalAmount ? 'PAID' : 'PARTIAL';
    
    if (paymentReference || paymentNote || paidDate) {
      payment.payment = {
        ...payment.payment,
        paidDate: paidDate ? new Date(paidDate) : new Date(),
        paymentReference: paymentReference || payment.payment?.paymentReference,
        paymentNote: paymentNote || payment.payment?.paymentNote
      };
    }
    
    await payment.save();
    
    const updatedPayment = await Payment.findById(payment._id)
      .populate('jobId')
      .lean();
    
    res.status(200).json(updatedPayment);
  } catch (error) {
    console.error('Error marking payment as paid:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete payment
export const deletePayment = async (req, res) => {
  try {
    const companyId = req.user.id;
    const { id } = req.params;
    
    const payment = await Payment.findOne({ _id: id, companyId });
    if (!payment) {
      return res.status(404).json({ message: 'Plaćanje nije pronađeno' });
    }
    
    await Payment.deleteOne({ _id: id });
    
    res.status(200).json({ message: 'Plaćanje je obrisano' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get payment statistics
export const getPaymentStats = async (req, res) => {
  try {
    const companyId = req.user.id;
    const { startDate, endDate } = req.query;
    
    const query = { companyId };
    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }
    
    const stats = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          paidAmount: { $sum: '$paidAmount' },
          remainingAmount: { $sum: '$remainingAmount' }
        }
      }
    ]);
    
    const totalStats = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalPayments: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$paidAmount' },
          totalRemaining: { $sum: '$remainingAmount' }
        }
      }
    ]);
    
    res.status(200).json({
      byStatus: stats,
      totals: totalStats[0] || {
        totalPayments: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalRemaining: 0
      }
    });
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({ message: error.message });
  }
};

