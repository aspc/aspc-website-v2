import express, { Request, Response } from "express";
import EngageEventsService from "../services/EngageEventsService";

const router = express.Router();

// Helper function to get start and end times for day, week and month
const getTimeRange = (
    type: "day" | "week" | "month"
): { start: number; end: number } => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (type) {
        case "day":
            start = new Date(now.setHours(0, 0, 0, 0)); // Start at midnight
            end = new Date(now.setHours(23, 59, 59, 999)); // End at 11:59pm
            break;
        case "week":
            start = new Date(now);
            start.setDate(now.getDate() - now.getDay()); // Start of the week (Sunday)
            start.setHours(0, 0, 0, 0); // Start at midnight on Sunday

            end = new Date(start);
            end.setDate(start.getDate() + 6); // End of the week (Saturday)
            end.setHours(23, 59, 59, 999); // End at 11:59pm on Saturday
            break;
        case "month":
            start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0); // First day of the current month
            end = new Date(
                now.getFullYear(),
                now.getMonth() + 1,
                0,
                23,
                59,
                59,
                999
            ); // Last day of the month
            break;
        default:
            throw new Error("Invalid time range");
    }

    return { start: start.getTime(), end: end.getTime() };
};

// GET all items (from 7 days before now to 7 days after now)
// TODO: Do we even need this??
router.get("/", async (req: Request, res: Response) => {
    try {
        // Get the start and end dates
        const now = new Date();
        const startTime = new Date(now);
        startTime.setDate(startTime.getDate() - 7);
        const endTime = new Date(now);
        endTime.setDate(endTime.getDate() + 7);

        const events = await EngageEventsService.getEvents(
            startTime.getTime(),
            endTime.getTime()
        );
        res.json(events);
    } catch (error) {
        console.error(error);
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ message: "Server error", error: errorMessage });
    }
});

// GET all events for today
router.get("/day", async (req: Request, res: Response) => {
    try {
        const { start, end } = getTimeRange("day");
        const events = await EngageEventsService.getEvents(start, end);
        res.json(events);
    } catch (error) {
        console.error(error);
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ message: "Server error", error: errorMessage });
    }
});

// GET all events for the current week
router.get("/week", async (req: Request, res: Response) => {
    try {
        const { start, end } = getTimeRange("week");
        const events = await EngageEventsService.getEvents(start, end);
        res.json(events);
    } catch (error) {
        console.error(error);
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ message: "Server error", error: errorMessage });
    }
});

// GET all events for the current month
router.get("/month", async (req: Request, res: Response) => {
    try {
        const { start, end } = getTimeRange("month");
        const events = await EngageEventsService.getEvents(start, end);
        res.json(events);
    } catch (error) {
        console.error(error);
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ message: "Server error", error: errorMessage });
    }
});

// GET item by id
router.get("/:id", async (req: Request, res: Response) => {
    //TODO: Implementation
});

export default router;
