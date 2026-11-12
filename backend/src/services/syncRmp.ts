/**
 * Link instructors to their Rate My Professors pages.
 *
 * For every instructor without an rmpId, searches RMP by name within the
 * instructor's school and stores the professor id when exactly one
 * candidate matches by first and last name. Everything else is recorded
 * as "checked, not found" (rmpId null, rmpCheckedAt set) and listed in the
 * report with the candidates RMP returned so an admin can fix it by hand
 * via PUT /api/instructors/:id/rmp.
 *
 * The script never overwrites an existing rmpId, so manual fixes survive
 * re-runs. To re-link an instructor, clear their rmpId first.
 *
 * Usage:
 *   npm run sync:rmp                 dry run, writes nothing to Mongo
 *   npm run sync:rmp -- --live       write results
 *   npm run sync:rmp -- --all        re-check instructors checked < 30 days ago
 *   npm run sync:rmp -- --limit 50   stop after 50 instructors (for testing)
 */

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Instructors } from '../models/People';
import { CLAREMONT_RMP_SCHOOL_IDS, RMP_SCHOOL_IDS } from '../constants/rmp';
import { searchRmpTeachers, sleep, RmpTeacher } from './rmp/rmpClient';
import { pickRmpMatch, toRmpSearchText, MatchReason } from './rmp/rmpMatcher';

dotenv.config();

const REPORT_DIR = path.join(__dirname, '..', 'migration', 'migration-data');
const DELAY_BETWEEN_REQUESTS_MS = 1_000;
const RECHECK_AFTER_DAYS = 30;

interface ReportEntry {
    instructorId: number;
    name: string;
    school: string;
    searchText: string;
    reason: MatchReason | 'error';
    rmpId: number | null;
    candidates: Array<{
        legacyId: number;
        name: string;
        department: string;
        school: string;
        numRatings: number;
    }>;
    error?: string;
}

function parseArgs(argv: string[]) {
    const live = argv.includes('--live');
    const all = argv.includes('--all');
    const limitIdx = argv.indexOf('--limit');
    const limit =
        limitIdx !== -1 ? parseInt(argv[limitIdx + 1], 10) : undefined;
    return { live, all, limit };
}

function summarizeCandidate(c: RmpTeacher) {
    return {
        legacyId: c.legacyId,
        name: `${c.firstName} ${c.lastName}`,
        department: c.department,
        school: c.school.name,
        numRatings: c.numRatings,
    };
}

/**
 * Search RMP for one instructor. Known school: scoped search.
 * Unknown school: unscoped search filtered to the five Claremont colleges.
 */
async function findCandidates(
    searchText: string,
    school?: string
): Promise<RmpTeacher[]> {
    const schoolId = school ? RMP_SCHOOL_IDS[school] : undefined;
    if (schoolId !== undefined) {
        return searchRmpTeachers(searchText, schoolId);
    }
    const all = await searchRmpTeachers(searchText, undefined, 50);
    return all.filter((t) => CLAREMONT_RMP_SCHOOL_IDS.includes(t.school.legacyId));
}

async function syncRmp() {
    const { live, all, limit } = parseArgs(process.argv.slice(2));

    console.log('='.repeat(80));
    console.log('Sync Rate My Professors ids');
    console.log(`Mode: ${live ? 'LIVE' : 'DRY RUN'}${all ? ' (--all)' : ''}`);
    if (limit) console.log(`Limit: ${limit}`);
    console.log('='.repeat(80));

    // Same selection as server.ts: production hits the real database,
    // anything else hits the test database.
    const mongoUri =
        process.env.NODE_ENV === 'production'
            ? process.env.MONGODB_URI
            : process.env.MONGODB_TEST_URI;
    if (!mongoUri) {
        throw new Error(
            'MONGODB_URI / MONGODB_TEST_URI is not defined. Check backend/.env.'
        );
    }
    await mongoose.connect(mongoUri);
    console.log(`Database: ${mongoose.connection.name}`);
    console.log('Connected to MongoDB\n');

    const recheckBefore = new Date(
        Date.now() - RECHECK_AFTER_DAYS * 24 * 60 * 60 * 1000
    );
    const filter: Record<string, unknown> = {
        $or: [{ rmpId: null }, { rmpId: { $exists: false } }],
    };
    if (!all) {
        filter.$and = [
            {
                $or: [
                    { rmpCheckedAt: null },
                    { rmpCheckedAt: { $exists: false } },
                    { rmpCheckedAt: { $lt: recheckBefore } },
                ],
            },
        ];
    }

    let instructors = await Instructors.find(filter)
        .sort({ numReviews: -1, id: 1 })
        .lean();
    if (limit) instructors = instructors.slice(0, limit);
    console.log(`${instructors.length} instructor(s) to check\n`);

    const stats: Record<ReportReason, number> = {
        matched: 0,
        no_candidates: 0,
        no_exact_match: 0,
        multiple_exact_matches: 0,
        error: 0,
    };
    const entries: ReportEntry[] = [];

    for (const [i, inst] of instructors.entries()) {
        const searchText = toRmpSearchText(inst.name);
        const prefix = `[${i + 1}/${instructors.length}] ${inst.name} (${inst.school ?? 'N/A'})`;

        let entry: ReportEntry;
        try {
            const candidates = await findCandidates(searchText, inst.school);
            const result = pickRmpMatch(inst.name, candidates);
            entry = {
                instructorId: inst.id,
                name: inst.name,
                school: inst.school ?? 'N/A',
                searchText,
                reason: result.reason,
                rmpId: result.match?.legacyId ?? null,
                candidates: result.candidates.map(summarizeCandidate),
            };
            console.log(
                result.match
                    ? `${prefix} -> ${result.match.legacyId} (${result.match.department})`
                    : `${prefix} -> ${result.reason} (${candidates.length} candidate(s))`
            );
        } catch (err) {
            entry = {
                instructorId: inst.id,
                name: inst.name,
                school: inst.school ?? 'N/A',
                searchText,
                reason: 'error',
                rmpId: null,
                candidates: [],
                error: err instanceof Error ? err.message : String(err),
            };
            console.error(`${prefix} -> ERROR ${entry.error}`);
        }

        stats[entry.reason] += 1;
        entries.push(entry);

        // Only record a result in Mongo when the lookup actually ran.
        if (live && entry.reason !== 'error') {
            await Instructors.updateOne(
                { id: inst.id },
                { $set: { rmpId: entry.rmpId, rmpCheckedAt: new Date() } }
            );
        }

        if (i < instructors.length - 1) {
            await sleep(DELAY_BETWEEN_REQUESTS_MS);
        }
    }

    const report = {
        mode: live ? 'live' : 'dryrun',
        all,
        limit: limit ?? null,
        timestamp: new Date().toISOString(),
        stats,
        unmatched: entries.filter((e) => e.reason !== 'matched'),
        matched: entries.filter((e) => e.reason === 'matched'),
    };
    fs.mkdirSync(REPORT_DIR, { recursive: true });
    const reportPath = path.join(
        REPORT_DIR,
        `rmp-sync-report-${live ? '' : 'dryrun-'}${Date.now()}.json`
    );
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    for (const [reason, count] of Object.entries(stats)) {
        console.log(`  ${reason.padEnd(24)} ${count}`);
    }
    console.log(`\nReport: ${reportPath}`);
    if (!live) console.log('Dry run: nothing written to MongoDB. Re-run with --live to save.');

    await mongoose.disconnect();
}

type ReportReason = MatchReason | 'error';

syncRmp().catch((err) => {
    console.error(err);
    process.exit(1);
});
