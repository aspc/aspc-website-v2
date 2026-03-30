/**
 * Strategy 1 parity check (read-only): same Mongo DB that has both
 * all_instructor_ids and (optionally) all_instructor_cxids.
 *
 * - Courses: distinct resolved instructor count — legacy keys vs CxID keys
 *   (mirrors getCourseInstructorAssociationKeys + API lookup behavior).
 * - Reviews: "display resolvable" — instructor_cxid match first, else instructor_id.
 *
 * Usage (from backend/):
 *   MONGODB_URI="mongodb://..." npx ts-node src/migration/validate-cxid-parity.ts
 *
 * Optional:
 *   --out=./migration-data/parity-report.json   (default: timestamped file under migration-data)
 *   --max-mismatch=50                            max course rows to print to console
 */

import mongoose from 'mongoose';
import path from 'path';
import * as fs from 'fs';
import { Instructors } from '../models/People';
import { Courses, CourseReviews } from '../models/Courses';
import { getCourseInstructorAssociationKeys } from '../utils/courseInstructors';

const MIGRATION_DATA_DIR = path.join(__dirname, 'migration-data');

interface CourseMismatchRow {
    courseId: number;
    code_slug: string;
    legacySlotCount: number;
    cxidSlotCount: number;
    legacyDistinctResolved: number;
    cxidDistinctResolved: number;
    mode: 'cxid' | 'legacy';
}

function parseArgs() {
    const argv = process.argv.slice(2);
    let outPath: string | null = null;
    let maxMismatch = 30;

    for (const a of argv) {
        if (a.startsWith('--out=')) {
            outPath = a.slice('--out='.length);
        } else if (a.startsWith('--max-mismatch=')) {
            maxMismatch = parseInt(a.slice('--max-mismatch='.length), 10) || 30;
        }
    }

    return { outPath, maxMismatch };
}

