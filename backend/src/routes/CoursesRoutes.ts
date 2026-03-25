import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Courses, CourseReviews } from '../models/Courses';
import { Instructors } from '../models/People';
import {
    isAdmin,
    isAuthenticated,
    isCourseReviewOwner,
} from '../middleware/authMiddleware';
import {
    getCourseInstructorAssociationKeys,
    pickInstructorCxidForCourse,
} from '../utils/courseInstructors';

const router = express.Router();

/**
 * Normalizes a course code search term to match variations
 * Examples: "cs51" matches "CSCI051", "CS051", "CS51", etc.
 * @param searchTerm - The search term (e.g., "cs51", "CSCI051")
 * @returns A regex pattern that matches normalized course codes
 */
function createNormalizedCodeRegex(searchTerm: string): RegExp {
    // Extract letters (department) and numbers (course number) from search term
    const letters = searchTerm.match(/[a-zA-Z]+/)?.[0] || '';
    const numbers = searchTerm.match(/\d+/)?.[0] || '';

    // If no letters or numbers, fall back to simple prefix match
    if (!letters && !numbers) {
        const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`^${escaped}`, 'i');
    }

    // Build regex pattern
    // Department part: match letters case-insensitively, allow additional letters
    // Number part: match numbers with optional leading zeros
    let pattern = '^';

    if (letters) {
        // Match department that starts with the search letters
        // e.g., "cs" matches "CS", "CSCI", "CS", etc.
        const letterPattern = letters
            .split('')
            .map((char) => `[${char.toUpperCase()}${char.toLowerCase()}]`)
            .join('');
        pattern += `${letterPattern}[A-Za-z]*`;
    }

    if (numbers) {
        // Match course number with optional leading zeros
        // e.g., "51" matches "51", "051", "0051", etc.
        // Remove leading zeros from the number to match more variations
        const numWithoutLeadingZeros = numbers.replace(/^0+/, '') || '0';
        pattern += `0*${numWithoutLeadingZeros}`;
    }

    return new RegExp(pattern, 'i');
}

