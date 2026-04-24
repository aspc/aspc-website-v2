/**
 * Courses + instructors HTTP routes against an in-memory MongoDB.
 *
 * Auth is bypassed so we can exercise handlers without SAML/session setup.
 */

jest.mock('../middleware/authMiddleware', () => ({
    isAuthenticated: (req: any, _res: any, next: any) => {
        if (!req.session) req.session = {};
        req.session.user = {
            email: 'student-integration@test.edu',
            id: 'integration-user',
        };
        next();
    },
    isAdmin: (_req: any, _res: any, next: any) => next(),
    isCourseReviewOwner: (_req: any, _res: any, next: any) => next(),
}));

import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

import coursesRoutes from '../routes/CoursesRoutes';
import instructorsRoutes from '../routes/InstructorsRoutes';
import { Courses, CourseReviews } from '../models/Courses';
import { Instructors } from '../models/People';

function buildTestApp() {
    const app = express();
    app.use(express.json());
    app.use(
        session({
            secret: 'jest-courses-secret',
            resave: false,
            saveUninitialized: true,
        })
    );
    app.use('/api/courses', coursesRoutes);
    app.use('/api/instructors', instructorsRoutes);
    return app;
}

let mongoServer: MongoMemoryServer;
let app: ReturnType<typeof buildTestApp>;

async function seedCourseAndInstructorsLegacy() {
    await Instructors.create({
        id: 5001,
        name: 'Legacy Prof',
        numReviews: 0,
    });
    await Courses.create({
        id: 7001,
        code: 'TEST100 HM',
        code_slug: 'TEST100-HM',
        name: 'Integration Test Course',
        department_names: ['Computer Science'],
        requirement_codes: [],
        requirement_names: [],
        term_keys: [],
        description: 'Test',
        all_instructor_ids: [5001],
        review_count: 0,
    });
}

async function seedCourseAndInstructorsCxids() {
    await Instructors.create({
        id: 5002,
        name: 'CxID Prof',
        cxids: [91001, 91002],
        numReviews: 0,
    });
    await Courses.create({
        id: 7002,
        code: 'TEST200 HM',
        code_slug: 'TEST200-HM',
        name: 'CxID Course',
        department_names: ['Physics'],
        requirement_codes: [],
        requirement_names: [],
        term_keys: [],
        description: 'Test',
        all_instructor_ids: [5002],
        all_instructor_cxids: [91001],
        review_count: 0,
    });
}

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    app = buildTestApp();
});

beforeEach(async () => {
    await Promise.all([
        Courses.deleteMany({}),
        CourseReviews.deleteMany({}),
        Instructors.deleteMany({}),
    ]);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('GET /api/courses', () => {
    it('returns empty results when search is shorter than 2 characters', async () => {
        const res = await request(app).get('/api/courses').query({
            search: 'x',
        });
        expect(res.status).toBe(200);
        expect(res.body.courses).toEqual([]);
        expect(res.body.pagination.totalCount).toBe(0);
    });
});

describe('GET /api/courses/:id', () => {
    it('404 when course does not exist', async () => {
        const res = await request(app).get('/api/courses/99999');
        expect(res.status).toBe(404);
    });

    it('returns course when found', async () => {
        await seedCourseAndInstructorsLegacy();
        const res = await request(app).get('/api/courses/7001');
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(7001);
        expect(res.body.code_slug).toBe('TEST100-HM');
    });
});

describe('GET /api/courses/:id/reviews', () => {
    it('returns reviews for the course', async () => {
        await seedCourseAndInstructorsLegacy();
        await CourseReviews.create({
            id: 1,
            overall_rating: 5,
            course_id: 7001,
            instructor_id: 5001,
            instructor_cxid: 91000,
            user_email: 'r@test.edu',
        });
        const res = await request(app).get('/api/courses/7001/reviews');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].instructor_id).toBe(5001);
    });
});

describe('GET /api/courses/:courseId/instructors', () => {
    it('resolves instructors by legacy id when CxIDs are absent', async () => {
        await seedCourseAndInstructorsLegacy();
        const res = await request(app).get('/api/courses/7001/instructors');
        expect(res.status).toBe(200);
        expect(res.body.instructors).toHaveLength(1);
        expect(res.body.instructors[0].id).toBe(5001);
        expect(res.body.pagination.totalCount).toBe(1);
    });

    it('resolves instructors by CxID when all_instructor_cxids is set', async () => {
        await seedCourseAndInstructorsCxids();
        const res = await request(app).get('/api/courses/7002/instructors');
        expect(res.status).toBe(200);
        expect(res.body.instructors).toHaveLength(1);
        expect(res.body.instructors[0].id).toBe(5002);
        expect(res.body.pagination.totalCount).toBe(1);
    });
});

