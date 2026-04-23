import mongoose from 'mongoose';
import * as fs from 'fs';
import path from 'path';
import { Instructors } from '../../models/People';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function groupInstructors() {
    console.log('='.repeat(80));
    console.log('Grouping Instructors by Last Name');
    console.log('='.repeat(80));

    try {
        // Connect to MongoDB
        const mongoUri =
            process.env.MONGODB_URI || 'mongodb://localhost:27017/coursereview';
        await mongoose.connect(mongoUri);
        console.log('✓ Connected to MongoDB');

        // Fetch all instructors
        const instructors = await Instructors.find({}).lean();
        console.log(`✓ Found ${instructors.length} instructors in MongoDB`);

        // Group by last name
        // The name field has the "Last, First (Middle)" format.
        const grouped: Record<string, string[]> = {};

        instructors.forEach((instructor) => {
            const name = instructor.name;
            if (!name) return;

            // Extract last name
            const parts = name.split(',');
            const lastName = parts[0].trim();

            if (!grouped[lastName]) {
                grouped[lastName] = [];
            }
            grouped[lastName].push(name);
        });

        // Filter to keep only those with the same last name (at least 2 instructors)
        const output: Record<string, string[]> = {};
        let totalGrouped = 0;

        Object.keys(grouped).forEach((lastName) => {
            if (grouped[lastName].length > 1) {
                output[lastName] = grouped[lastName];
                totalGrouped += grouped[lastName].length;
            }
        });

        // Output to JSON file
        const outputPath = path.join(
            __dirname,
            '..',
            'results',
            'grouped_instructors.json'
        );
        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

        console.log(
            `✓ Grouped ${totalGrouped} instructors into ${Object.keys(output).length} last-name groups`
        );
        console.log(`✓ Output saved to: ${outputPath}`);
        console.log('='.repeat(80));
    } catch (error) {
        console.error('\n❌ Error during grouping:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('✓ Disconnected from MongoDB');
    }
}

// Execute
groupInstructors()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('Grouping failed:', error);
        process.exit(1);
    });
