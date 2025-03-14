import express, { Request, Response } from "express";
import {
    HousingBuildings,
    HousingSuites,
    HousingRooms,
    HousingReviews,
} from "../models/Housing";
const router = express.Router();

// Get all buildings
router.get("/", async (req: Request, res: Response) => {
    try {
        const buildings = await HousingBuildings.find({});
        res.json(buildings);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// Get suites in a building
// NOTE: This route is not used since we don't have data for suites, consider removing
router.get("/:building/suites", async (req: Request, res: Response) => {
    try {
        // Get building id
        const { building } = req.params;
        const buildingData = await HousingBuildings.findOne({ name: building });
        const buildingId = buildingData?._id;
        if (!buildingId) {
            res.status(404).json({ message: "Building not found" });
            return;
        }

        // Get suites
        const suites = await HousingSuites.find({
            housing_building_id: buildingId,
        });
        if (!suites || suites.length === 0) {
            res.status(404).json({ message: "Suites not found" });
            return;
        }
        res.json(suites);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// Get all rooms in a building (by building id)
router.get("/:building/rooms", async (req: Request, res: Response) => {
    try {
        // Get building id
        const { buildingId } = req.params;
        if (!buildingId) {
            res.status(404).json({ message: "No building id provided" });
            return;
        }

        // Get all rooms in those suites
        const rooms = await HousingRooms.find({
            housing_building_id: buildingId,
        });

        res.json({ rooms });
    } catch (error) {
        console.error("Error fetching rooms:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Get housing reviews for a room
router.get("/:room/reviews", async (req: Request, res: Response) => {
    try {
        // Get room id
        const { roomId } = req.params;

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
        console.error("Error fetching reviews:", error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
