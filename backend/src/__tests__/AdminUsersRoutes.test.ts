import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

import adminUsersRoutes from '../routes/admin/AdminUsersRoutes';
import { isAdmin } from '../middleware/authMiddleware';
import { SAMLUser } from '../models/People';

// Session payloads shaped like what /saml/consume stores. The middleware
// only reads `id`, which it uses to look the user up in the database.
const SUPER_SESSION = {
    user: { id: 'azure-super', email: 'super@pomona.edu' },
};
const ADMIN_SESSION = {
    user: { id: 'azure-admin', email: 'admin@pomona.edu' },
};
const USER_SESSION = {
    user: { id: 'azure-user', email: 'user@pomona.edu' },
};

const buildApp = (sessionData = {}) => {
    const app = express();
    app.use(express.json());
    app.use(
        session({
            secret: 'test-secret',
            resave: false,
            saveUninitialized: true,
        })
    );
    // Inject session data so each test can act as a specific logged-in user
    app.use((req: any, _res, next) => {
        Object.assign(req.session, sessionData);
        next();
    });
    app.use('/api/admin/users', adminUsersRoutes);
    // Probe route guarded by the real isAdmin middleware, used to confirm
    // existing admin authorization still behaves after our changes
    app.get('/api/probe/admin', isAdmin, (_req, res) => {
        res.json({ ok: true });
    });
    return app;
};

let mongoServer: MongoMemoryServer;
let superAdminId: string;
let adminId: string;
let userId: string;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
}, 90000);

beforeEach(async () => {
    await SAMLUser.deleteMany({});
    const [superAdmin, admin, user] = await SAMLUser.create([
        {
            id: 'azure-super',
            email: 'super@pomona.edu',
            firstName: 'Sue',
            lastName: 'Super',
            isAdmin: true,
            isSuperAdmin: true,
        },
        {
            id: 'azure-admin',
            email: 'admin@pomona.edu',
            firstName: 'Al',
            lastName: 'Admin',
            isAdmin: true,
        },
        {
            id: 'azure-user',
            email: 'user@pomona.edu',
            firstName: 'Uma',
            lastName: 'User',
        },
    ]);
    superAdminId = String(superAdmin._id);
    adminId = String(admin._id);
    userId = String(user._id);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
}, 30000);

describe('GET /api/admin/users/admins', () => {
    it('returns 401 when not logged in', async () => {
        const res = await request(buildApp()).get('/api/admin/users/admins');
        expect(res.status).toBe(401);
    });

    it('returns 403 for a normal user', async () => {
        const res = await request(buildApp(USER_SESSION)).get(
            '/api/admin/users/admins'
        );
        expect(res.status).toBe(403);
    });

    it('returns 403 for a normal admin', async () => {
        const res = await request(buildApp(ADMIN_SESSION)).get(
            '/api/admin/users/admins'
        );
        expect(res.status).toBe(403);
    });

    it('lists admins for a super admin without exposing the SAML id', async () => {
        const res = await request(buildApp(SUPER_SESSION)).get(
            '/api/admin/users/admins'
        );
        expect(res.status).toBe(200);
        const emails = res.body.map((u: { email: string }) => u.email);
        expect(emails).toEqual(['admin@pomona.edu', 'super@pomona.edu']);
        expect(res.body[0].id).toBeUndefined();
    });
});

