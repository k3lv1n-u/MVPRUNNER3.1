const PromoCode = require('../models/PromoCode');
const User = require('../models/User');
const WheelConfig = require('../models/WheelConfig');

// 관리자가 프로모션 코드 생성
exports.createPromoCode = async (req, res) => {
  try {
    const { 
      count, 
      wheelConfigId, 
      isPurchasable, 
      price, 
      stock, 
      description 
    } = req.body;

    if (!count || count < 1 || count > 100) {
      return res.status(400).json({ error: 'Count must be between 1 and 100' });
    }

    if (isPurchasable && (!price || price < 0)) {
      return res.status(400).json({ error: 'Price is required for purchasable codes' });
    }

    // 휠 설정 확인
    let wheelConfig = null;
    if (wheelConfigId) {
      wheelConfig = await WheelConfig.findById(wheelConfigId);
      if (!wheelConfig) {
        return res.status(404).json({ error: 'Wheel config not found' });
      }
    } else {
      // 기본 휠 설정 사용
      wheelConfig = await WheelConfig.getActive();
    }

    const codes = [];
    for (let i = 0; i < count; i++) {
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
        wheelConfigId: wheelConfig ? wheelConfig._id : null,
        isPurchasable: isPurchasable || false,
        price: isPurchasable ? price : 0,
        stock: isPurchasable ? (stock || 0) : 0,
        description: description || ''
      });

      await promoCode.save();
      codes.push({
        id: promoCode._id,
        code: promoCode.code,
        isPurchasable: promoCode.isPurchasable,
        price: promoCode.price
      });
    }

    res.json({
      success: true,
      message: `${count} promo code(s) created successfully`,
      codes
    });
  } catch (error) {
    console.error('Error creating promo codes:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 구매 가능한 프로모션 코드 목록 조회 (상점 아이템 기반)
exports.getPurchasableCodes = async (req, res) => {
  try {
    const ShopItem = require('../models/ShopItem');
    const items = await ShopItem.find({
      type: 'promo-code',
      isActive: true
    })
      .populate('promoCodeConfig.wheelConfigId', 'name segments')
      .sort({ price: 1 })
      .select('-__v');

    res.json({
      success: true,
      codes: items.map(item => ({
        id: item._id,
        name: item.name,
        description: item.description,
        price: item.price,
        stock: item.stock,
        soldCount: item.soldCount,
        available: item.stock === 0 ? -1 : item.stock - item.soldCount,
        wheelConfig: item.promoCodeConfig?.wheelConfigId ? {
          id: item.promoCodeConfig.wheelConfigId._id,
          name: item.promoCodeConfig.wheelConfigId.name,
          segments: item.promoCodeConfig.wheelConfigId.segments
        } : null
      }))
    });
  } catch (error) {
    console.error('Error getting purchasable codes:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 프로모션 코드 구매 (요청 생성)
exports.purchasePromoCode = async (req, res) => {
  try {
    const { itemId } = req.body;
    const { telegramId } = req.params;

    console.log('[PromoCode] Purchase request:', { itemId, telegramId, body: req.body });

    if (!itemId) {
      console.error('[PromoCode] Item ID is missing');
      return res.status(400).json({ error: 'Item ID is required' });
    }

    const user = await User.findOne({ telegramId: parseInt(telegramId) });
    if (!user) {
      console.error('[PromoCode] User not found:', telegramId);
      return res.status(404).json({ error: 'User not found' });
    }

    const ShopItem = require('../models/ShopItem');
    const shopItem = await ShopItem.findById(itemId)
      .populate('promoCodeConfig.wheelConfigId');

    if (!shopItem) {
      console.error('[PromoCode] Shop item not found:', itemId);
      return res.status(404).json({ error: 'Shop item not found' });
    }

    console.log('[PromoCode] Shop item found:', { id: shopItem._id, type: shopItem.type, isActive: shopItem.isActive });

    if (shopItem.type !== 'promo-code') {
      return res.status(400).json({ error: 'This item is not a promo code' });
    }

    if (!shopItem.isActive) {
      return res.status(400).json({ error: 'This item is not available' });
    }

    // 재고 확인
    if (shopItem.stock > 0 && shopItem.soldCount >= shopItem.stock) {
      return res.status(400).json({ error: 'This item is out of stock' });
    }

    // 잔액 확인
    if (user.balance < shopItem.price) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // 자동 발급인 경우
    if (shopItem.promoCodeConfig?.autoIssue) {
      // 프로모션 코드 즉시 생성 및 발급
      const WheelConfig = require('../models/WheelConfig');
      let wheelConfig = null;
      if (shopItem.promoCodeConfig.wheelConfigId) {
        wheelConfig = shopItem.promoCodeConfig.wheelConfigId;
      } else {
        wheelConfig = await WheelConfig.getActive();
      }

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
        telegramId: parseInt(telegramId),
        userId: user._id,
        wheelConfigId: wheelConfig ? wheelConfig._id : null,
        isPurchasable: false,
        price: 0,
        purchasePrice: shopItem.price // 구매 가격 저장
      });
      await promoCode.save();

      // 잔액 차감 및 판매 수 증가
      user.balance -= shopItem.price;
      await user.save();
      shopItem.soldCount += 1;
      await shopItem.save();

      // 텔레그램 봇 알림 전송 (자동 발급)
      try {
        const { sendPromoCodePurchaseNotification } = require('../services/telegramBot');
        await sendPromoCodePurchaseNotification(
          parseInt(telegramId),
          user.username || user.firstName || 'Unknown',
          promoCode.code,
          shopItem.name,
          shopItem.price
        );
      } catch (notifError) {
        console.error('[PromoCode] Error sending purchase notification:', notifError);
        // 알림 실패해도 구매는 성공으로 처리
      }

      return res.json({
        success: true,
        message: 'Promo code purchased and issued successfully',
        promoCode: {
          id: promoCode._id,
          code: promoCode.code
        },
        balance: user.balance
      });
    }

    // 수동 승인 필요한 경우 - 요청 생성
    const PromoCodeRequest = require('../models/PromoCodeRequest');
    const existingRequest = await PromoCodeRequest.findOne({
      telegramId: parseInt(telegramId),
      type: 'shop-purchase',
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ error: 'You already have a pending purchase request' });
    }

    // 잔액 차감 (요청 생성 시점에 차감)
    user.balance -= shopItem.price;
    await user.save();

    const promoRequest = new PromoCodeRequest({
      type: 'shop-purchase',
      telegramId: parseInt(telegramId),
      userId: user._id,
      shopPurchasePrice: shopItem.price,
      shopItemId: shopItem._id,
      status: 'pending'
    });
    await promoRequest.save();

    // 텔레그램 봇 알림 전송 (수동 승인 대기)
    try {
      const { sendPromoCodeRequestNotification } = require('../services/telegramBot');
      await sendPromoCodeRequestNotification(
        parseInt(telegramId),
        user.username || user.firstName || 'Unknown',
        shopItem.name,
        shopItem.price,
        promoRequest._id.toString()
      );
    } catch (notifError) {
      console.error('[PromoCode] Error sending request notification:', notifError);
      // 알림 실패해도 요청 생성은 성공으로 처리
    }

    res.json({
      success: true,
      message: 'Purchase request submitted. Waiting for admin approval.',
      requestId: promoRequest._id,
      balance: user.balance
    });
  } catch (error) {
    console.error('Error purchasing promo code:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 프로모션 코드 검증
exports.verifyCode = async (req, res) => {
  try {
    const { code } = req.body;
    const { telegramId } = req.params;

    if (!code) {
      return res.status(400).json({ error: 'Promo code is required' });
    }

    const promoCode = await PromoCode.findOne({ 
      code: code.toUpperCase(),
      telegramId: parseInt(telegramId)
    }).populate('wheelConfigId');

    if (!promoCode) {
      return res.status(404).json({ 
        error: 'Invalid promo code',
        valid: false 
      });
    }

    if (promoCode.isUsed) {
      return res.status(400).json({ 
        error: 'Promo code already used',
        valid: false,
        used: true
      });
    }

    // 휠 설정 가져오기
    let wheelConfig = null;
    if (promoCode.wheelConfigId) {
      wheelConfig = {
        id: promoCode.wheelConfigId._id,
        name: promoCode.wheelConfigId.name,
        segments: promoCode.wheelConfigId.segments
      };
    } else {
      // 휠 설정이 없으면 기본 설정 사용
      const defaultConfig = await WheelConfig.getActive();
      if (defaultConfig) {
        wheelConfig = {
          id: defaultConfig._id,
          name: defaultConfig.name,
          segments: defaultConfig.segments
        };
      }
    }

    res.json({
      success: true,
      valid: true,
      promoCode: {
        id: promoCode._id,
        code: promoCode.code,
        targetScore: promoCode.targetScore,
        actualScore: promoCode.actualScore
      },
      wheelConfig
    });
  } catch (error) {
    console.error('Error verifying promo code:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 프로모션 코드 사용 (휠 당첨 점수 저장)
exports.useCode = async (req, res) => {
  try {
    const { code, wheelPrize } = req.body;
    const { telegramId } = req.params;

    if (!code || wheelPrize === undefined) {
      return res.status(400).json({ error: 'Promo code and wheel prize are required' });
    }

    const promoCode = await PromoCode.findOne({ 
      code: code.toUpperCase(),
      telegramId: parseInt(telegramId)
    });

    if (!promoCode) {
      return res.status(404).json({ error: 'Invalid promo code' });
    }

    if (promoCode.isUsed) {
      return res.status(400).json({ error: 'Promo code already used' });
    }

    // 프로모션 코드 사용 처리
    promoCode.isUsed = true;
    promoCode.usedAt = Date.now();
    promoCode.wheelPrize = parseInt(wheelPrize);
    await promoCode.save();

    // 사용자 잔액 업데이트 (선택사항 - 필요시)
    const user = await User.findOne({ telegramId: parseInt(telegramId) });
    if (user) {
      user.balance += parseInt(wheelPrize);
      await user.save();
    }

    res.json({
      success: true,
      message: 'Promo code used successfully',
      wheelPrize: promoCode.wheelPrize,
      cryptoPayment: {
        required: true,
        amount: promoCode.wheelPrize,
        message: 'Please process cryptocurrency payment outside the game'
      }
    });
  } catch (error) {
    console.error('Error using promo code:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 사용자의 프로모션 코드 목록 조회
exports.getUserCodes = async (req, res) => {
  try {
    const { telegramId } = req.params;

    const codes = await PromoCode.find({ telegramId: parseInt(telegramId) })
      .sort({ createdAt: -1 })
      .populate('weeklyGoalId', 'targetScore weekStartDate weekEndDate')
      .select('-__v');

    res.json({
      success: true,
      codes: codes.map(code => ({
        id: code._id,
        code: code.code,
        targetScore: code.targetScore,
        actualScore: code.actualScore,
        isUsed: code.isUsed,
        usedAt: code.usedAt,
        wheelPrize: code.wheelPrize,
        cryptoPaid: code.cryptoPaid,
        createdAt: code.createdAt,
        weeklyGoal: code.weeklyGoalId ? {
          targetScore: code.weeklyGoalId.targetScore,
          weekStartDate: code.weeklyGoalId.weekStartDate,
          weekEndDate: code.weeklyGoalId.weekEndDate
        } : null,
        wheelConfig: code.wheelConfigId ? {
          id: code.wheelConfigId._id,
          name: code.wheelConfigId.name,
          segments: code.wheelConfigId.segments
        } : null
      }))
    });
  } catch (error) {
    console.error('Error getting user promo codes:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 모든 프로모션 코드 조회 (관리자용)
exports.getAllCodes = async (req, res) => {
  try {
    const codes = await PromoCode.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'username telegramId')
      .populate('weeklyGoalId', 'targetScore weekStartDate weekEndDate')
      .select('-__v');

    res.json({
      success: true,
      codes
    });
  } catch (error) {
    console.error('Error getting all promo codes:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 암호화폐 지급 완료 처리 (관리자용)
exports.markCryptoPaid = async (req, res) => {
  try {
    const { id } = req.params;

    const promoCode = await PromoCode.findById(id);

    if (!promoCode) {
      return res.status(404).json({ error: 'Promo code not found' });
    }

    promoCode.cryptoPaid = true;
    promoCode.cryptoPaidAt = Date.now();
    await promoCode.save();

    res.json({
      success: true,
      message: 'Cryptocurrency payment marked as completed',
      promoCode: {
        id: promoCode._id,
        code: promoCode.code,
        wheelPrize: promoCode.wheelPrize,
        cryptoPaid: promoCode.cryptoPaid,
        cryptoPaidAt: promoCode.cryptoPaidAt
      }
    });
  } catch (error) {
    console.error('Error marking crypto as paid:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

