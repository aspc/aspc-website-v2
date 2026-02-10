import mongoose from 'mongoose';

import express, { Request, Response, Router } from 'express';
import { isAuthenticated } from '../middleware/authMiddleware';
import { Candidate, StudentBallotInfo, Vote } from '../models/Voting';

const router: Router = express.Router();

interface Vote {
    position: string;
    ranking: string[];
}

export const getClassRepCandidates = async (year: number) => {
    const yearToPosition: Record<number, string> = {
        1: 'first_year_class_president',
        2: 'sophomore_class_president',
        3: 'junior_class_president',
        4: 'senior_class_president',
    };

    if (!(year in yearToPosition)) {
        return [];
    }

    const candidates = await Candidate.find({
        position: yearToPosition[year],
    });

    return candidates;
};

export const getCampusRepCandidates = async (housingStatus: string) => {
    const housingStatusToCampusRep: Record<string, string> = {
        north: 'north_campus_representative',
        south: 'south_campus_representative',
    };

    if (!(housingStatus in housingStatusToCampusRep)) {
        return [];
    }

    const candidates = await Candidate.find({
        position: housingStatusToCampusRep[housingStatus],
    });

    return candidates;
};

export const getAllOtherCandidates = async () => {
    const candidates = await Candidate.find({
        position: {
            $nin: [
                'first_year_class_president',
                'sophomore_class_president',
                'junior_class_president',
                'senior_class_president',
                'south_campus_representative',
                'north_campus_representative',
            ],
        },
    });

    return candidates;
};

export const getBallot = async (req: Request, res: Response) => {
    try {
        const { electionId } = req.params;

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

        const campusRepCandidates = await getCampusRepCandidates(
            studentInfo.campusRep
        );
        const classPresidentCandidates = await getClassRepCandidates(
            studentInfo.year
        );
        const otherCandidates = await getAllOtherCandidates();

        const allCandidates = [
            ...campusRepCandidates,
            ...classPresidentCandidates,
            ...otherCandidates,
        ];

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

/**
 * @route   GET /api/voting/ballot/:electionId
 * @desc    Get the correct ballot based on student status
 * @access  isAuthenticated
 */
router.get('/voting/ballot/:electionId', isAuthenticated, getBallot);

export const recordVote = async (req: Request, res: Response) => {
    try {
        const { electionId } = req.params;
        const { votes } = req.body;

        // User must vote for at least one position
        if (!votes || votes.length === 0) {
            res.status(400).json({
                status: 'error',
                message: 'At least one vote must be submitted',
            });
            return;
        }

        // Cannot vote for the same position twice
        const positions = votes.map((v: Vote) => v.position);
        const uniquePositions = new Set(positions);

        if (uniquePositions.size !== positions.length) {
            res.status(400).json({
                status: 'error',
                message: 'Cannot submit more than one vote per position',
            });
            return;
        }

        for (const v of votes) {
            // Ensure that rankings are non-empty and at most 5 candidates
            const maxRanking = 5;
            if (
                !v.ranking ||
                v.ranking.length === 0 ||
                v.ranking.length > maxRanking
            ) {
                res.status(400).json({
                    status: 'error',
                    message: `Incorrect number of candidates ranked`,
                });
                return;
            }

            // Ensure rankings are for valid candidates (only checks valid ObjectId)
            if (!v.ranking.every(mongoose.Types.ObjectId.isValid)) {
                res.status(400).json({
                    status: 'error',
                    message: `Invalid candidate ID in ranking for position ${v.position}`,
                });
                return;
            }

            // TODO: Ensure candidates belong to the position they were ranked for
        }

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

        const session = await mongoose.startSession();

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

            const voteDocs = votes.map((v: Vote) => ({
                electionId,
                position: v.position,
                ranking: v.ranking.map((id) => new mongoose.Types.ObjectId(id)),
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
            message: 'Failed to record vote',
        });
    }
};

/**
 * @route   POST /api/voting/:electionId
 * @desc    Record a vote
 * @access  isAuthenticated
 */
router.post('/voting/:electionId', isAuthenticated, recordVote);

export default router;
