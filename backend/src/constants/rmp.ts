/**
 * Rate My Professors constants.
 *
 * RMP has no official API. The numeric "legacy" school ids below were read
 * off RMP's own school search pages and are what its site uses in URLs.
 */

export const RMP_BASE_URL = 'https://www.ratemyprofessors.com';

/** RMP legacy school ids for the Claremont Colleges, keyed by our school codes. */
export const RMP_SCHOOL_IDS: Record<string, number> = {
    PO: 774, // Pomona College
    CM: 234, // Claremont McKenna College
    HM: 400, // Harvey Mudd College
    SC: 889, // Scripps College
    PZ: 768, // Pitzer College
};

export const CLAREMONT_RMP_SCHOOL_IDS: number[] = Object.values(RMP_SCHOOL_IDS);

export function buildRmpProfessorUrl(legacyId: number): string {
    return `${RMP_BASE_URL}/professor/${legacyId}`;
}
