import mongoose from 'mongoose';
import * as fs from 'fs';
import { Instructors } from '../models/People';

// ============================================================================
// PHASE 2: Update Instructors Schema with CxIDs
// ============================================================================
// This script adds the cxids array field to all instructors and populates it
// with data from Phase 1

interface InstructorCxIDData {
    name: string;
    cxids: number[];
}

interface MigrationStats {
    totalInMongoDB: number;
    totalInAPI: number;
    updated: number;
    created: number;
    skipped: number;
    errors: number;
    instructorsWithMultipleCxIDs: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize instructor names for better matching
 * Handles minor variations in formatting
 */
function normalizeName(name: string): string {
    return name
        .trim()
        .replace(/\s+/g, ' ') // Normalize whitespace
        .toLowerCase();
}

/**
 * Get next available instructor ID
 */
async function getNextInstructorId(): Promise<number> {
    const maxInstructor = await Instructors.findOne()
        .sort({ id: -1 })
        .select('id')
        .lean();

    return maxInstructor ? maxInstructor.id + 1 : 1;
}

// ============================================================================
// Main Migration Logic
// ============================================================================

async function migrateInstructors(dryRun: boolean = false) {
    console.log('='.repeat(80));
    console.log('PHASE 2: Update Instructors Schema with CxIDs');
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
        const apiInstructors: InstructorCxIDData[] = JSON.parse(
            fs.readFileSync('./migration-data/instructor-cxids.json', 'utf-8')
        );
        console.log(
            `✓ Loaded ${apiInstructors.length} instructors from API data\n`
        );

        // Create lookup map by normalized name
        const apiLookup = new Map<string, InstructorCxIDData>();
        apiInstructors.forEach((instructor) => {
            apiLookup.set(normalizeName(instructor.name), instructor);
        });

        // Get all existing instructors from MongoDB
        const dbInstructors = await Instructors.find({}).lean();
        console.log(`Found ${dbInstructors.length} instructors in MongoDB\n`);

        const stats: MigrationStats = {
            totalInMongoDB: dbInstructors.length,
            totalInAPI: apiInstructors.length,
            updated: 0,
            created: 0,
            skipped: 0,
            errors: 0,
            instructorsWithMultipleCxIDs: 0,
        };

        // Track instructors that will be skipped (no CxIDs)
        const instructorsToSkip: Array<{
            id: number;
            name: string;
            numReviews: number;
        }> = [];

        console.log('Step 1: Updating existing instructors...');
        console.log('-'.repeat(80));

        // Update existing instructors
        for (const dbInstructor of dbInstructors) {
            const normalizedName = normalizeName(dbInstructor.name);
            const apiData = apiLookup.get(normalizedName);

            if (!apiData) {
                console.log(
                    `⚠️  No API data found for: ${dbInstructor.name} (ID: ${dbInstructor.id})`
                );
                stats.skipped++;
                instructorsToSkip.push({
                    id: dbInstructor.id,
                    name: dbInstructor.name,
                    numReviews: dbInstructor.numReviews,
                });
                continue;
            }

            try {
                if (!dryRun) {
                    await Instructors.updateOne(
                        { id: dbInstructor.id },
                        {
                            $set: {
                                cxids: apiData.cxids,
                            },
                        }
                    );
                }

                if (apiData.cxids.length > 1) {
                    stats.instructorsWithMultipleCxIDs++;
                    console.log(
                        `✓ Updated: ${dbInstructor.name} → ${apiData.cxids.length} CxIDs: [${apiData.cxids.join(', ')}]`
                    );
                } else if (stats.updated < 5) {
                    // Only log first few for brevity
                    console.log(
                        `✓ Updated: ${dbInstructor.name} → CxID: ${apiData.cxids[0]}`
                    );
                }

                stats.updated++;

                // Remove from lookup so we can identify new instructors
                apiLookup.delete(normalizedName);
            } catch (error) {
                console.error(`❌ Error updating ${dbInstructor.name}:`, error);
                stats.errors++;
            }
        }

        if (stats.updated > 5) {
            console.log(`... (${stats.updated - 5} more instructors updated)`);
        }

        console.log('\nStep 2: Creating new instructors from API data...');
        console.log('-'.repeat(80));

        // Remaining instructors in apiLookup are new (not in MongoDB)
        const newInstructors = Array.from(apiLookup.values());

        if (newInstructors.length > 0) {
            console.log(
                `Found ${newInstructors.length} new instructors in API data`
            );

            let nextId = await getNextInstructorId();

            for (const newInstructor of newInstructors) {
                try {
                    if (!dryRun) {
                        await Instructors.create({
                            id: nextId,
                            name: newInstructor.name,
                            cxids: newInstructor.cxids,
                            numReviews: 0,
                            // Other fields will use schema defaults
                        });
                    }

                    if (newInstructor.cxids.length > 1) {
                        console.log(
                            `✓ Created: ${newInstructor.name} → ${newInstructor.cxids.length} CxIDs: [${newInstructor.cxids.join(', ')}]`
                        );
                    } else if (stats.created < 5) {
                        console.log(
                            `✓ Created: ${newInstructor.name} → CxID: ${newInstructor.cxids[0]}`
                        );
                    }

                    stats.created++;
                    nextId++;
                } catch (error) {
                    console.error(
                        `❌ Error creating ${newInstructor.name}:`,
                        error
                    );
                    stats.errors++;
                }
            }

            if (stats.created > 5) {
                console.log(
                    `... (${stats.created - 5} more instructors created)`
                );
            }
        } else {
            console.log('No new instructors to create');
        }

        // Export list of instructors that will be/are without CxIDs
        if (instructorsToSkip.length > 0) {
            console.log('\nStep 2.5: Exporting instructors without CxIDs...');
            console.log('-'.repeat(80));

            // Sort by review count (descending) to prioritize important instructors
            instructorsToSkip.sort((a, b) => b.numReviews - a.numReviews);

            const noCxIDsPath = `./migration-data/instructors-without-cxids-${dryRun ? 'preview-' : ''}${Date.now()}.json`;
            fs.writeFileSync(
                noCxIDsPath,
                JSON.stringify(instructorsToSkip, null, 2)
            );

            console.log(
                `✓ Exported ${instructorsToSkip.length} instructors without CxIDs to: ${noCxIDsPath}`
            );
            console.log(
                '\nTop 10 instructors without CxIDs (by review count):'
            );
            instructorsToSkip.slice(0, 10).forEach((i) => {
                console.log(
                    `  - ${i.name} (ID: ${i.id}, Reviews: ${i.numReviews})`
                );
            });
            if (instructorsToSkip.length > 10) {
                console.log(
                    `  ... and ${instructorsToSkip.length - 10} more (see JSON file)`
                );
            }
        }

        // Verify the migration
        console.log('\nStep 3: Verifying migration...');
        console.log('-'.repeat(80));

        if (!dryRun) {
            const totalWithCxIDs = await Instructors.countDocuments({
                cxids: { $exists: true, $ne: [] },
            });
            const totalWithoutCxIDs = await Instructors.countDocuments({
                $or: [{ cxids: { $exists: false } }, { cxids: [] }],
            });

            console.log(`Instructors with CxIDs: ${totalWithCxIDs}`);
            console.log(`Instructors without CxIDs: ${totalWithoutCxIDs}`);

            if (totalWithoutCxIDs > 0) {
                console.log('\n⚠️  Warning: Some instructors still lack CxIDs');
                console.log(
                    '   These are likely instructors only in MongoDB (historical data)'
                );

                // Get ALL instructors without CxIDs
                const instructorsWithoutCxIDs = await Instructors.find({
                    $or: [{ cxids: { $exists: false } }, { cxids: [] }],
                })
                    .sort({ numReviews: -1 })
                    .lean();

                // Export to file
                const noCxIDsData = instructorsWithoutCxIDs.map((i) => ({
                    id: i.id,
                    name: i.name,
                    numReviews: i.numReviews,
                    school: i.school || 'N/A',
                    courses: i.courses || [],
                }));

                const noCxIDsPath =
                    './migration-data/instructors-without-cxids.json';
                fs.writeFileSync(
                    noCxIDsPath,
                    JSON.stringify(noCxIDsData, null, 2)
                );
                console.log(
                    `✓ Exported ${noCxIDsData.length} instructors without CxIDs to: ${noCxIDsPath}`
                );

                // Show sample
                console.log(
                    '\nSample instructors without CxIDs (sorted by review count):'
                );
                instructorsWithoutCxIDs.slice(0, 10).forEach((i) => {
                    console.log(
                        `  - ${i.name} (ID: ${i.id}, Reviews: ${i.numReviews})`
                    );
                });

                if (instructorsWithoutCxIDs.length > 10) {
                    console.log(
                        `  ... and ${instructorsWithoutCxIDs.length - 10} more`
                    );
                }
            }
        }

        // Save migration report
        const report = {
            phase: 2,
            description: 'Update Instructors with CxIDs',
            dryRun: dryRun,
            stats: stats,
            timestamp: new Date().toISOString(),
        };

        const reportPath = `./migration-data/phase2-report-${dryRun ? 'dryrun-' : ''}${Date.now()}.json`;
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        // Print summary
        console.log('\n' + '='.repeat(80));
        console.log('PHASE 2 COMPLETE - Summary:');
        console.log('='.repeat(80));
        console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
        console.log(`Instructors in MongoDB: ${stats.totalInMongoDB}`);
        console.log(`Instructors in API: ${stats.totalInAPI}`);
        console.log(`Updated: ${stats.updated}`);
        console.log(`Created: ${stats.created}`);
        console.log(`Skipped (no API data): ${stats.skipped}`);
        console.log(`Errors: ${stats.errors}`);
        console.log(
            `Instructors with multiple CxIDs: ${stats.instructorsWithMultipleCxIDs}`
        );
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
            console.log('  2. Check instructors without CxIDs');
            console.log('  3. Proceed to Phase 3: Update Courses schema');
        }
    } catch (error) {
        console.error('\n❌ Error during Phase 2:', error);
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

migrateInstructors(dryRun)
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
