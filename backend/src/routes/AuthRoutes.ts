import express, { Request, Response } from 'express';
import { initializeSAML, fetchAndSaveMetadata } from '../config/samlConfig';
import fs from 'fs';
import path from 'path';
import { SAMLUser } from '../models/People';
import { Router } from 'express';
import { IdentityProvider } from 'samlify/types/src/entity-idp';
import { ServiceProvider } from 'samlify/types/src/entity-sp';
import { isAuthenticated } from '../middleware/authMiddleware';

const router = Router();

let idp: IdentityProvider | undefined;
let sp: ServiceProvider | undefined;

// check if metadata file exists, if not fetch and save it
const metadataPath = path.join(__dirname, '../../idp_metadata.xml');
(!fs.existsSync(metadataPath)
    ? fetchAndSaveMetadata().then(() => initializeSAML())
    : Promise.resolve(initializeSAML())
).then((result) => {
    if (result) {
        idp = result.idp;
        sp = result.sp;
    }
});

// Test SAML metadata route
router.get('/test-saml-metadata', async (req: Request, res: Response) => {
    try {
        if (!idp || !sp) {
            res.status(500).json({ message: 'SAML not initialized' });
            return;
        }

        res.json({
            idpMetadata: idp.getMetadata(),
            spMetadata: sp.getMetadata(),
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error fetching SAML metadata',
            error,
        });
    }
});

// SAML login initiation
router.get('/login/saml', async (req: Request, res: Response) => {
    try {
        if (!idp || !sp) {
            res.status(500).json({ message: 'SAML not initialized' });
            return;
        }

        const { id, context } = sp.createLoginRequest(idp, 'redirect');
        req.session.authRequest = id;

        // Save session before redirecting so it persists when the
        // SAML response comes back to /saml/consume
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                res.status(500).json({ message: 'Failed to save session' });
                return;
            }
            res.redirect(context);
        });
    } catch (error) {
        res.status(500).json({ message: 'SAML login error', error });
    }
});

// SAML assertion consumer service
router.post(
    '/saml/consume',
    express.urlencoded({ extended: false }),
    async (req: Request, res: Response) => {
        try {
            if (!idp || !sp) {
                res.status(500).json({ message: 'SAML not initialized' });
                return;
            }
            // Parse the SAML response
            const { extract } = await sp.parseLoginResponse(idp, 'post', req);

            // production-> validate that the InResponseTo matches the authRequest ID stored in session
            if (process.env.NODE_ENV === 'production') {
                const expectedRequestId = req.session.authRequest;
                if (!expectedRequestId) {
                    res.status(403).json({
                        message: 'No pending authentication request',
                    });
                    return;
                }
                const inResponseTo = extract.response?.inResponseTo;
                if (!inResponseTo || inResponseTo !== expectedRequestId) {
                    res.status(403).json({
                        message: 'Invalid SAML response: InResponseTo mismatch',
                    });
                    return;
                }
                delete req.session.authRequest;
            }

            const baseLink =
                'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/';

            req.session.user = {
                id: extract.attributes[
                    'http://schemas.microsoft.com/identity/claims/objectidentifier'
                ],
                email: extract.attributes[baseLink + 'emailaddress'],
                firstName: extract.attributes[baseLink + 'givenname'],
                lastName: extract.attributes[baseLink + 'surname'],
                sessionIndex: extract.sessionIndex,
                nameID: extract.nameID,
            };

            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    res.status(500).json({ message: 'Failed to save session' });
                    return;
                }
                res.redirect(
                    process.env.FRONTEND_LINK || 'http://localhost:3000'
                );
            });
        } catch (error) {
            console.error('SAML consume error:', error);
            res.status(500).json({
                message: 'SAML authentication failed',
                error,
            });
        }
    }
);

// Logout Route
router.get('/logout/saml', async (req: Request, res: Response) => {
    try {
        if (!idp || !sp) {
            throw new Error('SAML not initialized');
        }

        const user = req.session.user;
        if (!user) {
            res.redirect(process.env.FRONTEND_LINK || '/');
            return;
        }

        const { context } = sp.createLogoutRequest(idp, 'redirect', {
            sessionIndex: user.sessionIndex.sessionIndex,
            nameID: user.nameID,
        });

        req.session.destroy((err) => {
            if (err) {
                console.error('Session destruction error:', err);
            }

            res.clearCookie('connect.sid', {
                path: '/',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite:
                    process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                domain:
                    process.env.NODE_ENV === 'production'
                        ? '.pomonastudents.org'
                        : undefined,
            });

            // Redirect to IdP to terminate their session.
            res.redirect(process.env.FRONTEND_LINK || context);
        });
    } catch (error) {
        console.error('SAML logout error:', error);
        res.status(500).json({ message: 'Logout failed', error });
    }
});

// Get current user
router.get('/current_user', async (req: Request, res: Response) => {
    if (!req.session.user) {
        res.status(401).json({ message: 'No user is logged in' });
        return;
    }

    const azureId = req.session.user.id;
    // In AuthRoutes.ts, /current_user endpoint
    try {
        // First try to find user by Azure ID
        let user = await SAMLUser.findOne({ id: azureId });

        if (!user) {
            // Check by email first before creating
            user = await SAMLUser.findOne({
                email: req.session.user.email,
            });

            if (!user) {
                // Only create if no user exists with this email
                const userData = {
                    id: azureId,
                    email: req.session.user.email,
                    firstName: req.session.user.firstName,
                    lastName: req.session.user.lastName,
                    isAdmin: false,
                };

                try {
                    const samlUser = new SAMLUser(userData);
                    await samlUser.save();
                    user = samlUser;
                } catch (err) {
                    // Handle duplicate key errors gracefully
                    if ((err as { code?: number }).code === 11000) {
                        // If creation failed due to race condition, try finding again
                        user = await SAMLUser.findOne({
                            email: req.session.user.email,
                        });
                    } else {
                        throw err;
                    }
                }
            }
        }

        if (!user) {
            res.status(500).json({
                message: 'Failed to retrieve or create user',
            });
            return;
        }

        res.status(200).json({
            user: {
                ...user.toObject(),
                _id: user._id,
            },
        });
    } catch (error) {
        console.error('User creation error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user by ID
router.get(
    '/users/:id',
    isAuthenticated,
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const user = await SAMLUser.findOne({ _id: id }).select(
                'firstName lastName email'
            );
            if (!user) {
                res.status(404).json({ message: 'User not found' });
                return;
            }

            res.json({
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
            });
        } catch (error) {
            console.error('Error fetching user:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

export default router;
