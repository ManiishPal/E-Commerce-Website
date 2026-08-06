import mongoose from 'mongoose';

const productSimilaritySchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'product', required: true, unique: true },
    recommendations: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'product', required: true },
        score: { type: Number, required: true },
    }],
    trainedAt: { type: Date, required: true },
    interactionCount: { type: Number, required: true, default: 0 },
});

const productSimilarityModel = mongoose.models.productSimilarity || mongoose.model('productSimilarity', productSimilaritySchema);
export default productSimilarityModel;