async function main() {
    const { outPath, maxMismatch } = parseArgs();

    const uri =
        process.env.MONGODB_URI || 'mongodb://localhost:27017/coursereview';
    await mongoose.connect(uri);
    console.log('Connected. Loading instructors…');

    const instructors = await Instructors.find({}).lean();
    const instructorIdSet = new Set(instructors.map((i) => i.id));

    const cxidToInstructorId = new Map<number, number>();
    const duplicateCxids: number[] = [];
    for (const inst of instructors) {
        for (const cx of inst.cxids ?? []) {
            if (typeof cx !== 'number' || Number.isNaN(cx)) continue;
            if (cxidToInstructorId.has(cx)) {
                duplicateCxids.push(cx);
            } else {
                cxidToInstructorId.set(cx, inst.id);
            }
        }
    }

    console.log(`Instructors: ${instructors.length}`);
    if (duplicateCxids.length > 0) {
        console.log(
            `Warning: ${duplicateCxids.length} CxID values appear on more than one instructor doc (first mapping wins).`
        );
    }

    console.log('Scanning courses…');
    const courses = await Courses.find({})
        .select({
            id: 1,
            code_slug: 1,
            all_instructor_ids: 1,
            all_instructor_cxids: 1,
        })
        .lean();

    const mismatches: CourseMismatchRow[] = [];
    let withCxids = 0;
    let coursesCompared = 0;

    for (const c of courses) {
        const legacyIds = Array.isArray(c.all_instructor_ids)
            ? c.all_instructor_ids
            : [];
        const legacyResolved = new Set<number>();
        for (const lid of legacyIds) {
            if (instructorIdSet.has(lid)) legacyResolved.add(lid);
        }

        const assoc = getCourseInstructorAssociationKeys({
            all_instructor_cxids: c.all_instructor_cxids,
            all_instructor_ids: c.all_instructor_ids,
        });

        if (assoc.mode === 'cxid') {
            withCxids++;
            const cxidResolved = new Set<number>();
            for (const cx of assoc.keys) {
                const iid = cxidToInstructorId.get(cx);
                if (iid !== undefined) cxidResolved.add(iid);
            }
            coursesCompared++;
            if (legacyResolved.size !== cxidResolved.size) {
                mismatches.push({
                    courseId: c.id,
                    code_slug: c.code_slug,
                    legacySlotCount: legacyIds.length,
                    cxidSlotCount: assoc.keys.length,
                    legacyDistinctResolved: legacyResolved.size,
                    cxidDistinctResolved: cxidResolved.size,
                    mode: 'cxid',
                });
            }
        }
    }

    console.log('\n--- Courses ---');
    console.log(`Total courses: ${courses.length}`);
    console.log(`Courses with non-empty all_instructor_cxids: ${withCxids}`);
    console.log(
        `Compared (CxID strategy vs legacy distinct resolved): ${coursesCompared}`
    );
    console.log(`Mismatched distinct instructor count: ${mismatches.length}`);

    if (mismatches.length > 0) {
        console.log(
            `\nFirst ${Math.min(maxMismatch, mismatches.length)} mismatches:`
        );
        for (const m of mismatches.slice(0, maxMismatch)) {
            console.log(
                `  id=${m.courseId} slug=${m.code_slug} legacy=${m.legacyDistinctResolved} cxid=${m.cxidDistinctResolved} (legacySlots=${m.legacySlotCount} cxidSlots=${m.cxidSlotCount})`
            );
        }
    }

    console.log('\nScanning reviews…');
    const reviews = await CourseReviews.find({})
        .select({
            id: 1,
            instructor_id: 1,
            instructor_cxid: 1,
        })
        .lean();

    let resolvedViaCxid = 0;
    let resolvedViaLegacyOnly = 0;
    let unresolvable = 0;

    for (const r of reviews) {
        let viaCxid = false;
        if (r.instructor_cxid != null && r.instructor_cxid !== undefined) {
            if (cxidToInstructorId.has(r.instructor_cxid)) {
                viaCxid = true;
                resolvedViaCxid++;
            }
        }
        if (viaCxid) continue;

        const lid = r.instructor_id;
        if (lid != null && instructorIdSet.has(Number(lid))) {
            resolvedViaLegacyOnly++;
        } else {
            unresolvable++;
        }
    }

    const totalRev = reviews.length;
    console.log(
        '\n--- Reviews (display resolution: CxID first, else legacy id) ---'
    );
    console.log(`Total reviews: ${totalRev}`);
    console.log(`Resolvable via instructor_cxid: ${resolvedViaCxid}`);
    console.log(`Resolvable via instructor_id only: ${resolvedViaLegacyOnly}`);
    console.log(`Unresolvable (no matching instructor doc): ${unresolvable}`);
    if (totalRev > 0) {
        console.log(
            `Resolvable rate: ${(((totalRev - unresolvable) / totalRev) * 100).toFixed(2)}%`
        );
    }

    const report = {
        generatedAt: new Date().toISOString(),
        uriHost: (() => {
            try {
                return new URL(uri).host;
            } catch {
                return '(masked)';
            }
        })(),
        instructorsLoaded: instructors.length,
        duplicateCxidAssignments: duplicateCxids.length,
        courses: {
            total: courses.length,
            withAllInstructorCxids: withCxids,
            comparedLegacyVsCxidDistinct: coursesCompared,
            mismatchedDistinctInstructorCount: mismatches.length,
            mismatchSample: mismatches.slice(0, 200),
        },
        reviews: {
            total: totalRev,
            resolvedViaCxid,
            resolvedViaLegacyOnly,
            unresolvable,
            resolvableRate:
                totalRev > 0 ? (totalRev - unresolvable) / totalRev : null,
        },
    };

    const defaultOut = path.join(
        MIGRATION_DATA_DIR,
        `parity-report-${Date.now()}.json`
    );
    const target = outPath ? path.resolve(process.cwd(), outPath) : defaultOut;
    if (!fs.existsSync(path.dirname(target))) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
    }
    fs.writeFileSync(target, JSON.stringify(report, null, 2));
    console.log(`\nFull report written to ${target}`);

    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
