import express, { Request, Response } from 'express';
import { initializeSAML, fetchAndSaveMetadata } from '../config/samlConfig';
import fs from 'fs';
import path from 'path';
import { SAMLUser } from '../models/People';
import { Router } from 'express';
import { IdentityProvider } from 'samlify/types/src/entity-idp';
import { ServiceProvider } from 'samlify/types/src/entity-sp';

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
        if (typeof document !== 'undefined' && document.hasStorageAccess) {
            const hasAccess = await document.hasStorageAccess();
            if (!hasAccess) {
                // Request storage access if not available
                await document.requestStorageAccess();
            }
        }

        const { id, context } = sp.createLoginRequest(idp, 'redirect');
        (req.session as any).authRequest = id;
        res.redirect(context);
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

            const { extract } = await sp.parseLoginResponse(idp, 'post', req);
            const baseLink =
                'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/';
            // console.log('SAML extract:', extract);

            // Store user in session
            (req.session as any).user = {
                id: extract.attributes[
                    'http://schemas.microsoft.com/identity/claims/objectidentifier'
                ],
                email: extract.attributes[baseLink + 'emailaddress'],
                firstName: extract.attributes[baseLink + 'givenname'],
                lastName: extract.attributes[baseLink + 'surname'],
                sessionIndex: extract.sessionIndex,
                nameID: extract.nameID,
            };

            console.log('SAML user:', (req.session as any).user);

            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    res.status(500).json({ message: 'Failed to save session' });
                    return;
                }
                // Redirect to your frontend app
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

        const user = (req.session as any).user;
        if (!user) {
            res.redirect('/');
            return;
        }
        console.log('SAML user logged out:', user.nameID);
        const { id, context } = sp.createLogoutRequest(idp, 'redirect', {
            sessionIndex: user.sessionIndex.sessionIndex,
            nameID: user.nameID,
        });

        // Clear the session
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destruction error:', err);
            }

            // Clear the cookie with the EXACT same settings as when it was created
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

            res.redirect(process.env.FRONTEND_LINK || context);
        });
    } catch (error) {
        console.error('SAML logout error:', error);
        res.status(500).json({ message: 'Logout failed', error });
    }
});

// Get current user
router.get('/current_user', async (req: Request, res: Response) => {
    if (!(req.session as any).user) {
        res.status(401).json({ message: 'No user is logged in' });
        return;
    }

    const azureId = (req.session as any).user.id;
    // In AuthRoutes.ts, /current_user endpoint
    try {
        // First try to find user by Azure ID
        let user = await SAMLUser.findOne({ id: azureId });

        if (!user) {
            // Check by email first before creating
            user = await SAMLUser.findOne({
                email: (req.session as any).user.email,
            });

            if (!user) {
                // Only create if no user exists with this email
                const userData = {
                    id: azureId,
                    email: (req.session as any).user.email,
                    firstName: (req.session as any).user.firstName,
                    lastName: (req.session as any).user.lastName,
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
                            email: (req.session as any).user.email,
                        });
                    } else {
                        throw err;
                    }
                }
            }
        }

        if (!user) {
            res.status(500).json({ message: 'Failed to retrieve or create user' });
            return;
        }

        res.status(200).json({ 
            user: {
                ...user.toObject(),
                _id: (user._id as any).toString(),
            }
        });
    } catch (error) {
        console.error('User creation error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// All Users
router.get('/users', async (req: Request, res: Response) => {
    try {
        const users = await SAMLUser.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user by ID
router.get('/users/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await SAMLUser.findOne({ _id: id }).select('firstName lastName email');
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
});

export default router;
