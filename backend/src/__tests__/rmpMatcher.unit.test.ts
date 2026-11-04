import {
    normalizeNamePart,
    pickRmpMatch,
    splitInstructorName,
    toRmpSearchText,
} from '../services/rmp/rmpMatcher';
import type { RmpTeacher } from '../services/rmp/rmpClient';

const pomona = { legacyId: 774, name: 'Pomona College' };

function teacher(
    legacyId: number,
    firstName: string,
    lastName: string,
    overrides: Partial<RmpTeacher> = {}
): RmpTeacher {
    return {
        legacyId,
        firstName,
        lastName,
        department: 'Economics',
        numRatings: 5,
        school: pomona,
        ...overrides,
    };
}

describe('rmpMatcher', () => {
    describe('splitInstructorName', () => {
        it('handles "Last, First Middle"', () => {
            expect(splitInstructorName('Smith, Gary A.')).toEqual({
                firstName: 'Gary',
                lastName: 'Smith',
            });
        });

        it('handles "First Middle Last"', () => {
            expect(splitInstructorName('Gary Alan Smith')).toEqual({
                firstName: 'Gary',
                lastName: 'Smith',
            });
        });

        it('handles "First Last" and stray whitespace', () => {
            expect(splitInstructorName('  Gary   Smith ')).toEqual({
                firstName: 'Gary',
                lastName: 'Smith',
            });
        });

        it('treats a single token as a last name', () => {
            expect(splitInstructorName('Staff')).toEqual({
                firstName: '',
                lastName: 'Staff',
            });
        });
    });

    describe('toRmpSearchText', () => {
        it('produces "First Last" without middle names', () => {
            expect(toRmpSearchText('Smith, Gary A.')).toBe('Gary Smith');
            expect(toRmpSearchText('Gary Alan Smith')).toBe('Gary Smith');
        });
    });

    describe('normalizeNamePart', () => {
        it('strips accents, case, hyphens and apostrophes', () => {
            expect(normalizeNamePart('García-López')).toBe('garcialopez');
            expect(normalizeNamePart("O'Brien")).toBe('obrien');
            expect(normalizeNamePart('SMITH')).toBe('smith');
        });
    });

    describe('pickRmpMatch', () => {
        it('matches the single candidate with the same first and last name', () => {
            const candidates = [
                teacher(1, 'Gary', 'Smith'),
                teacher(2, 'Gary', 'Kates'),
                teacher(3, 'Darryl', 'Smith'),
            ];
            const result = pickRmpMatch('Smith, Gary A.', candidates);
            expect(result.reason).toBe('matched');
            expect(result.match?.legacyId).toBe(1);
        });

        it('matches across accents and hyphens', () => {
            const candidates = [teacher(9, 'Maria', 'Garcia Lopez')];
            const result = pickRmpMatch('García-López, María', candidates);
            expect(result.reason).toBe('matched');
            expect(result.match?.legacyId).toBe(9);
        });

        it('returns no_candidates for an empty list', () => {
            const result = pickRmpMatch('Gary Smith', []);
            expect(result.reason).toBe('no_candidates');
            expect(result.match).toBeNull();
        });

        it('accepts a short-form first name with the same last name', () => {
            const candidates = [teacher(5, 'Fred', 'Grieman')];
            const result = pickRmpMatch('Grieman, Frederick J.', candidates);
            expect(result.reason).toBe('matched');
            expect(result.match?.legacyId).toBe(5);
        });

        it('does not accept a first initial alone', () => {
            const candidates = [teacher(6, 'F', 'Grieman')];
            const result = pickRmpMatch('Frederick Grieman', candidates);
            expect(result.reason).toBe('no_exact_match');
        });

        it('does not accept a non-prefix nickname', () => {
            const candidates = [teacher(7, 'Mike', 'Kuehlwein')];
            const result = pickRmpMatch('Michael Kuehlwein', candidates);
            expect(result.reason).toBe('no_exact_match');
        });

        it('does not accept a last-name-only match', () => {
            const candidates = [teacher(3, 'Darryl', 'Smith')];
            const result = pickRmpMatch('Gary Smith', candidates);
            expect(result.reason).toBe('no_exact_match');
            expect(result.match).toBeNull();
        });

        it('refuses to guess between two exact matches', () => {
            const candidates = [
                teacher(1, 'Gary', 'Smith'),
                teacher(2, 'Gary', 'Smith', { department: 'History' }),
            ];
            const result = pickRmpMatch('Gary Smith', candidates);
            expect(result.reason).toBe('multiple_exact_matches');
            expect(result.match).toBeNull();
            expect(result.candidates).toHaveLength(2);
        });
    });
});
