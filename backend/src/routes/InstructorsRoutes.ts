import express, { Request, Response, Router } from "express";
import { Instructors } from "../models/People";
import { CourseReviews } from "../models/Courses";

const router: Router = express.Router();

/**
 * @route   GET /api/instructors
 * @desc    Get all instructors with optional filters (search )
 * @access  Public
 */
router.get("/", async (req: Request, res: Response) => {
    try {
        const { search } = req.query;

        // Build the query object
        const query: any = {};

        // Add search functionality
        if (search && typeof search === "string") {
            // Basic search with regex for case-insensitive matching
            query.$or = [{ name: { $regex: search, $options: "i" } }];
        }

        // Execute the query
        const instructors = await Instructors.find(query).sort({ code: 1 });

        res.json(instructors);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * @route   GET /api/instructors/:id
 * @desc    Get instructor information by ID
 * @access  Public
 */
router.get("/:id", async (req: Request, res: Response) => {
    try {
        const instructorId = parseInt(req.params.id);

        // Check if conversion is valid
        if (isNaN(instructorId)) {
            res.status(400).json({ message: "Invalid instructor ID format" });
            return;
        }

        const instructor = await Instructors.findOne({
            id: instructorId,
        });

        if (!instructor) {
            res.status(404).json({ message: "Instructor not found" });
            return;
        }

        res.json(instructor);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * @route   POST /api/instructors
 * @desc    Create new instructor
 * @access  Private (Admin)
 */
router.post("/", async (req: Request, res: Response) => {
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
            res.status(400).json({ message: "Instructor already exists" });
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
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * @route   PUT /api/instructors/:id
 * @desc    Update instructor
 * @access  Private (Admin)
 */
router.put("/:id", async (req: Request, res: Response) => {
    try {
        const instructorId = parseInt(req.params.id);

        // Check if conversion is valid
        if (isNaN(instructorId)) {
            res.status(400).json({ message: "Invalid instructor ID format" });
            return;
        }

        const instructor = await Instructors.findOne({
            id: instructorId,
        });

        if (!instructor) {
            res.status(404).json({ message: "Instructor not found" });
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
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * @route   GET /api/instructors/:id/reviews
 * @desc    Get all reviews for a specific instructor
 * @access  Public
 */
router.get("/:id/reviews", async (req: Request, res: Response) => {
    try {
        const instructorId = parseInt(req.params.id);

        // Check if conversion is valid
        if (isNaN(instructorId)) {
            res.status(400).json({ message: "Invalid instructor ID format" });
            return;
        }

        // Verify instructor exists
        const instructor = await Instructors.findOne({
            id: instructorId,
        });

        if (!instructor) {
            res.status(404).json({ message: "Instructor not found" });
            return;
        }
        // Get all reviews for this instructor
        const reviews = await CourseReviews.find({
            instructor_id: instructorId,
        }).sort({ updatedAt: -1 });

        res.json(reviews);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * @route   GET /api/instructors/:id/courses
 * @desc    Get all courses for a specific instructor
 * @access  Public
 */
router.get("/:id/courses", async (req: Request, res: Response) => {
    try {
        const instructorId = parseInt(req.params.id);

        // Check if conversion is valid
        if (isNaN(instructorId)) {
            res.status(400).json({ message: "Invalid instructor ID format" });
            return;
        }

        // Verify instructor exists
        const instructor = await Instructors.findOne({
            id: instructorId,
        });

        if (!instructor) {
            res.status(404).json({ message: "Instructor not found" });
            return;
        }

        // Get all courses for this instructor
        const courses = instructor.courses;

        // Check if courses exist
        if (!courses || courses.length === 0) {
            res.status(404).json({
                message: "No courses found for this instructor",
            });
            return;
        }

        res.json(courses);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
