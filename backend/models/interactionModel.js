import mongoose from 'mongoose';

const interactionSchema = new mongoose.Schema(
    {
        userId: { type: String, index: true },
        sessionId: { type: String, index: true },
        type: { type: String, required: true, enum: ['view', 'search', 'cart', 'purchase', 'recommendation_click', 'recommendation_impression'], index: true },
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'product' },
        sourceProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'product' },
        recommendedProductIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'product' }],
        query: { type: String, trim: true, maxlength: 120 },
    },
    { timestamps: true }
);

interactionSchema.index({ userId: 1, createdAt: -1 });
interactionSchema.index({ sessionId: 1, createdAt: -1 });
interactionSchema.index({ productId: 1, type: 1, createdAt: -1 });

const interactionModel = mongoose.models.interaction || mongoose.model('interaction', interactionSchema);

export default interactionModel;
