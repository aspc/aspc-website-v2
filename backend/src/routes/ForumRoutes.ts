import express, { Request, Response } from 'express';
import { ForumEvent, EventComment } from '../models/Forum';
import { isAuthenticated } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * @route   GET /api/openforum
 * @desc    Get all open forum events with average ratings
 * @access  Public
 */
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const events = await ForumEvent.find({});
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   GET /api/openforum/:id
 * @desc    Get event details with ratings
 * @access  Public
 */
router.get('/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const eventData = await ForumEvent.findOne({
            _id: id,
        });
        if (!eventData) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }

        res.json(eventData);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   POST /api/openforum/:id/rate
 * @desc    Add new open forum event rating
 * @access  Public
 */
router.post(
    '/:id/rate',
    isAuthenticated,
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const event = await ForumEvent.findById(id);

            if (!event) {
                res.status(404).json({ message: 'Event not found' });
                return;
            }

            // parse review fields from request
            const { userId, isAnonymous, overall, wouldRepeat, customRatings } =
                req.body;

            if (
                typeof overall !== 'number' ||
                overall < 1 ||
                overall > 5 ||
                typeof wouldRepeat !== 'number' ||
                wouldRepeat < 1 ||
                wouldRepeat > 5 ||
                !Array.isArray(customRatings)
            ) {
                res.status(400).json({ message: 'Invalid rating data.' });
                return;
            }

            const ratingDate = new Date();

            if (ratingDate > event.ratingUntil) {
                res.status(403).json({ message: 'Rating period has ended.' });
                return;
            }

            if (event.hasUserRated(userId)) {
                res.status(409).json({
                    message: 'User has already rated this event.',
                });
                return;
            }

            event.ratings.push({
                userId: userId,
                isAnonymous: isAnonymous,
                overall: overall,
                wouldRepeat: wouldRepeat,
                customRatings: customRatings,
                createdAt: ratingDate,
            });

            await event.save();

            res.status(201).json({ message: 'Rating saved successfully' });
        } catch (error) {
            res.status(400).json({ message: 'Error creating rating' });
        }
    }
);

/**
 * @route   GET /api/openforum/:id/comments
 * @desc    Get all comments for an open forum event
 * @access  Public
 */
router.get(
    '/:id/comments',
    isAuthenticated,
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const comments = await EventComment.find({
                eventId: id,
                isHidden: false,
            });

            if (!comments) {
                res.status(404).json({ message: 'Event not found' });
                return;
            }

            res.json(comments);
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }
);

/**
 * @route   POST /api/openforum/:id/comment
 * @desc    Get reviews for a room by building id and room number
 * @access  Public
 */
router.post(
    '/:id/comment',
    isAuthenticated,
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { author, isAnonymous, content } = req.body;

            const newComment = new EventComment({
                eventId: id,
                author: author,
                isAnonymous: isAnonymous,
                content: content,
            });

            const savedComment = await newComment.save();
            res.status(201).json(savedComment);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

export default router;
