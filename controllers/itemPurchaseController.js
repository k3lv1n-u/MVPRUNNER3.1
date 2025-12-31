const User = require('../models/User');
const ShopItem = require('../models/ShopItem');

// 아이템 구매
exports.purchaseItem = async (req, res) => {
    try {
        const { itemId, quantity = 1 } = req.body;
        const { telegramId } = req.params;

        console.log('[ItemPurchase] Purchase request:', { itemId, telegramId, quantity });

        if (!itemId) {
            return res.status(400).json({ error: 'Item ID is required' });
        }

        if (quantity < 1 || !Number.isInteger(quantity)) {
            return res.status(400).json({ error: 'Invalid quantity' });
        }

        const user = await User.findOne({ telegramId: parseInt(telegramId) });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const shopItem = await ShopItem.findById(itemId);
        if (!shopItem) {
            return res.status(404).json({ error: 'Shop item not found' });
        }

        if (shopItem.type !== 'item') {
            return res.status(400).json({ error: 'This is not a purchasable item' });
        }

        if (!shopItem.isActive) {
            return res.status(400).json({ error: 'This item is not available' });
        }

        // 재고 확인 (quantity 고려)
        if (shopItem.stock > 0 && (shopItem.soldCount + quantity) > shopItem.stock) {
            return res.status(400).json({ error: 'Insufficient stock for the requested quantity' });
        }

        // 총 가격 계산
        const totalPrice = shopItem.price * quantity;

        // 잔액 확인
        if (user.balance < totalPrice) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // 잔액 차감
        user.balance -= totalPrice;

        // 인벤토리에 아이템 추가
        console.log('[ItemPurchase] Shop item details:', {
            id: shopItem._id,
            itemKey: shopItem.itemKey,
            name: shopItem.name,
            type: shopItem.type
        });

        if (!shopItem.itemKey) {
            console.error('[ItemPurchase] ERROR: Shop item has no itemKey!');
            return res.status(400).json({
                error: 'Shop item configuration error: missing itemKey',
                details: 'Please contact administrator to fix this item in database'
            });
        }

        const existingItem = user.inventory.find(item => item.itemKey === shopItem.itemKey);
        if (existingItem) {
            existingItem.quantity += quantity;
            existingItem.purchasedAt = Date.now();
            console.log('[ItemPurchase] Updated existing item:', existingItem);
        } else {
            const newItem = {
                itemKey: shopItem.itemKey,
                quantity: quantity,
                purchasedAt: Date.now()
            };
            user.inventory.push(newItem);
            console.log('[ItemPurchase] Added new item to inventory:', newItem);
        }

        await user.save();

        // 판매 수 증가 (quantity만큼)
        shopItem.soldCount += quantity;
        await shopItem.save();

        console.log('[ItemPurchase] Item purchased successfully:', {
            itemKey: shopItem.itemKey,
            quantity: quantity,
            totalPrice: totalPrice,
            newBalance: user.balance,
            inventorySize: user.inventory.length
        });

        res.json({
            success: true,
            message: `Item purchased successfully (x${quantity})`,
            balance: user.balance,
            inventory: user.inventory,
            purchasedQuantity: quantity
        });
    } catch (error) {
        console.error('Error purchasing item:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// 사용자 인벤토리 조회
exports.getUserInventory = async (req, res) => {
    try {
        const { telegramId } = req.params;

        const user = await User.findOne({ telegramId: parseInt(telegramId) })
            .select('inventory');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            inventory: user.inventory || []
        });
    } catch (error) {
        console.error('Error getting user inventory:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// 아이템 사용
exports.useItem = async (req, res) => {
    try {
        const { itemKey } = req.body;
        const { telegramId } = req.params;

        if (!itemKey) {
            return res.status(400).json({ error: 'Item key is required' });
        }

        const user = await User.findOne({ telegramId: parseInt(telegramId) });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const inventoryItem = user.inventory.find(item => item.itemKey === itemKey);
        if (!inventoryItem || inventoryItem.quantity <= 0) {
            return res.status(400).json({ error: 'Item not found in inventory' });
        }

        // ShopItem이 존재하는지만 확인 (가격 변경이나 isActive 상태와 무관)
        // 이미 구매한 아이템은 가격이 변경되거나 비활성화되어도 사용 가능해야 함
        const shopItem = await ShopItem.findOne({ itemKey: itemKey, type: 'item' });
        if (!shopItem) {
            console.log('[ItemUse] Shop item not found for itemKey:', itemKey);
            // 아이템이 상점에서 완전히 삭제된 경우에만 인벤토리에서 제거하고 에러 반환
            // 가격 변경이나 비활성화는 이미 구매한 아이템 사용에 영향을 주지 않음
            user.inventory = user.inventory.filter(item => item.itemKey !== itemKey);
            await user.save();
            return res.status(400).json({ 
                error: 'This item is no longer available',
                message: 'The item has been removed from the shop. It has been removed from your inventory.'
            });
        }

        // isActive 체크 제거: 이미 구매한 아이템은 가격 변경이나 비활성화와 관계없이 사용 가능

        // 수량 감소
        inventoryItem.quantity -= 1;

        // 수량이 0이 되면 인벤토리에서 제거
        if (inventoryItem.quantity === 0) {
            user.inventory = user.inventory.filter(item => item.itemKey !== itemKey);
        }

        await user.save();

        console.log('[ItemUse] Item used successfully:', { 
            itemKey, 
            remainingQuantity: inventoryItem.quantity,
            shopItemName: shopItem.name
        });

        res.json({
            success: true,
            message: 'Item used successfully',
            inventory: user.inventory
        });
    } catch (error) {
        console.error('Error using item:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
