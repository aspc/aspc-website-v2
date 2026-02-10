import {
    getCampusRepCandidates,
    getClassRepCandidates,
    recordVote,
} from '../routes/VotingRoutes';
import { Candidate, StudentBallotInfo } from '../models/Voting';
import { Request, Response } from 'express';

jest.mock('../models/Voting');

describe('Ballot helper functions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getClassRepCandidates', () => {
        it('calls Candidate.find with correct position for year', async () => {
            const mockCandidatesDB = [
                { name: 'Alice', position: 'first_year_class_president' },
                { name: 'Carol', position: 'first_year_class_president' },
            ];

            (Candidate.find as jest.Mock).mockResolvedValue(mockCandidatesDB);

            const candidates = await getClassRepCandidates(1);

            expect(Candidate.find).toHaveBeenCalledWith({
                position: 'first_year_class_president',
            });
            expect(candidates).toEqual(mockCandidatesDB);
        });

        it('returns empty array if year not in yearToPosition', async () => {
            const candidates = await getClassRepCandidates(99);
            expect(candidates).toEqual([]);
        });
    });

    describe('getCampusRepCandidates', () => {
        it('returns candidates for north campus housing', async () => {
            const mockCandidatesDB = [
                { name: 'Bob', position: 'north_campus_representative' },
                { name: 'Dave', position: 'north_campus_representative' },
            ];
            (Candidate.find as jest.Mock).mockResolvedValue(mockCandidatesDB);

            const candidates = await getCampusRepCandidates('north');

            expect(Candidate.find).toHaveBeenCalledWith({
                position: 'north_campus_representative',
            });
            expect(candidates).toEqual(mockCandidatesDB);
        });

        it('returns candidates for south housing', async () => {
            const mockCandidatesDB = [
                { name: 'Eve', position: 'south_campus_representative' },
            ];

            (Candidate.find as jest.Mock).mockResolvedValue(mockCandidatesDB);

            const candidates = await getCampusRepCandidates('south');

            expect(Candidate.find).toHaveBeenCalledWith({
                position: 'south_campus_representative',
            });
            expect(candidates).toEqual(mockCandidatesDB);
        });

        it('returns undefined if housingStatus not in map', async () => {
            const candidates = await getCampusRepCandidates('east');
            expect(Candidate.find).not.toHaveBeenCalled();
            expect(candidates).toEqual([]);
        });
    });
});
