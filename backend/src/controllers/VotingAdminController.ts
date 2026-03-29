import { Request, Response } from 'express';
import { Election, Candidate, StudentBallotInfo, Vote } from '../models/Voting';

export const getAllElections = async (req: Request, res: Response) => {
    try {
        const elections = await Election.find({}).sort({ createdAt: -1 });
        res.json(elections);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getElectionById = async (req: Request, res: Response) => {
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
};

export const createElection = async (req: Request, res: Response) => {
    try {
        const {
            name,
            description,
            startDate,
            endDate,
            semester,
            allowVoterComment,
        } = req.body;

        if (!name || !startDate || !endDate || !semester) {
            res.status(400).json({ message: 'Missing required fields.' });
            return;
        }

        if (!['spring', 'fall', 'other'].includes(semester)) {
            res.status(400).json({ message: 'Invalid semester value.' });
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
            semester,
            allowVoterComment: !!allowVoterComment,
        });

        const savedElection = await election.save();
        res.status(201).json(savedElection);
    } catch (error) {
        res.status(400).json({ message: 'Error creating election' });
    }
};

export const updateElection = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            startDate,
            endDate,
            semester,
            allowVoterComment,
        } = req.body;

        if (!name || !startDate || !endDate || !semester) {
            res.status(400).json({ message: 'Missing required fields.' });
            return;
        }

        if (!['spring', 'fall', 'other'].includes(semester)) {
            res.status(400).json({ message: 'Invalid semester value.' });
            return;
        }

        if (new Date(startDate) >= new Date(endDate)) {
            res.status(400).json({
                message: 'Start date must be before end date.',
            });
            return;
        }

        const updateFields: Record<string, unknown> = {
            name,
            description: description || '',
            startDate,
            endDate,
            semester,
        };
        if (
            Object.prototype.hasOwnProperty.call(req.body, 'allowVoterComment')
        ) {
            updateFields.allowVoterComment = !!allowVoterComment;
        }

        const updatedElection = await Election.findByIdAndUpdate(
            id,
            updateFields,
            { new: true, runValidators: true }
        );

        if (!updatedElection) {
            res.status(404).json({ message: 'Election not found.' });
            return;
        }

        res.status(200).json(updatedElection);
    } catch (error) {
        res.status(400).json({ message: 'Error updating election' });
    }
};

export const deleteElection = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const election = await Election.findById(id);
        if (!election) {
            res.status(404).json({ message: 'Election not found' });
            return;
        }

        await Candidate.deleteMany({ electionId: id });
        await StudentBallotInfo.deleteMany({ electionId: id });
        await Vote.deleteMany({ electionId: id });

        await Election.findByIdAndDelete(id);

        res.status(200).json({ message: 'Election deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getCandidatesByElection = async (req: Request, res: Response) => {
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
};

export const createCandidate = async (req: Request, res: Response) => {
    try {
        const { electionId } = req.params;
        const { name, position, eligibleYears, housingLocation } = req.body;

        if (!name || !position) {
            res.status(400).json({ message: 'Missing required fields.' });
            return;
        }

        const candidate = new Candidate({
            electionId,
            name,
            position,
            eligibleYears: eligibleYears || [],
            housingLocation: housingLocation || [],
        });

        const savedCandidate = await candidate.save();

        // Sync eligibility to all candidates with the same position in this election
        await Candidate.updateMany(
            { electionId, position, _id: { $ne: savedCandidate._id } },
            {
                eligibleYears: eligibleYears || [],
                housingLocation: housingLocation || [],
            }
        );

        res.status(201).json(savedCandidate);
    } catch (error) {
        res.status(400).json({ message: 'Error creating candidate' });
    }
};

export const updateCandidate = async (req: Request, res: Response) => {
    try {
        const { electionId, candidateId } = req.params;
        const { name, position } = req.body;

        if (!name || !position) {
            res.status(400).json({ message: 'Missing required fields.' });
            return;
        }

        const { eligibleYears, housingLocation } = req.body;

        const updatedCandidate = await Candidate.findOneAndUpdate(
            { _id: candidateId, electionId },
            {
                name,
                position,
                eligibleYears: eligibleYears || [],
                housingLocation: housingLocation || [],
            },
            { new: true, runValidators: true }
        );

        if (!updatedCandidate) {
            res.status(404).json({ message: 'Candidate not found.' });
            return;
        }

        // Sync eligibility to all candidates with the same position in this election
        await Candidate.updateMany(
            { electionId, position, _id: { $ne: candidateId } },
            {
                eligibleYears: eligibleYears || [],
                housingLocation: housingLocation || [],
            }
        );

        res.status(200).json(updatedCandidate);
    } catch (error) {
        res.status(400).json({ message: 'Error updating candidate' });
    }
};

export const deleteCandidate = async (req: Request, res: Response) => {
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
        res.status(500).json({ message: 'Server error' });
    }
};
