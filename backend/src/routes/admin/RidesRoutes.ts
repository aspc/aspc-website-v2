import express from 'express';
import { isAdmin } from '../../middleware/authMiddleware';
import {
    getRideMatchingStatus,
    runRideMatching,
} from '../../controllers/RideMatchingController';

const router = express.Router();

router.get('/status', isAdmin, getRideMatchingStatus);
router.post('/run', isAdmin, runRideMatching);

export default router;
