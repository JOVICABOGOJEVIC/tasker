import express from 'express';
import NotificationModel from '../../models/notification.js';
import CompanyModel from '../../models/auth/company.js';
import auth from '../../middleware/auth.js';

const router = express.Router();

// Get global notifications for logged-in users
router.get('/all', auth, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get user's subscription info
    const user = await CompanyModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Build query based on target audience
    const audienceQuery = [];
    
    if (user.subscriptionPackage && user.subscriptionPackage !== 'free') {
      // Users with subscriptions can see 'all' and subscription-specific notifications
      audienceQuery.push(
        { targetAudience: 'all' },
        { targetAudience: 'subscribers' },
        { targetAudience: user.subscriptionPackage }
      );
    } else {
      // Free users can only see 'all' and 'free' notifications
      audienceQuery.push(
        { targetAudience: 'all' },
        { targetAudience: 'free' }
      );
    }

    // Filter out expired notifications
    const now = new Date();
    const query = {
      $and: [
        { $or: audienceQuery },
        {
          $or: [
            { expiresAt: null },
            { expiresAt: { $gt: now } }
          ]
        }
      ]
    };

    const notifications = await NotificationModel.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .select('title message type priority createdAt expiresAt');

    // Mark as read by this user if not already read
    for (const notification of notifications) {
      const isRead = notification.readBy?.some(r => r.userId.toString() === userId.toString());
      if (!isRead) {
        await NotificationModel.findByIdAndUpdate(
          notification._id,
          {
            $push: {
              readBy: {
                userId,
                readAt: new Date()
              }
            }
          }
        );
      }
    }

    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching global notifications:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;

