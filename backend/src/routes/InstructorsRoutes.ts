import express, { Request, Response, Router } from 'express';
import { Instructors } from '../models/People';
import { CourseReviews } from '../models/Courses';

const router: Router = express.Router();

/**
 * @route   GET /api/instructors
 * @desc    Get all instructors with optional filters (search )
 * @access  Public
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const { search } = req.query;

        // Build the query object
        const query: any = {};

        // Add search functionality
        if (search && typeof search === 'string') {
            // Basic search with regex for case-insensitive matching
            query.$or = [{ name: { $regex: search, $options: 'i' } }];
        }

        // Execute the query
        const instructors = await Instructors.find(query).sort({ code: 1 });

        res.json(instructors);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   GET /api/instructors/bulk
 * @desc    Get multiple instructors by IDs
 * @access  Public
 */
router.get('/bulk', async (req: Request, res: Response) => {
    try {
        const { ids, cxids } = req.query;

        const instructorIds =
            ids && typeof ids === 'string'
                ? ids
                      .split(',')
                      .map((id) => parseInt(id.trim(), 10))
                      .filter((id) => !isNaN(id))
                : [];

        const cxidList =
            cxids && typeof cxids === 'string'
                ? cxids
                      .split(',')
                      .map((id) => parseInt(id.trim(), 10))
                      .filter((id) => !isNaN(id))
                : [];

        if (instructorIds.length === 0 && cxidList.length === 0) {
            res.status(400).json({
                message:
                    'Provide at least one valid id (ids=) or cxid (cxids=), comma-separated',
            });
            return;
        }

        const clauses: object[] = [];
        if (instructorIds.length > 0) {
            clauses.push({ id: { $in: instructorIds } });
        }
        if (cxidList.length > 0) {
            clauses.push({ cxids: { $in: cxidList } });
        }

        const query = clauses.length === 1 ? clauses[0] : { $or: clauses };

        const instructors = await Instructors.find(query);

        res.json(instructors);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   GET /api/instructors/:id
 * @desc    Get instructor information by ID
 * @access  Public
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const instructorId = parseInt(req.params.id);

        // Check if conversion is valid
        if (isNaN(instructorId)) {
            res.status(400).json({ message: 'Invalid instructor ID format' });
            return;
        }

        const instructor = await Instructors.findOne({
            id: instructorId,
        });

        if (!instructor) {
            res.status(404).json({ message: 'Instructor not found' });
            return;
        }

        res.json(instructor);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   POST /api/instructors
 * @desc    Create new instructor
 * @access  Private (Admin)
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const {
            id,
            name,
            inclusivity_rating,
            competency_rating,
            challenge_rating,
        } = req.body;

        // Check if instructor already exists
        const instructorExists = await Instructors.findOne({
            id,
        });
        if (instructorExists) {
            res.status(400).json({ message: 'Instructor already exists' });
            return;
        }

        const newInstructor = new Instructors({
            id,
            name,
            inclusivity_rating,
            competency_rating,
            challenge_rating,
        });

        const savedInstructor = await newInstructor.save();
        res.status(201).json(savedInstructor);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   PUT /api/instructors/:id
 * @desc    Update instructor
 * @access  Private (Admin)
 */
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const instructorId = parseInt(req.params.id);

        // Check if conversion is valid
        if (isNaN(instructorId)) {
            res.status(400).json({ message: 'Invalid instructor ID format' });
            return;
        }

        const instructor = await Instructors.findOne({
            id: instructorId,
        });

        if (!instructor) {
            res.status(404).json({ message: 'Instructor not found' });
            return;
        }

        const updatedInstructor = await Instructors.findOneAndUpdate(
            { id: instructorId },
            { $set: req.body },
            { new: true }
        );

        res.json(updatedInstructor);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   GET /api/instructors/:id/reviews
 * @desc    Get all reviews for a specific instructor
 * @access  Public
 */
router.get('/:id/reviews', async (req: Request, res: Response) => {
    try {
        const instructorId = parseInt(req.params.id);

        // Check if conversion is valid
        if (isNaN(instructorId)) {
            res.status(400).json({ message: 'Invalid instructor ID format' });
            return;
        }

        // Verify instructor exists
        const instructor = await Instructors.findOne({
            id: instructorId,
        })
            .lean()
            .exec();

        if (!instructor) {
            res.status(404).json({ message: 'Instructor not found' });
            return;
        }
        const cxidsOnInstructor = instructor.cxids ?? [];
        const reviewMatch =
            cxidsOnInstructor.length > 0
                ? {
                      $or: [
                          { instructor_id: instructorId },
                          { instructor_cxid: { $in: cxidsOnInstructor } },
                      ],
                  }
                : { instructor_id: instructorId };

        const reviews = await CourseReviews.find(reviewMatch).sort({
            updatedAt: -1,
        });

        res.json(reviews);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   GET /api/instructors/:id/courses
 * @desc    Get all courses for a specific instructor
 * @access  Public
 */
router.get('/:id/courses', async (req: Request, res: Response) => {
    try {
        const instructorId = parseInt(req.params.id);

        // Check if conversion is valid
        if (isNaN(instructorId)) {
            res.status(400).json({ message: 'Invalid instructor ID format' });
            return;
        }

        // Verify instructor exists
        const instructor = await Instructors.findOne({
            id: instructorId,
        });

        if (!instructor) {
            res.status(404).json({ message: 'Instructor not found' });
            return;
        }

        // Get all courses for this instructor
        const courses = instructor.courses;

        // Check if courses exist
        if (!courses || courses.length === 0) {
            res.status(404).json({
                message: 'No courses found for this instructor',
            });
            return;
        }

        res.json(courses);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