/**
 * @route   GET /api/courses
 * @desc    Get all courses with optional filters (search and department) with pagination
 * @access  Public
 */
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const {
            search,
            searchType = 'all',
            schools,
            limit = 20,
            page = 1,
        } = req.query;

        const requirements = req.query.requirements
            ? (req.query.requirements as string).split(',').map((r) => r.trim())
            : [];

        const numericLimit = parseInt(limit as string);
        const numericPage = parseInt(page as string);
        const skip = (numericPage - 1) * numericLimit;
        const schoolList = schools ? (schools as string).split(',') : [];

        // If no search term, return empty results
        if (!search || String(search).trim().length < 2) {
            res.json({
                courses: [],
                pagination: {
                    currentPage: 1,
                    totalPages: 0,
                    totalCount: 0,
                    limit: numericLimit,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            });
            return;
        }

        const searchTerm = String(search).trim();
        const type = String(searchType) as
            | 'all'
            | 'name'
            | 'code'
            | 'department';

        // Build base query filter for schools
        const schoolFilter: any = {};
        if (schoolList.length > 0) {
            schoolFilter.code = {
                $regex: new RegExp(
                    schoolList.map((s) => `.*${s}$`).join('|'),
                    'i'
                ),
            };
        }

        // Step 1: Get exact prefix matches (starts with, case-insensitive)
        // For code searches, also use normalized matching to handle abbreviations

        const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const normalizedCodeRegex = createNormalizedCodeRegex(searchTerm);

        let exactMatches: any[] = [];

        if (type === 'all') {
            // Step 1: Query code matches first (highest priority)
            const codeQuery: any = {
                $or: [
                    { code: { $regex: new RegExp(`^${escapedTerm}`, 'i') } },
                    { code: { $regex: normalizedCodeRegex } },
                ],
            };
            if (requirements.length > 0) {
                codeQuery.requirement_names = { $in: requirements };
            }
            if (schoolFilter.code) {
                codeQuery.$and = [
                    {
                        $or: [
                            {
                                code: {
                                    $regex: new RegExp(`^${escapedTerm}`, 'i'),
                                },
                            },
                            { code: { $regex: normalizedCodeRegex } },
                        ],
                    },
                    schoolFilter,
                ];
                delete codeQuery.$or;
            }

            const codeMatches = await Courses.find(codeQuery)
                .limit(numericLimit * 2)
                .lean();

            exactMatches = [...codeMatches];
            const codeMatchIds = new Set(
                codeMatches.map((c: any) => c._id.toString())
            );

            // Step 2: Query name matches (excluding code matches)
            const nameQuery: any = {
                _id: {
                    $nin: Array.from(codeMatchIds).map(
                        (id: string) => new mongoose.Types.ObjectId(id)
                    ),
                },
                name: { $regex: new RegExp(`^${escapedTerm}`, 'i') },
            };
            if (requirements.length > 0) {
                nameQuery.requirement_names = { $in: requirements };
            }
            if (schoolFilter.code) {
                Object.assign(nameQuery, schoolFilter);
            }

            const nameMatches = await Courses.find(nameQuery)
                .limit(numericLimit * 2)
                .lean();

            exactMatches = [...exactMatches, ...nameMatches];
            const nameMatchIds = new Set(
                nameMatches.map((c: any) => c._id.toString())
            );

            // Step 3: Query department matches (excluding code and name matches)
            const deptQuery: any = {
                _id: {
                    $nin: [
                        ...Array.from(codeMatchIds),
                        ...Array.from(nameMatchIds),
                    ].map((id: string) => new mongoose.Types.ObjectId(id)),
                },
                department_names: {
                    $regex: new RegExp(`^${escapedTerm}`, 'i'),
                },
            };
            if (requirements.length > 0) {
                deptQuery.requirement_names = { $in: requirements };
            }
            if (schoolFilter.code) {
                Object.assign(deptQuery, schoolFilter);
            }

            const deptMatches = await Courses.find(deptQuery)
                .limit(numericLimit * 2)
                .lean();

            exactMatches = [...exactMatches, ...deptMatches];
        } else {
            // For specific search types (code, name, department), use the original query
            const exactMatchQuery: any = {};

            if (requirements.length > 0) {
                exactMatchQuery.requirement_names = { $in: requirements };
            }

            switch (type) {
                case 'code':
                    exactMatchQuery.$or = [
                        {
                            code: {
                                $regex: new RegExp(`^${escapedTerm}`, 'i'),
                            },
                        },
                        { code: { $regex: normalizedCodeRegex } },
                    ];
                    if (schoolFilter.code) {
                        exactMatchQuery.$and = [
                            {
                                $or: [
                                    {
                                        code: {
                                            $regex: new RegExp(
                                                `^${escapedTerm}`,
                                                'i'
                                            ),
                                        },
                                    },
                                    { code: { $regex: normalizedCodeRegex } },
                                ],
                            },
                            schoolFilter,
                        ];
                        delete exactMatchQuery.$or;
                    }
                    break;
                case 'name':
                    exactMatchQuery.name = {
                        $regex: new RegExp(`^${escapedTerm}`, 'i'),
                    };
                    if (schoolFilter.code) {
                        Object.assign(exactMatchQuery, schoolFilter);
                    }
                    break;
                case 'department':
                    exactMatchQuery.department_names = {
                        $regex: new RegExp(`^${escapedTerm}`, 'i'),
                    };
                    if (schoolFilter.code) {
                        Object.assign(exactMatchQuery, schoolFilter);
                    }
                    break;
            }

            exactMatches = await Courses.find(exactMatchQuery)
                .limit(numericLimit * 2)
                .lean();
        }

        // Step 2: Get fuzzy matches (exclude exact matches by ID)
        const exactMatchIds = new Set(
            exactMatches.map((c: any) => c._id.toString())
        );

        const fuzzyQuery: any = {
            _id: { $nin: Array.from(exactMatchIds) },
        };

        if (schoolList.length > 0) {
            fuzzyQuery.code = {
                $regex: new RegExp(
                    schoolList.map((s) => `.*${s}$`).join('|'),
                    'i'
                ),
            };
        }

        if (requirements.length > 0) {
            fuzzyQuery.requirement_names = { $in: requirements };
        }

        // Build fuzzy search criteria using Atlas Search
        const searchCriteria: any[] = [];

        switch (type) {
            case 'code':
                searchCriteria.push({
                    text: {
                        query: searchTerm,
                        path: 'code',
                        fuzzy: { maxEdits: 2 },
                    },
                });
                break;
            case 'name':
                searchCriteria.push({
                    text: {
                        query: searchTerm,
                        path: 'name',
                        fuzzy: { maxEdits: 2 },
                    },
                });
                break;
            case 'department':
                searchCriteria.push({
                    text: {
                        query: searchTerm,
                        path: 'department_names',
                        fuzzy: { maxEdits: 2 },
                    },
                });
                break;
            case 'all':
            default:
                searchCriteria.push(
                    {
                        text: {
                            query: searchTerm,
                            path: 'code',
                            fuzzy: { maxEdits: 2 },
                        },
                    },
                    {
                        text: {
                            query: searchTerm,
                            path: 'name',
                            fuzzy: { maxEdits: 2 },
                        },
                    },
                    {
                        text: {
                            query: searchTerm,
                            path: 'department_names',
                            fuzzy: { maxEdits: 2 },
                        },
                    }
                );
        }

        const searchStage: any = {
            $search: {
                index: 'courses',
                compound: {
                    should: searchCriteria,
                    minimumShouldMatch: 1,
                },
            },
        };

        // Build filter array for compound query
        const filters: any[] = [];

        if (schoolList.length > 0) {
            filters.push({
                compound: {
                    should: schoolList.map((school) => ({
                        wildcard: {
                            query: `*${school}`,
                            path: 'code',
                            allowAnalyzedField: true,
                        },
                    })),
                    minimumShouldMatch: 1,
                },
            });
        }

        if (requirements.length > 0) {
            filters.push({
                compound: {
                    should: requirements.map((req) => ({
                        queryString: {
                            defaultPath: 'requirement_names',
                            query: `"${req}"`,
                        },
                    })),
                    minimumShouldMatch: 1,
                },
            });
        }

        if (filters.length > 0) {
            searchStage.$search.compound.filter = filters;
        }

        // Get fuzzy matches using aggregation

        const fuzzyPipeline: any[] = [
            searchStage,
            {
                $match: {
                    _id: {
                        $nin: Array.from(exactMatchIds).map(
                            (id: string) => new mongoose.Types.ObjectId(id)
                        ),
                    },
                },
            },
            { $limit: numericLimit * 2 },
        ];

        const fuzzyResults = await Courses.aggregate(fuzzyPipeline).exec();

        // Combine results: exact matches first, then fuzzy matches
        const allCourses = [...exactMatches, ...fuzzyResults];

        // Remove duplicates (by _id) while preserving order
        const seenIds = new Set();
        const uniqueCourses = allCourses.filter((course: any) => {
            const id = course._id.toString();
            if (seenIds.has(id)) {
                return false;
            }
            seenIds.add(id);
            return true;
        });

        // Paginate the combined results
        const paginatedCourses = uniqueCourses.slice(skip, skip + numericLimit);
        const totalCount = uniqueCourses.length;
        const totalPages = Math.ceil(totalCount / numericLimit);

        const paginationInfo = {
            currentPage: numericPage,
            totalPages: totalPages,
            totalCount: totalCount,
            limit: numericLimit,
            hasNextPage: numericPage < totalPages,
            hasPrevPage: numericPage > 1,
        };

        res.json({
            courses: paginatedCourses,
            pagination: paginationInfo,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   GET /api/courses/:id
 * @desc    Get course by ID
 * @access  Public
 */
router.get('/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const courseId = parseInt(req.params.id, 10);

        // Check if conversion is valid
        if (isNaN(courseId)) {
            res.status(400).json({ message: 'Invalid course ID format' });
            return;
        }

        // Find course by ID
        const course = await Courses.findOne({ id: courseId });
        if (!course) {
            res.status(404).json({ message: 'Course not found' });
            return;
        }
        res.json(course);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   POST /api/courses
 * @desc    Create new course
 * @access  Private (Admin)
 */
router.post('/', isAdmin, async (req: Request, res: Response) => {
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
            all_instructor_cxids,
        } = req.body;

        // Check if course already exists
        const courseExists = await Courses.findOne({ id });
        if (courseExists) {
            res.status(400).json({ message: 'Course already exists' });
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
            ...(Array.isArray(all_instructor_cxids) &&
            all_instructor_cxids.length > 0
                ? { all_instructor_cxids }
                : {}),
        });

        const savedCourse = await newCourse.save();
        res.status(201).json(savedCourse);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   PUT /api/courses/:id
 * @desc    Update course
 * @access  Private (Admin)
 */
router.put('/:id', isAdmin, async (req: Request, res: Response) => {
    try {
        const courseId = parseInt(req.params.id, 10);

        // Check if conversion is valid
        if (isNaN(courseId)) {
            res.status(400).json({ message: 'Invalid course ID format' });
            return;
        }

        // Find course by ID
        const course = await Courses.findOne({ id: courseId });
        if (!course) {
            res.status(404).json({ message: 'Course not found' });
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
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   DELETE /api/courses/:id
 * @desc    Delete course
 * @access  Private (Admin)
 */
router.delete('/:id', isAdmin, async (req: Request, res: Response) => {
    try {
        const courseId = parseInt(req.params.id, 10);

        // Check if conversion is valid
        if (isNaN(courseId)) {
            res.status(400).json({ message: 'Invalid course ID format' });
            return;
        }

        // Find course by ID
        const course = await Courses.findOne({ id: courseId });
        if (!course) {
            res.status(404).json({ message: 'Course not found' });
            return;
        }

        // Delete course
        await Courses.findOneAndDelete({ id: courseId });
        res.json({ message: 'Course removed' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   GET /api/courses/:id/reviews
 * @desc    Get all reviews for a specific course with pagination
 * @access  Public
 */
router.get(
    '/:id/reviews',
    isAuthenticated,
    async (req: Request, res: Response) => {
        try {
            const courseId: number = parseInt(req.params.id);

            if (isNaN(courseId)) {
                res.status(400).json({ message: 'Invalid course ID format' });
                return;
            }

            const reviews = await CourseReviews.find({ course_id: courseId })
                .sort({ updatedAt: -1 }) // -1 for descending order (newest first)
                .exec();

            res.json(reviews);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

/**
 * @route   POST /api/courses/:courseId/reviews
 * @desc    Add a new review for a course
 * @access  Public
 */
router.post(
    '/:courseId/reviews',
    isAuthenticated,
    async (req: Request, res: Response) => {
        try {
            // need to find new max id for the new review
            const result = await CourseReviews.aggregate([
                {
                    $group: {
                        _id: null, // No need to group, so _id is null
                        maxValue: { $max: '$id' }, // Find the max value of fieldName
                    },
                },
            ]);

            const maxId = (result[0]?.maxValue ?? 0) + 1;

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

            const course = await Courses.findOne({
                id: Number(courseId),
            }).lean();
            const instructor = await Instructors.findOne({
                id: Number(instructorId),
            }).lean();

            const instructor_cxid =
                instructor && course
                    ? pickInstructorCxidForCourse(
                          instructor,
                          course.all_instructor_cxids
                      )
                    : undefined;

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
                ...(instructor_cxid !== undefined ? { instructor_cxid } : {}),
                user_email: email,
            };

            const review = new CourseReviews(reviewData);
            await review.save();

            await Courses.findOneAndUpdate(
                { id: Number(courseId) },
                { $inc: { review_count: 1 } }
            );

            await Instructors.updateOne(
                { id: Number(instructorId) },
                { $inc: { numReviews: 1 } }
            );

            res.status(201).json({ message: 'Review saved successfully' });
        } catch (error) {
            res.status(400).json({ message: 'Error creating review' });
        }
    }
);

/**
 * @route   PATCH /api/courses/reviews/:reviewId
 * @desc    Edit a course review
 * @access  Owner
 */
router.patch(
    '/reviews/:reviewId',
    isCourseReviewOwner,
    async (req: Request, res: Response) => {
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

            const existing = await CourseReviews.findOne({
                id: reviewId,
            }).lean();
            if (!existing) {
                res.status(404).json({ message: 'Review not found' });
                return;
            }

            const course = await Courses.findOne({
                id: existing.course_id,
            }).lean();
            const instructor = await Instructors.findOne({
                id: Number(instructorId),
            }).lean();

            const instructor_cxid =
                instructor && course
                    ? pickInstructorCxidForCourse(
                          instructor,
                          course.all_instructor_cxids
                      )
                    : undefined;

            const updateData: Record<string, unknown> = {
                overall_rating: overall,
                challenge_rating: challenge,
                inclusivity_rating: inclusivity,
                work_per_week: workPerWeek,
                comments: comments,
                instructor_id: instructorId,
            };
            if (instructor_cxid !== undefined) {
                updateData.instructor_cxid = instructor_cxid;
            }

            const updatedReview = await CourseReviews.findOneAndUpdate(
                { id: reviewId },
                updateData,
                { new: true }
            );

            res.status(200).json({
                message: 'Review updated',
                updatedReview,
            });
        } catch (error) {
            console.error('update error: ', error);
            res.status(400).json({ message: 'Error updating review' });
        }
    }
);

/**
 * @route   DELETE /api/courses/reviews/:reviewId
 * @desc    Delete a course review
 * @access  Owner
 */
router.delete(
    '/reviews/:reviewId',
    isCourseReviewOwner,
    async (req: Request, res: Response) => {
        try {
            const review = await CourseReviews.findOneAndDelete({
                id: req.params.reviewId,
            });

            if (!review) {
                res.status(404).json({ message: 'Review not found' });
                return;
            }

            await Courses.findOneAndUpdate(
                { id: review.course_id },
                { $inc: { review_count: -1 } }
            );

            if (review.instructor_id) {
                await Instructors.findOneAndUpdate(
                    { id: review.instructor_id },
                    { $inc: { numReviews: -1 } }
                );
            }

            res.status(200).json({ message: 'Review deleted' });
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }
);

/**
 * @route   GET /api/courses/:courseId/instructors
 * @desc    Get all previous instructors for a course with optional pagination
 * @access  Public
 */
router.get(
    '/:courseId/instructors',
    isAuthenticated,
    async (req: Request, res: Response) => {
        try {
            const courseId: number = parseInt(req.params.courseId);
            const {
                limit = '20', // Default to 20 items per page
                page = '1', // Default to first page
            } = req.query;

            if (isNaN(courseId)) {
                res.status(400).json({ message: 'Invalid course ID format' });
                return;
            }

            const course = await Courses.findOne({ id: courseId }).lean();

            if (!course) {
                res.status(400).json({ message: 'No course found' });
                return;
            }

            const { mode, keys } = getCourseInstructorAssociationKeys(course);
            const numericLimit = parseInt(limit as string, 10);
            const numericPage = parseInt(page as string, 10);
            const skip = (numericPage - 1) * numericLimit;

            const totalCount = keys.length;
            const totalPages =
                totalCount === 0 ? 0 : Math.ceil(totalCount / numericLimit);

            const pageKeys = keys.slice(skip, skip + numericLimit);

            let instructors: unknown[] = [];

            if (mode === 'cxid' && pageKeys.length > 0) {
                const found = await Instructors.find({
                    cxids: { $in: pageKeys },
                }).lean();
                const ordered: typeof found = [];
                const seen = new Set<number>();
                for (const cx of pageKeys) {
                    const doc = found.find((d) => d.cxids?.includes(cx));
                    if (doc && !seen.has(doc.id)) {
                        ordered.push(doc);
                        seen.add(doc.id);
                    }
                }
                instructors = ordered;
            } else if (pageKeys.length > 0) {
                const found = await Instructors.find({
                    id: { $in: pageKeys },
                }).lean();
                const byId = new Map(found.map((d) => [d.id, d]));
                instructors = pageKeys
                    .map((legacyId) => byId.get(legacyId))
                    .filter(Boolean);
            }

            res.json({
                instructors,
                pagination: {
                    currentPage: numericPage,
                    totalPages,
                    totalCount,
                    limit: numericLimit,
                    hasNextPage: numericPage < totalPages,
                    hasPrevPage: numericPage > 1,
                },
            });
        } catch (error) {
            res.status(400).json({
                message: 'Error getting course instructors',
            });
        }
    }
);

export default router;
