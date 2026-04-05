import mongoose from 'mongoose';
import { Request, Response } from 'express';

import { MongoMemoryServer } from 'mongodb-memory-server';
import { Candidate, Election, StudentBallotInfo } from '../models/Voting';
import {
    getEligibleCandidates,
    getBallot,
    studentHasVoted,
} from '../controllers/VotingController';
import { SENATE_POSITIONS } from '../constants/election.constants';

const mockElectionId = new mongoose.Types.ObjectId();
const mockElection = {
    _id: mockElectionId,
    name: 'Test Election',
    description: 'A test election',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    semester: 'fall' as const,
};
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
        eligibleYears: [1],
        housingLocation: [],
    },
    {
        electionId: mockElectionId,
        name: 'Bob',
        position: SENATE_POSITIONS.SOPHOMORE_CLASS_PRESIDENT,
        eligibleYears: [1],
        housingLocation: [],
    },
    {
        electionId: mockElectionId,
        name: 'Carol',
        position: SENATE_POSITIONS.FIRST_YEAR_CLASS_PRESIDENT,
        eligibleYears: [1],
        housingLocation: [],
    },
    {
        electionId: mockElectionId,
        name: 'Dave',
        position: SENATE_POSITIONS.NORTH_CAMPUS_REPRESENTATIVE,
        eligibleYears: [],
        housingLocation: ['north'],
    },
    {
        electionId: mockElectionId,
        name: 'Eve',
        position: SENATE_POSITIONS.SOUTH_CAMPUS_REPRESENTATIVE,
        eligibleYears: [],
        housingLocation: ['south'],
    },
    {
        electionId: mockElectionId,
        name: 'Fred',
        position: SENATE_POSITIONS.PRESIDENT,
        eligibleYears: [],
        housingLocation: [],
    },
];

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
}, 90000);

beforeEach(async () => {
    await Election.deleteMany({});
    await Candidate.deleteMany({});
    await StudentBallotInfo.deleteMany({});

    await Election.create(mockElection);
    await StudentBallotInfo.create(mockStudent);
    await Candidate.insertMany(mockCandidatesDB);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
}, 30000);

