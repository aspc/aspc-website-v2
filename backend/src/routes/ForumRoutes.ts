import express, { Request, Response } from 'express';
import { ForumEvent, EventReview } from '../models/Forum';
import {
    isAuthenticated,
    isAdmin,
    hasNotRatedEvent,
} from '../middleware/authMiddleware';

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
 * @route   GET /api/openforum/:id/comments
 * @desc    Get all comments for an open forum event
 * @access  Public
 */
router.get(
    '/:id/ratings',
    isAuthenticated,
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const stats = await EventReview.getAverageRatings(id);

            res.json(stats);
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }
);

/**
 * @route   GET /api/openforum/:id/comments
 * @desc    Get all comments for an open forum event
 * @access  Public
 */
router.get(
    '/:id/reviews',
    isAuthenticated,
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const reviews = await EventReview.find({
                eventId: id,
                isHidden: false,
            });

            if (!reviews) {
                res.status(404).json({ message: 'Event not found' });
                return;
            }

            res.json(reviews);
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }
);

/**
 * @route   POST /api/openforum/:id/review
 * @desc    Add a new review for an event by the event's id
 * @access  Public
 */
router.post(
    '/:id/review',
    hasNotRatedEvent,
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const {
                isAnonymous,
                content,
                overall,
                wouldRepeat,
                customRatings,
            } = req.body;

            const email = (req.session as any).user.email;

            const newReview = new EventReview({
                eventId: id,
                author: email,
                isAnonymous: isAnonymous,
                content: content,
                overall: overall,
                wouldRepeat: wouldRepeat,
                customRatings: customRatings,
            });

            const savedReview = await newReview.save();
            res.status(201).json(savedReview);
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
            staffHost,
            eventDate,
            location,
            ratingUntil,
            customQuestions,
            engageEventId,
        } = req.body;

        if (!title || !description || !eventDate || !location || !ratingUntil) {
            res.status(400).json({ message: 'Missing required fields.' });
            return;
        }
        const email = (req.session as any).user.email;

        const event = new ForumEvent({
            title: title,
            description: description,
            createdBy: email,
            staffHost: staffHost,
            eventDate: eventDate,
            location: location,
            ratingUntil: ratingUntil,
            customQuestions: customQuestions || [],
            engageEventId: engageEventId,
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
            staffHost,
            eventDate,
            location,
            ratingUntil,
            customQuestions,
            engageEventId,
        } = req.body;

        if (!title || !description || !eventDate || !location || !ratingUntil) {
            res.status(400).json({ message: 'Missing required fields.' });
            return;
        }

        const updatedEvent = await ForumEvent.findByIdAndUpdate(
            id,
            {
                title: title,
                description: description,
                staffHost: staffHost,
                eventDate: eventDate,
                location: location,
                ratingUntil: ratingUntil,
                customQuestions: customQuestions || [],
                engageEventId: engageEventId,
            },
            { new: true, runValidators: true }
        );

        if (!updatedEvent) {
            res.status(404).json({ message: 'Forum event not found.' });
            return;
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

            const comment = await EventReview.findById(id);

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

/**
 * @route   DELETE /api/openforum/:id
 * @desc    Delete openforum event
 * @access  Admin
 */
router.delete('/:eventId', isAdmin, async (req: Request, res: Response) => {
    try {
        const event = await ForumEvent.findOneAndDelete({
            _id: req.params.eventId,
        });

        if (!event) {
            res.status(404).json({ message: 'Event not found' });
        }

        res.status(200).json({ message: 'Event deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
