import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
import 'dotenv/config';
import connectDB from '../config/mongodb.js';
import interactionModel from '../models/interactionModel.js';

const outputPath = path.resolve('ml/data/interactions.json');
try {
    await connectDB();
    const interactions = await interactionModel.find({}).sort({ createdAt: 1 }).lean();
    const dataset = interactions.map((item) => ({
        actorId: item.userId ? `user:${item.userId}` : `session:${item.sessionId}`,
        productId: item.productId ? String(item.productId) : null,
        sourceProductId: item.sourceProductId ? String(item.sourceProductId) : null,
        eventType: item.type,
        query: item.query || null,
        timestamp: item.createdAt.toISOString(),
    }));
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(dataset, null, 2));
    console.log(`Exported ${dataset.length} interactions to ${outputPath}`);
} catch (error) {
    console.error('Interaction export failed:', error);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
