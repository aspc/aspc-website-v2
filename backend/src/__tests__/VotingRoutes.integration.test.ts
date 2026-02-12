import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Candidate, StudentBallotInfo } from '../models/Voting';
import {
    getAllOtherCandidates,
    getCampusRepCandidates,
    getClassRepCandidates,
} from '../controllers/VotingController';
import { SENATE_POSITIONS } from '../constants/election.constants';
// import app from '../server';

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
            expectedCount: 0,
            expectedNames: [],
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
