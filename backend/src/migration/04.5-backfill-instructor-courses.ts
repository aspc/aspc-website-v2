import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Courses } from '../models/Courses';
import { Instructors } from '../models/People';

dotenv.config();

const dryRun = !process.argv.includes('--live');

async function backfillInstructorCourses() {
    console.log('='.repeat(80));
    console.log(
        'PHASE 4.5: Backfill instructor courses[] from all_instructor_cxids'
    );
    console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log('='.repeat(80));

    await mongoose.connect(
        process.env.MONGODB_URI ?? 'mongodb://localhost:27017/coursereview'
    );

    // Build cxid → instructor map
    const allInstructors = await Instructors.find({}).lean();
    const byCxid = new Map<number, (typeof allInstructors)[0]>();
    for (const inst of allInstructors) {
        for (const cx of inst.cxids ?? []) {
            if (!byCxid.has(cx)) byCxid.set(cx, inst);
        }
    }
    console.log(
        `Loaded ${allInstructors.length} instructors, ${byCxid.size} CxID entries\n`
    );

    // Load all courses that have cxids set
    const courses = await Courses.find({
        all_instructor_cxids: { $exists: true, $ne: [] },
    }).lean();
    console.log(`Found ${courses.length} courses with all_instructor_cxids\n`);

    let updated = 0;
    let alreadyLinked = 0;
    let noInstructor = 0;

    for (const course of courses) {
        const courseRef = {
            courseId: course.id,
            courseCode: course.code_slug ?? course.code,
            courseName: course.name,
        };

        for (const cxid of course.all_instructor_cxids ?? []) {
            const inst = byCxid.get(cxid);
            if (!inst) {
                noInstructor++;
                continue;
            }

            const alreadyHas = (inst.courses ?? []).some(
                (c) => c.courseId === course.id
            );
            if (alreadyHas) {
                alreadyLinked++;
                continue;
            }

            if (!dryRun) {
                await Instructors.updateOne(
                    { id: inst.id },
                    { $push: { courses: courseRef } }
                );
                // keep in-memory map current so we don't double-push
                if (!inst.courses) inst.courses = [];
                inst.courses.push(courseRef);
            }

            updated++;
            if (updated <= 5) {
                console.log(`  ${inst.name} ← ${courseRef.courseCode}`);
            }
        }
    }

    if (updated > 5) console.log(`  ... (${updated - 5} more)`);

    console.log('\n' + '='.repeat(80));
    console.log(
        `${dryRun ? '[DRY RUN] Would add' : 'Added'} ${updated} course link(s) to instructor docs`
    );
    console.log(`Already linked: ${alreadyLinked}`);
    console.log(`CxIDs with no matching instructor doc: ${noInstructor}`);
    if (dryRun) console.log('Run with --live to apply.');
    console.log('='.repeat(80));

    await mongoose.disconnect();
}

backfillInstructorCourses().catch((err) => {
    console.error(err);
    process.exit(1);
});
