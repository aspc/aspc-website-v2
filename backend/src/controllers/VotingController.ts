import mongoose from 'mongoose';
import { ClientSession } from 'mongoose';

import { Request, Response } from 'express';
import { Candidate, Election, StudentBallotInfo, Vote } from '../models/Voting';
import {
    getPositionsForSemester,
    SENATE_POSITIONS,
} from '../constants/election.constants';

export interface VoteRequest {
    position: string;
    ranking: string[];
}

export const getElection = async (req: Request, res: Response) => {
    try {
        // Find the most recently started election
        const election = await Election.findOne({}).sort({ startDate: -1 });
        console.log(election);

        if (!election) {
            res.status(404).json({ message: 'No election found.' });
            return;
        }

        res.status(200).json(election);
    } catch (error) {
        console.error('Error fetching election:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const studentHasVoted = async (req: Request, res: Response) => {
    try {
        const { electionId } = req.params;

        const sessionUserEmail = (req.session as any).user.email;
        const studentInfo = await StudentBallotInfo.findOne({
            electionId: electionId,
            email: sessionUserEmail,
        });

        if (!studentInfo) {
            res.status(404).json({
                status: 'error',
                message: 'Student not registered in election',
            });
            return;
        }

        res.status(200).json({
            status: 'success',
            hasVoted: studentInfo.hasVoted,
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
        });
    }
};

// Unified ballot fetching: eligibility is stored on each candidate.
// For spring/fall, positions must also be valid for that semester.
// For "other", all positions are custom so only eligibility is checked.

export const getEligibleCandidates = async (
    electionId: string,
    semester: 'spring' | 'fall' | 'other',
    year: number,
    campus: string
) => {
    const allCandidates = await Candidate.find({ electionId }).sort({
        position: 1,
        name: 1,
    });

    const validPositions = getPositionsForSemester(semester);

    const presetPositions = new Set(Object.values(SENATE_POSITIONS));

    return allCandidates.filter((c) => {
        // For spring/fall, preset positions must be valid for that semester.
        const isPreset = presetPositions.has(c.position as any);
        if (
            isPreset &&
            validPositions !== null &&
            !validPositions.includes(c.position as any)
        ) {
            return false;
        }

        // Filter by stored eligibility
        const ey = c.eligibleYears || [];
        const hl = c.housingLocation || [];
        if (ey.length > 0 && !ey.includes(year)) return false;
        if (hl.length > 0 && !hl.includes(campus)) return false;

        return true;
    });
};

export const getBallot = async (req: Request, res: Response) => {
    try {
        const { electionId } = req.params;

        const election = await Election.findById(electionId);
        if (!election) {
            res.status(404).json({
                status: 'error',
                message: 'Election not found',
            });
            return;
        }

        // TODO: type session
        const sessionUserEmail = (req.session as any).user.email;
        const studentInfo = await StudentBallotInfo.findOne({
            electionId: electionId,
            email: sessionUserEmail,
        });

        if (!studentInfo) {
            res.status(404).json({
                status: 'error',
                message: 'Student info not found',
            });
            return;
        }

        const allCandidates = await getEligibleCandidates(
            electionId,
            election.semester,
            studentInfo.year,
            studentInfo.campusRep
        );

        res.status(200).json({
            status: 'success',
            data: allCandidates,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch candidates',
        });
    }
};

export const isValidBallot = async (v: VoteRequest) => {
    // Ensure that rankings are non-empty
    if (!v.ranking || v.ranking.length === 0) {
        return false;
    }

    // Ensure rankings are for valid candidates (only checks valid ObjectId)
    if (!v.ranking.every(mongoose.Types.ObjectId.isValid)) {
        return false;
    }

    // Check for duplicate candidates ranked
    const uniqueCandidates = new Set(v.ranking.map((id) => id.toString()));
    if (uniqueCandidates.size !== v.ranking.length) {
        return false;
    }

    // Ensure all ranked candidates belong to the correct position
    const validCandidates = await Candidate.find({
        _id: { $in: v.ranking },
        position: v.position,
    });

    return validCandidates.length === v.ranking.length;
};

const MAX_VOTER_COMMENT_LENGTH = 5000;

export const recordVotes = async (req: Request, res: Response) => {
    let session: ClientSession | undefined;

    try {
        const { electionId } = req.params;
        const { votes, comment } = req.body;

        // User must vote for at least one position
        if (!votes || votes.length === 0) {
            res.status(400).json({
                status: 'error',
                message: 'At least one vote must be submitted',
            });
            return;
        }

        // Cannot vote for the same position twice
        const positions = votes.map((v: VoteRequest) => v.position);
        const uniquePositions = new Set(positions);

        if (uniquePositions.size !== positions.length) {
            res.status(400).json({
                status: 'error',
                message: 'Cannot submit more than one vote per position',
            });
            return;
        }

        for (const v of votes) {
            if (!(await isValidBallot(v))) {
                res.status(400).json({
                    status: 'error',
                    message: `Invalid vote for position: ${v.position}`,
                });
                return;
            }
        }

        const election = await Election.findById(electionId);
        if (!election) {
            res.status(404).json({
                status: 'error',
                message: 'Election not found',
            });
            return;
        }

        let voterComment = '';
        if (election.allowVoterComment) {
            voterComment =
                typeof comment === 'string'
                    ? comment.trim().slice(0, MAX_VOTER_COMMENT_LENGTH)
                    : '';
        }

        const sessionUserEmail = (req.session as any).user.email;

        session = await mongoose.startSession();

        await session.withTransaction(async () => {
            const ballot = await StudentBallotInfo.findOneAndUpdate(
                {
                    electionId: electionId,
                    email: sessionUserEmail,
                    hasVoted: false, // ensure voter hasn't already voted
                },
                {
                    $set: { hasVoted: true },
                },
                {
                    new: true, // return the updated document
                    session,
                }
            );

            if (!ballot) {
                throw new Error('Unable to submit vote');
            }

            const voteDocs = votes.map((v: VoteRequest, index: number) => ({
                electionId,
                position: v.position,
                ranking: v.ranking.map((id) => new mongoose.Types.ObjectId(id)),
                ...(election.allowVoterComment && index === 0
                    ? { voterComment }
                    : {}),
            }));

            await Vote.insertMany(voteDocs, { session });
        });

        res.status(200).json({
            status: 'success',
        });
    } catch (error: any) {
        if (error.message === 'Unable to submit vote') {
            res.status(400).json({
                status: 'error',
                message: error.message,
            });
            return;
        }

        res.status(500).json({
            status: 'error',
            message: 'Failed to record vote rip',
        });
    } finally {
        if (session) {
            await session.endSession();
        }
    }
};
