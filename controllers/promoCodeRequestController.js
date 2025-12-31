const PromoCodeRequest = require('../models/PromoCodeRequest');
const PromoCode = require('../models/PromoCode');
const User = require('../models/User');
const WeeklyGoal = require('../models/WeeklyGoal');
const WheelConfig = require('../models/WheelConfig');
const ShopItem = require('../models/ShopItem');

// 모든 프로모션 코드 요청 조회
exports.getAllRequests = async (req, res) => {
  try {
    const { status, type } = req.query;

    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const requests = await PromoCodeRequest.find(query)
      .populate('userId', 'username telegramId')
      .populate('weeklyGoalId', 'targetScore weekStartDate weekEndDate')
      .populate('shopItemId', 'name description price')
      .populate('promoCodeId', 'code isUsed')
      .sort({ requestedAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      requests
    });
  } catch (error) {
    console.error('Error getting promo code requests:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 프로모션 코드 요청 승인 및 발급
exports.approveRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { wheelConfigId, adminNote } = req.body;

    const request = await PromoCodeRequest.findById(requestId)
      .populate('userId', 'username telegramId')
      .populate('weeklyGoalId');

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request is not pending' });
    }

    // 휠 설정 가져오기
    let wheelConfig = null;
    if (wheelConfigId) {
      wheelConfig = await WheelConfig.findById(wheelConfigId);
    }
    if (!wheelConfig) {
      wheelConfig = await WheelConfig.getActive();
    }

    // 프로모션 코드 생성
    let code;
    let isUnique = false;
    while (!isUnique) {
      code = PromoCode.generateCode();
      const exists = await PromoCode.findOne({ code });
      if (!exists) {
        isUnique = true;
      }
    }

    const promoCode = new PromoCode({
      code,
      telegramId: request.telegramId,
      userId: request.userId._id,
      weeklyGoalId: request.weeklyGoalId?._id || null,
      wheelConfigId: wheelConfig ? wheelConfig._id : null,
      targetScore: request.targetScore || null,
      actualScore: request.actualScore || null,
      isPurchasable: false,
      price: 0,
      purchasePrice: request.shopPurchasePrice || 0 // 구매 가격 저장 (상점 구매인 경우)
    });

    await promoCode.save();

    // 요청 상태 업데이트
    request.status = 'issued';
    request.promoCodeId = promoCode._id;
    request.adminNote = adminNote || '';
    request.processedAt = Date.now();
    request.processedBy = 'admin'; // 실제로는 관리자 정보를 넣어야 함
    await request.save();

    res.json({
      success: true,
      message: 'Promo code issued successfully',
      request: {
        id: request._id,
        type: request.type,
        telegramId: request.telegramId,
        username: request.userId.username
      },
      promoCode: {
        id: promoCode._id,
        code: promoCode.code,
        wheelConfigId: promoCode.wheelConfigId
      },
      wheelConfig: wheelConfig ? {
        id: wheelConfig._id,
        name: wheelConfig.name,
        segments: wheelConfig.segments
      } : null
    });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 프로모션 코드 요청 거부
exports.rejectRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminNote } = req.body;

    const request = await PromoCodeRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request is not pending' });
    }

    // 상점 구매 요청인 경우 잔액 환불 및 판매 수 감소
    if (request.type === 'shop-purchase' && request.shopPurchasePrice) {
      const user = await User.findById(request.userId);
      if (user) {
        user.balance += request.shopPurchasePrice;
        await user.save();
      }
      
      // 상점 아이템 판매 수 감소
      if (request.shopItemId) {
        const shopItem = await ShopItem.findById(request.shopItemId);
        if (shopItem && shopItem.soldCount > 0) {
          shopItem.soldCount -= 1;
          await shopItem.save();
        }
      }
    }

    request.status = 'rejected';
    request.adminNote = adminNote || '';
    request.processedAt = Date.now();
    request.processedBy = 'admin';
    await request.save();

    res.json({
      success: true,
      message: 'Request rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 사용자의 프로모션 코드 요청 상태 확인
exports.getUserRequestStatus = async (req, res) => {
  try {
    const { telegramId } = req.params;

    const requests = await PromoCodeRequest.find({
      telegramId: parseInt(telegramId),
      status: { $in: ['pending', 'approved', 'issued'] }
    })
      .populate('promoCodeId', 'code isUsed')
      .sort({ requestedAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      requests: requests.map(req => ({
        id: req._id,
        type: req.type,
        status: req.status,
        requestedAt: req.requestedAt,
        promoCode: req.promoCodeId ? {
          code: req.promoCodeId.code,
          isUsed: req.promoCodeId.isUsed
        } : null
      }))
    });
  } catch (error) {
    console.error('Error getting user request status:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

