import mongoose from 'mongoose';

const notificationSchema = mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['info', 'warning', 'error', 'success'], 
    default: 'info' 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium' 
  },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  senderRole: { type: String, default: 'superadmin' },
  targetAudience: { 
    type: String, 
    enum: ['all', 'subscribers', 'free', 'standard', 'business'], 
    default: 'all' 
  },
  readBy: [{ 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    readAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date }
});

const NotificationModel = mongoose.model('Notification', notificationSchema);

export default NotificationModel;

