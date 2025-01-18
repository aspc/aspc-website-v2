import express, { Express, Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { GridFSBucket } from 'mongodb';
import userRoutes from './routes/UserRoutes';
import authRoutes from './routes/AuthRoutes';
import adminRoutes from './routes/AdminRoutes';
import staffRoutes from './routes/StaffRoutes';

dotenv.config();

const app: Express = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Test endpoint for frontend
app.get('/api/test', (req: Request, res: Response) => {
  res.json({ message: 'ASPC API is running!' });
});

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school-platform';

let bucket: GridFSBucket;

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    const db = mongoose.connection.db;

    if (!db) {
      throw new Error('Database connection is not ready');
    }

    bucket = new GridFSBucket(db, {
      bucketName: 'uploads', // Default bucket name, you can change it if needed
    });
    console.log('Uploads bucket created')
  })
  .catch((err) => console.error('MongoDB connection error:', err));

export { bucket };

// Routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin/pages', adminRoutes);
app.use('/api/members', staffRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
