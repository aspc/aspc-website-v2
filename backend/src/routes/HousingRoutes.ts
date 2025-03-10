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

// Get all rooms in a building
router.get("/:building/rooms", async (req: Request, res: Response) => {
    try {
        // Get building id
        const { building } = req.params;
        const buildingData = await HousingBuildings.findOne({ name: building });
        const buildingId = buildingData?._id;
        if (!buildingId) {
            res.status(404).json({ message: "Building not found" });
            return;
        }

        // Get all suites in the building
        const suites = await HousingSuites.find({
            housing_building_id: buildingId,
        });
        if (!suites || suites.length === 0) {
            res.json({ rooms: [] });
            return;
        }

        // Get all suite IDs
        const suiteIds = suites.map((suite) => suite._id);

        // Get all rooms in those suites
        const rooms = await HousingRooms.find({
            housing_suite_id: { $in: suiteIds },
        });

        res.json({ rooms });
    } catch (error) {
        console.error("Error fetching rooms:", error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
