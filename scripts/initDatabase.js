require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const GameRecord = require('../models/GameRecord');
const WeeklyGoal = require('../models/WeeklyGoal');
const PromoCode = require('../models/PromoCode');
const WheelConfig = require('../models/WheelConfig');
const ShopItem = require('../models/ShopItem');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mvp-runner', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected');
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const initDatabase = async () => {
  try {
    await connectDB();

    console.log('Initializing database...');

    // 기본 휠 설정 생성
    const existingDefaultWheel = await WheelConfig.findOne({ isDefault: true });
    if (!existingDefaultWheel) {
      const defaultWheel = new WheelConfig({
        name: 'default',
        isDefault: true,
        isActive: true,
        description: 'Default wheel configuration',
        segments: [
          { value: 100, label: '100 USDT', color: '#1a1a1a', gradient: ['#0f0f0f', '#222222'] },
          { value: 250, label: '250 USDT', color: '#1f1f1f', gradient: ['#141414', '#2a2a2a'] },
          { value: 500, label: '500 USDT', color: '#242424', gradient: ['#191919', '#2f2f2f'] },
          { value: 1000, label: '1000 USDT', color: '#292929', gradient: ['#1e1e1e', '#343434'] },
          { value: 1000, label: '1000 USDT', color: '#2e2e2e', gradient: ['#232323', '#393939'] },
          { value: 100, label: '100 USDT', color: '#1a1a1a', gradient: ['#0f0f0f', '#222222'] },
          { value: 100, label: '100 USDT', color: '#1f1f1f', gradient: ['#141414', '#2a2a2a'] },
          { value: 25, label: '25 USDT', color: '#1a1a1a', gradient: ['#0f0f0f', '#222222'] }
        ]
      });
      await defaultWheel.save();
      console.log('✓ Default wheel config created');
    } else {
      console.log('✓ Default wheel config already exists');
    }

    // 기본 상점 아이템 생성
    const promoCodeItem = await ShopItem.findOne({ itemKey: 'promo-code' });
    if (!promoCodeItem) {
      const newPromoCodeItem = new ShopItem({
        itemKey: 'promo-code',
        name: 'Промокод для рулетки',
        type: 'promo-code',
        description: 'Промокод для игры в рулетку',
        price: 1000,
        stock: 0, // 무제한
        isActive: true,
        promoCodeConfig: {
          autoIssue: false // 관리자 승인 필요
        }
      });
      await newPromoCodeItem.save();
      console.log('✓ Promo code shop item created');
    } else {
      console.log('✓ Promo code shop item already exists');
    }

    const slowShoesItem = await ShopItem.findOne({ itemKey: 'slow-shoes' });
    if (!slowShoesItem) {
      const newSlowShoesItem = new ShopItem({
        itemKey: 'slow-shoes',
        name: 'Замедляющие ботинки',
        type: 'item',
        description: 'Замедляет скорость игры',
        price: 500,
        stock: 0, // 무제한
        isActive: true,
        itemConfig: {
          effect: 'slow-speed'
        }
      });
      await newSlowShoesItem.save();
      console.log('✓ Slow shoes shop item created');
    } else {
      console.log('✓ Slow shoes shop item already exists');
    }

    const magicSyringeItem = await ShopItem.findOne({ itemKey: 'magic_syringe' });
    if (!magicSyringeItem) {
      const newMagicSyringeItem = new ShopItem({
        itemKey: 'magic_syringe',
        name: 'Волшебный шприц',
        type: 'item',
        description: 'Увеличивает скорость и дает неуязвимость',
        price: 1000,
        stock: 0, // 무제한
        isActive: true,
        itemConfig: {
          effectType: 'magic-syringe',
          duration: 6000,
          speedMultiplier: 1.5
        }
      });
      await newMagicSyringeItem.save();
      console.log('✓ Magic Syringe shop item created');
    } else {
      console.log('✓ Magic Syringe shop item already exists');
      // Update existing item to ensure it has correct config
      magicSyringeItem.name = 'Волшебный шприц';
      magicSyringeItem.description = 'Увеличивает скорость и дает неуязвимость';
      magicSyringeItem.price = 1000;
      magicSyringeItem.isActive = true;
      magicSyringeItem.itemConfig = {
        effectType: 'magic-syringe',
        duration: 6000,
        speedMultiplier: 1.5
      };
      await magicSyringeItem.save();
      console.log('✓ Magic Syringe shop item updated');
    }

    // 코인 부스트 아이템 생성
    const moneyBoostItem = await ShopItem.findOne({ itemKey: 'money-boost' });
    if (!moneyBoostItem) {
      const newMoneyBoostItem = new ShopItem({
        itemKey: 'money-boost',
        name: 'Усилитель монет',
        type: 'item',
        description: 'Увеличивает количество собираемых монет в 10 раз',
        price: 2000,
        stock: 0, // 무제한
        isActive: true,
        itemConfig: {
          effectType: 'coin-multiplier',
          duration: 20000,
          multiplier: 10
        }
      });
      await newMoneyBoostItem.save();
      console.log('✓ Money Boost shop item created');
    } else {
      console.log('✓ Money Boost shop item already exists');
      // Update existing item to ensure it has correct config
      moneyBoostItem.name = 'Усилитель монет';
      moneyBoostItem.description = 'Увеличивает количество собираемых монет в 10 раз';
      moneyBoostItem.price = 2000;
      moneyBoostItem.isActive = true;
      moneyBoostItem.itemConfig = {
        effectType: 'coin-multiplier',
        duration: 20000,
        multiplier: 10
      };
      await moneyBoostItem.save();
      console.log('✓ Money Boost shop item updated');
    }

    console.log('Database initialization completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

// 실행
if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };

