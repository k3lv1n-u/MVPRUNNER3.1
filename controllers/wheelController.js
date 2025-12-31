const PromoCode = require('../models/PromoCode');
const WheelConfig = require('../models/WheelConfig');
const User = require('../models/User');
const { sendUSDTWinNotification, sendCoinsWinNotification } = require('../services/telegramBot');

// 행운의 휠 스핀 (서버에서 결과 계산)
exports.spinWheel = async (req, res) => {
  try {
    const { telegramId, promoCode } = req.body;

    if (!telegramId || !promoCode) {
      return res.status(400).json({ error: 'Telegram ID and promo code are required' });
    }

    // 프로모션 코드 확인
    const code = await PromoCode.findOne({
      code: promoCode.toUpperCase(),
      telegramId: parseInt(telegramId),
      isUsed: false
    }).populate('wheelConfigId');

    if (!code) {
      return res.status(404).json({ error: 'Invalid or already used promo code' });
    }

    // 휠 설정 가져오기
    let wheelConfig = null;
    if (code.wheelConfigId) {
      wheelConfig = code.wheelConfigId;
    } else {
      wheelConfig = await WheelConfig.getActive();
    }

    if (!wheelConfig || !wheelConfig.segments || wheelConfig.segments.length === 0) {
      return res.status(500).json({ error: 'Wheel configuration not found' });
    }

    // 서버에서 랜덤 결과 계산
    const segments = wheelConfig.segments;
    const randomIndex = Math.floor(Math.random() * segments.length);
    const selectedSegment = segments[randomIndex];

    // 프로모션 코드 사용 처리
    code.isUsed = true;
    code.usedAt = Date.now();
    code.wheelPrize = selectedSegment.value; // 당첨된 USDT 금액 저장
    await code.save();

    // 사용자의 총 암호화폐(USDT) 획득량 업데이트
    // 주의: 휠에서 당첨된 값은 실제 암호화폐 USDT이며, 게임코인(balance)과는 별개입니다.
    // 게임코인(balance)은 게임에서 버운티를 수집할 때만 증가합니다.
    const user = await User.findOne({ telegramId: parseInt(telegramId) });
    if (user) {
      // totalCryptoEarned: 실제 암호화폐 USDT (관리자가 지급)
      user.totalCryptoEarned = (user.totalCryptoEarned || 0) + selectedSegment.value;
      // balance는 업데이트하지 않음 (게임코인은 버운티 수집으로만 증가)
      await user.save();
      
      console.log(`[Wheel] USDT earned updated: user=${telegramId}, amount=${selectedSegment.value}, totalCryptoEarned=${user.totalCryptoEarned}`);

      // USDT 승리 알림 발송
      // 휠은 항상 USDT이므로 value > 0이면 항상 USDT로 처리
      const isUSDT = selectedSegment.value > 0;
      
      console.log(`[Wheel] Segment check: value=${selectedSegment.value}, label="${selectedSegment.label}", isUSDT=${isUSDT}`);
      console.log(`[Wheel] Promo code info: weeklyGoalId=${code.weeklyGoalId}, purchasePrice=${code.purchasePrice}`);
      
      if (isUSDT) {
        // 주간 목표 달성으로 받은 프로모션 코드인지, 게임 코인으로 구매한 것인지 구분
        const isWeeklyGoal = code.weeklyGoalId !== null && code.weeklyGoalId !== undefined;
        const isPurchased = code.purchasePrice > 0;
        
        if (isPurchased && !isWeeklyGoal) {
          // 게임 코인으로 구매한 프로모션 코드
          console.log(`[Wheel] Purchased promo code win detected: user=${telegramId}, amount=${selectedSegment.value}, purchasePrice=${code.purchasePrice}`);
          
          const { sendPurchasedPromoCodeWinNotification } = require('../services/telegramBot');
          sendPurchasedPromoCodeWinNotification(
            parseInt(telegramId),
            user.username || 'Unknown',
            selectedSegment.value,
            code.purchasePrice
          ).then(() => {
            console.log(`[Wheel] sendPurchasedPromoCodeWinNotification completed successfully`);
          }).catch(err => {
            console.error('[Wheel] Error sending purchased promo code win notification:', err);
            console.error('[Wheel] Error stack:', err.stack);
          });
        } else {
          // 주간 목표 달성으로 받은 프로모션 코드
          const WeeklyGoal = require('../models/WeeklyGoal');
          const currentGoal = await WeeklyGoal.getCurrentGoal();
          const pointsRequired = currentGoal ? currentGoal.targetScore : 0;
          
          console.log(`[Wheel] Weekly goal promo code win detected: user=${telegramId}, amount=${selectedSegment.value}, label=${selectedSegment.label}`);
          console.log(`[Wheel] Calling sendUSDTWinNotification with: telegramId=${parseInt(telegramId)}, username=${user.username || 'Unknown'}, amount=${selectedSegment.value}, pointsRequired=${pointsRequired}`);
          
          // 비동기로 알림 발송 (응답 지연 방지)
          sendUSDTWinNotification(
            parseInt(telegramId),
            user.username || 'Unknown',
            selectedSegment.value,
            pointsRequired
          ).then(() => {
            console.log(`[Wheel] sendUSDTWinNotification completed successfully`);
          }).catch(err => {
            console.error('[Wheel] Error sending USDT win notification:', err);
            console.error('[Wheel] Error stack:', err.stack);
          });
        }
      } else if (selectedSegment.value > 0) {
        // COINS 승리 알림 (개인 메시지만)
        console.log(`[Wheel] COINS win detected: user=${telegramId}, amount=${selectedSegment.value}, label=${selectedSegment.label}`);
        sendCoinsWinNotification(
          parseInt(telegramId),
          user.username || 'Unknown',
          selectedSegment.value
        ).catch(err => console.error('Error sending COINS win notification:', err));
      } else {
        console.log(`[Wheel] No notification: user=${telegramId}, value=${selectedSegment.value}, label=${selectedSegment.label}`);
      }
    }

    // 회전 각도 계산 (클라이언트에서 사용)
    // 포인터는 위쪽(0도)에 있고, 시계 방향으로 회전
    // SVG에서 세그먼트는 -90도부터 시작 (위쪽이 0도)
    // 선택된 세그먼트의 중앙이 포인터 아래(0도)에 오도록 계산
    const segmentAngle = 360 / segments.length;
    const baseRotation = 360 * 5; // 5바퀴
    // 세그먼트는 0번 인덱스가 위쪽(-90도에서 시작)에서 시작
    // 선택된 인덱스의 세그먼트 중앙 각도 (0도 기준, 위쪽이 0도)
    // SVG에서는 -90도 오프셋이 있지만, 회전 계산은 0도 기준으로 함
    const targetSegmentCenterAngle = randomIndex * segmentAngle + (segmentAngle / 2);
    // 포인터는 0도(위쪽)에 있으므로, 세그먼트 중앙이 포인터 아래에 오려면
    // 360 - targetSegmentCenterAngle 만큼 회전해야 함
    const finalRotation = baseRotation + (360 - targetSegmentCenterAngle);

    res.json({
      success: true,
      prize: {
        value: selectedSegment.value,
        label: selectedSegment.label,
        index: randomIndex
      },
      rotation: finalRotation,
      segments: segments,
      cryptoPayment: {
        required: true,
        amount: selectedSegment.value,
        message: 'Please process cryptocurrency payment outside the game'
      }
    });
  } catch (error) {
    console.error('Error spinning wheel:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

