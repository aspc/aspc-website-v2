// voting.controller.transaction.test.ts
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { Request, Response } from 'express';
import { Candidate, StudentBallotInfo, Vote } from '../models/Voting';
import { recordVotes } from '../controllers/VotingController';

let mongoServer: MongoMemoryReplSet;

beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({
        replSet: { count: 1, storageEngine: 'wiredTiger' },
    });

    const uri = mongoServer.getUri();
    console.log(uri);
    await mongoose.connect(uri);
}, 90000);

afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    if (mongoServer) {
        await mongoServer.stop();
    }
}, 30000);

describe('recordVote - Transaction & Race Condition Tests', () => {
    let electionId: mongoose.Types.ObjectId;
    let candidateId1: mongoose.Types.ObjectId;
    let candidateId2: mongoose.Types.ObjectId;
    let candidateId3: mongoose.Types.ObjectId;

    beforeEach(async () => {
        electionId = new mongoose.Types.ObjectId();
        candidateId1 = new mongoose.Types.ObjectId();
        candidateId2 = new mongoose.Types.ObjectId();
        candidateId3 = new mongoose.Types.ObjectId();

        await Candidate.deleteMany({});
        await StudentBallotInfo.deleteMany({});
        await Vote.deleteMany({});

        await Candidate.insertMany([
            {
                _id: candidateId1,
                electionId: electionId,
                name: 'President Candidate 1',
                position: 'PRESIDENT',
            },
            {
                _id: candidateId2,
                electionId: electionId,
                name: 'President Candidate 2',
                position: 'PRESIDENT',
            },
            {
                _id: candidateId3,
                electionId: electionId,
                name: 'Treasurer Candidate 1',
                position: 'TREASURER',
            },
        ]);

        await StudentBallotInfo.create({
            electionId: electionId,
            email: 'student@test.com',
            campusRep: 'north',
            year: 1,
            hasVoted: false,
        });
    });

    // === TRANSACTION ATOMICITY ===

    it('commits both student update and vote insert together', async () => {
        const jsonMock = jest.fn();
        const statusMock = jest.fn().mockReturnValue({ json: jsonMock });

        const req = {
            params: { electionId: electionId.toString() },
            session: { user: { email: 'student@test.com' } } as any,
            body: {
                votes: [
                    {
                        position: 'PRESIDENT',
                        ranking: [
                            candidateId1.toString(),
                            candidateId2.toString(),
                        ],
                    },
                ],
            },
        };

        const res = {
            status: statusMock,
            json: jsonMock,
        };

        await recordVotes(
            req as unknown as Request,
            res as unknown as Response
        );

        expect(statusMock).toHaveBeenCalledWith(200);
        expect(jsonMock).toHaveBeenCalledWith({ status: 'success' });

        // ✅ Verify both operations committed
        const student = await StudentBallotInfo.findOne({
            email: 'student@test.com',
            electionId: electionId,
        });
        expect(student?.hasVoted).toBe(true);

        const votes = await Vote.find({ electionId: electionId });
        expect(votes).toHaveLength(1);
        expect(votes[0].position).toBe('PRESIDENT');
        expect(votes[0].ranking).toHaveLength(2);
    });

    it('rolls back transaction when student not found', async () => {
        const jsonMock = jest.fn();
        const statusMock = jest.fn().mockReturnValue({ json: jsonMock });

        await StudentBallotInfo.deleteOne({ email: 'student@test.com' });

        const req = {
            params: { electionId: electionId.toString() },
            session: { user: { email: 'student@test.com' } } as any,
            body: {
                votes: [
                    {
                        position: 'PRESIDENT',
                        ranking: [candidateId1.toString()],
                    },
                ],
            },
        };

        const res = {
            status: statusMock,
            json: jsonMock,
        };

        await recordVotes(
            req as unknown as Request,
            res as unknown as Response
        );

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
            status: 'error',
            message: 'Unable to submit vote',
        });

        // No votes recorded (transaction rolled back)
        const votes = await Vote.find({ electionId: electionId });
        expect(votes).toHaveLength(0);
    });

    it('supports multiple votes for different positions in one transaction', async () => {
        const jsonMock = jest.fn();
        const statusMock = jest.fn().mockReturnValue({ json: jsonMock });

        const req = {
            params: { electionId: electionId.toString() },
            session: { user: { email: 'student@test.com' } } as any,
            body: {
                votes: [
                    {
                        position: 'PRESIDENT',
                        ranking: [candidateId1.toString()],
                    },
                    {
                        position: 'TREASURER',
                        ranking: [candidateId3.toString()],
                    },
                ],
            },
        };

        const res = {
            status: statusMock,
            json: jsonMock,
        };

        await recordVotes(
            req as unknown as Request,
            res as unknown as Response
        );

        expect(statusMock).toHaveBeenCalledWith(200);

        const votes = await Vote.find({ electionId: electionId });
        expect(votes).toHaveLength(2);

        const positions = votes.map((v) => v.position).sort();
        expect(positions).toEqual(['PRESIDENT', 'TREASURER']);
    });

    // === RACE CONDITIONS ===

    it('prevents race condition - two simultaneous votes from same student', async () => {
        const createRequest = () => ({
            params: { electionId: electionId.toString() },
            session: { user: { email: 'student@test.com' } } as any,
            body: {
                votes: [
                    {
                        position: 'PRESIDENT',
                        ranking: [candidateId1.toString()],
                    },
                ],
            },
        });

        const createResponse = () => {
            const jsonMock = jest.fn();
            const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
            return { status: statusMock, json: jsonMock, statusMock, jsonMock };
        };

        const req1 = createRequest();
        const res1 = createResponse();

        const req2 = createRequest();
        const res2 = createResponse();

        // Execute both simultaneously
        await Promise.all([
            recordVotes(
                req1 as unknown as Request,
                res1 as unknown as Response
            ),
            recordVotes(
                req2 as unknown as Request,
                res2 as unknown as Response
            ),
        ]);

        const responses = [
            res1.statusMock.mock.calls[0]?.[0],
            res2.statusMock.mock.calls[0]?.[0],
        ];

        const successCount = responses.filter((s) => s === 200).length;
        const failCount = responses.filter((s) => s === 400).length;

        // One request succeeds, one fails
        expect(successCount).toBe(1);
        expect(failCount).toBe(1);

        // Only one vote recorded
        const votes = await Vote.find({ electionId: electionId });
        expect(votes).toHaveLength(1);

        // Student marked as voted
        const student = await StudentBallotInfo.findOne({
            email: 'student@test.com',
            electionId: electionId,
        });
        expect(student?.hasVoted).toBe(true);
    });

    it('handles multiple students voting simultaneously', async () => {
        // Create additional students
        await StudentBallotInfo.insertMany([
            {
                electionId: electionId,
                email: 'student1@test.com',
                campusRep: 'north',
                year: 1,
                hasVoted: false,
            },
            {
                electionId: electionId,
                email: 'student2@test.com',
                campusRep: 'south',
                year: 2,
                hasVoted: false,
            },
            {
                electionId: electionId,
                email: 'student3@test.com',
                campusRep: 'north',
                year: 3,
                hasVoted: false,
            },
        ]);

        const createRequest = (email: string) => ({
            params: { electionId: electionId.toString() },
            session: { user: { email } } as any,
            body: {
                votes: [
                    {
                        position: 'PRESIDENT',
                        ranking: [candidateId1.toString()],
                    },
                ],
            },
        });

        const createResponse = () => {
            const jsonMock = jest.fn();
            const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
            return { status: statusMock, json: jsonMock };
        };

        const requests = [
            { req: createRequest('student1@test.com'), res: createResponse() },
            { req: createRequest('student2@test.com'), res: createResponse() },
            { req: createRequest('student3@test.com'), res: createResponse() },
        ];

        await Promise.all(
            requests.map(({ req, res }) =>
                recordVotes(
                    req as unknown as Request,
                    res as unknown as Response
                )
            )
        );

        // All should succeed
        const votes = await Vote.find({ electionId: electionId });
        expect(votes).toHaveLength(3);

        // All students marked as voted
        const students = await StudentBallotInfo.find({
            electionId: electionId,
            email: {
                $in: [
                    'student1@test.com',
                    'student2@test.com',
                    'student3@test.com',
                ],
            },
        });
        expect(students).toHaveLength(3);
        expect(students.every((s) => s.hasVoted)).toBe(true);
    });

    it('stress test - 10 concurrent double-vote attempts', async () => {
        const createRequest = () => ({
            params: { electionId: electionId.toString() },
            session: { user: { email: 'student@test.com' } } as any,
            body: {
                votes: [
                    {
                        position: 'PRESIDENT',
                        ranking: [candidateId1.toString()],
                    },
                ],
            },
        });

        const createResponse = () => {
            const jsonMock = jest.fn();
            const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
            return { status: statusMock, json: jsonMock, statusMock };
        };

        // Create 10 simultaneous requests
        const requests = Array.from({ length: 10 }, () => ({
            req: createRequest(),
            res: createResponse(),
        }));

        await Promise.all(
            requests.map(({ req, res }) =>
                recordVotes(
                    req as unknown as Request,
                    res as unknown as Response
                )
            )
        );

        const statuses = requests.map(
            (r) => r.res.statusMock.mock.calls[0]?.[0]
        );
        const successCount = statuses.filter((s) => s === 200).length;
        const failCount = statuses.filter((s) => s === 400).length;

        // Exactly 1 success, 9 failures
        expect(successCount).toBe(1);
        expect(failCount).toBe(9);

        // Only 1 vote recorded
        const votes = await Vote.find({ electionId: electionId });
        expect(votes).toHaveLength(1);
    });

    // === EDGE CASES ===

    it('prevents voting after student already voted (idempotency)', async () => {
        // First vote succeeds
        const jsonMock1 = jest.fn();
        const statusMock1 = jest.fn().mockReturnValue({ json: jsonMock1 });

        const req1 = {
            params: { electionId: electionId.toString() },
            session: { user: { email: 'student@test.com' } } as any,
            body: {
                votes: [
                    {
                        position: 'PRESIDENT',
                        ranking: [candidateId1.toString()],
                    },
                ],
            },
        };

        await recordVotes(
            req1 as unknown as Request,
            { status: statusMock1, json: jsonMock1 } as unknown as Response
        );

        expect(statusMock1).toHaveBeenCalledWith(200);

        // Second vote fails
        const jsonMock2 = jest.fn();
        const statusMock2 = jest.fn().mockReturnValue({ json: jsonMock2 });

        const req2 = {
            params: { electionId: electionId.toString() },
            session: { user: { email: 'student@test.com' } } as any,
            body: {
                votes: [
                    {
                        position: 'TREASURER',
                        ranking: [candidateId3.toString()],
                    },
                ],
            },
        };

        await recordVotes(
            req2 as unknown as Request,
            { status: statusMock2, json: jsonMock2 } as unknown as Response
        );

        expect(statusMock2).toHaveBeenCalledWith(400);
        expect(jsonMock2).toHaveBeenCalledWith({
            status: 'error',
            message: 'Unable to submit vote',
        });

        // Only first vote recorded
        const votes = await Vote.find({ electionId: electionId });
        expect(votes).toHaveLength(1);
        expect(votes[0].position).toBe('PRESIDENT');
    });
});
