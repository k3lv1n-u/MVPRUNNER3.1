const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: Number,
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['referral_reward', 'referral_earned', 'game_reward', 'system'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        default: 0
    },
    read: {
        type: Boolean,
        default: false
    },
    claimed: {
        type: Boolean,
        default: false
    },
    claimedAt: {
        type: Date
    },
    relatedUserId: {
        type: Number
    },
    relatedUsername: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// 인덱스
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ userId: 1, claimed: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
