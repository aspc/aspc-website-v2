/**
 * Thin client for Rate My Professors' unofficial GraphQL endpoint.
 *
 * This is the same endpoint RMP's own website calls. It is not a supported
 * API: the schema or auth token can change without notice. Everything that
 * talks to RMP lives in this file so there is one place to fix when it does.
 *
 * Only the offline sync script (services/syncRmp.ts) should call this.
 * Never call it from a request handler.
 */

import axios, { AxiosError } from 'axios';
import { RMP_BASE_URL } from '../../constants/rmp';

const GRAPHQL_URL = `${RMP_BASE_URL}/graphql`;

// Public token embedded in RMP's frontend bundle ("test:test"). Not a secret.
const RMP_AUTH_HEADER = 'Basic dGVzdDp0ZXN0';

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1_000;

export interface RmpTeacher {
    legacyId: number;
    firstName: string;
    lastName: string;
    department: string;
    numRatings: number;
    school: {
        legacyId: number;
        name: string;
    };
}

interface TeacherSearchResponse {
    data?: {
        newSearch?: {
            teachers?: {
                edges?: Array<{ node: RmpTeacher }>;
            };
        };
    };
    errors?: Array<{ message: string }>;
}

const TEACHER_SEARCH_QUERY = `
query TeacherSearch($query: TeacherSearchQuery!, $first: Int!) {
  newSearch {
    teachers(query: $query, first: $first) {
      edges {
        node {
          legacyId
          firstName
          lastName
          department
          numRatings
          school {
            legacyId
            name
          }
        }
      }
    }
  }
}`;

/** RMP's GraphQL school ids are base64 of "School-<legacyId>". */
export function encodeRmpSchoolId(legacyId: number): string {
    return Buffer.from(`School-${legacyId}`).toString('base64');
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(err: unknown): boolean {
    const axiosErr = err as AxiosError;
    if (!axiosErr.isAxiosError) return false;
    if (!axiosErr.response) return true; // network error or timeout
    return axiosErr.response.status >= 500 || axiosErr.response.status === 429;
}

/**
 * Search RMP for teachers whose name matches `text`.
 * Pass a school legacy id to scope the search to that school; omit it to
 * search every school RMP knows about.
 */
export async function searchRmpTeachers(
    text: string,
    schoolLegacyId?: number,
    first = 20
): Promise<RmpTeacher[]> {
    const variables = {
        first,
        query: {
            text,
            ...(schoolLegacyId !== undefined
                ? { schoolID: encodeRmpSchoolId(schoolLegacyId) }
                : {}),
        },
    };

    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const response = await axios.post<TeacherSearchResponse>(
                GRAPHQL_URL,
                { query: TEACHER_SEARCH_QUERY, variables },
                {
                    timeout: REQUEST_TIMEOUT_MS,
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: RMP_AUTH_HEADER,
                        'User-Agent': 'Mozilla/5.0 (ASPC course review sync)',
                    },
                }
            );

            if (response.data.errors?.length) {
                throw new Error(
                    `RMP GraphQL error: ${response.data.errors
                        .map((e) => e.message)
                        .join('; ')}`
                );
            }

            const edges = response.data.data?.newSearch?.teachers?.edges;
            if (!Array.isArray(edges)) {
                throw new Error('RMP response missing teachers.edges');
            }
            return edges.map((edge) => edge.node);
        } catch (err) {
            lastError = err;
            if (attempt < MAX_ATTEMPTS && isRetryable(err)) {
                await sleep(RETRY_BASE_DELAY_MS * attempt);
                continue;
            }
            throw err;
        }
    }
    throw lastError;
}
