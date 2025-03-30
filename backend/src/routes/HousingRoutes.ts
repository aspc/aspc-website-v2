import express, { Request, Response } from "express";
import multer from "multer";
import {
    HousingBuildings,
    HousingRooms,
    HousingReviews,
} from "../models/Housing";
import { housingReviewPictures } from "../server";
import { ObjectId } from 'mongodb';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Get all buildings
router.get("/", async (req: Request, res: Response) => {
    try {
        const buildings = await HousingBuildings.find({});
        res.json(buildings);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// Get a building by id
router.get("/:building", async (req: Request, res: Response) => {
    try {
        // Get building id
        const buildingId = parseInt(req.params.building, 10);

        // Check if conversion is valid
        if (isNaN(buildingId)) {
            res.status(400).json({ message: "Invalid building ID format" });
            return;
        }

        // Find building by id
        const buildingData = await HousingBuildings.findOne({ id: buildingId });
        if (!buildingData) {
            res.status(404).json({ message: "Building not found" });
            return;
        }

        // Return building
        res.json(buildingData);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// Get suites in a building
// TODO: This route is not used since we don't have data for suites, consider removing
// router.get("/:building/suites", async (req: Request, res: Response) => {
//     try {
//         // Get building id
//         const { building } = req.params;
//         if (!building) {
//             res.status(404).json({ message: "No building id provided" });
//             return;
//         }

//         // Get suites
//         const suites = await HousingSuites.find({
//             housing_building_id: building,
//         });
//         if (!suites || suites.length === 0) {
//             res.status(404).json({ message: "Suites not found" });
//             return;
//         }
//         res.json(suites);
//     } catch (error) {
//         res.status(500).json({ message: "Server error" });
//     }
// });

// Get all rooms in a building (by building id)
router.get("/:building/rooms", async (req: Request, res: Response) => {
    try {
        // Get building id
        const buildingId = parseInt(req.params.building, 10);

        // Check if conversion is valid
        if (isNaN(buildingId)) {
            res.status(400).json({ message: "Invalid building ID format" });
            return;
        }

        // Get all rooms in the building
        const rooms = await HousingRooms.find({
            housing_building_id: buildingId,
        }).sort({ room_number: 1 });

        if (!rooms || rooms.length === 0) {
            res.status(404).json({ message: "Rooms not found" });
            return;
        }

        res.json(rooms);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// Get housing reviews for a room
router.get("/:room/reviews", async (req: Request, res: Response) => {
    try {
        // Get room id and convert it to a number
        const roomId = parseInt(req.params.room, 10);

        // Check if conversion is valid
        if (isNaN(roomId)) {
            res.status(400).json({ message: "Invalid room ID format" });
            return;
        }

        // Find the room by room id
        const roomData = await HousingRooms.findOne({ id: roomId });

        if (!roomData) {
            res.status(404).json({ message: "Room not found" });
            return;
        }

        // Get all reviews for the room
        const reviews = await HousingReviews.find({
            housing_room_id: roomId,
        });

        // Calculate average ratings
        if (reviews.length > 0) {
            const overallRatings = reviews
                .map((r) => r.overall_rating)
                .filter(Boolean) as number[];
            const quietRatings = reviews
                .map((r) => r.quiet_rating)
                .filter(Boolean) as number[];
            const layoutRatings = reviews
                .map((r) => r.layout_rating)
                .filter(Boolean) as number[];
            const temperatureRatings = reviews
                .map((r) => r.temperature_rating)
                .filter(Boolean) as number[];

            const calcAverage = (arr: number[]) =>
                arr.length > 0
                    ? arr.reduce((sum, val) => sum + val, 0) / arr.length
                    : 0;

            const averages = {
                overallAverage: calcAverage(overallRatings),
                quietAverage: calcAverage(quietRatings),
                layoutAverage: calcAverage(layoutRatings),
                temperatureAverage: calcAverage(temperatureRatings),
                reviewCount: reviews.length,
            };

            // Return reviews and averages as well as the room data itself
            res.json({
                room: roomData,
                reviews: reviews,
                averages: averages,
            });
            return;
        }

        // Return reviews (even if empty)
        res.json({
            room: roomData,
            reviews: reviews,
            averages: {
                overallAverage: 0,
                quietAverage: 0,
                layoutAverage: 0,
                temperatureAverage: 0,
                reviewCount: 0,
            },
        });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

router.get("/:buildingId/:roomNumber/reviews", async (req: Request, res: Response) => {
    try {
        // Get room id and convert it to a number
        const { buildingId, roomNumber} = req.params;
        const buildingIdNumber = parseInt(buildingId, 10); 
  
        // Find the room by building and room number
        if (isNaN(buildingIdNumber)) {
            res.status(400).json({ message: "Invalid building ID format" });
            return;
        }

        const roomData = await HousingRooms.findOne({ housing_building_id: buildingIdNumber, room_number: roomNumber });

        if (!roomData) {
            res.status(404).json({ message: "Room not found" });
            return;
        }

        // Get all reviews for the room using room id
        const reviews = await HousingReviews.find({
            housing_room_id: roomData.id,
        });

        // Calculate average ratings
        if (reviews.length > 0) {
            const overallRatings = reviews
                .map((r) => r.overall_rating)
                .filter(Boolean) as number[];
            const quietRatings = reviews
                .map((r) => r.quiet_rating)
                .filter(Boolean) as number[];
            const layoutRatings = reviews
                .map((r) => r.layout_rating)
                .filter(Boolean) as number[];
            const temperatureRatings = reviews
                .map((r) => r.temperature_rating)
                .filter(Boolean) as number[];

            const calcAverage = (arr: number[]) =>
                arr.length > 0
                    ? arr.reduce((sum, val) => sum + val, 0) / arr.length
                    : 0;

            const averages = {
                overallAverage: calcAverage(overallRatings),
                quietAverage: calcAverage(quietRatings),
                layoutAverage: calcAverage(layoutRatings),
                temperatureAverage: calcAverage(temperatureRatings),
                reviewCount: reviews.length,
            };

            // Return reviews and averages as well as the room data itself
            res.json({
                room: roomData,
                reviews: reviews,
                averages: averages,
            });
            return;
        }

        // Return reviews (even if empty)
        res.json({
            room: roomData,
            reviews: reviews,
            averages: {
                overallAverage: 0,
                quietAverage: 0,
                layoutAverage: 0,
                temperatureAverage: 0,
                reviewCount: 0,
            },
        });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

router.post("/:buildingId/:roomNumber/reviews", upload.array("pictures"), async (req: Request, res: Response) => {
    try {
        const pictureIds: ObjectId[] = [];

        // Upload each file to GridFS
        if (Array.isArray(req.files)) {
            for (let i = 0; i < req.files.length; i++) {
                const file = req.files[i] as Express.Multer.File;
        
                // Create a writable stream to upload to GridFS
                const uploadStream = housingReviewPictures.openUploadStream(file.originalname, {
                contentType: file.mimetype,
                });
        
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
        }

        // need to find new max id for the new review
        const result = await HousingReviews.aggregate([
            {
                $group: {
                _id: null,            // No need to group, so _id is null
                maxValue: { $max: "$id" }  // Find the max value of fieldName
                }
            }
            ]);
        
        const maxId = result[0].maxValue + 1;
        
        // Find room id by building and room number
        const { buildingId, roomNumber} = req.params;
        const buildingIdNumber = parseInt(buildingId, 10); 
  
        if (isNaN(buildingIdNumber)) {
            res.status(400).json({ message: "Invalid building ID format" });
            return;
        }

        const roomData = await HousingRooms.findOne({ housing_building_id: buildingIdNumber, room_number: roomNumber });

        if (!roomData) {
            res.status(404).json({ message: "Room not found" });
            return;
        }
        
        // parse review fields from request
        const { overall, quiet, layout, temperature, comments, email } = req.body;

        // construct review data
        const reviewData = {
            id: maxId,
            overall_rating: overall,
            quiet_rating: quiet,
            layout_rating: layout,
            temperature_rating: temperature,
            comments: comments,
            housing_room_id: roomData.id, 
            user_email: email, 
            pictures: pictureIds, 
        };
        
        const review = new HousingReviews(reviewData);
        await review.save();

        req.files = undefined; // free up memory
        res.status(201).json({ message: "Review saved successfully" });
    } catch (error) {
        res.status(400).json({ message: "Error creating member" });
    }
});

router.patch("/reviews/:id", upload.array("pictures"), async (req: Request, res: Response) => {
    try {
        if (!req.files && !req.body) {
            return;
        }
    
        const id = req.params.id;
        const oldReview = await HousingReviews.findOne({ id: id });
        
        if (!oldReview) {
            console.log("cant find old review")
            res.status(404).json({ message: "Review not found" });
            return;
        }
        
        let updateData = req.body;
        const pictureIds: ObjectId[] = [];

        if (Array.isArray(req.files) && req.files.length > 0) {
            // if new pictures provided, delete old pictures from database
            if (oldReview.pictures && oldReview.pictures.length > 0) {
                for (const pictureId of oldReview.pictures) {
                    const oldPictureId = new ObjectId(pictureId);
                    console.log(`Deleting image with ObjectId: ${oldPictureId}`);
              
                    await housingReviewPictures.delete(oldPictureId);
                    console.log(`Image with ObjectId ${oldPictureId} deleted from GridFS`);
                }
            }

            for (let i = 0; i < req.files.length; i++) {
                const file = req.files[i] as Express.Multer.File;
        
                // Create a writable stream to upload to GridFS
                const uploadStream = housingReviewPictures.openUploadStream(file.originalname, {
                contentType: file.mimetype,
                });
        
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

            updateData = { ...updateData, pictures: pictureIds };
        }

        const updatedReview = await HousingReviews.findOneAndUpdate(
            { id: id },
            updateData,
            { new: true }
        );
        res.status(200).json({
            message: "Review updated",
            updatedReview,
        });

    } catch (error) {
        console.error("update error: ", error);
        res.status(400).json({ message: "Error updating review" });
    }
});

router.delete("/reviews/:id", async (req: Request, res: Response) => {
    try {
        const review = await HousingReviews.findOneAndDelete({ id: req.params.id });

        if (!review) {
            res.status(404).json({ message: "Review not found" });
        }

        res.status(200).json({ message: "Review deleted" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// Get profile picture by id
router.get("/review_pictures/:id", async (req: Request, res: Response) => {
    try {
        const fileId = new ObjectId(req.params.id);

        // Check if file exists
        const files = await housingReviewPictures.find({ _id: fileId }).toArray();
        if (!files.length) {
            res.status(404).json({ message: "Profile picture not found" });
            return;
        }

        // Set appropriate headers
        res.set("Content-Type", files[0].contentType);

        // Create download stream
        const downloadStream = housingReviewPictures.openDownloadStream(fileId);

        // Pipe the file to the response
        downloadStream.pipe(res);

        downloadStream.on("error", () => {
            res.status(404).json({
                message: "Error retrieving profile picture",
            });
        });
    } catch (error) {
        res.status(400).json({ message: "Invalid profile picture ID" });
    }
});

export default router;
