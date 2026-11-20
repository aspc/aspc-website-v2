/**
 * Pure matching logic for linking our instructors to RMP teachers.
 * No network or database access, so it is unit-testable in isolation.
 *
 * The rule is deliberately strict for the first pass: we only accept a
 * candidate whose last name matches ours exactly after normalization and
 * whose first name is the same or a short form of ours ("Fred" for
 * "Frederick"), and only when there is exactly one such candidate.
 * Anything less certain is left for an admin to resolve by hand.
 */

import type { RmpTeacher } from './rmpClient';

export interface NameParts {
    firstName: string;
    lastName: string;
}

export type MatchReason =
    | 'matched'
    | 'no_candidates'
    | 'no_exact_match'
    | 'multiple_exact_matches';

export interface MatchResult {
    match: RmpTeacher | null;
    reason: MatchReason;
    /** Candidates considered, kept for the report so admins can pick by hand. */
    candidates: RmpTeacher[];
}

/**
 * Split an instructor name into first and last.
 * Handles "Last, First Middle" and "First Middle Last"; middle names are
 * dropped because RMP usually omits them.
 */
export function splitInstructorName(name: string): NameParts {
    const trimmed = name.trim().replace(/\s+/g, ' ');
    const commaIdx = trimmed.indexOf(',');
    if (commaIdx !== -1) {
        const lastName = trimmed.slice(0, commaIdx).trim();
        const firstName = trimmed
            .slice(commaIdx + 1)
            .trim()
            .split(' ')[0];
        return { firstName, lastName };
    }
    const parts = trimmed.split(' ');
    if (parts.length === 1) {
        return { firstName: '', lastName: parts[0] };
    }
    return { firstName: parts[0], lastName: parts[parts.length - 1] };
}

/** "First Last" string suitable for an RMP search query. */
export function toRmpSearchText(name: string): string {
    const { firstName, lastName } = splitInstructorName(name);
    return [firstName, lastName].filter(Boolean).join(' ');
}

/**
 * Lowercase, strip accents, and drop everything but letters so that
 * "García-López", "Garcia Lopez" and "GARCIALOPEZ" all compare equal.
 */
export function normalizeNamePart(part: string): string {
    return part
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z]/g, '');
}

const MIN_PREFIX_LENGTH = 3;

/**
 * True when the two first names are identical, or one is a short form of
 * the other ("fred"/"frederick", "mike"/"michael" does NOT qualify since
 * it is not a prefix). Requires at least MIN_PREFIX_LENGTH characters so a
 * bare initial never matches.
 */
export function firstNamesCompatible(a: string, b: string): boolean {
    if (a === b) return true;
    const [short, long] = a.length <= b.length ? [a, b] : [b, a];
    return short.length >= MIN_PREFIX_LENGTH && long.startsWith(short);
}

export function pickRmpMatch(
    instructorName: string,
    candidates: RmpTeacher[]
): MatchResult {
    if (candidates.length === 0) {
        return { match: null, reason: 'no_candidates', candidates };
    }

    const ours = splitInstructorName(instructorName);
    const wantFirst = normalizeNamePart(ours.firstName);
    const wantLast = normalizeNamePart(ours.lastName);

    const exact = candidates.filter(
        (c) =>
            normalizeNamePart(c.lastName) === wantLast &&
            firstNamesCompatible(normalizeNamePart(c.firstName), wantFirst)
    );

    if (exact.length === 1) {
        return { match: exact[0], reason: 'matched', candidates };
    }
    if (exact.length > 1) {
        return { match: null, reason: 'multiple_exact_matches', candidates };
    }
    return { match: null, reason: 'no_exact_match', candidates };
}
