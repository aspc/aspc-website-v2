import mongoose from 'mongoose';
import { ClientSession } from 'mongoose';

import { Request, Response } from 'express';
import { Candidate, Election, StudentBallotInfo, Vote } from '../models/Voting';
import { SENATE_POSITIONS } from '../constants/election.constants';

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

export const getClassRepCandidates = async (
    electionId: string,
    year: number
) => {
    // Seniors (year 4) vote for both commencement speaker and class name
    if (year === 4) {
        const candidates = await Candidate.find({
            electionId: electionId,
            position: {
                $in: [
                    SENATE_POSITIONS.COMMENCEMENT_SPEAKER,
                    SENATE_POSITIONS.CLASS_NAME,
                ],
            },
        });
        return candidates;
    }

    const yearToPosition: Record<number, string> = {
        1: SENATE_POSITIONS.SOPHOMORE_CLASS_PRESIDENT,
        2: SENATE_POSITIONS.JUNIOR_CLASS_PRESIDENT,
        3: SENATE_POSITIONS.SENIOR_CLASS_PRESIDENT,
    };

    if (!(year in yearToPosition)) {
        return [];
    }

    const candidates = await Candidate.find({
        electionId: electionId,
        position: yearToPosition[year],
    });

    return candidates;
};

export const getCampusRepCandidates = async (
    electionId: string,
    housingStatus: string
) => {
    const housingStatusToCampusRep: Record<string, string> = {
        north: SENATE_POSITIONS.NORTH_CAMPUS_REPRESENTATIVE,
        south: SENATE_POSITIONS.SOUTH_CAMPUS_REPRESENTATIVE,
    };

    if (!(housingStatus in housingStatusToCampusRep)) {
        return [];
    }

    const candidates = await Candidate.find({
        electionId: electionId,
        position: housingStatusToCampusRep[housingStatus],
    });

    return candidates;
};

export const getAllOtherCandidates = async (electionId: string) => {
    const candidates = await Candidate.find({
        electionId: electionId,
        position: {
            $nin: [
                SENATE_POSITIONS.FIRST_YEAR_CLASS_PRESIDENT,
                SENATE_POSITIONS.SOPHOMORE_CLASS_PRESIDENT,
                SENATE_POSITIONS.JUNIOR_CLASS_PRESIDENT,
                SENATE_POSITIONS.SENIOR_CLASS_PRESIDENT,
                SENATE_POSITIONS.NORTH_CAMPUS_REPRESENTATIVE,
                SENATE_POSITIONS.SOUTH_CAMPUS_REPRESENTATIVE,
                SENATE_POSITIONS.COMMENCEMENT_SPEAKER,
                SENATE_POSITIONS.CLASS_NAME,
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
            electionId,
            studentInfo.campusRep
        );
        const classPresidentCandidates = await getClassRepCandidates(
            electionId,
            studentInfo.year
        );
        const otherCandidates = await getAllOtherCandidates(electionId);

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

    if (validCandidates.length !== v.ranking.length) {
        return false;
    }

    const writeInCount = validCandidates.filter((c) => c.writeIn).length;
    if (writeInCount > 1) {
        return false;
    }

    return true;
};

export const createWriteInCandidate = async (req: Request, res: Response) => {
    try {
        const { electionId } = req.params;
        const { firstName, lastName, position } = req.body;

        if (!firstName?.trim() || !lastName?.trim() || !position?.trim()) {
            res.status(400).json({
                status: 'error',
                message: 'First name, last name, and position are required',
            });
            return;
        }

        const name = `${firstName.trim()} ${lastName.trim()}`;

        const existing = await Candidate.findOne({
            electionId,
            name: { $regex: new RegExp(`^${name}$`, 'i') },
            position,
        });

        if (existing) {
            res.status(200).json({
                status: 'success',
                data: existing,
            });
            return;
        }

        const candidate = await Candidate.create({
            electionId,
            name,
            position,
            writeIn: true,
        });

        res.status(201).json({
            status: 'success',
            data: candidate,
        });
    } catch (error) {
        console.error('Error creating write-in candidate:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create write-in candidate',
        });
    }
};

export const recordVotes = async (req: Request, res: Response) => {
    let session: ClientSession | undefined;

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

            const voteDocs = votes.map((v: VoteRequest) => ({
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
            message: 'Failed to record vote rip',
        });
    } finally {
        if (session) {
            await session.endSession();
        }
    }
};
