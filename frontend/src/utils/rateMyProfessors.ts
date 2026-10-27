/**
 * Helpers for linking out to Rate My Professors.
 *
 * There is no official RMP API, so this only builds deep links to RMP's
 * own search page. Nothing is fetched from RMP.
 */

const RMP_BASE_URL = 'https://www.ratemyprofessors.com';

/** RMP's numeric school ids for the Claremont Colleges, keyed by our school codes. */
export const RMP_SCHOOL_IDS: Record<string, number> = {
    PO: 774, // Pomona College
    CM: 234, // Claremont McKenna College
    HM: 400, // Harvey Mudd College
    SC: 889, // Scripps College
    PZ: 768, // Pitzer College
};

/**
 * Reduce an instructor name to "First Last" for a search query.
 * Handles both "Last, First Middle" and "First Middle Last" formats and
 * drops middle names, which RMP often omits.
 */
export function formatNameForRmpSearch(name: string): string {
    const trimmed = name.trim().replace(/\s+/g, ' ');
    const commaIdx = trimmed.indexOf(',');
    if (commaIdx !== -1) {
        const lastName = trimmed.slice(0, commaIdx).trim();
        const firstName = trimmed
            .slice(commaIdx + 1)
            .trim()
            .split(' ')[0];
        return [firstName, lastName].filter(Boolean).join(' ');
    }
    const parts = trimmed.split(' ');
    if (parts.length > 2) {
        return `${parts[0]} ${parts[parts.length - 1]}`;
    }
    return trimmed;
}

/**
 * Build a link to RMP's professor search. Scoped to the instructor's
 * school when we know it, otherwise searches across all schools.
 */
export function buildRmpSearchUrl(name: string, schoolCode?: string): string {
    const query = encodeURIComponent(formatNameForRmpSearch(name));
    const schoolId = schoolCode ? RMP_SCHOOL_IDS[schoolCode] : undefined;
    const path = schoolId
        ? `/search/professors/${schoolId}`
        : '/search/professors';
    return `${RMP_BASE_URL}${path}?q=${query}`;
}
