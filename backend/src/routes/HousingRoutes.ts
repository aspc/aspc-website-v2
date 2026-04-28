import express, { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import multer from 'multer';
import {
    isAuthenticated,
    isHousingReviewOwner,
} from '../middleware/authMiddleware';
import {
    HousingBuildings,
    HousingReviews,
    HousingRooms,
} from '../models/Housing';
import { housingReviewPictures } from '../server';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const calcAverages = (
    reviews: {
        overall_rating?: number;
        quiet_rating?: number;
        layout_rating?: number;
        temperature_rating?: number;
    }[]
) => {
    const avg = (arr: number[]) =>
        arr.length > 0
            ? arr.reduce((sum, val) => sum + val, 0) / arr.length
            : 0;
    return {
        overallAverage: avg(
            reviews.map((r) => r.overall_rating).filter(Boolean) as number[]
        ),
        quietAverage: avg(
            reviews.map((r) => r.quiet_rating).filter(Boolean) as number[]
        ),
        layoutAverage: avg(
            reviews.map((r) => r.layout_rating).filter(Boolean) as number[]
        ),
        temperatureAverage: avg(
            reviews.map((r) => r.temperature_rating).filter(Boolean) as number[]
        ),
        reviewCount: reviews.length,
    };
};

/**
 * @route   GET /api/campus/housing
 * @desc    Get all housing buildings
 * @access  isAuthenticated
 */
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const buildings = await HousingBuildings.find({});
        res.json(buildings);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   GET /api/campus/housing/:building
 * @desc    Get housing building by id
 * @access  isAuthenticated
 */
router.get(
    '/:building',
    isAuthenticated,
    async (req: Request, res: Response) => {
        try {
            // Get building id
            const buildingId = parseInt(req.params.building, 10);

            // Check if conversion is valid
            if (isNaN(buildingId)) {
                res.status(400).json({ message: 'Invalid building ID format' });
                return;
            }

            // Find building by id
            const buildingData = await HousingBuildings.findOne({
                id: buildingId,
            });
            if (!buildingData) {
                res.status(404).json({ message: 'Building not found' });
                return;
            }

            // Return building
            res.json(buildingData);
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }
);

/**
 * @route   GET /campus/housing/:building/rooms
 * @desc    Get all roms in a building (by building id)
 * @access  isAuthenticated
 */
router.get(
    '/:building/rooms',
    isAuthenticated,
    async (req: Request, res: Response) => {
        try {
            // Get building id
            const buildingId = parseInt(req.params.building, 10);

            // Check if conversion is valid
            if (isNaN(buildingId)) {
                res.status(400).json({ message: 'Invalid building ID format' });
                return;
            }

            // Get all rooms in the building
            const rooms = await HousingRooms.find({
                housing_building_id: buildingId,
            }).sort({ room_number: 1 });

            if (!rooms || rooms.length === 0) {
                res.status(404).json({ message: 'Rooms not found' });
                return;
            }

            res.json(rooms);
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }
);

/**
 * @route   GET /api/campus/:room/reviews
 * @desc    Get housing reviews for a room
 * @access  isAuthenticated
 */
router.get(
    '/:room/reviews',
    isAuthenticated,
    async (req: Request, res: Response) => {
        try {
            // Get room id and convert it to a number
            const roomId = parseInt(req.params.room, 10);

            // Check if conversion is valid
            if (isNaN(roomId)) {
                res.status(400).json({ message: 'Invalid room ID format' });
                return;
            }

            // Find the room by room id
            const roomData = await HousingRooms.findOne({ id: roomId });

            if (!roomData) {
                res.status(404).json({ message: 'Room not found' });
                return;
            }

            // Get all reviews for the room
            const reviews = await HousingReviews.find({
                housing_room_id: roomId,
            }).lean();

            const sessionEmail = req.session.user!.email;
            const safeReviews = reviews.map(({ user_email, ...fields }) => ({
                ...fields,
                isOwner: user_email === sessionEmail,
            }));

            res.json({
                room: roomData,
                reviews: safeReviews,
                averages: calcAverages(reviews),
            });
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }
);

/**
 * @route   GET /api/campus/housing/:buildingId/:roomNumber/reviews
 * @desc    Get reviews for a room by building id and room number
 * @access  isAuthenticated
 */
router.get(
    '/:buildingId/:roomNumber/reviews',
    isAuthenticated,
    async (req: Request, res: Response) => {
        try {
            const { buildingId, roomNumber } = req.params;
            const buildingIdNumber = parseInt(buildingId, 10);

            if (isNaN(buildingIdNumber)) {
                res.status(400).json({ message: 'Invalid building ID format' });
                return;
            }

            const roomData = await HousingRooms.findOne({
                housing_building_id: buildingIdNumber,
                room_number: roomNumber,
            });

            if (!roomData) {
                res.status(404).json({ message: 'Room not found' });
                return;
            }

            const reviews = await HousingReviews.find({
                housing_room_id: roomData.id,
            }).lean();

            const sessionEmail = req.session.user!.email;
            const safeReviews = reviews.map(({ user_email, ...fields }) => ({
                ...fields,
                isOwner: user_email === sessionEmail,
            }));

            res.json({
                room: roomData,
                reviews: safeReviews,
                averages: calcAverages(reviews),
            });
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }
);

/**
 * @route   POST /api/campus/housing/:buildingId/:roomNumber/reviews
 * @desc    Add new housing room review
 * @access  isAuthenticated
 */
router.post(
    '/:buildingId/:roomNumber/reviews',
    isAuthenticated,
    upload.array('pictures'),
    async (req: Request, res: Response) => {
        try {
            const { buildingId, roomNumber } = req.params;
            const buildingIdNumber = parseInt(buildingId, 10);

            if (isNaN(buildingIdNumber)) {
                res.status(400).json({ message: 'Invalid building ID format' });
                return;
            }

            const roomData = await HousingRooms.findOne({
                housing_building_id: buildingIdNumber,
                room_number: roomNumber,
            });

            if (!roomData) {
                res.status(404).json({ message: 'Room not found' });
                return;
            }

            const pictureIds: ObjectId[] = [];

            if (Array.isArray(req.files)) {
                for (let i = 0; i < req.files.length; i++) {
                    const file = req.files[i] as Express.Multer.File;

                    const uploadStream = housingReviewPictures.openUploadStream(
                        file.originalname,
                        { contentType: file.mimetype }
                    );

                    uploadStream.end(file.buffer);

                    uploadStream.on('finish', () => {
                        pictureIds.push(uploadStream.id);
                    });

                    await new Promise((resolve) => {
                        uploadStream.on('finish', resolve);
                    });
                }
            }

            const result = await HousingReviews.aggregate([
                { $group: { _id: null, maxValue: { $max: '$id' } } },
            ]);

            const maxId = result.length > 0 ? result[0].maxValue + 1 : 1;

            // parse review fields from request
            const { overall, quiet, layout, temperature, comments } = req.body;

            // construct review data
            const reviewData = {
                id: maxId,
                overall_rating: overall,
                quiet_rating: quiet,
                layout_rating: layout,
                temperature_rating: temperature,
                comments: comments,
                housing_room_id: roomData.id,
                user_email: req.session.user!.email,
                pictures: pictureIds,
            };

            const review = new HousingReviews(reviewData);
            await review.save();

            req.files = undefined; // free up memory
            res.status(201).json({ message: 'Review saved successfully' });
        } catch (error) {
            res.status(400).json({ message: 'Error creating review' });
        }
    }
);

/**
 * @route   PATCH /api/campus/housing/reviews/:id
 * @desc    Update housing review by review id
 * @access  isHousingReviewOwner
 */
router.patch(
    '/reviews/:reviewId',
    isHousingReviewOwner,
    upload.array('pictures'),
    async (req: Request, res: Response) => {
        try {
            const reviewId = req.params.reviewId;
            const oldReview = await HousingReviews.findOne({ id: reviewId });

            if (!oldReview) {
                res.status(404).json({ message: 'Review not found' });
                return;
            }

            // parse review fields from request
            const { overall, quiet, layout, temperature, comments } = req.body;

            // construct review data
            let updateData = {
                overall_rating: overall,
                quiet_rating: quiet,
                layout_rating: layout,
                temperature_rating: temperature,
                comments: comments,
                pictures: oldReview.pictures,
            };

            const pictureIds: ObjectId[] = [];

            if (Array.isArray(req.files) && req.files.length > 0) {
                // if new pictures provided, delete old pictures from database
                if (oldReview.pictures && oldReview.pictures.length > 0) {
                    for (const pictureId of oldReview.pictures) {
                        const oldPictureId = new ObjectId(pictureId);
                        await housingReviewPictures.delete(oldPictureId);
                    }
                }

                for (let i = 0; i < req.files.length; i++) {
                    const file = req.files[i] as Express.Multer.File;

                    // Create a writable stream to upload to GridFS
                    const uploadStream = housingReviewPictures.openUploadStream(
                        file.originalname,
                        {
                            contentType: file.mimetype,
                        }
                    );

                    // Upload the file buffer to GridFS
                    uploadStream.end(file.buffer);

                    // Wait for the file upload to finish and get the file ID
                    uploadStream.on('finish', () => {
                        pictureIds.push(uploadStream.id);
                    });

                    // Wait for the stream to finish before continuing
                    await new Promise((resolve) => {
                        uploadStream.on('finish', resolve);
                    });
                }

                updateData.pictures = pictureIds;
            }

            const updatedReview = await HousingReviews.findOneAndUpdate(
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
 * @route   DELETE /api/campus/housing/reviews/:id
 * @desc    Delete housing room review
 * @access  isHousingReviewOwner
 */
router.delete(
    '/reviews/:reviewId',
    isHousingReviewOwner,
    async (req: Request, res: Response) => {
        try {
            const review = await HousingReviews.findOneAndDelete({
                id: req.params.reviewId,
            });

            if (!review) {
                res.status(404).json({ message: 'Review not found' });
                return;
            }

            if (review.pictures && review.pictures.length > 0) {
                for (const pictureId of review.pictures) {
                    await housingReviewPictures.delete(new ObjectId(pictureId));
                }
            }

            res.status(200).json({ message: 'Review deleted' });
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }
);

/**
 * @route   GET /api/campus/housing/review_pictures/:id
 * @desc    Get review picture by id
 * @access  isAuthenticated
 */
router.get(
    '/review_pictures/:id',
    isAuthenticated,
    async (req: Request, res: Response) => {
        try {
            const fileId = new ObjectId(req.params.id);

            // Check if file exists
            const files = await housingReviewPictures
                .find({ _id: fileId })
                .toArray();
            if (!files.length) {
                res.status(404).json({ message: 'Profile picture not found' });
                return;
            }

            // Set appropriate headers
            res.set('Content-Type', files[0].contentType);

            // Create download stream
            const downloadStream =
                housingReviewPictures.openDownloadStream(fileId);

            // Pipe the file to the response
            downloadStream.pipe(res);

            downloadStream.on('error', () => {
                res.status(404).json({
                    message: 'Error retrieving profile picture',
                });
            });
        } catch (error) {
            res.status(400).json({ message: 'Invalid profile picture ID' });
        }
    }
);

/**
 * @route   GET /api/campus/housing/:building/ratings
 * @desc    Get ratings for all rooms in a building
 * @access  isAuthenticated
 */
router.get(
    '/:building/ratings',
    isAuthenticated,
    async (req: Request, res: Response) => {
        try {
            const buildingId = parseInt(req.params.building, 10);
            if (isNaN(buildingId)) {
                res.status(400).json({ message: 'Invalid building ID format' });
                return;
            }

            // Get all rooms for the building
            const rooms = await HousingRooms.find({
                housing_building_id: buildingId,
            });
            if (!rooms || rooms.length === 0) {
                res.json({});
                return;
            }

            const roomIds = rooms.map((r) => r.id);

            // Fetch all reviews for all rooms in one query
            const allReviews = await HousingReviews.find({
                housing_room_id: { $in: roomIds },
            });

            // Group reviews by room id and calculate averages
            const calcAverage = (arr: number[]) =>
                arr.length > 0
                    ? arr.reduce((sum, val) => sum + val, 0) / arr.length
                    : 0;

            const ratingsMap: Record<
                number,
                { overallAverage: number; reviewCount: number }
            > = {};

            for (const room of rooms) {
                const roomReviews = allReviews.filter(
                    (r) => r.housing_room_id === room.id
                );
                const overallRatings = roomReviews
                    .map((r) => r.overall_rating)
                    .filter(Boolean) as number[];
                ratingsMap[room.id] = {
                    overallAverage: calcAverage(overallRatings),
                    reviewCount: roomReviews.length,
                };
            }

            res.json(ratingsMap);
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }
);

export default router;
