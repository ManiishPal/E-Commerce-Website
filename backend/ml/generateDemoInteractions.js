import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
import 'dotenv/config';
import connectDB from '../config/mongodb.js';
import productModel from '../models/productModel.js';

const outputPath = path.resolve('ml/data/syntheticInteractions.json');
const ACTOR_COUNT = 400;
const randomItem = (items) => items[Math.floor(Math.random() * items.length)];
const randomSample = (items, count) => [...items].sort(() => Math.random() - 0.5).slice(0, count);

try {
    await connectDB();
    const products = await productModel.find({}).select('_id category subCategory name').lean();
    if (products.length < 2) throw new Error('At least two products are required to generate interactions.');

    const groups = new Map();
    for (const product of products) {
        const key = `${product.category}:${product.subCategory}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(product);
    }
    const eligibleGroups = [...groups.values()].filter((group) => group.length >= 2);
    const dataset = [];

    for (let actorNumber = 1; actorNumber <= ACTOR_COUNT; actorNumber += 1) {
        const preferredProducts = randomItem(eligibleGroups.length ? eligibleGroups : [products]);
        const viewedProducts = randomSample(preferredProducts, Math.min(preferredProducts.length, 4 + Math.floor(Math.random() * 4)));
        const startTime = Date.now() - (1 + Math.floor(Math.random() * 60)) * 86400000;
        const actorId = `demo-user:${actorNumber}`;
        const searchProduct = viewedProducts[0];
        dataset.push({
            actorId,
            productId: null,
            eventType: 'search',
            query: `${searchProduct.category} ${searchProduct.subCategory}`,
            timestamp: new Date(startTime).toISOString(),
            source: 'synthetic',
        });

        viewedProducts.forEach((product, index) => {
            const timestamp = new Date(startTime + (index + 1) * 180000).toISOString();
            dataset.push({ actorId, productId: String(product._id), eventType: 'view', query: null, timestamp, source: 'synthetic' });
            if (Math.random() < 0.55) dataset.push({ actorId, productId: String(product._id), eventType: 'cart', query: null, timestamp, source: 'synthetic' });
        });

        const purchasedProduct = randomItem(viewedProducts);
        if (Math.random() < 0.3) dataset.push({ actorId, productId: String(purchasedProduct._id), eventType: 'purchase', query: null, timestamp: new Date(startTime + 1800000).toISOString(), source: 'synthetic' });
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(dataset, null, 2));
    console.log(`Generated ${dataset.length} synthetic interactions for ${ACTOR_COUNT} demo users.`);
} catch (error) {
    console.error('Synthetic interaction generation failed:', error);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
