import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Instructors } from '../models/People';
import { CourseReviews } from '../models/Courses';
import { normalizeInstructorName } from '../utils/instructorNames';

dotenv.config();

// ---- main -------------------------------------------------------------------

async function mergeInstructorDuplicates(dryRun: boolean) {
    console.log('='.repeat(80));
    console.log('Merge instructor duplicates (middle-name variants)');
    console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log('='.repeat(80));

    await mongoose.connect(
        process.env.MONGODB_URI ?? 'mongodb://localhost:27017/coursereview'
    );
    console.log('Connected to MongoDB\n');

    const all = await Instructors.find({}).lean();
    console.log(`Loaded ${all.length} instructor documents\n`);

    // Group by stripped-normalized name
    const groups = new Map<string, (typeof all)[number][]>();
    for (const inst of all) {
        const key = normalizeInstructorName(inst.name);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(inst);
    }

    const duplicateSets = Array.from(groups.values()).filter(
        (g) => g.length > 1
    );
    console.log(`Found ${duplicateSets.length} duplicate group(s)\n`);

    if (duplicateSets.length === 0) {
        console.log('Nothing to merge.');
        await mongoose.disconnect();
        return;
    }

    let mergedCount = 0;
    let deletedCount = 0;
    let reviewsReassigned = 0;

    for (const group of duplicateSets) {
        // Canonical = shortest name (no middle name), break ties by lower id
        group.sort((a, b) => a.name.length - b.name.length || a.id - b.id);
        const canonical = group[0];
        const duplicates = group.slice(1);

        console.log(`\nGroup: "${normalizeInstructorName(canonical.name)}"`);
        console.log(
            `  Canonical : "${canonical.name}" (id=${canonical.id}, cxids=[${(canonical.cxids ?? []).join(', ')}])`
        );
        for (const dup of duplicates) {
            console.log(
                `  Duplicate : "${dup.name}" (id=${dup.id}, cxids=[${(dup.cxids ?? []).join(', ')}])`
            );
        }

        // Build merged cxids
        const mergedCxids = [
            ...new Set([
                ...(canonical.cxids ?? []),
                ...duplicates.flatMap((d) => d.cxids ?? []),
            ]),
        ];

        // Build merged courses (union by courseId, dedup within canonical too)
        const seenCourseIds = new Set<number>();
        const mergedCourses: Array<{
            courseId: number;
            courseCode: string;
            courseName: string;
        }> = [];
        for (const course of [
            ...(canonical.courses ?? []),
            ...duplicates.flatMap((d) => d.courses ?? []),
        ]) {
            if (!seenCourseIds.has(course.courseId)) {
                mergedCourses.push(course);
                seenCourseIds.add(course.courseId);
            }
        }

        const mergedNumReviews =
            (canonical.numReviews ?? 0) +
            duplicates.reduce((sum, d) => sum + (d.numReviews ?? 0), 0);

        console.log(`  → merged cxids     : [${mergedCxids.join(', ')}]`);
        console.log(`  → merged courses   : ${mergedCourses.length} entries`);
        console.log(`  → merged numReviews: ${mergedNumReviews}`);

        const dupIds = duplicates.map((d) => d.id);

        if (!dryRun) {
            // Update canonical
            await Instructors.updateOne(
                { id: canonical.id },
                {
                    $set: {
                        cxids: mergedCxids,
                        courses: mergedCourses,
                        numReviews: mergedNumReviews,
                    },
                }
            );

            // Reassign legacy instructor_id on reviews
            for (const dupId of dupIds) {
                const result = await CourseReviews.updateMany(
                    { instructor_id: dupId },
                    { $set: { instructor_id: canonical.id } }
                );
                if (result.modifiedCount > 0) {
                    console.log(
                        `  Reassigned ${result.modifiedCount} review(s) from instructor ${dupId} → ${canonical.id}`
                    );
                    reviewsReassigned += result.modifiedCount;
                }
            }

            // Delete duplicates
            const del = await Instructors.deleteMany({ id: { $in: dupIds } });
            deletedCount += del.deletedCount;
        }

        mergedCount++;
    }

    console.log('\n' + '='.repeat(80));
    console.log('Summary');
    console.log('='.repeat(80));
    console.log(`Duplicate groups processed : ${mergedCount}`);
    if (!dryRun) {
        console.log(`Instructor docs deleted    : ${deletedCount}`);
        console.log(`Reviews reassigned         : ${reviewsReassigned}`);
    } else {
        console.log('No changes made (dry run). Pass --live to apply.');
    }

    await mongoose.disconnect();
}

const dryRun = !process.argv.includes('--live');
mergeInstructorDuplicates(dryRun).catch((err) => {
    console.error(err);
    process.exit(1);
});
