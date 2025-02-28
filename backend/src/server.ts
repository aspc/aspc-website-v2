import express, { Express, Request, Response } from "express";
import mongoose from "mongoose";
import MongoStore from "connect-mongo";
import cors from "cors";
import dotenv from "dotenv";
import { GridFSBucket } from "mongodb";
import userRoutes from "./routes/UserRoutes";
import authRoutes from "./routes/AuthRoutes";
import pageRoutes from "./routes/admin/PagesRoutes";
import staffRoutes from "./routes/admin/StaffRoutes";
import eventRoutes from "./routes/EventsRoutes";
import session from "express-session";
import https from "https";
import http from "http";
import fs from "fs";
import path from "path";
dotenv.config();

const app: Express = express();

// Middleware
app.use(
    cors({
        origin: [
            "http://localhost:3000",
            "https://localhost:3001",
            "https://aspc-website-v2.vercel.app",
            "https://pomonastudents.org",
        ],
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        credentials: true,
    })
);
app.use(express.json());

app.set("trust proxy", 1); // Required for secure cookies

// Connect to MongoDB
const MONGODB_URI =
    process.env.MONGODB_URI || "mongodb://localhost:27017/school-platform";

// Session
app.use(
    session({
        secret: process.env.SESSION_SECRET || "secretlongpassword",
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: MONGODB_URI,
            ttl: 24 * 60 * 60, // = 1 day (in seconds)
            autoRemove: "native", // Use MongoDB's TTL index
        }),
        cookie: {
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        },
    })
);

// Test endpoint for frontend
app.get("/api/test", (req: Request, res: Response) => {
    res.json({ message: "ASPC API is running!" });
});

let bucket: GridFSBucket;

mongoose
    .connect(MONGODB_URI)
    .then(() => {
        console.log("Connected to MongoDB");
        const db = mongoose.connection.db;

        if (!db) {
            throw new Error("Database connection is not ready");
        }

        // Create GridFS bucket for uploads
        bucket = new GridFSBucket(db, {
            bucketName: "uploads",
        });
        console.log("Uploads bucket created");
    })
    .catch((err) => console.error("MongoDB connection error:", err));

export { bucket };

// Routes
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin/pages", pageRoutes);
app.use("/api/members", staffRoutes);
app.use("/api/events", eventRoutes);

const PORT = process.env.PORT || 5000;

// Check environment to determine server type
if (process.env.NODE_ENV === "development") {
    const httpsOptions = {
        key: fs.readFileSync(path.join(__dirname, "../certs/localhost.key")),
        cert: fs.readFileSync(path.join(__dirname, "../certs/localhost.crt")),
    };

    // Development: HTTPS server with local certificates
    const server = https.createServer(httpsOptions, app);
    server.listen(PORT, () => {
        console.log(`Secure server (HTTPS) running on port ${PORT}`);
    });
} else {
    // Production: HTTP server (SSL termination at load balancer)
    const server = http.createServer(app);
    server.listen(PORT, () => {
        console.log(`Server (HTTP) running on port ${PORT}`);
    });
}
