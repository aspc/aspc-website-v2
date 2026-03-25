import express from 'express';
import { isAdmin } from '../../middleware/authMiddleware';
import {
    getAllElections,
    getElectionById,
    createElection,
    updateElection,
    deleteElection,
    getCandidatesByElection,
    createCandidate,
    updateCandidate,
    deleteCandidate,
} from '../../controllers/VotingAdminController';

const router = express.Router();

// ELECTION ROUTES
router.get('/', isAdmin, getAllElections);
router.get('/:id', isAdmin, getElectionById);
router.post('/', isAdmin, createElection);
router.put('/:id', isAdmin, updateElection);
router.delete('/:id', isAdmin, deleteElection);

// CANDIDATE ROUTES
router.get('/:electionId/candidates', isAdmin, getCandidatesByElection);
router.post('/:electionId/candidates', isAdmin, createCandidate);
router.put('/:electionId/candidates/:candidateId', isAdmin, updateCandidate);
router.delete('/:electionId/candidates/:candidateId', isAdmin, deleteCandidate);

export default router;
