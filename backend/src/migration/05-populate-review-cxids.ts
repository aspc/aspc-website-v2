import mongoose from 'mongoose';
import * as fs from 'fs';
import path from 'path';
import { Courses, CourseReviews } from '../models/Courses';
import { pickInstructorCxidForCourse } from '../utils/courseInstructors';

const MIGRATION_DATA_DIR = path.join(__dirname, 'migration-data');
import { Instructors } from '../models/People';

// ============================================================================
// PHASE 4: Update CourseReviews with Instructor CxIDs
// ============================================================================

interface CxIDMapping {
    courseCode: string;
    termKey: string;
    instructorName: string;
    cxid: number;
}

interface MigrationStats {
    totalReviews: number;
    mappedToCxID: number;
    unmappedLegacy: number;
    errors: number;
}

// ============================================================================
// Helpers
// ============================================================================

function levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
        let prev = dp[0];
        dp[0] = i;
        for (let j = 1; j <= n; j++) {
            const temp = dp[j];
            dp[j] =
                a[i - 1] === b[j - 1]
                    ? prev
                    : 1 + Math.min(prev, dp[j], dp[j - 1]);
            prev = temp;
        }
    }
    return dp[n];
}

// Handles "Last, First" vs "First Last" and similar token-order differences
function tokenSortNormalize(name: string): string {
    return name
        .toLowerCase()
        .replace(/[,.]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .sort()
        .join(' ');
}

const LEVENSHTEIN_THRESHOLD = 3;
const TX_BATCH_SIZE = 500;

interface ReviewUpdate {
    reviewId: number;
    cxid: number;
    matchMethod: 'exact' | 'token-sort' | 'fuzzy' | 'cxid-intersection';
}

// ============================================================================
// Main Migration Logic
// ============================================================================

async function migrateReviews(dryRun: boolean = false) {
    console.log('='.repeat(80));
    console.log('PHASE 4: Update CourseReviews with Instructor CxIDs');
    if (dryRun) {
        console.log(
            '🔍 DRY RUN MODE - No changes will be made to the database'
        );
    }
    console.log('='.repeat(80));

    try {
        // Connect to MongoDB
        await mongoose.connect(
            process.env.MONGODB_TEST_URI ||
                'mongodb://localhost:27017/coursereview'
        );
        console.log('✓ Connected to MongoDB\n');

        // Load Phase 1 mappings
        console.log('Loading Phase 1 CxID mappings...');
        const cxidMappings: CxIDMapping[] = JSON.parse(
            fs.readFileSync(
                path.join(MIGRATION_DATA_DIR, 'cxid-mappings.json'),
                'utf-8'
            )
        );
        console.log(`✓ Loaded ${cxidMappings.length} CxID mappings\n`);

        // Build lookup maps for fast access
        console.log('Building lookup indexes...');

        // courseCode -> exact-normalized name -> Set<CxID>
        const courseLookup = new Map<string, Map<string, Set<number>>>();
        // courseCode -> token-sorted normalized name -> Set<CxID>
        const courseTokenLookup = new Map<string, Map<string, Set<number>>>();

        cxidMappings.forEach((mapping) => {
            const exactName = mapping.instructorName.toLowerCase().trim();
            const tokenName = tokenSortNormalize(mapping.instructorName);

            if (!courseLookup.has(mapping.courseCode)) {
                courseLookup.set(mapping.courseCode, new Map());
            }
            const instructorMap = courseLookup.get(mapping.courseCode)!;
            if (!instructorMap.has(exactName)) {
                instructorMap.set(exactName, new Set());
            }
            instructorMap.get(exactName)!.add(mapping.cxid);

            if (!courseTokenLookup.has(mapping.courseCode)) {
                courseTokenLookup.set(mapping.courseCode, new Map());
            }
            const tokenMap = courseTokenLookup.get(mapping.courseCode)!;
            if (!tokenMap.has(tokenName)) {
                tokenMap.set(tokenName, new Set());
            }
            tokenMap.get(tokenName)!.add(mapping.cxid);
        });

        console.log(`✓ Built lookup index for ${courseLookup.size} courses\n`);

        // Get all instructors for name lookup
        console.log('Loading instructor data...');
        const allInstructors = await Instructors.find({}).lean();
        const instructorById = new Map(allInstructors.map((i) => [i.id, i]));
        console.log(`✓ Loaded ${allInstructors.length} instructors\n`);

        // Get all courses for code_slug lookup
        console.log('Loading course data...');
        const allCourses = await Courses.find({}).lean();
        const courseById = new Map(allCourses.map((c) => [c.id, c]));
        console.log(`✓ Loaded ${allCourses.length} courses\n`);

        // Get all reviews
        console.log('Loading course reviews...');
        const reviews = await CourseReviews.find({}).lean();
        console.log(`✓ Found ${reviews.length} reviews\n`);

        const stats: MigrationStats = {
            totalReviews: reviews.length,
            mappedToCxID: 0,
            unmappedLegacy: 0,
            errors: 0,
        };

        // ── Computation phase: resolve CxID for every review (no writes) ──────
        console.log('Computing CxID mappings...');
        console.log('-'.repeat(80));

        const updates: ReviewUpdate[] = [];
        const unmappedReviews: {
            reviewId: number;
            course: string;
            instructor: string;
        }[] = [];

        let processed = 0;

        for (const review of reviews) {
            try {
                const course = courseById.get(review.course_id);
                const instructor = instructorById.get(review.instructor_id);

                if (!course || !instructor) {
                    if (stats.errors < 5) {
                        console.log(
                            `⚠️  Review ${review.id}: Missing course or instructor reference`
                        );
                    }
                    stats.errors++;
                    continue;
                }

                let foundCxID: number | undefined;
                let matchMethod: ReviewUpdate['matchMethod'] | undefined;

                if (course.code_slug && instructor.name) {
                    const exactName = instructor.name.toLowerCase().trim();
                    const tokenName = tokenSortNormalize(instructor.name);

                    const instructorMap = courseLookup.get(course.code_slug);
                    const tokenMap = courseTokenLookup.get(course.code_slug);

                    // 1. Exact normalized name match
                    const exactCxids = instructorMap?.get(exactName);
                    if (exactCxids && exactCxids.size > 0) {
                        foundCxID = exactCxids.values().next().value!;
                        matchMethod = 'exact';
                    }

                    // 2. Token-sort match (handles "Last, First" vs "First Last")
                    if (foundCxID === undefined) {
                        const tokenCxids = tokenMap?.get(tokenName);
                        if (tokenCxids && tokenCxids.size > 0) {
                            foundCxID = tokenCxids.values().next().value!;
                            matchMethod = 'token-sort';
                        }
                    }

                    // 3. Levenshtein fuzzy match within threshold
                    if (foundCxID === undefined && instructorMap) {
                        let bestDist = LEVENSHTEIN_THRESHOLD + 1;
                        let bestCxids: Set<number> | undefined;
                        for (const [candidateName, cxids] of instructorMap) {
                            const dist = levenshtein(exactName, candidateName);
                            if (
                                dist <= LEVENSHTEIN_THRESHOLD &&
                                dist < bestDist
                            ) {
                                bestDist = dist;
                                bestCxids = cxids;
                            }
                        }
                        if (bestCxids && bestCxids.size > 0) {
                            foundCxID = bestCxids.values().next().value!;
                            matchMethod = 'fuzzy';
                        }
                    }
                }

                // 4. CxID-intersection fallback: prefer a CxID the course already
                //    knows about; avoids picking an arbitrary school when an
                //    instructor has taught at multiple campuses
                if (foundCxID === undefined) {
                    const picked = pickInstructorCxidForCourse(
                        instructor,
                        course.all_instructor_cxids
                    );
                    if (picked !== undefined) {
                        foundCxID = picked;
                        matchMethod = 'cxid-intersection';
                    }
                }

                if (foundCxID !== undefined && matchMethod) {
                    updates.push({
                        reviewId: review.id,
                        cxid: foundCxID,
                        matchMethod,
                    });
                    stats.mappedToCxID++;

                    if (stats.mappedToCxID <= 5) {
                        console.log(
                            `✓ Review ${review.id}: ${course.code} + ${instructor.name} → CxID ${foundCxID} (${matchMethod})`
                        );
                    }
                } else {
                    unmappedReviews.push({
                        reviewId: review.id,
                        course: course.code,
                        instructor: instructor.name,
                    });
                    stats.unmappedLegacy++;

                    if (stats.unmappedLegacy <= 5) {
                        console.log(
                            `⚠️  Review ${review.id}: ${course.code} + ${instructor.name} → No CxID (legacy only)`
                        );
                    }
                }

                processed++;

                if (processed % 1000 === 0) {
                    const pct = Math.round((processed / reviews.length) * 100);
                    console.log(
                        `  Progress: ${processed}/${reviews.length} (${pct}%)`
                    );
                }
            } catch (error) {
                console.error(
                    `❌ Error processing review ${review.id}:`,
                    error
                );
                stats.errors++;
            }
        }

        if (stats.mappedToCxID > 5) {
            console.log(`... (${stats.mappedToCxID - 5} more reviews mapped)`);
        }
        if (stats.unmappedLegacy > 5) {
            console.log(
                `... (${stats.unmappedLegacy - 5} more reviews unmapped)`
            );
        }

        // Log match method breakdown
        const methodCounts = updates.reduce(
            (acc, u) => {
                acc[u.matchMethod] = (acc[u.matchMethod] ?? 0) + 1;
                return acc;
            },
            {} as Partial<Record<ReviewUpdate['matchMethod'], number>>
        );
        console.log('\nMatch method breakdown:');
        for (const [method, count] of Object.entries(methodCounts)) {
            console.log(`  ${method}: ${count}`);
        }

        // ── Write phase: apply in batched transactions ────────────────────────
        // Requires a MongoDB replica set (Atlas or local rs). Each batch is
        // atomic: a mid-batch failure rolls back only that batch, not prior ones.
        if (!dryRun && updates.length > 0) {
            const totalBatches = Math.ceil(updates.length / TX_BATCH_SIZE);
            console.log(
                `\nApplying ${updates.length} updates in ${totalBatches} batch(es) of up to ${TX_BATCH_SIZE}...`
            );

            for (let i = 0; i < updates.length; i += TX_BATCH_SIZE) {
                const batch = updates.slice(i, i + TX_BATCH_SIZE);
                const batchNum = Math.floor(i / TX_BATCH_SIZE) + 1;
                const session = await mongoose.startSession();
                try {
                    await session.withTransaction(async () => {
                        for (const { reviewId, cxid } of batch) {
                            await CourseReviews.updateOne(
                                { id: reviewId },
                                { $set: { instructor_cxid: cxid } },
                                { session }
                            );
                        }
                    });
                    console.log(
                        `  ✓ Batch ${batchNum}/${totalBatches} committed`
                    );
                } finally {
                    await session.endSession();
                }
            }
        }

        // Verification
        console.log('\nVerifying migration...');
        console.log('-'.repeat(80));

        if (!dryRun) {
            const withCxID = await CourseReviews.countDocuments({
                instructor_cxid: { $exists: true, $ne: null },
            });
            const withoutCxID = await CourseReviews.countDocuments({
                $or: [
                    { instructor_cxid: { $exists: false } },
                    { instructor_cxid: null },
                ],
            });

            console.log(`Reviews with CxID: ${withCxID}`);
            console.log(`Reviews without CxID (legacy): ${withoutCxID}`);
        }

        // Calculate percentages
        const mappedPct = Math.round(
            (stats.mappedToCxID / stats.totalReviews) * 100
        );
        const unmappedPct = Math.round(
            (stats.unmappedLegacy / stats.totalReviews) * 100
        );

        // Save report
        const report = {
            phase: 4,
            description: 'Update CourseReviews with Instructor CxIDs',
            dryRun: dryRun,
            stats: {
                ...stats,
                mappedPercentage: mappedPct,
                unmappedPercentage: unmappedPct,
                matchMethods: methodCounts,
            },
            unmappedReviews,
            timestamp: new Date().toISOString(),
        };

        const reportPath = path.join(
            MIGRATION_DATA_DIR,
            `phase4-report-${dryRun ? 'dryrun-' : ''}${Date.now()}.json`
        );
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        // Print summary
        console.log('\n' + '='.repeat(80));
        console.log('PHASE 4 COMPLETE - Summary:');
        console.log('='.repeat(80));
        console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
        console.log(`Total reviews: ${stats.totalReviews}`);
        console.log(`Mapped to CxID: ${stats.mappedToCxID} (${mappedPct}%)`);
        console.log(
            `Unmapped (legacy only): ${stats.unmappedLegacy} (${unmappedPct}%)`
        );
        console.log(`Errors: ${stats.errors}`);
        console.log(`\nReport saved to: ${reportPath}`);
        console.log('='.repeat(80));

        if (dryRun) {
            console.log(
                '\n💡 This was a dry run. Run again with --live to apply changes.'
            );
        } else {
            console.log(
                '\n✅ Migration complete! CourseReviews updated with CxIDs.'
            );
            console.log('\nNext steps:');
            console.log('  1. Verify reviews with and without CxIDs');
            console.log('  2. Test queries using instructor_cxid');
            console.log('  3. Proceed to Phase 5: Cleanup legacy fields');
        }
    } catch (error) {
        console.error('\n❌ Error during Phase 4:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('\n✓ Disconnected from MongoDB');
    }
}

// ============================================================================
// Execute
// ============================================================================

const args = process.argv.slice(2);
const dryRun = !args.includes('--live');

if (dryRun) {
    console.log(
        'ℹ️  Running in DRY RUN mode. Use --live flag to apply changes.\n'
    );
}

migrateReviews(dryRun)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
