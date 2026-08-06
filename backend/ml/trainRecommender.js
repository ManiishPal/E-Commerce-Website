import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
import 'dotenv/config';
import connectDB from '../config/mongodb.js';
import productModel from '../models/productModel.js';
import productSimilarityModel from '../models/productSimilarityModel.js';

const inputPaths = [path.resolve('ml/data/interactions.json'), path.resolve('ml/data/syntheticInteractions.json')];
const weights = { view: 1, recommendation_click: 2, cart: 4, purchase: 8 };

try {
    const datasets = await Promise.all(inputPaths.map(async (inputPath) => {
        try {
            return JSON.parse(await fs.readFile(inputPath, 'utf8'));
        } catch (error) {
            if (error.code === 'ENOENT') return [];
            throw error;
        }
    }));
    const interactions = datasets.flat();
    const profiles = new Map();
    const now = Date.now();
    for (const event of interactions) {
        if (!event.actorId || !event.productId || !weights[event.eventType]) continue;
        const ageInDays = Math.max(0, now - new Date(event.timestamp).getTime()) / 86400000;
        const score = weights[event.eventType] * Math.exp(-ageInDays / 30);
        if (!profiles.has(event.actorId)) profiles.set(event.actorId, new Map());
        const profile = profiles.get(event.actorId);
        profile.set(event.productId, (profile.get(event.productId) || 0) + score);
    }

    const pairs = new Map();
    for (const profile of profiles.values()) {
        const products = [...profile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
        for (let left = 0; left < products.length; left += 1) {
            for (let right = left + 1; right < products.length; right += 1) {
                const weight = Math.min(products[left][1], products[right][1]);
                for (const [source, target] of [[products[left][0], products[right][0]], [products[right][0], products[left][0]]]) {
                    if (!pairs.has(source)) pairs.set(source, new Map());
                    const targets = pairs.get(source);
                    targets.set(target, (targets.get(target) || 0) + weight);
                }
            }
        }
    }

    await connectDB();
    const ids = [...pairs.keys()];
    const products = await productModel.find({ _id: { $in: ids } }).select('_id').lean();
    const validIds = new Set(products.map((product) => String(product._id)));
    const trainedAt = new Date();
    const operations = [];
    for (const [productId, candidates] of pairs) {
        if (!validIds.has(productId)) continue;
        const maxScore = Math.max(...candidates.values());
        const recommendations = [...candidates.entries()]
            .filter(([id]) => validIds.has(id))
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([id, score]) => ({ productId: id, score: Number((score / maxScore).toFixed(4)) }));
        if (recommendations.length) operations.push({ updateOne: { filter: { productId }, update: { $set: { recommendations, trainedAt, interactionCount: profiles.size } }, upsert: true } });
    }
    if (operations.length) await productSimilarityModel.bulkWrite(operations);
    console.log(`Trained ${operations.length} product profiles from ${profiles.size} actors.`);
} catch (error) {
    console.error('Recommendation training failed:', error);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}

