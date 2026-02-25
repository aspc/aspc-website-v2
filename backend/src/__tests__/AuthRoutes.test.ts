import request from 'supertest';
import express from 'express';
import session from 'express-session';
import router from '../routes/AuthRoutes';

// Mock samlConfig so tests don't need real IdP metadata
jest.mock('../config/samlConfig', () => ({
    fetchAndSaveMetadata: jest.fn().mockResolvedValue(null),
    initializeSAML: jest.fn().mockReturnValue({
        idp: {
            getMetadata: jest.fn().mockReturnValue('<idp-metadata/>'),
        },
        sp: {
            getMetadata: jest.fn().mockReturnValue('<sp-metadata/>'),
            createLoginRequest: jest.fn().mockReturnValue({
                id: 'test-request-id',
                context: 'https://idp.example.com/saml/login?SAMLRequest=abc',
            }),
            createLogoutRequest: jest.fn().mockReturnValue({
                id: 'test-logout-id',
                context: 'https://idp.example.com/saml/logout?SAMLRequest=abc',
            }),
            parseLoginResponse: jest.fn().mockResolvedValue({
                extract: {
                    response: { inResponseTo: 'test-request-id' },
                    attributes: {
                        'http://schemas.microsoft.com/identity/claims/objectidentifier':
                            'azure-id-123',
                        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress':
                            'test@pomona.edu',
                        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname':
                            'Test',
                        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname':
                            'User',
                    },
                    sessionIndex: { sessionIndex: 'session-idx-1' },
                    nameID: 'test-name-id',
                },
            }),
        },
    }),
}));

// Mock SAMLUser model
jest.mock('../../models/People', () => ({
    SAMLUser: {
        findOne: jest.fn(),
        findOneAndUpdate: jest.fn(),
    },
}));

// Mock fs so it doesn't look for real metadata file
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    existsSync: jest.fn().mockReturnValue(true),
    readFileSync: jest.fn().mockReturnValue('<metadata/>'),
}));

const buildApp = (sessionData = {}) => {
    const app = express();
    app.use(
        session({
            secret: 'test-secret',
            resave: false,
            saveUninitialized: true,
        })
    );
    // Inject session data for tests that need an existing session
    app.use((req: any, _res, next) => {
        Object.assign(req.session, sessionData);
        next();
    });
    app.use('/api/auth', router);
    return app;
};

describe('GET /api/auth/login/saml', () => {
    it('redirects to IdP login URL', async () => {
        const res = await request(buildApp()).get('/api/auth/login/saml');
        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('idp.example.com');
    });
});

describe('POST /api/auth/saml/consume', () => {
    it('redirects to frontend on success in development', async () => {
        process.env.NODE_ENV = 'development';
        const res = await request(buildApp())
            .post('/api/auth/saml/consume')
            .send('SAMLResponse=mockresponse');
        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('localhost:3000');
    });

    it('rejects in production if no pending auth request', async () => {
        process.env.NODE_ENV = 'production';
        const res = await request(buildApp())
            .post('/api/auth/saml/consume')
            .send('SAMLResponse=mockresponse');
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('No pending authentication request');
    });

    it('rejects in production if InResponseTo does not match', async () => {
        process.env.NODE_ENV = 'production';
        const { sp } = require('../../config/samlConfig').initializeSAML();
        sp.parseLoginResponse.mockResolvedValueOnce({
            extract: {
                response: { inResponseTo: 'wrong-id' },
                attributes: {},
                sessionIndex: {},
                nameID: '',
            },
        });
        const res = await request(buildApp({ authRequest: 'test-request-id' }))
            .post('/api/auth/saml/consume')
            .send('SAMLResponse=mockresponse');
        expect(res.status).toBe(403);
        expect(res.body.message).toBe(
            'Invalid SAML response: InResponseTo mismatch'
        );
    });
});

describe('GET /api/auth/logout/saml', () => {
    it('redirects to frontend if no user in session', async () => {
        const res = await request(buildApp()).get('/api/auth/logout/saml');
        expect(res.status).toBe(302);
    });

    it('redirects to IdP logout URL when user is logged in', async () => {
        const res = await request(
            buildApp({
                user: {
                    nameID: 'test-name-id',
                    sessionIndex: { sessionIndex: 'session-idx-1' },
                },
            })
        ).get('/api/auth/logout/saml');
        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('idp.example.com/saml/logout');
    });
});

describe('GET /api/auth/current_user', () => {
    it('returns 401 if not logged in', async () => {
        const res = await request(buildApp()).get('/api/auth/current_user');
        expect(res.status).toBe(401);
    });

    it('returns user data if logged in and user exists in DB', async () => {
        const { SAMLUser } = require('../../models/People');
        SAMLUser.findOne.mockResolvedValue({
            _id: 'mongo-id',
            id: 'azure-id-123',
            email: 'test@pomona.edu',
            firstName: 'Test',
            lastName: 'User',
            isAdmin: false,
            toObject: () => ({
                id: 'azure-id-123',
                email: 'test@pomona.edu',
                firstName: 'Test',
                lastName: 'User',
                isAdmin: false,
            }),
        });

        const res = await request(
            buildApp({
                user: {
                    id: 'azure-id-123',
                    email: 'test@pomona.edu',
                    firstName: 'Test',
                    lastName: 'User',
                },
            })
        ).get('/api/auth/current_user');

        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe('test@pomona.edu');
    });
});
