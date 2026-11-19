import express from 'express';
import { isAdmin, isRoleAllowed } from '../../middleware/authMiddleware';
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
router.post('/', isRoleAllowed('director_of_elections'), createElection);
router.put('/:id', isRoleAllowed('director_of_elections'), updateElection);
router.delete('/:id', isRoleAllowed('director_of_elections'), deleteElection);

// CANDIDATE ROUTES
router.get('/:electionId/candidates', isAdmin, getCandidatesByElection);
router.post(
    '/:electionId/candidates',
    isRoleAllowed('director_of_elections'),
    createCandidate
);
router.put(
    '/:electionId/candidates/:candidateId',
    isRoleAllowed('director_of_elections'),
    updateCandidate
);
router.delete(
    '/:electionId/candidates/:candidateId',
    isRoleAllowed('director_of_elections'),
    deleteCandidate
);

export default router;
