import express, { Express, Request, Response } from 'express';
import mongoose from 'mongoose';
import MongoStore from 'connect-mongo';
import cors from 'cors';
import dotenv from 'dotenv';
import { GridFSBucket } from 'mongodb';
import authRoutes from './routes/AuthRoutes';
import pageRoutes from './routes/admin/PagesRoutes';
import staffRoutes from './routes/admin/StaffRoutes';
import eventRoutes from './routes/EventsRoutes';
import housingRoutes from './routes/HousingRoutes';
import coursesRoutes from './routes/CoursesRoutes';
import instructorsRoutes from './routes/InstructorsRoutes';
import reviewsRoutes from './routes/ReviewsRoutes';
import forumRoutes from './routes/ForumRoutes';
import votingRoutes from './routes/VotingRoutes';
import session from 'express-session';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
dotenv.config();

// MAIN SERVER FILE
const app: Express = express();

// Middleware
app.use(
    cors({
        origin: [
            'http://localhost:3000',
            'https://localhost:3001',
            'https://aspc-website-v2.vercel.app',
            'https://pomonastudents.org',
            'https://api.pomonastudents.org',
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    })
);
app.use(express.json());

app.set('trust proxy', 1); // Required for secure cookies

// Connect to MongoDB
const MONGODB_URI =
    process.env.NODE_ENV === 'production'
        ? process.env.MONGODB_URI
        : process.env.MONGODB_TEST_URI;

if (!MONGODB_URI) {
    throw new Error(
        'MONGODB_URI is not defined. Please check your environment variables.'
    );
}

// Session
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'secretlongpassword',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: MONGODB_URI,
            ttl: 24 * 60 * 60, // = 1 day (in seconds)
            autoRemove: 'native', // Use MongoDB's TTL index
        }),
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            domain:
                process.env.NODE_ENV === 'production'
                    ? '.pomonastudents.org'
                    : undefined,
        },
    })
);

let bucket: GridFSBucket;
let housingReviewPictures: GridFSBucket;

mongoose
    .connect(MONGODB_URI)
    .then(() => {
        console.log(`Connected to ${process.env.NODE_ENV} MongoDB`);
        const db = mongoose.connection.db;

        if (!db) {
            throw new Error('Database connection is not ready');
        }

        // Create GridFS bucket for profile picture uploads
        bucket = new GridFSBucket(db, {
            bucketName: 'uploads',
        });
        console.log('Profile picture uploads bucket created');

        housingReviewPictures = new GridFSBucket(db, {
            bucketName: 'housingreviewpictures',
        });

        console.log('Housing review uploads bucket created');
    })
    .catch((err) => console.error('MongoDB connection error:', err));

export { bucket, housingReviewPictures };

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin/pages', pageRoutes);
app.use('/api/members', staffRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/campus/housing', housingRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/instructors', instructorsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/openforum', forumRoutes);
app.use('/api/voting', votingRoutes);

const PORT = process.env.PORT || 5000;

// Check environment to determine server type
if (process.env.NODE_ENV === 'development') {
    const httpsOptions = {
        key: fs.readFileSync(path.join(__dirname, '../certs/localhost.key')),
        cert: fs.readFileSync(path.join(__dirname, '../certs/localhost.crt')),
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
