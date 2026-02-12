import mongoose from 'mongoose';

import {
    getCampusRepCandidates,
    getClassRepCandidates,
    getAllOtherCandidates,
    isValidBallot,
} from '../controllers/VotingController';
import { Candidate } from '../models/Voting';
import { SENATE_POSITIONS } from '../constants/election.constants';

jest.mock('../models/Voting');

const mockElectionId = new mongoose.Types.ObjectId();

// TODO: mockELectionID should be in the mockDB entries

describe('Ballot helper functions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getClassRepCandidates', () => {
        it.each([
            {
                year: 1,
                position: SENATE_POSITIONS.FIRST_YEAR_CLASS_PRESIDENT,
                expectedCandidates: [
                    {
                        electionId: mockElectionId,
                        name: 'Alice',
                        position: SENATE_POSITIONS.FIRST_YEAR_CLASS_PRESIDENT,
                    },
                    {
                        electionId: mockElectionId,
                        name: 'Bob',
                        position: SENATE_POSITIONS.FIRST_YEAR_CLASS_PRESIDENT,
                    },
                ],
            },
            {
                year: 2,
                position: SENATE_POSITIONS.SOPHOMORE_CLASS_PRESIDENT,
                expectedCandidates: [
                    {
                        electionId: mockElectionId,
                        name: 'Carol',
                        position: SENATE_POSITIONS.SOPHOMORE_CLASS_PRESIDENT,
                    },
                ],
            },
            {
                year: 3,
                position: SENATE_POSITIONS.JUNIOR_CLASS_PRESIDENT,
                expectedCandidates: [
                    {
                        electionId: mockElectionId,
                        name: 'Dave',
                        position: SENATE_POSITIONS.JUNIOR_CLASS_PRESIDENT,
                    },
                ],
            },
            {
                year: 4,
                position: SENATE_POSITIONS.SENIOR_CLASS_PRESIDENT,
                expectedCandidates: [
                    {
                        electionId: mockElectionId,
                        name: 'Eve',
                        position: SENATE_POSITIONS.SENIOR_CLASS_PRESIDENT,
                    },
                ],
            },
        ])(
            'calls Candidate.find with correct position for year $year',
            async ({ year, position, expectedCandidates }) => {
                (Candidate.find as jest.Mock).mockResolvedValue(
                    expectedCandidates
                );

                const candidates = await getClassRepCandidates(
                    mockElectionId.toString(),
                    year
                );

                expect(Candidate.find).toHaveBeenCalledWith({
                    electionId: mockElectionId.toString(),
                    position,
                });
                expect(candidates).toEqual(expectedCandidates);
            }
        );

        it('returns empty array for invalid year', async () => {
            const candidates = await getClassRepCandidates(
                mockElectionId.toString(),
                99
            );
            expect(candidates).toEqual([]);
            expect(Candidate.find).not.toHaveBeenCalled();
        });
    });

    describe('getCampusRepCandidates', () => {
        it.each([
            {
                housingStatus: 'north',
                position: SENATE_POSITIONS.NORTH_CAMPUS_REPRESENTATIVE,
                expectedCandidates: [
                    {
                        electionId: mockElectionId,
                        name: 'Bob',
                        position: SENATE_POSITIONS.NORTH_CAMPUS_REPRESENTATIVE,
                    },
                    {
                        electionId: mockElectionId,
                        name: 'Dave',
                        position: SENATE_POSITIONS.NORTH_CAMPUS_REPRESENTATIVE,
                    },
                ],
            },
            {
                housingStatus: 'south',
                position: SENATE_POSITIONS.SOUTH_CAMPUS_REPRESENTATIVE,
                expectedCandidates: [
                    {
                        electionId: mockElectionId,
                        name: 'Frank',
                        position: SENATE_POSITIONS.SOUTH_CAMPUS_REPRESENTATIVE,
                    },
                ],
            },
        ])(
            'calls Candidate.find with correct position for housing status $housingStatus',
            async ({ housingStatus, position, expectedCandidates }) => {
                (Candidate.find as jest.Mock).mockResolvedValue(
                    expectedCandidates
                );

                const candidates = await getCampusRepCandidates(
                    mockElectionId.toString(),
                    housingStatus
                );

                expect(Candidate.find).toHaveBeenCalledWith({
                    electionId: mockElectionId.toString(),
                    position,
                });
                expect(candidates).toEqual(expectedCandidates);
            }
        );

        it.each([
            { housingStatus: 'east', expected: [] },
            { housingStatus: 'off-campus', expected: [] },
        ])(
            'returns empty array for invalid housing status "$housingStatus"',
            async ({ housingStatus, expected }) => {
                const candidates = await getCampusRepCandidates(
                    mockElectionId.toString(),
                    housingStatus
                );
                expect(Candidate.find).not.toHaveBeenCalled();
                expect(candidates).toEqual(expected);
            }
        );
    });

    describe('getAllOtherCandidates', () => {
        it('returns candidates excluding class and campus rep positions', async () => {
            const mockCandidatesDB = [
                {
                    electionId: mockElectionId,
                    name: 'Alice',
                    position: SENATE_POSITIONS.PRESIDENT,
                },
                {
                    electionId: mockElectionId,
                    name: 'Bob',
                    position: SENATE_POSITIONS.VP_ACADEMIC_AFFAIRS,
                },
            ];

            (Candidate.find as jest.Mock).mockResolvedValue(mockCandidatesDB);

            const candidates = await getAllOtherCandidates(
                mockElectionId.toString()
            );

            expect(Candidate.find).toHaveBeenCalledWith({
                electionId: mockElectionId.toString(),
                position: {
                    $nin: [
                        SENATE_POSITIONS.FIRST_YEAR_CLASS_PRESIDENT,
                        SENATE_POSITIONS.SOPHOMORE_CLASS_PRESIDENT,
                        SENATE_POSITIONS.JUNIOR_CLASS_PRESIDENT,
                        SENATE_POSITIONS.SENIOR_CLASS_PRESIDENT,
                        SENATE_POSITIONS.NORTH_CAMPUS_REPRESENTATIVE,
                        SENATE_POSITIONS.SOUTH_CAMPUS_REPRESENTATIVE,
                    ],
                },
            });
            expect(candidates).toEqual(mockCandidatesDB);
        });
    });

    describe('isValidBallot', () => {
        const position = SENATE_POSITIONS.PRESIDENT;
        const candidate1 = new mongoose.Types.ObjectId();
        const candidate2 = new mongoose.Types.ObjectId();
        const candidate3 = new mongoose.Types.ObjectId();

        afterEach(() => {
            jest.clearAllMocks();
        });

        it.each([
            {
                description: 'valid vote',
                voteRequest: {
                    position: position,
                    ranking: [candidate1.toString(), candidate2.toString()],
                },
                mockCandidates: [
                    { _id: candidate1, position: position },
                    { _id: candidate2, position: position },
                ],
                shouldCallDB: true,
                expected: true,
            },
            {
                description: 'empty ranking',
                voteRequest: {
                    position: position,
                    ranking: [],
                },
                mockCandidates: null,
                shouldCallDB: false,
                expected: false,
            },
            {
                description: 'null ranking',
                voteRequest: {
                    position: position,
                    ranking: null as any,
                },
                mockCandidates: null,
                shouldCallDB: false,
                expected: false,
            },
            {
                description: 'undefined ranking',
                voteRequest: {
                    position: position,
                    ranking: undefined as any,
                },
                mockCandidates: null,
                shouldCallDB: false,
                expected: false,
            },
            {
                description: 'more than 5 candidates',
                voteRequest: {
                    position: position,
                    ranking: [
                        candidate1.toString(),
                        candidate2.toString(),
                        candidate3.toString(),
                        new mongoose.Types.ObjectId().toString(),
                        new mongoose.Types.ObjectId().toString(),
                        new mongoose.Types.ObjectId().toString(),
                    ],
                },
                mockCandidates: null,
                shouldCallDB: false,
                expected: false,
            },
            {
                description: 'invalid ObjectId',
                voteRequest: {
                    position: position,
                    ranking: ['invalid-id', candidate1.toString()],
                },
                mockCandidates: null,
                shouldCallDB: false,
                expected: false,
            },
            {
                description: 'duplicate candidates',
                voteRequest: {
                    position: position,
                    ranking: [
                        candidate1.toString(),
                        candidate1.toString(),
                        candidate2.toString(),
                    ],
                },
                mockCandidates: null,
                shouldCallDB: false,
                expected: false,
            },
            {
                description: 'candidate does not belong to position',
                voteRequest: {
                    position: position,
                    ranking: [candidate1.toString(), candidate2.toString()],
                },
                mockCandidates: [{ _id: candidate1, position: position }],
                shouldCallDB: true,
                expected: false,
            },
            {
                description: 'candidate does not exist',
                voteRequest: {
                    position: position,
                    ranking: [candidate1.toString(), candidate2.toString()],
                },
                mockCandidates: [],
                shouldCallDB: true,
                expected: false,
            },
        ])(
            'returns $expected for $description',
            async ({ voteRequest, mockCandidates, shouldCallDB, expected }) => {
                if (mockCandidates !== null) {
                    (Candidate.find as jest.Mock).mockResolvedValue(
                        mockCandidates
                    );
                }

                const result = await isValidBallot(voteRequest);

                if (shouldCallDB) {
                    expect(Candidate.find).toHaveBeenCalledWith({
                        _id: { $in: voteRequest.ranking },
                        position: position,
                    });
                } else {
                    expect(Candidate.find).not.toHaveBeenCalled();
                }

                expect(result).toBe(expected);
            }
        );
    });
});
