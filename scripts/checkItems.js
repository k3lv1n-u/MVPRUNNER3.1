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

const checkItems = async () => {
    try {
        await connectDB();

        console.log('Checking Shop Items...');
        const items = await ShopItem.find({});
        console.log(`Found ${items.length} items:`);
        items.forEach(item => {
            console.log(`- [${item.itemKey}] ${item.name} (Type: ${item.type}, Active: ${item.isActive})`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error checking items:', error);
        process.exit(1);
    }
};

checkItems();
