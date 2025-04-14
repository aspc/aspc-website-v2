import { Request, Response, NextFunction } from "express";
import { SAMLUser } from "../models/People";

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
