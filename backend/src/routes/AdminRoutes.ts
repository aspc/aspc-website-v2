import express, { Request, Response } from "express";
import PageContent from "../models/PageContent";

const router = express.Router();

// Get all pages
router.get("/", async (req: Request, res: Response) => {
    try {
        const pages = await PageContent.find({}, "id name");
        res.json(pages);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// Get the page by id
router.get("/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const page = await PageContent.findOne({ id });

        if (!page) {
            res.status(404).json({ message: "Page not found" });
            return;
        }

        res.json(page);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// Create a new page
router.post("/", async (req: Request, res: Response) => {
    try {
        const { id, name, content } = req.body;

        if (!id || !name || !content) {
            res.status(400).json({
                message: "All fields are required (id, name, content)",
            });
            return;
        }

        const newPage = new PageContent({ id, name, content });
        await newPage.save();

        res.status(201).json({ message: "Page successfully created" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// Update an existing page
router.put("/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { newId, name, content } = req.body;

        if (!name && !content) {
            res.status(400).json({
                message: "At least one field is required (name or content)",
            });
            return;
        }

        const page = await PageContent.findOneAndUpdate(
            { id },
            { id: newId, name, content },
            { new: true }
        );

        if (!page) {
            res.status(404).json("Page not found");
            return;
        }

        res.json({ message: "Page successfully updated", page });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// Delete a page by id
router.delete("/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const page = await PageContent.findOneAndDelete({ id });

        if (!page) {
            res.status(404).json({ message: "Page not found" });
            return;
        }

        res.status(200).json({ message: "Page deleted", page });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