describe('POST /api/courses/:courseId/reviews', () => {
    it('creates a review and sets instructor_cxid when course has CxIDs', async () => {
        await seedCourseAndInstructorsCxids();
        const res = await request(app).post('/api/courses/7002/reviews').send({
            overall: 4,
            challenge: 3,
            inclusivity: 5,
            workPerWeek: 5,
            instructorId: 5002,
            comments: 'Great course',
            email: 'student-integration@test.edu',
        });
        expect(res.status).toBe(201);

        const saved = await CourseReviews.findOne({ course_id: 7002 }).lean();
        expect(saved).toBeTruthy();
        expect(saved!.instructor_cxid).toBe(91001);

        const course = await Courses.findOne({ id: 7002 }).lean();
        expect(course!.review_count).toBe(1);
    });
});

describe('GET /api/instructors/bulk', () => {
    it('400 when neither ids nor cxids provided', async () => {
        const res = await request(app).get('/api/instructors/bulk');
        expect(res.status).toBe(400);
    });

    it('loads by legacy ids', async () => {
        await Instructors.create({
            id: 601,
            name: 'Bulk One',
            numReviews: 0,
        });
        const res = await request(app).get('/api/instructors/bulk').query({
            ids: '601',
        });
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].name).toBe('Bulk One');
    });

    it('loads by cxids', async () => {
        await Instructors.create({
            id: 602,
            name: 'Bulk Two',
            cxids: [777001],
            numReviews: 0,
        });
        const res = await request(app).get('/api/instructors/bulk').query({
            cxids: '777001',
        });
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].id).toBe(602);
    });
});

describe('GET /api/instructors/:id', () => {
    it('404 when missing', async () => {
        const res = await request(app).get('/api/instructors/999999');
        expect(res.status).toBe(404);
    });

    it('200 when found', async () => {
        await Instructors.create({
            id: 603,
            name: 'Solo',
            numReviews: 0,
        });
        const res = await request(app).get('/api/instructors/603');
        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Solo');
    });
});

describe('GET /api/instructors/:id/reviews', () => {
    it('includes reviews matched by instructor_cxid', async () => {
        await seedCourseAndInstructorsCxids();
        await CourseReviews.create({
            id: 10,
            overall_rating: 4,
            course_id: 7002,
            instructor_id: 999999,
            instructor_cxid: 91001,
            user_email: 'x@test.edu',
        });
        const res = await request(app).get('/api/instructors/5002/reviews');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].instructor_cxid).toBe(91001);
    });
});

describe('GET /api/instructors/:id/courses', () => {
    it('404 when instructor has no embedded courses list', async () => {
        await Instructors.create({
            id: 604,
            name: 'No Courses',
            numReviews: 0,
        });
        const res = await request(app).get('/api/instructors/604/courses');
        expect(res.status).toBe(404);
    });

    it('returns embedded courses when present', async () => {
        await Instructors.create({
            id: 605,
            name: 'With Courses',
            numReviews: 0,
            courses: [
                {
                    courseId: 1,
                    courseCode: 'A',
                    courseName: 'Alpha',
                },
            ],
        });
        const res = await request(app).get('/api/instructors/605/courses');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].courseCode).toBe('A');
    });
});

describe('Admin course routes (auth mocked)', () => {
    it('POST /api/courses creates a course', async () => {
        const res = await request(app)
            .post('/api/courses')
            .send({
                id: 8001,
                code: 'ADM101 HM',
                code_slug: 'ADM101-HM',
                name: 'Admin Test',
                department_names: [],
                requirement_codes: [],
                requirement_names: [],
                term_keys: [],
                description: '',
                all_instructor_ids: [],
                all_instructor_cxids: [123456],
            });
        expect(res.status).toBe(201);
        expect(res.body.id).toBe(8001);
        expect(res.body.all_instructor_cxids).toEqual([123456]);
    });

    it('PUT /api/courses/:id updates fields', async () => {
        await Courses.create({
            id: 8002,
            code: 'PUT1 HM',
            code_slug: 'PUT1-HM',
            name: 'Old',
            department_names: [],
            requirement_codes: [],
            requirement_names: [],
            term_keys: [],
            description: 'd',
            all_instructor_ids: [],
            review_count: 0,
        });
        const res = await request(app).put('/api/courses/8002').send({
            name: 'New Title',
        });
        expect(res.status).toBe(200);
        expect(res.body.name).toBe('New Title');
    });

    it('DELETE /api/courses/:id removes course', async () => {
        await Courses.create({
            id: 8003,
            code: 'DEL1 HM',
            code_slug: 'DEL1-HM',
            name: 'Del',
            department_names: [],
            requirement_codes: [],
            requirement_names: [],
            term_keys: [],
            description: '',
            all_instructor_ids: [],
            review_count: 0,
        });
        const res = await request(app).delete('/api/courses/8003');
        expect(res.status).toBe(200);
        const gone = await Courses.findOne({ id: 8003 });
        expect(gone).toBeNull();
    });
});
