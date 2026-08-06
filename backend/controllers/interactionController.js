import mongoose from 'mongoose';
import interactionModel from '../models/interactionModel.js';
import productModel from '../models/productModel.js';
import productSimilarityModel from '../models/productSimilarityModel.js';

const PRODUCT_EVENT_TYPES = new Set(['view', 'cart', 'purchase', 'recommendation_click']);
const RECOMMENDATION_EVENT_TYPES = new Set(['recommendation_click', 'recommendation_impression']);
const MAX_SESSION_ID_LENGTH = 128;

const getSessionId = (req) => {
    const value = req.headers['x-session-id'];
    return typeof value === 'string' ? value.trim().slice(0, MAX_SESSION_ID_LENGTH) : '';
};

const getLimit = (value) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 10) : 5;
};

const queryTokens = (query = '') => [...new Set(query.toLowerCase().match(/[a-z0-9]{2,}/g) || [])].slice(0, 12);

const recordInteraction = async (req, res) => {
    try {
        const { type, productId, sourceProductId, recommendedProductIds } = req.body;
        const sessionId = getSessionId(req);
        const query = typeof req.body.query === 'string' ? req.body.query.trim().slice(0, 120) : '';

        if (!req.userId && !sessionId) return res.status(400).json({ success: false, message: 'A session is required' });
        if (!['view', 'search', 'cart', 'purchase', 'recommendation_click', 'recommendation_impression'].includes(type)) return res.status(400).json({ success: false, message: 'Invalid interaction type' });
        if (PRODUCT_EVENT_TYPES.has(type) && !mongoose.isValidObjectId(productId)) return res.status(400).json({ success: false, message: 'A valid product is required' });
        if (RECOMMENDATION_EVENT_TYPES.has(type) && !mongoose.isValidObjectId(sourceProductId)) return res.status(400).json({ success: false, message: 'A valid recommendation source is required' });
        if (type === 'recommendation_impression' && (!Array.isArray(recommendedProductIds) || recommendedProductIds.length < 1 || recommendedProductIds.length > 10 || recommendedProductIds.some((id) => !mongoose.isValidObjectId(id)))) return res.status(400).json({ success: false, message: 'Valid recommended products are required' });
        if (type === 'search' && query.length < 2) return res.status(400).json({ success: false, message: 'Search query must contain at least two characters' });

        await interactionModel.create({
            userId: req.userId,
            sessionId: sessionId || undefined,
            type,
            productId: PRODUCT_EVENT_TYPES.has(type) ? productId : undefined,
            sourceProductId: RECOMMENDATION_EVENT_TYPES.has(type) ? sourceProductId : undefined,
            recommendedProductIds: type === 'recommendation_impression' ? recommendedProductIds : undefined,
            query: type === 'search' ? query : undefined,
        });

        res.status(201).json({ success: true });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getRecommendations = async (req, res) => {
    try {
        const sessionId = getSessionId(req);
        const limit = getLimit(req.query.limit);
        const excludeProductId = mongoose.isValidObjectId(req.query.excludeProductId) ? String(req.query.excludeProductId) : null;
        const identities = [];
        if (req.userId) identities.push({ userId: req.userId });
        if (sessionId) identities.push({ sessionId });

        const interactions = identities.length
            ? await interactionModel.find({ $or: identities }).sort({ createdAt: -1 }).limit(60).lean()
            : [];
        const productIds = [...new Set(interactions.filter((item) => item.productId).map((item) => String(item.productId)))];
        const interactedProducts = productIds.length ? await productModel.find({ _id: { $in: productIds } }).lean() : [];
        const productsById = new Map(interactedProducts.map((product) => [String(product._id), product]));
        const modelSources = interactions.filter((item) => item.productId).map((item) => item.productId);
        const similarityProfiles = modelSources.length ? await productSimilarityModel.find({ productId: { $in: modelSources } }).lean() : [];
        const modelScores = new Map();
        for (const profile of similarityProfiles) {
            for (const recommendation of profile.recommendations) {
                const id = String(recommendation.productId);
                modelScores.set(id, (modelScores.get(id) || 0) + recommendation.score);
            }
        }
        const categoryWeights = new Map();
        const subCategoryWeights = new Map();
        const searchTerms = new Map();
        const recentViewedIds = new Set();
        const now = Date.now();

        for (const interaction of interactions) {
            const ageInDays = Math.max(0, now - new Date(interaction.createdAt).getTime()) / 86400000;
            const recency = Math.exp(-ageInDays / 14);
            const eventWeight = interaction.type === 'purchase' ? 5 : interaction.type === 'cart' ? 3 : ['view', 'recommendation_click'].includes(interaction.type) ? 2 : 1;
            const weight = recency * eventWeight;

            if (interaction.type === 'search') {
                for (const token of queryTokens(interaction.query)) searchTerms.set(token, (searchTerms.get(token) || 0) + weight);
            }

            const product = productsById.get(String(interaction.productId));
            if (!product) continue;
            categoryWeights.set(product.category, (categoryWeights.get(product.category) || 0) + weight);
            subCategoryWeights.set(product.subCategory, (subCategoryWeights.get(product.subCategory) || 0) + weight);
            if (interaction.type === 'view') recentViewedIds.add(String(product._id));
        }

        const catalog = await productModel.find({}).lean();
        const availableProducts = catalog.filter((product) => String(product._id) !== excludeProductId);
        const unseenProducts = availableProducts.filter((product) => !recentViewedIds.has(String(product._id)));
        const candidates = unseenProducts.length >= limit ? unseenProducts : availableProducts;
        const ranked = candidates.map((product) => {
            let score = product.bestseller ? 1 : 0;
            score += (modelScores.get(String(product._id)) || 0) * 3;
            score += categoryWeights.get(product.category) || 0;
            score += (subCategoryWeights.get(product.subCategory) || 0) * 1.5;
            const searchableText = (product.name + ' ' + product.description).toLowerCase();
            for (const [term, weight] of searchTerms) if (searchableText.includes(term)) score += weight * 2;
            score += Math.min(1, Math.max(0, (product.date - (now - 90 * 86400000)) / (90 * 86400000)));
            return { product, score };
        }).sort((a, b) => b.score - a.score || b.product.date - a.product.date).slice(0, limit).map(({ product }) => product);

        res.json({ success: true, products: ranked });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export { recordInteraction, getRecommendations };