describe('POST /api/admin/users/admins', () => {
    it('lets a super admin promote a user by email', async () => {
        const res = await request(buildApp(SUPER_SESSION))
            .post('/api/admin/users/admins')
            .send({ email: 'user@pomona.edu' });
        expect(res.status).toBe(200);
        expect(res.body.user.isAdmin).toBe(true);

        const user = await SAMLUser.findById(userId);
        expect(user?.isAdmin).toBe(true);
        expect(user?.isSuperAdmin).toBe(false);
    });

    it('normalizes email case and whitespace', async () => {
        const res = await request(buildApp(SUPER_SESSION))
            .post('/api/admin/users/admins')
            .send({ email: '  USER@Pomona.edu ' });
        expect(res.status).toBe(200);
        const user = await SAMLUser.findById(userId);
        expect(user?.isAdmin).toBe(true);
    });

    it('is idempotent when the user is already an admin', async () => {
        const res = await request(buildApp(SUPER_SESSION))
            .post('/api/admin/users/admins')
            .send({ email: 'admin@pomona.edu' });
        expect(res.status).toBe(200);
        const admin = await SAMLUser.findById(adminId);
        expect(admin?.isAdmin).toBe(true);
    });

    it('returns 404 for an unknown email', async () => {
        const res = await request(buildApp(SUPER_SESSION))
            .post('/api/admin/users/admins')
            .send({ email: 'nobody@pomona.edu' });
        expect(res.status).toBe(404);
    });

    it('returns 400 when email is missing or not a string', async () => {
        const app = buildApp(SUPER_SESSION);
        const missing = await request(app)
            .post('/api/admin/users/admins')
            .send({});
        expect(missing.status).toBe(400);

        const wrongType = await request(app)
            .post('/api/admin/users/admins')
            .send({ email: { $ne: null } });
        expect(wrongType.status).toBe(400);
    });

    it('ignores isSuperAdmin in the request body', async () => {
        const res = await request(buildApp(SUPER_SESSION))
            .post('/api/admin/users/admins')
            .send({ email: 'user@pomona.edu', isSuperAdmin: true });
        expect(res.status).toBe(200);
        const user = await SAMLUser.findById(userId);
        expect(user?.isSuperAdmin).toBe(false);
    });

    it('returns 401 when not logged in and does not change the user', async () => {
        const res = await request(buildApp())
            .post('/api/admin/users/admins')
            .send({ email: 'user@pomona.edu' });
        expect(res.status).toBe(401);
        const user = await SAMLUser.findById(userId);
        expect(user?.isAdmin).toBe(false);
    });

    it('returns 403 for a normal admin and does not change the user', async () => {
        const res = await request(buildApp(ADMIN_SESSION))
            .post('/api/admin/users/admins')
            .send({ email: 'user@pomona.edu' });
        expect(res.status).toBe(403);
        const user = await SAMLUser.findById(userId);
        expect(user?.isAdmin).toBe(false);
    });

    it('returns 403 for a normal user trying to promote themselves', async () => {
        const res = await request(buildApp(USER_SESSION))
            .post('/api/admin/users/admins')
            .send({ email: 'user@pomona.edu' });
        expect(res.status).toBe(403);
        const user = await SAMLUser.findById(userId);
        expect(user?.isAdmin).toBe(false);
    });
});

describe('DELETE /api/admin/users/admins/:id', () => {
    it('lets a super admin revoke admin from a normal admin', async () => {
        const res = await request(buildApp(SUPER_SESSION)).delete(
            `/api/admin/users/admins/${adminId}`
        );
        expect(res.status).toBe(200);
        expect(res.body.user.isAdmin).toBe(false);

        const admin = await SAMLUser.findById(adminId);
        expect(admin?.isAdmin).toBe(false);
    });

    it('refuses to demote a super admin, including yourself', async () => {
        const res = await request(buildApp(SUPER_SESSION)).delete(
            `/api/admin/users/admins/${superAdminId}`
        );
        expect(res.status).toBe(403);

        const superAdmin = await SAMLUser.findById(superAdminId);
        expect(superAdmin?.isAdmin).toBe(true);
        expect(superAdmin?.isSuperAdmin).toBe(true);
    });

    it('returns 404 for a well-formed id that does not exist', async () => {
        const res = await request(buildApp(SUPER_SESSION)).delete(
            `/api/admin/users/admins/${new mongoose.Types.ObjectId()}`
        );
        expect(res.status).toBe(404);
    });

    it('returns 400 for a malformed id', async () => {
        const res = await request(buildApp(SUPER_SESSION)).delete(
            '/api/admin/users/admins/not-an-id'
        );
        expect(res.status).toBe(400);
    });

    it('returns 401 when not logged in and does not change the admin', async () => {
        const res = await request(buildApp()).delete(
            `/api/admin/users/admins/${adminId}`
        );
        expect(res.status).toBe(401);
        const admin = await SAMLUser.findById(adminId);
        expect(admin?.isAdmin).toBe(true);
    });

    it('returns 403 for a normal admin and does not change the admin', async () => {
        const res = await request(buildApp(ADMIN_SESSION)).delete(
            `/api/admin/users/admins/${adminId}`
        );
        expect(res.status).toBe(403);
        const admin = await SAMLUser.findById(adminId);
        expect(admin?.isAdmin).toBe(true);
    });

    it('returns 403 for a normal user and does not change the admin', async () => {
        const res = await request(buildApp(USER_SESSION)).delete(
            `/api/admin/users/admins/${adminId}`
        );
        expect(res.status).toBe(403);
        const admin = await SAMLUser.findById(adminId);
        expect(admin?.isAdmin).toBe(true);
    });
});

