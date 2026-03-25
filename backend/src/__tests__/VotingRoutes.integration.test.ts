import mongoose from 'mongoose';
import { Request, Response } from 'express';

import { MongoMemoryServer } from 'mongodb-memory-server';
import { Candidate, StudentBallotInfo, Vote } from '../models/Voting';
import {
    getAllOtherCandidates,
    getCampusRepCandidates,
    getClassRepCandidates,
    getBallot,
    studentHasVoted,
} from '../controllers/VotingController';
import { SENATE_POSITIONS } from '../constants/election.constants';

const mockElectionId = new mongoose.Types.ObjectId();
const mockStudent = {
    electionId: mockElectionId,
    email: 'student@test.com',
    campusRep: 'north',
    year: 1,
};

// Mock candidate data
const mockCandidatesDB = [
    {
        electionId: mockElectionId,
        name: 'Alice',
        position: SENATE_POSITIONS.FIRST_YEAR_CLASS_PRESIDENT,
    },
    {
        electionId: mockElectionId,
        name: 'Bob',
        position: SENATE_POSITIONS.SOPHOMORE_CLASS_PRESIDENT,
    },
    {
        electionId: mockElectionId,
        name: 'Carol',
        position: SENATE_POSITIONS.FIRST_YEAR_CLASS_PRESIDENT,
    },
    {
        electionId: mockElectionId,
        name: 'Dave',
        position: SENATE_POSITIONS.NORTH_CAMPUS_REPRESENTATIVE,
    },
    {
        electionId: mockElectionId,
        name: 'Eve',
        position: SENATE_POSITIONS.SOUTH_CAMPUS_REPRESENTATIVE,
    },
    {
        electionId: mockElectionId,
        name: 'Fred',
        position: SENATE_POSITIONS.PRESIDENT,
    },
];

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    await StudentBallotInfo.create(mockStudent);
});

