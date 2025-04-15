import express, { Request, Response } from "express";
import { Courses, CourseReviews } from "../models/Courses";
import { Instructors } from "../models/People";

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

        res.json(reviews);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * @route   POST /api/courses/:courseId/reviews
 * @desc    Add a new review for a course
 */
router.post("/:courseId/reviews", async (req: Request, res: Response) => {
    try {
        // need to find new max id for the new review
        const result = await CourseReviews.aggregate([
            {
                $group: {
                    _id: null, // No need to group, so _id is null
                    maxValue: { $max: "$id" }, // Find the max value of fieldName
                },
            },
        ]);

        const maxId = result[0].maxValue + 1;

        const { courseId } = req.params;

        // parse review fields from request
        const {
            overall,
            challenge,
            inclusivity,
            workPerWeek,
            instructorId,
            comments,
            email,
        } = req.body;

        // construct review data
        const reviewData = {
            id: maxId,
            overall_rating: overall,
            challenge_rating: challenge,
            inclusivity_rating: inclusivity,
            work_per_week: workPerWeek,
            comments: comments,
            course_id: Number(courseId),
            instructor_id: instructorId,
            user_email: email,
        };

        const review = new CourseReviews(reviewData);
        await review.save();

        res.status(201).json({ message: "Review saved successfully" });
    } catch (error) {
        res.status(400).json({ message: "Error creating review" });
    }
});

/**
 * @route   PATCH /api/courses/reviews/:reviewId
 * @desc    Edit a course review
 */
router.patch("/reviews/:reviewId", async (req: Request, res: Response) => {
    try {
        const reviewId = req.params.reviewId;

        // parse review fields from request
        const {
            overall,
            challenge,
            inclusivity,
            workPerWeek,
            comments,
            instructorId,
        } = req.body;

        const updateData = {
            overall_rating: overall,
            challenge_rating: challenge,
            inclusivity_rating: inclusivity,
            work_per_week: workPerWeek,
            comments: comments,
            instructor_id: instructorId,
        };

        const updatedReview = await CourseReviews.findOneAndUpdate(
            { id: reviewId },
            updateData,
            { new: true }
        );

        if (!updatedReview) {
            res.status(404).json({ message: "Review not found" });
        }

        res.status(200).json({
            message: "Review updated",
            updatedReview,
        });
    } catch (error) {
        console.error("update error: ", error);
        res.status(400).json({ message: "Error updating review" });
    }
});

/**
 * @route   DELETE /api/courses/reviews/:reviewId
 * @desc    Delete a course review
 */
router.delete("/reviews/:reviewId", async (req: Request, res: Response) => {
    try {
        const review = await CourseReviews.findOneAndDelete({
            id: req.params.reviewId,
        });

        if (!review) {
            res.status(404).json({ message: "Review not found" });
        }

        res.status(200).json({ message: "Review deleted" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * @route   GET /api/courses/:courseId/instructors
 * @desc    Get all previous instructors for a course
 */
router.get("/:courseId/instructors", async (req: Request, res: Response) => {
    try {
        const courseId: number = parseInt(req.params.courseId);

        if (isNaN(courseId)) {
            res.status(400).json({ message: "Invalid course ID format" });
            return;
        }

        const course = await Courses.findOne({ id: courseId });

        if (!course) {
            res.status(400).json({ message: "No course found" });
            return;
        }

        const instructorIds = course.all_instructor_ids;

        const instructors = await Instructors.find({
            id: { $in: instructorIds },
        });

        res.json(instructors);
    } catch (error) {
        res.status(400).json({ message: "Error getting course instructors" });
    }
});

export default router;
