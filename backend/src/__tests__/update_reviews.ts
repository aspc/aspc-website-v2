import mongoose from 'mongoose';
import * as fs from 'fs';
import { Courses, CourseReviews } from '../models/Courses';
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
            process.env.MONGODB_URI || 'mongodb://localhost:27017/coursereview'
        );
        console.log('✓ Connected to MongoDB\n');

        // Load Phase 1 mappings
        console.log('Loading Phase 1 CxID mappings...');
        const cxidMappings: CxIDMapping[] = JSON.parse(
            fs.readFileSync('./migration-data/cxid-mappings.json', 'utf-8')
        );
        console.log(`✓ Loaded ${cxidMappings.length} CxID mappings\n`);

        // Build lookup maps for fast access
        console.log('Building lookup indexes...');

        // Map: courseCode-slug -> instructorName -> Set of CxIDs
        const courseLookup = new Map<string, Map<string, Set<number>>>();

        cxidMappings.forEach((mapping) => {
            if (!courseLookup.has(mapping.courseCode)) {
                courseLookup.set(mapping.courseCode, new Map());
            }

            const instructorMap = courseLookup.get(mapping.courseCode)!;
            const normalizedName = mapping.instructorName.toLowerCase().trim();

            if (!instructorMap.has(normalizedName)) {
                instructorMap.set(normalizedName, new Set());
            }

            instructorMap.get(normalizedName)!.add(mapping.cxid);
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

        console.log('Processing reviews...');
        console.log('-'.repeat(80));

        let processed = 0;

        for (const review of reviews) {
            try {
                // Get course and instructor info
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

                // Look up CxID using course code_slug and instructor name
                let foundCxID: number | null = null;

                if (course.code_slug && instructor.name) {
                    const instructorMap = courseLookup.get(course.code_slug);

                    if (instructorMap) {
                        const normalizedName = instructor.name
                            .toLowerCase()
                            .trim();
                        const cxids = instructorMap.get(normalizedName);

                        if (cxids && cxids.size > 0) {
                            // Found in course-specific mapping
                            foundCxID = Array.from(cxids)[0];
                        }
                    }
                }

                // FALLBACK: If not found in mapping, check if instructor has cxids
                if (
                    !foundCxID &&
                    instructor.cxids &&
                    instructor.cxids.length > 0
                ) {
                    // Use the first CxID from the instructor's array
                    foundCxID = instructor.cxids[0];
                }

                if (foundCxID) {
                    // Successfully mapped to CxID
                    if (!dryRun) {
                        await CourseReviews.updateOne(
                            { id: review.id },
                            { $set: { instructor_cxid: foundCxID } }
                        );
                    }

                    stats.mappedToCxID++;

                    // Show first few mappings
                    if (stats.mappedToCxID <= 5) {
                        console.log(
                            `✓ Review ${review.id}: ${course.code} + ${instructor.name} → CxID ${foundCxID}`
                        );
                    }
                } else {
                    // No CxID found - keep legacy instructor_id
                    stats.unmappedLegacy++;

                    // Show first few unmapped
                    if (stats.unmappedLegacy <= 5) {
                        console.log(
                            `⚠️  Review ${review.id}: ${course.code} + ${instructor.name} → No CxID (legacy only)`
                        );
                    }
                }

                processed++;

                // Progress indicator
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
            },
            timestamp: new Date().toISOString(),
        };

        const reportPath = `./migration-data/phase4-report-${dryRun ? 'dryrun-' : ''}${Date.now()}.json`;
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
