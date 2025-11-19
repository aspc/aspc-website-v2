import mongoose from 'mongoose';
import { Courses } from '../models/Courses';

/**
 * Migration Script: Update code_slug format from "MUS-130-SC" to "MUS130-SC"
 *
 * Changes: DEPT-NUM-SCHOOL → DEPTNUM-SCHOOL
 */

async function fixCodeSlugFormat(dryRun: boolean = true) {
    console.log('='.repeat(80));
    console.log('MongoDB Migration: Fix code_slug Format');
    if (dryRun) {
        console.log(
            '🔍 DRY RUN MODE - No changes will be made to the database'
        );
    }
    console.log('='.repeat(80));
    console.log('\nConverting: Code field → DEPTNUM-SCHOOL format');
    console.log('Handling duplicates: Keep course with more reviews\n');

    try {
        await mongoose.connect(
            process.env.MONGODB_URI || 'mongodb://localhost:27017/coursereview'
        );
        console.log('✓ Connected to MongoDB\n');

        // Get all courses
        const courses = await Courses.find({}).lean();
        console.log(`Found ${courses.length} courses\n`);

        let updated = 0;
        let skipped = 0;
        let deleted = 0;
        let errors = 0;

        // First pass: Group courses by what their normalized slug would be
        console.log('Step 1: Analyzing courses and identifying duplicates...');
        console.log('-'.repeat(80));

        const slugGroups = new Map<string, typeof courses>();

        for (const course of courses) {
            if (!course.code || typeof course.code !== 'string') {
                skipped++;
                continue;
            }

            // Calculate what the normalized slug would be
            const cleanCode = course.code.replace(/\s+/g, '').toUpperCase();
            // Match only 2-letter school codes (HM, PO, CM, SC, PZ)
            const schoolMatch = cleanCode.match(/^(.+?)([A-Z]{2})$/);

            if (!schoolMatch) {
                skipped++;
                continue;
            }

            const [, baseCode, schoolCode] = schoolMatch;
            const normalizedSlug = `${baseCode}-${schoolCode}`;

            if (!slugGroups.has(normalizedSlug)) {
                slugGroups.set(normalizedSlug, []);
            }
            slugGroups.get(normalizedSlug)!.push(course);
        }

        // Identify duplicates
        const duplicateGroups = Array.from(slugGroups.entries()).filter(
            ([, group]) => group.length > 1
        );
        console.log(`✓ Found ${duplicateGroups.length} duplicate groups\n`);

        if (duplicateGroups.length > 0) {
            console.log(
                'Duplicate Groups (showing what will be kept/deleted):'
            );
            console.log('-'.repeat(80));

            duplicateGroups.forEach(([slug, group]) => {
                // Sort by review count (descending), then by id (ascending) as tiebreaker
                const sorted = group.sort((a, b) => {
                    if (b.review_count !== a.review_count) {
                        return b.review_count - a.review_count;
                    }
                    return a.id - b.id; // Lower ID wins in case of tie
                });

                const keep = sorted[0];
                const toDelete = sorted.slice(1);

                console.log(`\nSlug: "${slug}"`);
                console.log(
                    `  ✓ KEEP:   ID ${keep.id} | Code: ${keep.code.padEnd(20)} | Reviews: ${keep.review_count} | ${keep.name}`
                );
                toDelete.forEach((c) => {
                    console.log(
                        `  ✗ DELETE: ID ${c.id} | Code: ${c.code.padEnd(20)} | Reviews: ${c.review_count} | ${c.name}`
                    );
                });
            });

            console.log('\n');
        }

        // Second pass: Update/delete courses
        console.log('Step 2: Processing courses...');
        console.log('-'.repeat(80));

        for (const [normalizedSlug, group] of slugGroups.entries()) {
            try {
                if (group.length === 1) {
                    // Single course - just update the slug
                    const course = group[0];

                    if (course.code_slug === normalizedSlug) {
                        skipped++;
                        continue;
                    }

                    if (updated < 5) {
                        console.log(
                            `✓ ${course.code.padEnd(20)} → ${normalizedSlug}`
                        );
                    }

                    if (!dryRun) {
                        await Courses.updateOne(
                            { id: course.id },
                            { $set: { code_slug: normalizedSlug } }
                        );
                    }

                    updated++;
                } else {
                    // Duplicates - keep one, delete others
                    const sorted = group.sort((a, b) => {
                        if (b.review_count !== a.review_count) {
                            return b.review_count - a.review_count;
                        }
                        return a.id - b.id;
                    });

                    const keep = sorted[0];
                    const toDelete = sorted.slice(1);

                    // Update the one we're keeping
                    if (keep.code_slug !== normalizedSlug) {
                        if (!dryRun) {
                            await Courses.updateOne(
                                { id: keep.id },
                                { $set: { code_slug: normalizedSlug } }
                            );
                        }
                        updated++;
                    } else {
                        skipped++;
                    }

                    // Delete the duplicates
                    for (const course of toDelete) {
                        if (!dryRun) {
                            await Courses.deleteOne({ id: course.id });
                        }
                        deleted++;
                    }
                }
            } catch (error) {
                console.error(
                    `❌ Error processing slug ${normalizedSlug}:`,
                    error
                );
                errors++;
            }
        }

        if (updated > 5) {
            console.log(`... (${updated - 5} more courses updated)`);
        }

        // Summary
        console.log('\n' + '='.repeat(80));
        console.log('MIGRATION COMPLETE - Summary:');
        console.log('='.repeat(80));
        console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
        console.log(`Total courses processed: ${courses.length}`);
        console.log(`Updated: ${updated}`);
        console.log(`Deleted (duplicates): ${deleted}`);
        console.log(`Skipped: ${skipped}`);
        console.log(`Errors: ${errors}`);
        console.log(`Final course count: ${courses.length - deleted}`);
        console.log('='.repeat(80));

        if (dryRun) {
            console.log(
                '\n💡 This was a dry run. Run with --live to apply changes.'
            );
            if (deleted > 0) {
                console.log(
                    `⚠️  WARNING: ${deleted} duplicate courses will be DELETED when run with --live`
                );
            }
        } else {
            console.log(
                '\n✅ Migration complete! code_slug format updated and duplicates removed.'
            );
        }
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('\n✓ Disconnected from MongoDB');
    }
}

// Execute
const args = process.argv.slice(2);
const dryRun = !args.includes('--live');

if (dryRun) {
    console.log(
        'ℹ️  Running in DRY RUN mode. Use --live flag to apply changes.\n'
    );
}

fixCodeSlugFormat(dryRun)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
