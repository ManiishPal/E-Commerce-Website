import express from 'express';
import { getRecommendations, recordInteraction } from '../controllers/interactionController.js';
import optionalAuth from '../middleware/optionalAuth.js';

const interactionRouter = express.Router();

interactionRouter.post('/', optionalAuth, recordInteraction);
interactionRouter.get('/recommendations', optionalAuth, getRecommendations);

export default interactionRouter;
