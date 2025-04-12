import express, { Request, Response } from "express";
import { Courses, CourseReviews } from "../models/Courses";

const router = express.Router();

/**
 * @route   GET /api/courses
 * @desc    Get all courses with optional filters (search and department)
 * @access  Public
 */
// Courses routes
router.get("/", async (req: Request, res: Response) => {
    try {
        const { search, department } = req.query;

        // Build the query object
        const query: any = {};

        // Add search functionality
        if (search && typeof search === "string") {
            // Basic search with regex for case-insensitive matching
            query.$or = [
                { code: { $regex: search, $options: "i" } },
                { name: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }

        // Add department filter if provided
        if (department) {
            const deptArray = Array.isArray(department)
                ? department
                : [department];
            query.department_names = { $in: deptArray };
        }

        // Execute the query
        const courses = await Courses.find(query).sort({ code: 1 });

        res.json(courses);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * @route   GET /api/courses/:id
 * @desc    Get course by ID
 * @access  Public
 */
router.get("/:id", async (req: Request, res: Response) => {
    try {
        const courseId = parseInt(req.params.id, 10);

        // Check if conversion is valid
        if (isNaN(courseId)) {
            res.status(400).json({ message: "Invalid course ID format" });
            return;
        }

        // Find course by ID
        const course = await Courses.findOne({ id: courseId });
        if (!course) {
            res.status(404).json({ message: "Course not found" });
            return;
        }
        res.json(course);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * @route   POST /api/courses
 * @desc    Create new course
 * @access  Private (Admin)
 */
router.post("/", async (req: Request, res: Response) => {
    // ? Do we need to create slugs for all courses here ? //
    try {
        const {
            id,
            code,
            code_slug,
            name,
            department_names,
            requirement_codes,
            requirement_names,
            term_keys,
            description,
            all_instructor_ids,
        } = req.body;

        // Check if course already exists
        const courseExists = await Courses.findOne({ id });
        if (courseExists) {
            res.status(400).json({ message: "Course already exists" });
            return;
        }

        const newCourse = new Courses({
            id,
            code,
            code_slug,
            name,
            department_names,
            requirement_codes,
            requirement_names,
            term_keys,
            description,
            all_instructor_ids,
        });

        const savedCourse = await newCourse.save();
        res.status(201).json(savedCourse);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * @route   PUT /api/courses/:id
 * @desc    Update course
 * @access  Private (Admin)
 */
router.put("/:id", async (req: Request, res: Response) => {
    try {
        const courseId = parseInt(req.params.id, 10);

        // Check if conversion is valid
        if (isNaN(courseId)) {
            res.status(400).json({ message: "Invalid course ID format" });
            return;
        }

        // Find course by ID
        const course = await Courses.findOne({ id: courseId });
        if (!course) {
            res.status(404).json({ message: "Course not found" });
            return;
        }

        // Update course
        const updatedCourse = await Courses.findOneAndUpdate(
            { id: courseId },
            { $set: req.body },
            { new: true }
        );
        res.json(updatedCourse);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * @route   DELETE /api/courses/:id
 * @desc    Delete course
 * @access  Private (Admin)
 */
router.delete("/:id", async (req: Request, res: Response) => {
    try {
        const courseId = parseInt(req.params.id, 10);

        // Check if conversion is valid
        if (isNaN(courseId)) {
            res.status(400).json({ message: "Invalid course ID format" });
            return;
        }

        // Find course by ID
        const course = await Courses.findOne({ id: courseId });
        if (!course) {
            res.status(404).json({ message: "Course not found" });
            return;
        }

        // Delete course
        await Courses.findOneAndDelete({ id: courseId });
        res.json({ message: "Course removed" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * @route   GET /api/courses/:id/reviews
 * @desc    Get all reviews for a specific course
 * @access  Public
 */
router.get("/:id/reviews", async (req: Request, res: Response) => {
    try {
        const courseId: number = parseInt(req.params.id);

        if (isNaN(courseId)) {
            res.status(400).json({ message: "Invalid course ID format" });
            return;
        }

        const reviews = await CourseReviews.find({ course_id: courseId })
            .sort({ updatedAt: -1 }) // -1 for descending order (newest first)
            .exec();

        // TODO: I don't like this formatting, but it works
        const formattedReviews = reviews.map((review: any) => ({
            ...review.toObject(),
            overall_rating: review.overall_rating
                ? parseFloat(review.overall_rating.toString())
                : null,
            challenge_rating: review.challenge_rating
                ? parseFloat(review.challenge_rating.toString())
                : null,
            inclusivity_rating: review.inclusivity_rating
                ? parseFloat(review.inclusivity_rating.toString())
                : null,
            work_per_week: review.work_per_week
                ? parseFloat(review.work_per_week.toString())
                : null,
            total_cost: review.total_cost
                ? parseFloat(review.total_cost.toString())
                : null,
        }));

        res.json(formattedReviews);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
