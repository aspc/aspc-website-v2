import express, { Request, Response } from 'express';
import EngageEventsService from '../services/EngageEventsService';

const router = express.Router();


// GET all items
router.get('/', async (req: Request, res: Response) => {
  try {
    const items = await EngageEventsService.getEvents();
    res.json(items);
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Server error', error: errorMessage });
  }
});

// GET item by id
router.get('/:id', async (req: Request, res: Response) => {
  // Implementation
});



export default router;
