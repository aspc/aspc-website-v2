import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Courses } from '../../models/Courses';
import { Instructors } from '../../models/People';

dotenv.config();

// ObjectId of the first document created during the run to roll back.
// All Courses and Instructors with _id >= this are deleted.
const THRESHOLD_OID = '691ad62ece2d595ef1899271';

async function rollback(dryRun: boolean) {
    await mongoose.connect(
        process.env.MONGODB_URI ?? 'mongodb://localhost:27017/coursereview'
    );

    const threshold = new mongoose.Types.ObjectId(THRESHOLD_OID);
    const thresholdDate = threshold.getTimestamp();
    console.log(`Threshold ObjectId : ${THRESHOLD_OID}`);
    console.log(`Threshold timestamp: ${thresholdDate.toISOString()}`);
    console.log(`Mode              : ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

    const coursesToDelete = await Courses.countDocuments({
        _id: { $gte: threshold },
    });
    const instructorsToDelete = await Instructors.countDocuments({
        _id: { $gte: threshold },
    });

    console.log(`Courses to delete   : ${coursesToDelete}`);
    console.log(`Instructors to delete: ${instructorsToDelete}`);

    if (!dryRun) {
        const deletedCourses = await Courses.deleteMany({
            _id: { $gte: threshold },
        });
        console.log(`\nDeleted ${deletedCourses.deletedCount} courses`);

        const deletedInstructors = await Instructors.deleteMany({
            _id: { $gte: threshold },
        });
        console.log(`Deleted ${deletedInstructors.deletedCount} instructors`);
    } else {
        console.log('\nDry run — no documents deleted. Pass --live to apply.');
    }

    await mongoose.disconnect();
}

const dryRun = !process.argv.includes('--live');
rollback(dryRun).catch((err) => {
    console.error(err);
    process.exit(1);
});
