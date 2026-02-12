import express, { Router } from 'express';
import { isAuthenticated } from '../middleware/authMiddleware';
import {
    studentHasVoted,
    getBallot,
    recordVotes,
} from '../controllers/VotingController';

const router: Router = express.Router();

/**
 * @route   GET /api/voting/votestatus/:electionId
 * @desc    Get whether or not a student has voted already
 * @access  isAuthenticated
 */
router.get('/votestatus/:electionId', isAuthenticated, studentHasVoted);

/**
 * @route   GET /api/voting/ballot/:electionId
 * @desc    Get the correct ballot based on student status
 * @access  isAuthenticated
 */
router.get('/ballot/:electionId', isAuthenticated, getBallot);

/**
 * @route   POST /api/voting/:electionId
 * @desc    Record a vote
 * @access  isAuthenticated
 */
router.post('/:electionId', isAuthenticated, recordVotes);

export default router;