beforeEach(async () => {
    await Candidate.deleteMany({});
    await StudentBallotInfo.deleteMany({});

    await StudentBallotInfo.create(mockStudent);
    await Candidate.insertMany(mockCandidatesDB);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('getClassRepCandidates (integration test)', () => {
    it.each([
        {
            year: 1,
            expectedCount: 2,
            expectedNames: ['Alice', 'Carol'],
            description: 'first-year class president',
        },
        {
            year: 3,
            expectedCount: 0,
            expectedNames: [],
            description: 'junior class president (no candidates)',
        },
    ])(
        'returns $expectedCount $description candidates for year $year',
        async ({ year, expectedCount, expectedNames }) => {
            const candidates = await getClassRepCandidates(
                mockElectionId.toString(),
                year
            );

            expect(candidates).toHaveLength(expectedCount);

            if (expectedCount > 0) {
                const names = candidates.map((c) => c.name);
                expectedNames.forEach((name) => {
                    expect(names).toContain(name);
                });
            }
        }
    );

    it('returns empty array for invalid year', async () => {
        const candidates = await getClassRepCandidates(
            mockElectionId.toString(),
            5
        );
        expect(candidates).toEqual([]);
    });
});

describe('getCampusRepCandidates (integration test)', () => {
    it.each([
        {
            housingStatus: 'north',
            expectedCount: 1,
            expectedNames: ['Dave'],
            description: 'north campus rep',
        },
        {
            housingStatus: 'south',
            expectedCount: 1,
            expectedNames: ['Eve'],
            description: 'south campus rep',
        },
    ])(
        'returns $expectedCount $description candidates for housing status $housingStatus',
        async ({ housingStatus, expectedCount, expectedNames }) => {
            const candidates = await getCampusRepCandidates(
                mockElectionId.toString(),
                housingStatus
            );

            expect(candidates).toHaveLength(expectedCount);

            if (expectedCount > 0) {
                const names = candidates.map((c) => c.name);
                expectedNames.forEach((name) => {
                    expect(names).toContain(name);
                });
            }
        }
    );

    it('returns empty array for non-north/south housing status', async () => {
        const candidates = await getCampusRepCandidates(
            mockElectionId.toString(),
            'east'
        );
        expect(candidates).toEqual([]);
    });
});

describe('getAllOtherCandidates (integration test)', () => {
    it('returns all non-campus/class rep rep candidates', async () => {
        const candidates = await getAllOtherCandidates(
            mockElectionId.toString()
        );

        expect(candidates).toHaveLength(1);
        const names = candidates.map((c) => c.name);
        expect(names).toContain('Fred');
    });
});

describe('getBallot (integration test)', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });

        req = {
            params: { electionId: mockElectionId.toString() },
            session: { user: { email: 'student@test.com' } } as any,
        };

        res = {
            status: statusMock,
            json: jsonMock,
        };
    });

    it('returns all candidates for north campus first-year student', async () => {
        await getBallot(req as Request, res as Response);

        expect(statusMock).toHaveBeenCalledWith(200);

        const responseData = jsonMock.mock.calls[0][0];
        expect(responseData.status).toBe('success');
        expect(responseData.data).toHaveLength(4); // Dave + Alice + Carol + Fred

        const names = responseData.data.map((c: any) => c.name);
        expect(names).toContain('Dave'); // North campus rep
        expect(names).toContain('Alice'); // First-year president
        expect(names).toContain('Carol'); // First-year president
        expect(names).toContain('Fred'); // President
        expect(names).not.toContain('Eve'); // South campus (shouldn't be included)
        expect(names).not.toContain('Bob'); // Sophomore (shouldn't be included)
    });

    it('returns correct candidates for south campus sophomore student', async () => {
        // Update student to be south campus sophomore
        await StudentBallotInfo.updateOne(
            { email: 'student@test.com' },
            { $set: { campusRep: 'south', year: 2 } }
        );

        await getBallot(req as Request, res as Response);

        expect(statusMock).toHaveBeenCalledWith(200);

        const responseData = jsonMock.mock.calls[0][0];
        expect(responseData.data).toHaveLength(3); // Eve + Bob + Fred

        const names = responseData.data.map((c: any) => c.name);
        expect(names).toContain('Eve'); // South campus rep
        expect(names).toContain('Bob'); // Sophomore president
        expect(names).toContain('Fred'); // President
        expect(names).not.toContain('Dave'); // North campus
        expect(names).not.toContain('Alice'); // First-year
        expect(names).not.toContain('Carol'); // First-year
    });

    it('returns 404 when student not registered', async () => {
        req.session = { user: { email: 'unregistered@test.com' } } as any;

        await getBallot(req as Request, res as Response);

        expect(statusMock).toHaveBeenCalledWith(404);
        expect(jsonMock).toHaveBeenCalledWith({
            status: 'error',
            message: 'Student info not found',
        });
    });

    it('returns only other candidates when no class/campus match', async () => {
        // Update student to invalid year and housing
        await StudentBallotInfo.updateOne(
            { email: 'student@test.com' },
            { $set: { campusRep: 'off-campus', year: 5 } }
        );

        await getBallot(req as Request, res as Response);

        expect(statusMock).toHaveBeenCalledWith(200);

        const responseData = jsonMock.mock.calls[0][0];
        expect(responseData.data).toHaveLength(1); // Only Fred

        const names = responseData.data.map((c: any) => c.name);
        expect(names).toContain('Fred');
    });

    it('returns empty array when no candidates exist', async () => {
        await Candidate.deleteMany({});

        await getBallot(req as Request, res as Response);

        expect(statusMock).toHaveBeenCalledWith(200);
        expect(jsonMock).toHaveBeenCalledWith({
            status: 'success',
            data: [],
        });
    });

    it('only returns candidates from the specified election', async () => {
        const otherElectionId = new mongoose.Types.ObjectId();

        // Add candidates from another election
        await Candidate.insertMany([
            {
                electionId: otherElectionId,
                name: 'OtherElection1',
                position: SENATE_POSITIONS.FIRST_YEAR_CLASS_PRESIDENT,
            },
            {
                electionId: otherElectionId,
                name: 'OtherElection2',
                position: SENATE_POSITIONS.PRESIDENT,
            },
        ]);

        await getBallot(req as Request, res as Response);

        expect(statusMock).toHaveBeenCalledWith(200);

        const responseData = jsonMock.mock.calls[0][0];
        const names = responseData.data.map((c: any) => c.name);

        // Should not include candidates from other election
        expect(names).not.toContain('OtherElection1');
        expect(names).not.toContain('OtherElection2');

        // All candidates should be from mockElectionId
        const allFromCorrectElection = responseData.data.every(
            (c: any) => c.electionId.toString() === mockElectionId.toString()
        );
        expect(allFromCorrectElection).toBe(true);
    });
});

describe('studentHasVoted (integration test)', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });

        req = {
            params: { electionId: mockElectionId.toString() },
            session: { user: { email: 'student@test.com' } } as any,
        };

        res = {
            status: statusMock,
            json: jsonMock,
        };
    });

    it('returns hasVoted true when student has voted', async () => {
        // Update student to have voted
        await StudentBallotInfo.updateOne(
            { email: 'student@test.com' },
            { $set: { hasVoted: true } }
        );

        await studentHasVoted(req as Request, res as Response);

        expect(statusMock).toHaveBeenCalledWith(200);
        expect(jsonMock).toHaveBeenCalledWith({
            status: 'success',
            hasVoted: true,
        });
    });

    it('returns hasVoted false when student has not voted', async () => {
        // Ensure student hasn't voted (default from beforeEach)
        await studentHasVoted(req as Request, res as Response);

        expect(statusMock).toHaveBeenCalledWith(200);
        expect(jsonMock).toHaveBeenCalledWith({
            status: 'success',
            hasVoted: false,
        });
    });

    it('returns 404 when student not registered in election', async () => {
        req.session = { user: { email: 'unregistered@test.com' } } as any;

        await studentHasVoted(req as Request, res as Response);

        expect(statusMock).toHaveBeenCalledWith(404);
        expect(jsonMock).toHaveBeenCalledWith({
            status: 'error',
            message: 'Student not registered in election',
        });
    });

    it('returns 404 when student registered in different election', async () => {
        const differentElectionId = new mongoose.Types.ObjectId();
        req.params = { electionId: differentElectionId.toString() };

        await studentHasVoted(req as Request, res as Response);

        expect(statusMock).toHaveBeenCalledWith(404);
        expect(jsonMock).toHaveBeenCalledWith({
            status: 'error',
            message: 'Student not registered in election',
        });
    });
});
