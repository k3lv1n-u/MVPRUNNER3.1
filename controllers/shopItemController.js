const ShopItem = require('../models/ShopItem');
const WheelConfig = require('../models/WheelConfig');

// 모든 상점 아이템 조회
exports.getAllItems = async (req, res) => {
  try {
    const { type, isActive } = req.query;

    const query = {};
    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const items = await ShopItem.find(query)
      .populate('promoCodeConfig.wheelConfigId', 'name segments')
      .sort({ createdAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      items
    });
  } catch (error) {
    console.error('Error getting shop items:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 활성화된 상점 아이템 조회 (게임용)
exports.getActiveItems = async (req, res) => {
  try {
    const items = await ShopItem.find({
      isActive: true
    })
      .populate('promoCodeConfig.wheelConfigId', 'name segments')
      .sort({ price: 1 })
      .select('-__v');

    res.json({
      success: true,
      items: items.map(item => ({
        id: item._id,
        name: item.name,
        type: item.type,
        description: item.description,
        price: item.price,
        stock: item.stock,
        soldCount: item.soldCount,
        available: item.stock === 0 ? -1 : item.stock - item.soldCount,
        promoCodeConfig: item.promoCodeConfig
      }))
    });
  } catch (error) {
    console.error('Error getting active shop items:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 상점 아이템 생성
exports.createItem = async (req, res) => {
  try {
    const { itemKey, name, type, description, price, stock, promoCodeConfig, itemConfig, isActive } = req.body;

    if (!name || !type || price === undefined) {
      return res.status(400).json({ error: 'Name, type, and price are required' });
    }

    if (price < 0) {
      return res.status(400).json({ error: 'Price must be non-negative' });
    }

    // itemKey 중복 확인
    if (itemKey) {
      const existingItem = await ShopItem.findOne({ itemKey });
      if (existingItem) {
        return res.status(400).json({ error: 'Item key already exists' });
      }
    }

    if (type === 'promo-code' && promoCodeConfig) {
      if (promoCodeConfig.wheelConfigId) {
        const wheelConfig = await WheelConfig.findById(promoCodeConfig.wheelConfigId);
        if (!wheelConfig) {
          return res.status(404).json({ error: 'Wheel config not found' });
        }
      }
    }

    const item = new ShopItem({
      itemKey,
      name,
      type,
      description: description || '',
      price,
      stock: stock || 0,
      isActive: isActive !== undefined ? isActive : true,
      promoCodeConfig: promoCodeConfig || {},
      itemConfig: itemConfig || {}
    });

    await item.save();

    const populatedItem = await ShopItem.findById(item._id)
      .populate('promoCodeConfig.wheelConfigId', 'name segments');

    res.json({
      success: true,
      item: populatedItem
    });
  } catch (error) {
    console.error('Error creating shop item:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 상점 아이템 업데이트
exports.updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { itemKey, name, description, price, stock, promoCodeConfig, itemConfig, isActive } = req.body;

    const item = await ShopItem.findById(id);

    if (!item) {
      return res.status(404).json({ error: 'Shop item not found' });
    }

    if (itemKey && itemKey !== item.itemKey) {
      const existingItem = await ShopItem.findOne({ itemKey });
      if (existingItem) {
        return res.status(400).json({ error: 'Item key already exists' });
      }
      item.itemKey = itemKey;
    }

    if (name) item.name = name;
    if (description !== undefined) item.description = description;
    if (price !== undefined) {
      if (price < 0) {
        return res.status(400).json({ error: 'Price must be non-negative' });
      }
      item.price = price;
    }
    if (stock !== undefined) item.stock = stock;
    if (isActive !== undefined) item.isActive = isActive;
    if (promoCodeConfig) {
      if (promoCodeConfig.wheelConfigId) {
        const wheelConfig = await WheelConfig.findById(promoCodeConfig.wheelConfigId);
        if (!wheelConfig) {
          return res.status(404).json({ error: 'Wheel config not found' });
        }
      }
      item.promoCodeConfig = { ...item.promoCodeConfig, ...promoCodeConfig };
    }
    if (itemConfig) item.itemConfig = itemConfig;

    await item.save();

    const populatedItem = await ShopItem.findById(item._id)
      .populate('promoCodeConfig.wheelConfigId', 'name segments');

    res.json({
      success: true,
      item: populatedItem
    });
  } catch (error) {
    console.error('Error updating shop item:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 상점 아이템 삭제
exports.deleteItem = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await ShopItem.findByIdAndDelete(id);

    if (!item) {
      return res.status(404).json({ error: 'Shop item not found' });
    }

    res.json({
      success: true,
      message: 'Shop item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting shop item:', error);
    res.status(500).json({ error: 'Server error' });
  }
};





