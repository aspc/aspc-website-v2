import express, { Request, Response } from 'express';
import User from '../models/User';


const router = express.Router();

// Get all users
router.get('/', async (req: Request, res: Response) => {
  try {
    const users = await User.find().select('-password'); // Exclude password field
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a user
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, name, password, is_admin } = req.body;
    const user = new User({
      email,
      name,
      password, // Note: In production, you should hash this password
      is_admin
    });
    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error creating user' });
  }
});

export default router;