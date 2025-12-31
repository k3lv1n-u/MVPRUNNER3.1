require('dotenv').config();
const mongoose = require('mongoose');
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

const addMoneyBoostItem = async () => {
  try {
    await connectDB();

    console.log('Adding money-boost item to database...');

    // 기존 아이템 확인
    let moneyBoostItem = await ShopItem.findOne({ itemKey: 'money-boost' });
    
    if (!moneyBoostItem) {
      // 새로 생성
      moneyBoostItem = new ShopItem({
        itemKey: 'money-boost',
        name: 'Усилитель монет',
        type: 'item',
        description: 'Увеличивает количество собираемых монет в 10 раз',
        price: 2000,
        stock: 0,
        isActive: true,
        itemConfig: {
          effectType: 'coin-multiplier',
          duration: 20000,
          multiplier: 10
        }
      });
      await moneyBoostItem.save();
      console.log('✓ Money Boost item created successfully');
    } else {
      // 업데이트
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
      console.log('✓ Money Boost item updated successfully');
    }

    console.log('Money Boost item:', JSON.stringify(moneyBoostItem, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error adding money boost item:', error);
    process.exit(1);
  }
};

// 실행
if (require.main === module) {
  addMoneyBoostItem();
}

module.exports = { addMoneyBoostItem };

