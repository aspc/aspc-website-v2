import mongoose from 'mongoose';
import { ForumEvent, EventReview } from '../models/Forum';
import dotenv from 'dotenv';

dotenv.config();

async function testRatingFunctions() {
    try {
        // Connect to your database
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school-platform'
        );
        console.log('✅ Connected to MongoDB\n');

        // Create test users and event
        const userId1 = new mongoose.Types.ObjectId();
        const userId2 = new mongoose.Types.ObjectId();
        const userId3 = new mongoose.Types.ObjectId();

        const event = await ForumEvent.create({
            title: 'Test Event - DELETE ME',
            description: 'This is a test event for testing ratings',
            createdBy: userId1,
            eventDate: new Date('2025-12-01'),
            location: 'Test Location',
            ratingUntil: new Date('2025-12-10'),
            customQuestions: ['How was the food?', 'How was the venue?'],
        });

        console.log('📝 Created test event:', event._id, '\n');

        // ============================================
        // TEST 1: hasUserRated() - should be false
        // ============================================
        console.log('TEST 1: hasUserRated() before any ratings');
        const hasRated1 = await EventReview.hasUserRated(event._id, userId1);
        console.log('User 1 has rated?', hasRated1);
        console.log('Expected: false');
        console.log('Result:', hasRated1 === false ? '✅ PASS' : '❌ FAIL');
        console.log('');

        // ============================================
        // TEST 2: getAverageRatings() - should be zeros
        // ============================================
        console.log('TEST 2: getAverageRatings() with no ratings');
        const stats1 = await EventReview.getAverageRatings(event._id);
        console.log('Stats:', stats1);
        console.log('Expected: all zeros');
        console.log('Result:', stats1.totalResponses === 0 ? '✅ PASS' : '❌ FAIL');
        console.log('');

        // ============================================
        // TEST 3: Create first rating
        // ============================================
        console.log('TEST 3: Creating first rating (User 1)');
        await EventReview.create({
            eventId: event._id,
            author: userId1,
            content: 'Great event!',
            isAnonymous: false,
            overall: 5,
            wouldRepeat: 4,
            customRatings: [
                { question: 'How was the food?', rating: 5 },
                { question: 'How was the venue?', rating: 4 },
            ],
        });
        console.log('✅ Rating created\n');

        // ============================================
        // TEST 4: hasUserRated() - should be true now
        // ============================================
        console.log('TEST 4: hasUserRated() after rating');
        const hasRated2 = await EventReview.hasUserRated(event._id, userId1);
        console.log('User 1 has rated?', hasRated2);
        console.log('Expected: true');
        console.log('Result:', hasRated2 === true ? '✅ PASS' : '❌ FAIL');
        console.log('');

        // ============================================
        // TEST 5: getAverageRatings() - single rating
        // ============================================
        console.log('TEST 5: getAverageRatings() with 1 rating');
        const stats2 = await EventReview.getAverageRatings(event._id);
        console.log('Stats:', stats2);
        console.log('Expected: overall=5, wouldRepeat=4, totalResponses=1');
        console.log('Result:', stats2.overall === 5 && stats2.wouldRepeat === 4 && stats2.totalResponses === 1 ? '✅ PASS' : '❌ FAIL');
        console.log('');

        // ============================================
        // TEST 6: Add more ratings
        // ============================================
        console.log('TEST 6: Adding 2 more ratings');
        
        await EventReview.create({
            eventId: event._id,
            author: userId2,
            content: 'It was okay',
            overall: 3,
            wouldRepeat: 2,
            customRatings: [
                { question: 'How was the food?', rating: 3 },
                { question: 'How was the venue?', rating: 2 },
            ],
        });

        await EventReview.create({
            eventId: event._id,
            author: userId3,
            content: 'Pretty good!',
            overall: 4,
            wouldRepeat: 5,
            customRatings: [
                { question: 'How was the food?', rating: 4 },
                { question: 'How was the venue?', rating: 5 },
            ],
        });
        
        console.log('✅ 2 more ratings created\n');

        // ============================================
        // TEST 7: getAverageRatings() - multiple ratings
        // ============================================
        console.log('TEST 7: getAverageRatings() with 3 ratings');
        const stats3 = await EventReview.getAverageRatings(event._id);
        console.log('Stats:', stats3);
        console.log('Expected:');
        console.log('  - overall: 4 (avg of 5,3,4)');
        console.log('  - wouldRepeat: ~3.67 (avg of 4,2,5)');
        console.log('  - totalResponses: 3');
        console.log('  - food: 4 (avg of 5,3,4)');
        console.log('  - venue: ~3.67 (avg of 4,2,5)');
        
        const overallCorrect = stats3.overall === 4;
        const wouldRepeatCorrect = Math.abs(stats3.wouldRepeat - 3.67) < 0.01;
        const totalCorrect = stats3.totalResponses === 3;
        
        console.log('Result:', overallCorrect && wouldRepeatCorrect && totalCorrect ? '✅ PASS' : '❌ FAIL');
        console.log('');

        // ============================================
        // TEST 8: Test duplicate prevention
        // ============================================
        console.log('TEST 8: Trying to create duplicate rating (should fail)');
        try {
            await EventReview.create({
                eventId: event._id,
                author: userId1, // Same user as first rating
                content: 'Trying to rate again',
                overall: 1,
                wouldRepeat: 1,
                customRatings: [],
            });
            console.log('❌ FAIL - Should have thrown error!');
        } catch (error: any) {
            if (error.code === 11000) {
                console.log('✅ PASS - Correctly prevented duplicate rating');
            } else {
                console.log('❌ FAIL - Wrong error type:', error.message);
            }
        }
        console.log('');

        // ============================================
        // TEST 9: Test with hidden comment
        // ============================================
        console.log('TEST 9: Testing hidden comment exclusion');
        
        const userId4 = new mongoose.Types.ObjectId();
        await EventReview.create({
            eventId: event._id,
            author: userId4,
            content: 'Bad event',
            isHidden: true, // This should be excluded
            overall: 1,
            wouldRepeat: 1,
            customRatings: [],
        });

        const stats4 = await EventReview.getAverageRatings(event._id);
        console.log('Stats (should still be 3 responses, not 4):', stats4);
        console.log('Expected: totalResponses=3 (hidden rating excluded)');
        console.log('Result:', stats4.totalResponses === 3 ? '✅ PASS' : '❌ FAIL');
        console.log('');

        // ============================================
        // Cleanup
        // ============================================
        console.log('🧹 Cleaning up test data...');
        await ForumEvent.deleteOne({ _id: event._id });
        await EventReview.deleteMany({ eventId: event._id });
        console.log('✅ Cleanup complete\n');

        console.log('========================================');
        console.log('ALL TESTS COMPLETED!');
        console.log('========================================');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    }
}

// Run the tests
testRatingFunctions();