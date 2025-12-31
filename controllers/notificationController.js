const Notification = require('../models/Notification');
const User = require('../models/User');

// 사용자의 알림 목록 가져오기
exports.getNotifications = async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 50, skip = 0 } = req.query;

        const notifications = await Notification.find({ userId: parseInt(userId) })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip));

        const unreadCount = await Notification.countDocuments({
            userId: parseInt(userId),
            read: false
        });

        res.json({
            success: true,
            notifications,
            unreadCount
        });
    } catch (error) {
        console.error('[NotificationController] Error getting notifications:', error);
        res.status(500).json({ error: 'Failed to get notifications' });
    }
};

// 알림을 읽음으로 표시
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findByIdAndUpdate(
            id,
            { read: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({
            success: true,
            notification
        });
    } catch (error) {
        console.error('[NotificationController] Error marking as read:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
};

// 모든 알림을 읽음으로 표시
exports.markAllAsRead = async (req, res) => {
    try {
        const { userId } = req.params;

        await Notification.updateMany(
            { userId: parseInt(userId), read: false },
            { read: true }
        );

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        console.error('[NotificationController] Error marking all as read:', error);
        res.status(500).json({ error: 'Failed to mark all as read' });
    }
};

// 보상 수령
exports.claimReward = async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findById(id);

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        if (notification.claimed) {
            return res.status(400).json({ error: 'Reward already claimed' });
        }

        if (notification.amount <= 0) {
            return res.status(400).json({ error: 'No reward to claim' });
        }

        // 사용자에게 코인 지급
        const user = await User.findOne({ telegramId: notification.userId });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.balance = (user.balance || 0) + notification.amount;
        await user.save();

        // 알림 업데이트
        notification.claimed = true;
        notification.claimedAt = new Date();
        notification.read = true;
        await notification.save();

        res.json({
            success: true,
            notification,
            newBalance: user.balance
        });
    } catch (error) {
        console.error('[NotificationController] Error claiming reward:', error);
        res.status(500).json({ error: 'Failed to claim reward' });
    }
};

// 알림 생성 (내부 사용)
exports.createNotification = async (userId, type, title, message, amount = 0, relatedUserId = null, relatedUsername = null) => {
    try {
        const notification = new Notification({
            userId,
            type,
            title,
            message,
            amount,
            relatedUserId,
            relatedUsername
        });

        await notification.save();
        console.log(`[NotificationController] Created notification for user ${userId}: ${title}`);
        return notification;
    } catch (error) {
        console.error('[NotificationController] Error creating notification:', error);
        throw error;
    }
};
