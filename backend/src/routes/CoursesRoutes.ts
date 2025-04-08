import express, { Request, Response } from "express";
import { Courses, CourseReviews } from "../models/Courses";

const router = express.Router();

/**
 * @route   GET /api/courses
 * @desc    Get all courses with optional filters
 * @access  Public
 */
router.get("/", async (req: Request, res: Response) => {
    try {
        // TODO: Implement filtering logic based on query parameters
        const courses = await Courses.find({});
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
router.get("/courses/:id/reviews", async (req: Request, res: Response) => {
    try {
        const courseId: number = parseInt(req.params.id);

        const reviews = await CourseReviews.find({
            course_id: courseId,
        });

        // Check if conversion is valid
        if (isNaN(courseId)) {
            res.status(400).json({ message: "Invalid course ID format" });
            return;
        }

        res.json(reviews);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
