/**
 * Access rules for public vs. student-only routes, using the real auth
 * middleware against an in-memory MongoDB.
 *
 * Public: officer (staff) pages and content pages (About, Resources, Press).
 * Students only: reviews (courses, instructors, housing, events).
 */

// Route modules import GridFS buckets from server; avoid booting the server.
jest.mock('../server', () => ({ bucket: {}, pagePdfs: {} }));

import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

import instructorsRoutes from '../routes/InstructorsRoutes';
import staffRoutes from '../routes/admin/StaffRoutes';
import pageRoutes from '../routes/admin/PagesRoutes';
import { Instructors, SAMLUser, Staff } from '../models/People';
import PageContent from '../models/PageContent';

const STUDENT = { id: 'student-azure-id', email: 'student@test.edu' };

function buildTestApp(sessionUser?: typeof STUDENT) {
    const app = express();
    app.use(express.json());
    app.use(
        session({
            secret: 'jest-access-secret',
            resave: false,
            saveUninitialized: true,
        })
    );
    if (sessionUser) {
        app.use((req, _res, next) => {
            (req.session as any).user = sessionUser;
            next();
        });
    }
    app.use('/api/instructors', instructorsRoutes);
    app.use('/api/members', staffRoutes);
    app.use('/api/admin/pages', pageRoutes);
    return app;
}

let mongoServer: MongoMemoryServer;
const anonymous = buildTestApp();
const student = buildTestApp(STUDENT);

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    await SAMLUser.create({
        id: STUDENT.id,
        email: STUDENT.email,
        firstName: 'Test',
        lastName: 'Student',
        isAdmin: false,
    });
    await Instructors.create({ id: 801, name: 'Access Prof', numReviews: 0 });
    await Staff.create({
        id: '1',
        name: 'Officer',
        position: 'President',
        email: 'officer@test.edu',
        group: 'Senate',
        profilePic: new mongoose.Types.ObjectId(),
    });
    await PageContent.create({
        id: 'about-us',
        name: 'About Us',
        header: 'about',
        content: '<p>Hello</p>',
    });
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('public content routes (no login required)', () => {
    it('GET /api/members/group/:group returns officers', async () => {
        const res = await request(anonymous).get('/api/members/group/Senate');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
    });

    it('GET /api/members/:id returns an officer', async () => {
        const res = await request(anonymous).get('/api/members/1');
        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Officer');
    });

    it('GET /api/admin/pages/:id returns a content page', async () => {
        const res = await request(anonymous).get('/api/admin/pages/about-us');
        expect(res.status).toBe(200);
        expect(res.body.name).toBe('About Us');
    });
});

describe('instructor review routes (students only)', () => {
    it.each([
        '/api/instructors',
        '/api/instructors/bulk?ids=801',
        '/api/instructors/801',
        '/api/instructors/801/reviews',
        '/api/instructors/801/courses',
    ])('GET %s requires login', async (path) => {
        const res = await request(anonymous).get(path);
        expect(res.status).toBe(401);
    });

    it('GET /api/instructors/:id works for a logged-in student', async () => {
        const res = await request(student).get('/api/instructors/801');
        expect(res.status).toBe(200);
    });

    it('POST /api/instructors requires admin', async () => {
        const body = { id: 802, name: 'New Prof' };
        expect(
            (await request(anonymous).post('/api/instructors').send(body))
                .status
        ).toBe(401);
        expect(
            (await request(student).post('/api/instructors').send(body)).status
        ).toBe(403);
        expect(await Instructors.exists({ id: 802 })).toBeNull();
    });

    it('PUT /api/instructors/:id requires admin', async () => {
        const body = { name: 'Renamed' };
        expect(
            (await request(anonymous).put('/api/instructors/801').send(body))
                .status
        ).toBe(401);
        expect(
            (await request(student).put('/api/instructors/801').send(body))
                .status
        ).toBe(403);
        expect((await Instructors.findOne({ id: 801 }))?.name).toBe(
            'Access Prof'
        );
    });
});
