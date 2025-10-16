import mongoose from 'mongoose';
import { Courses, CourseReviews } from './models/Courses';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const populateReviewCount = async () => {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || 'your-mongodb-connection-string';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // Step 1: Aggregate review counts from CourseReviews
        console.log('Aggregating review counts...');
        const reviewCounts = await CourseReviews.aggregate([
            {
                $group: {
                    _id: '$course_id',
                    count: { $sum: 1 }
                }
            }
        ]);

        console.log(`Found ${reviewCounts.length} courses with reviews`);

        // Step 2: Update each course with its review count
        let updatedCount = 0;
        for (const item of reviewCounts) {
            await Courses.updateOne(
                { id: item._id },
                { $set: { review_count: item.count } }
            );
            updatedCount++;
        }

        console.log(`Updated ${updatedCount} courses with review counts`);

        // Step 3: Set review_count to 0 for courses with no reviews
        const coursesWithoutReviews = await Courses.updateMany(
            { review_count: { $exists: false } },
            { $set: { review_count: 0 } }
        );

        console.log(`Set review_count to 0 for ${coursesWithoutReviews.modifiedCount} courses without reviews`);

        // Step 4: Display some statistics
        const totalCourses = await Courses.countDocuments();
        const coursesWithReviews = await Courses.countDocuments({ review_count: { $gt: 0 } });
        const avgReviewCount = await Courses.aggregate([
            {
                $group: {
                    _id: null,
                    avgReviews: { $avg: '$review_count' }
                }
            }
        ]);

        console.log('\n--- Statistics ---');
        console.log(`Total courses: ${totalCourses}`);
        console.log(`Courses with reviews: ${coursesWithReviews}`);
        console.log(`Courses without reviews: ${totalCourses - coursesWithReviews}`);
        console.log(`Average review count: ${avgReviewCount[0]?.avgReviews.toFixed(2) || 0}`);

        // Display top 5 courses by review count
        const topCourses = await Courses.find()
            .sort({ review_count: -1 })
            .limit(5)
            .select('code name review_count');
        
        console.log('\n--- Top 5 Courses by Review Count ---');
        topCourses.forEach((course, index) => {
            console.log(`${index + 1}. ${course.code} - ${course.name}: ${course.review_count} reviews`);
        });

        console.log('\n✅ Review count population completed successfully!');

    } catch (error) {
        console.error('Error populating review counts:', error);
    } finally {
        // Close MongoDB connection
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
    }
};

// Run the script
populateReviewCount();