describe('getEligibleCandidates (integration test)', () => {
    it('fall election: first-year north student sees first-year pres + north rep', async () => {
        const candidates = await getEligibleCandidates(
            mockElectionId.toString(),
            'fall',
            1,
            'north'
        );

        const names = candidates.map((c: any) => c.name);
        expect(names).toContain('Alice'); // First-year pres, eligible for year 1
        expect(names).toContain('Carol'); // First-year pres, eligible for year 1
        expect(names).toContain('Dave'); // North campus rep
        expect(names).not.toContain('Eve'); // South campus rep
        expect(names).not.toContain('Fred'); // President is spring-only
        expect(names).not.toContain('Bob'); // Sophomore pres is spring-only
    });

    it('spring election: first-year south student sees soph pres + president', async () => {
        const candidates = await getEligibleCandidates(
            mockElectionId.toString(),
            'spring',
            1,
            'south'
        );

        const names = candidates.map((c: any) => c.name);
        expect(names).toContain('Bob'); // Soph pres, eligibleYears [1] matches
        expect(names).toContain('Fred'); // President, no restrictions
        expect(names).not.toContain('Alice'); // First-year pres is fall-only
        expect(names).not.toContain('Dave'); // North rep is fall-only
        expect(names).not.toContain('Eve'); // South rep is fall-only
    });

    it('spring election: sophomore does NOT see soph pres (eligibleYears [1])', async () => {
        const candidates = await getEligibleCandidates(
            mockElectionId.toString(),
            'spring',
            2,
            'south'
        );

        const names = candidates.map((c: any) => c.name);
        expect(names).toContain('Fred'); // President, unrestricted
        expect(names).not.toContain('Bob'); // Soph pres restricted to year 1
    });

    it('other election: filters only by stored eligibility', async () => {
        const candidates = await getEligibleCandidates(
            mockElectionId.toString(),
            'other',
            1,
            'north'
        );

        const names = candidates.map((c: any) => c.name);
        // All year-1 eligible + north campus + unrestricted
        expect(names).toContain('Alice');
        expect(names).toContain('Bob');
        expect(names).toContain('Carol');
        expect(names).toContain('Dave');
        expect(names).toContain('Fred');
        expect(names).not.toContain('Eve'); // south only
    });

    it('fall election: off-campus year 5 sees nothing', async () => {
        const candidates = await getEligibleCandidates(
            mockElectionId.toString(),
            'fall',
            5,
            'off-campus'
        );

        expect(candidates).toHaveLength(0);
    });

    it('custom positions pass through semester filter', async () => {
        await Candidate.create({
            electionId: mockElectionId,
            name: 'Grace',
            position: 'Best Dressed',
            eligibleYears: [],
            housingLocation: [],
        });

        // Custom position should appear in spring even though it's not in SPRING_POSITIONS
        const springCandidates = await getEligibleCandidates(
            mockElectionId.toString(),
            'spring',
            1,
            'north'
        );
        expect(springCandidates.map((c: any) => c.name)).toContain('Grace');

        // Should also appear in fall
        const fallCandidates = await getEligibleCandidates(
            mockElectionId.toString(),
            'fall',
            1,
            'north'
        );
        expect(fallCandidates.map((c: any) => c.name)).toContain('Grace');
    });

    it('custom position with eligibility restrictions filters correctly', async () => {
        await Candidate.create({
            electionId: mockElectionId,
            name: 'Hank',
            position: 'Spirit Award',
            eligibleYears: [3, 4],
            housingLocation: ['south'],
        });

        // Year 1 north — should not see Hank
        const result1 = await getEligibleCandidates(
            mockElectionId.toString(),
            'spring',
            1,
            'north'
        );
        expect(result1.map((c: any) => c.name)).not.toContain('Hank');

        // Year 3 south — should see Hank
        const result2 = await getEligibleCandidates(
            mockElectionId.toString(),
            'spring',
            3,
            'south'
        );
        expect(result2.map((c: any) => c.name)).toContain('Hank');

        // Year 3 north — year matches but housing does not
        const result3 = await getEligibleCandidates(
            mockElectionId.toString(),
            'spring',
            3,
            'north'
        );
        expect(result3.map((c: any) => c.name)).not.toContain('Hank');
    });

    it('only returns candidates from the specified election', async () => {
        const otherElectionId = new mongoose.Types.ObjectId();
        await Candidate.create({
            electionId: otherElectionId,
            name: 'Intruder',
            position: SENATE_POSITIONS.FIRST_YEAR_CLASS_PRESIDENT,
            eligibleYears: [1],
            housingLocation: [],
        });

        const candidates = await getEligibleCandidates(
            mockElectionId.toString(),
            'fall',
            1,
            'north'
        );

        expect(candidates.map((c: any) => c.name)).not.toContain('Intruder');
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

    it('fall election: returns fall-only positions for north campus first-year student', async () => {
        await getBallot(req as Request, res as Response);

        expect(statusMock).toHaveBeenCalledWith(200);

        const responseData = jsonMock.mock.calls[0][0];
        expect(responseData.status).toBe('success');
        // Fall positions only: Dave (north rep) + Alice + Carol (first year president)
        expect(responseData.data).toHaveLength(3);

        const names = responseData.data.map((c: any) => c.name);
        expect(names).toContain('Dave'); // North campus rep
        expect(names).toContain('Alice'); // First-year president
        expect(names).toContain('Carol'); // First-year president
        expect(names).not.toContain('Fred'); // President (spring-only)
        expect(names).not.toContain('Eve'); // South campus (wrong campus)
        expect(names).not.toContain('Bob'); // Sophomore (spring-only)
    });

    it('fall election: south campus sophomore only sees south campus rep', async () => {
        await StudentBallotInfo.updateOne(
            { email: 'student@test.com' },
            { $set: { campusRep: 'south', year: 2 } }
        );

        await getBallot(req as Request, res as Response);

        expect(statusMock).toHaveBeenCalledWith(200);

        const responseData = jsonMock.mock.calls[0][0];
        // Fall: Eve (south rep) only. Bob (soph pres) and Fred (president) are spring-only.
        // First-year pres restricted to year 1, Dave restricted to north
        expect(responseData.data).toHaveLength(1);

        const names = responseData.data.map((c: any) => c.name);
        expect(names).toContain('Eve'); // South campus rep (fall)
        expect(names).not.toContain('Bob'); // Sophomore president (spring-only)
        expect(names).not.toContain('Fred'); // President (spring-only)
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

    it('fall election: returns empty when no class/campus match', async () => {
        // Off-campus year 5: no campus rep match, no class president match
        await StudentBallotInfo.updateOne(
            { email: 'student@test.com' },
            { $set: { campusRep: 'off-campus', year: 5 } }
        );

        await getBallot(req as Request, res as Response);

        expect(statusMock).toHaveBeenCalledWith(200);

        const responseData = jsonMock.mock.calls[0][0];
        expect(responseData.data).toHaveLength(0);
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
                eligibleYears: [1],
                housingLocation: [],
            },
        ]);

        await getBallot(req as Request, res as Response);

        expect(statusMock).toHaveBeenCalledWith(200);

        const responseData = jsonMock.mock.calls[0][0];
        const names = responseData.data.map((c: any) => c.name);

        // Should not include candidates from other election
        expect(names).not.toContain('OtherElection1');

        // All candidates should be from mockElectionId
        const allFromCorrectElection = responseData.data.every(
            (c: any) => c.electionId.toString() === mockElectionId.toString()
        );
        expect(allFromCorrectElection).toBe(true);
    });

    it('includes custom positions in spring election', async () => {
        await Election.updateOne(
            { _id: mockElectionId },
            { $set: { semester: 'spring' } }
        );
        await Candidate.create({
            electionId: mockElectionId,
            name: 'Grace',
            position: 'Best Dressed',
            eligibleYears: [],
            housingLocation: [],
        });

        await getBallot(req as Request, res as Response);

        expect(statusMock).toHaveBeenCalledWith(200);
        const responseData = jsonMock.mock.calls[0][0];
        const names = responseData.data.map((c: any) => c.name);
        expect(names).toContain('Grace');
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
