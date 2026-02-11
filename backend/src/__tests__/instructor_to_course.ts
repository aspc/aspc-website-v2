import mongoose from 'mongoose';
import * as fs from 'fs';
import { Courses } from '../models/Courses';

// ============================================================================
// PHASE 3: Update Courses Schema with Instructor CxIDs
// ============================================================================
// This script adds the all_instructor_cxids array field to all courses
// and populates it with data from Phase 1

interface CourseCxIDData {
    courseCode: string; // Format: "GOVT156C-CM" to match code_slug
    cxids: number[];
}

interface MigrationStats {
    totalInMongoDB: number;
    totalInAPI: number;
    updated: number;
    skipped: number;
    skippedDueToInvalidCode: number;
    errors: number;
    coursesWithMultipleCxIDs: number;
    averageCxIDsPerCourse: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

// No extraction needed - we use code_slug directly from MongoDB!

// ============================================================================
// Main Migration Logic
// ============================================================================

async function migrateCourses(dryRun: boolean = false) {
    console.log('='.repeat(80));
    console.log('PHASE 3: Update Courses Schema with Instructor CxIDs');
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

        // Load Phase 1 data
        console.log('Loading Phase 1 data...');
        const apiCourses: CourseCxIDData[] = JSON.parse(
            fs.readFileSync('./migration-data/course-cxids.json', 'utf-8')
        );
        console.log(`✓ Loaded ${apiCourses.length} courses from API data\n`);

        // Create lookup map by code_slug (already in hyphenated format)
        const apiLookup = new Map<string, CourseCxIDData>();
        apiCourses.forEach((course) => {
            const normalizedCode = course.courseCode.toUpperCase().trim();
            apiLookup.set(normalizedCode, course);
        });

        // Get all existing courses from MongoDB
        const dbCourses = await Courses.find({}).lean();
        console.log(`Found ${dbCourses.length} courses in MongoDB\n`);

        const stats: MigrationStats = {
            totalInMongoDB: dbCourses.length,
            totalInAPI: apiCourses.length,
            updated: 0,
            skipped: 0,
            skippedDueToInvalidCode: 0,
            errors: 0,
            coursesWithMultipleCxIDs: 0,
            averageCxIDsPerCourse: 0,
        };

        // Track courses that will be skipped (no CxIDs)
        const coursesToSkip: Array<{
            id: number;
            code: string;
            name: string;
            review_count: number;
        }> = [];

        let totalCxIDs = 0;

        console.log('Step 1: Updating existing courses...');
        console.log('-'.repeat(80));

        // Update existing courses
        for (const dbCourse of dbCourses) {
            // Skip courses with invalid/missing code
            if (!dbCourse.code || dbCourse.code.trim() === '') {
                console.log(
                    `⚠️  Skipping course with missing code (ID: ${dbCourse.id}, Name: ${dbCourse.name || 'N/A'})`
                );
                stats.skipped++;
                stats.skippedDueToInvalidCode++;
                coursesToSkip.push({
                    id: dbCourse.id,
                    code: dbCourse.code || 'MISSING_CODE',
                    name: dbCourse.name || 'N/A',
                    review_count: dbCourse.review_count,
                });
                continue;
            }

            // Use code_slug for matching (already in "CSCI005-HM" format)
            if (!dbCourse.code_slug || dbCourse.code_slug.trim() === '') {
                if (stats.skipped < 5) {
                    console.log(
                        `⚠️  No code_slug for: ${dbCourse.code} (ID: ${dbCourse.id})`
                    );
                }
                stats.skipped++;
                stats.skippedDueToInvalidCode++;
                coursesToSkip.push({
                    id: dbCourse.id,
                    code: dbCourse.code,
                    name: dbCourse.name,
                    review_count: dbCourse.review_count,
                });
                continue;
            }

            const normalizedSlug = dbCourse.code_slug.toUpperCase().trim();
            const apiData = apiLookup.get(normalizedSlug);

            if (!apiData) {
                if (stats.skipped < 5) {
                    console.log(
                        `⚠️  No API data for: ${dbCourse.code} (slug: ${dbCourse.code_slug}) - ${dbCourse.name}`
                    );
                }
                stats.skipped++;
                coursesToSkip.push({
                    id: dbCourse.id,
                    code: dbCourse.code,
                    name: dbCourse.name,
                    review_count: dbCourse.review_count,
                });
                continue;
            }

            try {
                if (!dryRun) {
                    await Courses.updateOne(
                        { id: dbCourse.id },
                        {
                            $set: {
                                all_instructor_cxids: apiData.cxids,
                            },
                        }
                    );
                }

                totalCxIDs += apiData.cxids.length;

                if (apiData.cxids.length > 1) {
                    stats.coursesWithMultipleCxIDs++;
                }

                // Log first few and high CxID count courses
                if (stats.updated < 5) {
                    console.log(
                        `✓ Updated: ${dbCourse.code} (slug: ${dbCourse.code_slug}) → ${apiData.cxids.length} CxIDs`
                    );
                } else if (apiData.cxids.length > 5) {
                    console.log(
                        `✓ Updated: ${dbCourse.code} → ${apiData.cxids.length} CxIDs [${apiData.cxids.join(', ')}]`
                    );
                }

                stats.updated++;
            } catch (error) {
                console.error(
                    `❌ Error updating ${dbCourse.code} (ID: ${dbCourse.id}):`,
                    error
                );
                stats.errors++;
            }
        }

        if (stats.updated > 5) {
            console.log(`... (${stats.updated - 5} more courses updated)`);
        }

        if (stats.skipped > 5) {
            console.log(`... (${stats.skipped - 5} more courses skipped)`);
        }

        // Calculate average
        stats.averageCxIDsPerCourse =
            stats.updated > 0
                ? Math.round((totalCxIDs / stats.updated) * 100) / 100
                : 0;

        // Export list of courses that will be/are without CxIDs
        if (coursesToSkip.length > 0) {
            console.log('\nStep 2: Exporting courses without CxIDs...');
            console.log('-'.repeat(80));

            // Sort by review count (descending) to prioritize important courses
            coursesToSkip.sort((a, b) => b.review_count - a.review_count);

            const noCxIDsPath = `./migration-data/courses-without-cxids-${dryRun ? 'preview-' : ''}${Date.now()}.json`;
            fs.writeFileSync(
                noCxIDsPath,
                JSON.stringify(coursesToSkip, null, 2)
            );

            console.log(
                `✓ Exported ${coursesToSkip.length} courses without CxIDs to: ${noCxIDsPath}`
            );
            console.log('\nTop 10 courses without CxIDs (by review count):');
            coursesToSkip.slice(0, 10).forEach((c) => {
                console.log(
                    `  - ${c.code}: ${c.name} (ID: ${c.id}, Reviews: ${c.review_count})`
                );
            });
            if (coursesToSkip.length > 10) {
                console.log(
                    `  ... and ${coursesToSkip.length - 10} more (see JSON file)`
                );
            }
        }

        // Verify the migration
        console.log('\nStep 3: Verifying migration...');
        console.log('-'.repeat(80));

        if (!dryRun) {
            const totalWithCxIDs = await Courses.countDocuments({
                all_instructor_cxids: { $exists: true, $ne: [] },
            });
            const totalWithoutCxIDs = await Courses.countDocuments({
                $or: [
                    { all_instructor_cxids: { $exists: false } },
                    { all_instructor_cxids: [] },
                ],
            });

            console.log(`Courses with CxIDs: ${totalWithCxIDs}`);
            console.log(`Courses without CxIDs: ${totalWithoutCxIDs}`);

            if (totalWithoutCxIDs > 0) {
                console.log('\n⚠️  Warning: Some courses still lack CxIDs');
                console.log(
                    '   These are likely courses only in MongoDB (historical/deprecated)'
                );

                // Get ALL courses without CxIDs
                const coursesWithoutCxIDs = await Courses.find({
                    $or: [
                        { all_instructor_cxids: { $exists: false } },
                        { all_instructor_cxids: [] },
                    ],
                })
                    .sort({ review_count: -1 })
                    .lean();

                // Show sample
                console.log(
                    '\nSample courses without CxIDs (sorted by review count):'
                );
                coursesWithoutCxIDs.slice(0, 10).forEach((c) => {
                    console.log(
                        `  - ${c.code}: ${c.name} (ID: ${c.id}, Reviews: ${c.review_count})`
                    );
                });

                if (coursesWithoutCxIDs.length > 10) {
                    console.log(
                        `  ... and ${coursesWithoutCxIDs.length - 10} more`
                    );
                }
            }

            // Get statistics on CxID distribution
            const coursesWithManyCxIDs = await Courses.countDocuments({
                all_instructor_cxids: { $exists: true },
                $expr: { $gte: [{ $size: '$all_instructor_cxids' }, 5] },
            });

            console.log(
                `\nCourses with 5+ instructors (CxIDs): ${coursesWithManyCxIDs}`
            );
        }

        // Save migration report
        const report = {
            phase: 3,
            description: 'Update Courses with Instructor CxIDs',
            dryRun: dryRun,
            stats: stats,
            timestamp: new Date().toISOString(),
        };

        const reportPath = `./migration-data/phase3-report-${dryRun ? 'dryrun-' : ''}${Date.now()}.json`;
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        // Print summary
        console.log('\n' + '='.repeat(80));
        console.log('PHASE 3 COMPLETE - Summary:');
        console.log('='.repeat(80));
        console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
        console.log(`Courses in MongoDB: ${stats.totalInMongoDB}`);
        console.log(`Courses in API: ${stats.totalInAPI}`);
        console.log(`Updated: ${stats.updated}`);
        console.log(`Skipped (no API data): ${stats.skipped}`);
        if (stats.skippedDueToInvalidCode > 0) {
            console.log(
                `  └─ Due to invalid/missing code: ${stats.skippedDueToInvalidCode}`
            );
        }
        console.log(`Errors: ${stats.errors}`);
        console.log(
            `Courses with multiple instructors: ${stats.coursesWithMultipleCxIDs}`
        );
        console.log(`Average CxIDs per course: ${stats.averageCxIDsPerCourse}`);
        console.log(`\nReport saved to: ${reportPath}`);
        console.log('='.repeat(80));

        if (dryRun) {
            console.log(
                '\n💡 This was a dry run. Run again with --live to apply changes.'
            );
        } else {
            console.log('\n✅ Migration complete! Database has been updated.');
            console.log('\nNext steps:');
            console.log('  1. Verify the changes in MongoDB');
            console.log('  2. Check courses without CxIDs');
            console.log(
                '  3. Proceed to Phase 4: Update CourseReviews schema (THE BIG ONE!)'
            );
        }
    } catch (error) {
        console.error('\n❌ Error during Phase 3:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('\n✓ Disconnected from MongoDB');
    }
}

// ============================================================================
// Execute
// ============================================================================

// Check command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--live');

if (dryRun) {
    console.log(
        'ℹ️  Running in DRY RUN mode. Use --live flag to apply changes.\n'
    );
}

migrateCourses(dryRun)
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
