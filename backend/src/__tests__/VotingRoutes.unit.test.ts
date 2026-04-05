import mongoose from 'mongoose';

import {
    getEligibleCandidates,
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

    describe('getEligibleCandidates', () => {
        const mockSort = jest.fn();

        beforeEach(() => {
            mockSort.mockReset();
            (Candidate.find as jest.Mock).mockReturnValue({ sort: mockSort });
        });

        it('fall: returns year-eligible + campus-eligible, excludes spring-only', async () => {
            const allCandidates = [
                {
                    position: SENATE_POSITIONS.FIRST_YEAR_CLASS_PRESIDENT,
                    eligibleYears: [1],
                    housingLocation: [],
                },
                {
                    position: SENATE_POSITIONS.NORTH_CAMPUS_REPRESENTATIVE,
                    eligibleYears: [],
                    housingLocation: ['north'],
                },
                {
                    position: SENATE_POSITIONS.SOUTH_CAMPUS_REPRESENTATIVE,
                    eligibleYears: [],
                    housingLocation: ['south'],
                },
                {
                    position: SENATE_POSITIONS.PRESIDENT,
                    eligibleYears: [],
                    housingLocation: [],
                }, // spring-only
            ];
            mockSort.mockResolvedValue(allCandidates);

            const result = await getEligibleCandidates(
                mockElectionId.toString(),
                'fall',
                1,
                'north'
            );

            expect(result).toHaveLength(2);
            expect(result[0].position).toBe(
                SENATE_POSITIONS.FIRST_YEAR_CLASS_PRESIDENT
            );
            expect(result[1].position).toBe(
                SENATE_POSITIONS.NORTH_CAMPUS_REPRESENTATIVE
            );
        });

        it('spring: returns spring positions, excludes fall-only', async () => {
            const allCandidates = [
                {
                    position: SENATE_POSITIONS.SOPHOMORE_CLASS_PRESIDENT,
                    eligibleYears: [1],
                    housingLocation: [],
                },
                {
                    position: SENATE_POSITIONS.PRESIDENT,
                    eligibleYears: [],
                    housingLocation: [],
                },
                {
                    position: SENATE_POSITIONS.FIRST_YEAR_CLASS_PRESIDENT,
                    eligibleYears: [1],
                    housingLocation: [],
                }, // fall-only
            ];
            mockSort.mockResolvedValue(allCandidates);

            const result = await getEligibleCandidates(
                mockElectionId.toString(),
                'spring',
                1,
                'south'
            );

            expect(result).toHaveLength(2);
            expect(result.map((c: any) => c.position)).toContain(
                SENATE_POSITIONS.SOPHOMORE_CLASS_PRESIDENT
            );
            expect(result.map((c: any) => c.position)).toContain(
                SENATE_POSITIONS.PRESIDENT
            );
        });

        it('other: ignores semester, filters only by stored eligibility', async () => {
            const allCandidates = [
                {
                    position: 'Custom Vote',
                    eligibleYears: [1, 2],
                    housingLocation: [],
                },
                {
                    position: 'Best Dressed',
                    eligibleYears: [],
                    housingLocation: ['north'],
                },
                {
                    position: 'Spirit Award',
                    eligibleYears: [3],
                    housingLocation: [],
                },
            ];
            mockSort.mockResolvedValue(allCandidates);

            const result = await getEligibleCandidates(
                mockElectionId.toString(),
                'other',
                1,
                'north'
            );

            // Custom Vote (year 1 eligible) + Best Dressed (north) — not Spirit Award (year 3 only)
            expect(result).toHaveLength(2);
        });

        it('returns all candidates when no eligibility restrictions', async () => {
            const allCandidates = [
                {
                    position: SENATE_POSITIONS.PRESIDENT,
                    eligibleYears: [],
                    housingLocation: [],
                },
                {
                    position: SENATE_POSITIONS.VP_FINANCE,
                    eligibleYears: [],
                    housingLocation: [],
                },
            ];
            mockSort.mockResolvedValue(allCandidates);

            const result = await getEligibleCandidates(
                mockElectionId.toString(),
                'spring',
                2,
                'south'
            );

            expect(result).toHaveLength(2);
        });

        it('custom positions pass through semester filter in spring/fall', async () => {
            const allCandidates = [
                {
                    position: SENATE_POSITIONS.PRESIDENT,
                    eligibleYears: [],
                    housingLocation: [],
                },
                {
                    position: 'Best Dressed',
                    eligibleYears: [],
                    housingLocation: [],
                }, // custom
                {
                    position: SENATE_POSITIONS.FIRST_YEAR_CLASS_PRESIDENT,
                    eligibleYears: [1],
                    housingLocation: [],
                }, // fall-only
            ];
            mockSort.mockResolvedValue(allCandidates);

            const result = await getEligibleCandidates(
                mockElectionId.toString(),
                'spring',
                1,
                'north'
            );

            // President (spring) + Best Dressed (custom) — not first-year pres (fall preset)
            expect(result).toHaveLength(2);
            expect(result.map((c: any) => c.position)).toContain(
                SENATE_POSITIONS.PRESIDENT
            );
            expect(result.map((c: any) => c.position)).toContain(
                'Best Dressed'
            );
        });

        it('excludes candidate when year matches but housing does not', async () => {
            const allCandidates = [
                {
                    position: SENATE_POSITIONS.NORTH_CAMPUS_REPRESENTATIVE,
                    eligibleYears: [],
                    housingLocation: ['north'],
                },
            ];
            mockSort.mockResolvedValue(allCandidates);

            const result = await getEligibleCandidates(
                mockElectionId.toString(),
                'fall',
                1,
                'south'
            );

            expect(result).toHaveLength(0);
        });

        it('excludes candidate when housing matches but year does not', async () => {
            const allCandidates = [
                {
                    position: 'Custom',
                    eligibleYears: [3],
                    housingLocation: ['north'],
                },
            ];
            mockSort.mockResolvedValue(allCandidates);

            const result = await getEligibleCandidates(
                mockElectionId.toString(),
                'other',
                1,
                'north'
            );

            expect(result).toHaveLength(0);
        });

        it('returns empty when no candidates exist', async () => {
            mockSort.mockResolvedValue([]);

            const result = await getEligibleCandidates(
                mockElectionId.toString(),
                'spring',
                1,
                'north'
            );

            expect(result).toHaveLength(0);
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
                description: 'many candidates but not all match in DB',
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
                mockCandidates: [
                    { _id: candidate1, position: position },
                    { _id: candidate2, position: position },
                ],
                shouldCallDB: true,
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

        it('valid vote for custom position', async () => {
            const customPosition = 'Best Dressed';
            const c1 = new mongoose.Types.ObjectId();

            (Candidate.find as jest.Mock).mockResolvedValue([
                { _id: c1, position: customPosition },
            ]);

            const result = await isValidBallot({
                position: customPosition,
                ranking: [c1.toString()],
            });

            expect(Candidate.find).toHaveBeenCalledWith({
                _id: { $in: [c1.toString()] },
                position: customPosition,
            });
            expect(result).toBe(true);
        });
    });
});
