import express, { Request, Response } from 'express';
import {
    Election,
    Candidate,
    StudentBallotInfo,
    Vote,
} from '../../models/Voting';
import { SAMLUser } from '../../models/People';
import { isAdmin, isAuthenticated } from '../../middleware/authMiddleware';

const router = express.Router();

// ELECTION ROUTES

/**
 * @route   GET /api/admin/elections
 * @desc    Get all elections
 * @access  Admin
 */
router.get('/', isAdmin, async (req: Request, res: Response) => {
    try {
        const elections = await Election.find({}).sort({ createdAt: -1 });
        res.json(elections);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   GET /api/admin/elections/:id
 * @desc    Get election by id
 * @access  Admin
 */
router.get('/:id', isAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const election = await Election.findById(id);

        if (!election) {
            res.status(404).json({ message: 'Election not found' });
            return;
        }

        res.json(election);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   POST /api/admin/elections
 * @desc    Create new election
 * @access  Admin
 */
router.post('/', isAdmin, async (req: Request, res: Response) => {
    try {
        const { name, description, startDate, endDate, isActive } = req.body;

        if (!name || !startDate || !endDate) {
            res.status(400).json({ message: 'Missing required fields.' });
            return;
        }

        if (new Date(startDate) >= new Date(endDate)) {
            res.status(400).json({
                message: 'Start date must be before end date.',
            });
            return;
        }

        const election = new Election({
            name,
            description: description || '',
            startDate,
            endDate,
            isActive: isActive || false,
        });

        const savedElection = await election.save();
        res.status(201).json(savedElection);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Error creating election' });
    }
});

/**
 * @route   PUT /api/admin/elections/:id
 * @desc    Update election by id
 * @access  Admin
 */
router.put('/:id', isAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, startDate, endDate, isActive } = req.body;

        if (!name || !startDate || !endDate) {
            res.status(400).json({ message: 'Missing required fields.' });
            return;
        }

        if (new Date(startDate) >= new Date(endDate)) {
            res.status(400).json({
                message: 'Start date must be before end date.',
            });
            return;
        }

        const updatedElection = await Election.findByIdAndUpdate(
            id,
            {
                name,
                description: description || '',
                startDate,
                endDate,
                isActive: isActive !== undefined ? isActive : false,
            },
            { new: true, runValidators: true }
        );

        if (!updatedElection) {
            res.status(404).json({ message: 'Election not found.' });
            return;
        }

        res.status(200).json(updatedElection);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Error updating election' });
    }
});

/**
 * @route   DELETE /api/admin/elections/:id
 * @desc    Delete election by id
 * @access  Admin
 */
router.delete('/:id', isAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Check if voting has started
        const election = await Election.findById(id);
        if (!election) {
            res.status(404).json({ message: 'Election not found' });
            return;
        }

        if (new Date() >= new Date(election.startDate)) {
            res.status(400).json({
                message:
                    'Cannot delete election after voting period has started.',
            });
            return;
        }

        // Delete associated candidates, ballot info, and votes
        await Candidate.deleteMany({ electionId: id });
        await StudentBallotInfo.deleteMany({ electionId: id });
        await Vote.deleteMany({ electionId: id });

        await Election.findByIdAndDelete(id);
        res.status(200).json({ message: 'Election deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// CANDIDATE ROUTES

/**
 * @route   GET /api/admin/elections/:electionId/candidates
 * @desc    Get all candidates for an election
 * @access  Admin
 */
router.get(
    '/:electionId/candidates',
    isAdmin,
    async (req: Request, res: Response) => {
        try {
            const { electionId } = req.params;

            const election = await Election.findById(electionId);
            if (!election) {
                res.status(404).json({ message: 'Election not found' });
                return;
            }

            const candidates = await Candidate.find({ electionId }).sort({
                position: 1,
                name: 1,
            });
            res.json(candidates);
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }
);

/**
 * @route   POST /api/admin/elections/:electionId/candidates
 * @desc    Add candidate to election
 * @access  Admin
 */
router.post(
    '/:electionId/candidates',
    isAdmin,
    async (req: Request, res: Response) => {
        try {
            const { electionId } = req.params;
            const { name, position } = req.body;

            if (!name || !position) {
                res.status(400).json({ message: 'Missing required fields.' });
                return;
            }

            const candidate = new Candidate({
                electionId,
                name,
                position,
            });

            const savedCandidate = await candidate.save();
            res.status(201).json(savedCandidate);
        } catch (error) {
            console.error(error);
            res.status(400).json({ message: 'Error creating candidate' });
        }
    }
);

/**
 * @route   PUT /api/admin/elections/:electionId/candidates/:candidateId
 * @desc    Update candidate
 * @access  Admin
 */
router.put(
    '/:electionId/candidates/:candidateId',
    isAdmin,
    async (req: Request, res: Response) => {
        try {
            const { electionId, candidateId } = req.params;
            const { name, position } = req.body;

            if (!name || !position) {
                res.status(400).json({ message: 'Missing required fields.' });
                return;
            }

            const updatedCandidate = await Candidate.findOneAndUpdate(
                { _id: candidateId, electionId },
                { name, position },
                { new: true, runValidators: true }
            );

            if (!updatedCandidate) {
                res.status(404).json({ message: 'Candidate not found.' });
                return;
            }

            res.status(200).json(updatedCandidate);
        } catch (error) {
            console.error(error);
            res.status(400).json({ message: 'Error updating candidate' });
        }
    }
);

/**
 * @route   DELETE /api/admin/elections/:electionId/candidates/:candidateId
 * @desc    Delete candidate
 * @access  Admin
 */
router.delete(
    '/:electionId/candidates/:candidateId',
    isAdmin,
    async (req: Request, res: Response) => {
        try {
            const { electionId, candidateId } = req.params;

            const candidate = await Candidate.findOneAndDelete({
                _id: candidateId,
                electionId,
            });

            if (!candidate) {
                res.status(404).json({ message: 'Candidate not found' });
                return;
            }

            res.status(200).json({ message: 'Candidate deleted successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

export default router;
