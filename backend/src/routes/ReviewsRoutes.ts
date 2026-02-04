import express, { Request, Response, Router } from 'express';
import { CourseReviews } from '../models/Courses';
import {
    isAuthenticated,
    isCourseReviewOwner,
} from '../middleware/authMiddleware';

const router: Router = express.Router();

/**
 * @route   GET /api/reviews/:id
 * @desc    Get review by ID
 * @access  isAuthenticated
 */
router.get(
    '/reviews/:id',
    isAuthenticated,
    async (req: Request, res: Response) => {
        try {
            const reviewId = parseInt(req.params.id);

            // Check if conversion is valid
            if (isNaN(reviewId)) {
                res.status(400).json({ message: 'Invalid review ID format' });
                return;
            }

            const review = await CourseReviews.findOne({
                id: reviewId,
            });

            if (!review) {
                res.status(404).json({ message: 'Review not found' });
                return;
            }

            res.json(review);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

/**
 * @route   POST /api/reviews
 * @desc    Create new review
 * @access  isAuthenticated
 */
router.post(
    '/reviews',
    isAuthenticated,
    async (req: Request, res: Response) => {
        try {
            const {
                id,
                overall_rating,
                challenge_rating,
                inclusivity_rating,
                work_per_week,
                total_cost,
                comments,
                course_id,
                instructor_id,
                user_id,
            } = req.body;

            // Check if review already exists
            const reviewExists = await CourseReviews.findOne({
                id,
            });
            if (reviewExists) {
                res.status(400).json({ message: 'Review already exists' });
                return;
            }

            // Create new review
            const newReview = new CourseReviews({
                id,
                overall_rating,
                challenge_rating,
                inclusivity_rating,
                work_per_week,
                total_cost,
                comments,
                course_id,
                instructor_id,
                user_id,
            });

            const savedReview = await newReview.save();
            res.status(201).json(savedReview);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

/**
 * @route   PUT /api/reviews/:id
 * @desc    Update review
 * @access  isCourseReviewOwner
 */
router.put(
    '/reviews/:id',
    isCourseReviewOwner,
    async (req: Request, res: Response) => {
        try {
            const reviewId = parseInt(req.params.id);

            // Check if conversion is valid
            if (isNaN(reviewId)) {
                res.status(400).json({ message: 'Invalid review ID format' });
                return;
            }

            // Check if review exists
            const review = await CourseReviews.findOne({
                id: reviewId,
            });

            if (!review) {
                res.status(404).json({ message: 'Review not found' });
                return;
            }

            const updatedReview = await CourseReviews.findOneAndUpdate(
                { id: reviewId },
                { $set: req.body },
                { new: true }
            );

            res.json(updatedReview);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

/**
 * @route   DELETE /api/reviews/:id
 * @desc    Delete review
 * @access  isCourseReviewOwner
 */
router.delete(
    '/reviews/:id',
    isCourseReviewOwner,
    async (req: Request, res: Response) => {
        try {
            const reviewId: number = parseInt(req.params.id);

            // Check if conversion is valid
            if (isNaN(reviewId)) {
                res.status(400).json({ message: 'Invalid review ID format' });
                return;
            }

            // Check if review exists
            const review = await CourseReviews.findOne({
                id: reviewId,
            });

            if (!review) {
                res.status(404).json({ message: 'Review not found' });
                return;
            }

            await CourseReviews.findOneAndDelete({ id: reviewId });
            res.json({ message: 'Review removed' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

export default router;
