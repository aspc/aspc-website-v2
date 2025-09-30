import express, { Request, Response } from 'express';
import { ForumEvent, EventComment } from '../models/Forum';
import { isAuthenticated, isAdmin } from '../middleware/authMiddleware';

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
 * @desc    Add a new comment for an event by event's id
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

// ADMIN ROUTES

/**
 * @route   POST /api/openforum
 * @desc    Add new open forum event
 * @access  Admin
 */
router.post('/', isAdmin, async (req: Request, res: Response) => {
    try {
        const {
            title,
            description,
            createdBy,
            staffHost,
            eventDate,
            location,
            ratingUntil,
            customQuestions,
        } = req.body;

        if (
            !title ||
            !description ||
            !createdBy ||
            !eventDate ||
            !location ||
            !ratingUntil
        ) {
            res.status(400).json({ message: 'Missing required fields.' });
            return;
        }

        const event = new ForumEvent({
            title: title,
            description: description,
            createdBy: createdBy,
            staffHost: staffHost,
            eventDate: eventDate,
            location: location,
            ratingUntil: ratingUntil,
            ratings: [],
            customQuestions: customQuestions || [],
        });

        const savedEvent = await event.save();

        res.status(201).json(savedEvent);
    } catch (error) {
        res.status(400).json({ message: 'Error creating new custom event' });
    }
});

/**
 * @route   PUT /api/openforum/:id
 * @desc    Update existing open forum event by id
 * @access  Admin
 */
router.put('/:id', isAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            title,
            description,
            createdBy,
            staffHost,
            eventDate,
            location,
            ratingUntil,
            customQuestions,
        } = req.body;

        if (
            !title ||
            !description ||
            !createdBy ||
            !eventDate ||
            !location ||
            !ratingUntil
        ) {
            res.status(400).json({ message: 'Missing required fields.' });
            return;
        }

        const updatedEvent = await ForumEvent.findByIdAndUpdate(
            id,
            {
                title: title,
                description: description,
                createdBy: createdBy,
                staffHost: staffHost,
                eventDate: eventDate,
                location: location,
                ratingUntil: ratingUntil,
                customQuestions: customQuestions || [],
            },
            { new: true, runValidators: true }
        );

        if (!updatedEvent) {
            res.status(404).json({ message: 'Forum event not found.' });
        }

        res.status(201).json(updatedEvent);
    } catch (error) {
        res.status(400).json({ message: 'Error updating event' });
    }
});

/**
 * @route   PATCH /api/openforum/comments/:id/hide
 * @desc    Hide / unhide a comment by comment id
 * @access  Admin
 */
router.patch(
    '/comments/:id/hide',
    isAdmin,
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const comment = await EventComment.findById(id);

            if (!comment) {
                res.status(400).json({
                    message: 'Comment does not exist',
                });
            } else {
                comment.isHidden = !comment.isHidden;
                const updatedComment = await comment.save();

                res.status(201).json({
                    message: `Comment is now ${updatedComment.isHidden ? 'hidden' : 'visible'}.`,
                    comment: updatedComment,
                });
            }
        } catch (error) {
            res.status(400).json({
                message: 'Error hiding comment',
            });
        }
    }
);

export default router;
