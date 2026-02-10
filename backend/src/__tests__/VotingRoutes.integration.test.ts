import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Candidate, StudentBallotInfo } from '../models/Voting';
import {
    getAllOtherCandidates,
    getCampusRepCandidates,
    getClassRepCandidates,
} from '../routes/VotingRoutes';
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
        position: 'first_year_class_president',
    },
    {
        electionId: mockElectionId,
        name: 'Bob',
        position: 'sophomore_class_president',
    },
    {
        electionId: mockElectionId,
        name: 'Carol',
        position: 'first_year_class_president',
    },
    {
        electionId: mockElectionId,
        name: 'Dave',
        position: 'north_campus_representative',
    },
    {
        electionId: mockElectionId,
        name: 'Eve',
        position: 'south_campus_representative',
    },
    {
        electionId: mockElectionId,
        name: 'Fred',
        position: 'president',
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
    await Candidate.insertMany(mockCandidatesDB);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('getClassRepCandidates (integration test)', () => {
    it('returns all first-year class president candidates', async () => {
        const candidates = await getClassRepCandidates(1);

        expect(candidates).toHaveLength(2);
        const names = candidates.map((c) => c.name);
        expect(names).toContain('Alice');
        expect(names).toContain('Carol');
    });

    it('returns sophomore class president candidates', async () => {
        const candidates = await getClassRepCandidates(2);

        expect(candidates).toHaveLength(1);
        expect(candidates[0].name).toBe('Bob');
    });

    it('returns empty array for invalid year', async () => {
        const candidates = await getClassRepCandidates(5);
        expect(candidates).toEqual([]);
    });

    it('returns empty array if no candidates match the year', async () => {
        await Candidate.deleteMany({ position: 'first_year_class_president' });
        const candidates = await getClassRepCandidates(1);
        expect(candidates).toEqual([]);
    });
});

describe('getCampusRepCandidates (integration test)', () => {
    it('returns all north campus rep candidates', async () => {
        const candidates = await getCampusRepCandidates('north');

        expect(candidates).toHaveLength(1);
        const names = candidates.map((c) => c.name);
        expect(names).toContain('Dave');
    });

    it('returns south campus rep candidates', async () => {
        const candidates = await getCampusRepCandidates('south');

        expect(candidates).toHaveLength(1);
        expect(candidates[0].name).toBe('Eve');
    });

    it('returns empty array for non-north/south housing status', async () => {
        const candidates = await getCampusRepCandidates('off-campus');
        expect(candidates).toEqual([]);
    });

    it('returns empty array if no candidates', async () => {
        await Candidate.deleteMany({ position: 'south_campus_representative' });
        const candidates = await getCampusRepCandidates('south');
        expect(candidates).toEqual([]);
    });
});

describe('getAllOtherCandidates (integration test)', () => {
    it('returns all non-campus/class rep rep candidates', async () => {
        const candidates = await getAllOtherCandidates();

        expect(candidates).toHaveLength(1);
        const names = candidates.map((c) => c.name);
        expect(names).toContain('Fred');
    });
});

// describe('GET /api/candidates', () => {
//     it('returns all candidates for a student', async () => {
//         const agent = request.agent(app);

//         // Mock session middleware to inject student email
//         const res = await agent
//             .get('/api/candidates')
//             .set('Cookie', 'connect.sid=mocked-session')
//             .expect(200);

//         expect(res.body.status).toBe('success');
//         expect(res.body.data.length).toBeGreaterThan(0);
//         expect(res.body.data).toEqual(
//             expect.arrayContaining([
//                 expect.objectContaining({ name: 'Alice' }),
//                 expect.objectContaining({ name: 'Bob' }),
//             ])
//         );
//     });
// });