describe('GET /api/admin/users/search', () => {
    it('returns 401 when not logged in', async () => {
        const res = await request(buildApp()).get(
            '/api/admin/users/search?q=uma'
        );
        expect(res.status).toBe(401);
    });

    it('returns 403 for a normal admin', async () => {
        const res = await request(buildApp(ADMIN_SESSION)).get(
            '/api/admin/users/search?q=uma'
        );
        expect(res.status).toBe(403);
    });

    it('finds users by first name, case-insensitively', async () => {
        const res = await request(buildApp(SUPER_SESSION)).get(
            '/api/admin/users/search?q=UMA'
        );
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].email).toBe('user@pomona.edu');
        expect(res.body[0].isAdmin).toBe(false);
        expect(res.body[0]).not.toHaveProperty('id');
    });

    it('finds users by last name and by email', async () => {
        const byLast = await request(buildApp(SUPER_SESSION)).get(
            '/api/admin/users/search?q=admin'
        );
        expect(byLast.status).toBe(200);
        const emails = byLast.body.map((u: { email: string }) => u.email);
        // Matches "Al Admin" by last name and admin@pomona.edu by email
        expect(emails).toContain('admin@pomona.edu');

        const byEmail = await request(buildApp(SUPER_SESSION)).get(
            '/api/admin/users/search?q=super@pomona'
        );
        expect(byEmail.status).toBe(200);
        expect(byEmail.body).toHaveLength(1);
        expect(byEmail.body[0].email).toBe('super@pomona.edu');
    });

    it('returns an empty list when nothing matches', async () => {
        const res = await request(buildApp(SUPER_SESSION)).get(
            '/api/admin/users/search?q=zzzz'
        );
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    it('returns 400 for missing or too-short search text', async () => {
        const missing = await request(buildApp(SUPER_SESSION)).get(
            '/api/admin/users/search'
        );
        expect(missing.status).toBe(400);

        const short = await request(buildApp(SUPER_SESSION)).get(
            '/api/admin/users/search?q=u'
        );
        expect(short.status).toBe(400);
    });

    it('treats regex metacharacters as literal text', async () => {
        const res = await request(buildApp(SUPER_SESSION)).get(
            '/api/admin/users/search?q=' + encodeURIComponent('.*')
        );
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });
});

describe('existing isAdmin middleware', () => {
    it('still allows a normal admin', async () => {
        const res = await request(buildApp(ADMIN_SESSION)).get(
            '/api/probe/admin'
        );
        expect(res.status).toBe(200);
    });

    it('allows a super admin', async () => {
        const res = await request(buildApp(SUPER_SESSION)).get(
            '/api/probe/admin'
        );
        expect(res.status).toBe(200);
    });

    it('still rejects a normal user and unauthenticated requests', async () => {
        const asUser = await request(buildApp(USER_SESSION)).get(
            '/api/probe/admin'
        );
        expect(asUser.status).toBe(403);

        const anon = await request(buildApp()).get('/api/probe/admin');
        expect(anon.status).toBe(401);
    });

    it('rejects a demoted admin on the very next request', async () => {
        await request(buildApp(SUPER_SESSION)).delete(
            `/api/admin/users/admins/${adminId}`
        );
        const res = await request(buildApp(ADMIN_SESSION)).get(
            '/api/probe/admin'
        );
        expect(res.status).toBe(403);
    });
});
