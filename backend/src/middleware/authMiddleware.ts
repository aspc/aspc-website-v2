import { Request, Response, NextFunction } from "express";
import { SAMLUser } from "../models/People";
import { CourseReviews } from "../models/Courses";
import { HousingReviews } from "../models/Housing";

export const isAuthenticated = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Check if user is in session
    if (!(req.session as any).user) {
        res.status(401).json({ message: "Authentication required" });
        return;
    }

    next();
};

export const isAdmin = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // First check if user is authenticated
    if (!(req.session as any).user) {
        res.status(401).json({ message: "Authentication required" });
        return;
    }

    const azureId = (req.session as any).user.id;

    try {
        // Find the user in the database
        const user = await SAMLUser.findOne({ id: azureId });

        // Check if user exists and is an admin
        if (!user || !user.isAdmin) {
            res.status(403).json({ message: "Admin access required" });
            return;
        }

        // User is authenticated and is an admin
        next();
    } catch (error) {
        console.error("Admin verification error:", error);
        res.status(500).json({ message: "Server error" });
        return;
    }
};

export const isCourseReviewOwner = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // First check if user is authenticated and get the user ID from session
    const sessionUserEmail = (req.session as any).user.email;
    if (!sessionUserEmail) {
        res.status(401).json({ message: "Authentication required" });
        return;
    }

    const { reviewId } = req.params;

    const review = await CourseReviews.findOne({ id: reviewId });

    if (!review) {
        res.status(404).json({ message: "Review not found" });
        return;
    }

    if (review.user_email != sessionUserEmail) {
        res.status(403).json({
            message: "You are not authorized to modify this review",
        });
        return;
    }

    next();
};

export const isHousingReviewOwner = async (req: Request, res: Response, next: NextFunction) => {

    // First check if user is authenticated and get the user ID from session
    const sessionUserEmail = (req.session as any).user.email;
    if (!sessionUserEmail) {
        res.status(401).json({ message: "Authentication required" });
        return;
    }

    const { reviewId } = req.params;

    const review = await HousingReviews.findOne({ id: reviewId });

    if (!review) {
        res.status(404).json({ message: "Review not found" });
        return;
    }

    if (review.user_email != sessionUserEmail) {
        res.status(403).json({
            message: "You are not authorized to modify this review",
        });
        return;
    }

    next();
};