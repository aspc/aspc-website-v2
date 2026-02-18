import mongoose from 'mongoose';
import { StudentBallotInfo } from '../models/Voting';
import dotenv from 'dotenv';
dotenv.config();

const ELECTION_ID = '698ba8595d9257bf8fb8be8d';
const EMAILS: string[] = [
    'ljbq2023@mymail.pomona.edu',
    'gzfs2022@mymail.pomona.edu',
    'smfk2024@mymail.pomona.edu',
];

const MONGO_URI =
    process.env.MONGODB_TEST_URI ||
    'mongodb+srv://software:jxqDmaRabKr7BXuS@aspc.qm4l8.mongodb.net/school-platform-test?retryWrites=true&w=majority&appName=ASPC';
async function populateStudentBallotInfo() {
    if (!ELECTION_ID) throw new Error('ELECTION_ID is required');
    if (EMAILS.length === 0) throw new Error('EMAILS array is empty');

    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const campusReps: ('north' | 'south')[] = ['north', 'south'];
    const years = [1, 2, 3, 4];

    const docs = EMAILS.map((email, i) => ({
        electionId: new mongoose.Types.ObjectId(ELECTION_ID),
        email,
        campusRep: campusReps[i % campusReps.length],
        year: years[i % years.length],
        hasVoted: false,
    }));

    const result = await StudentBallotInfo.insertMany(docs, { ordered: false });
    console.log(
        `Successfully inserted ${result.length} StudentBallotInfo documents`
    );

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
}

populateStudentBallotInfo().catch((err) => {
    console.error('Error populating StudentBallotInfo:', err);
    process.exit(1);
});
