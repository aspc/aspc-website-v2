import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { SAMLUser } from '../../models/People';
import { isSuperAdmin } from '../../middleware/authMiddleware';

const router = express.Router();

// Fields returned to the client. Never include the SAML id.
const ADMIN_FIELDS = 'firstName lastName email isAdmin isSuperAdmin';

/**
 * @route   GET /api/admin/users/admins
 * @desc    List all users with admin privileges
 * @access  isSuperAdmin
 */
router.get('/admins', isSuperAdmin, async (req: Request, res: Response) => {
    try {
        const admins = await SAMLUser.find({ isAdmin: true })
            .select(ADMIN_FIELDS)
            .sort({ lastName: 1, firstName: 1 });
        res.json(admins);
    } catch (error) {
        console.error('Error listing admins:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   POST /api/admin/users/admins
 * @desc    Grant admin privileges to an existing user, looked up by email
 * @access  isSuperAdmin
 */
router.post('/admins', isSuperAdmin, async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email || typeof email !== 'string') {
            res.status(400).json({ message: 'Email is required' });
            return;
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Only isAdmin is ever written here. isSuperAdmin is managed in the
        // database directly and is never settable through the API.
        const user = await SAMLUser.findOneAndUpdate(
            { email: normalizedEmail },
            { $set: { isAdmin: true } },
            { new: true }
        ).select(ADMIN_FIELDS);

        if (!user) {
            res.status(404).json({
                message:
                    'User not found. They must log in at least once first.',
            });
            return;
        }

        console.log(
            `Admin granted to ${user.email} by ${req.session.user?.email}`
        );
        res.json({ message: 'Admin privileges granted', user });
    } catch (error) {
        console.error('Error granting admin:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   DELETE /api/admin/users/admins/:id
 * @desc    Remove admin privileges from a user by MongoDB _id
 * @access  isSuperAdmin
 */
router.delete(
    '/admins/:id',
    isSuperAdmin,
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                res.status(400).json({ message: 'Invalid user id' });
                return;
            }

            const target = await SAMLUser.findById(id).select(ADMIN_FIELDS);

            if (!target) {
                res.status(404).json({ message: 'User not found' });
                return;
            }

            // Super admin status is managed in the database, not the API,
            // so super admins cannot be demoted here (including yourself).
            if (target.isSuperAdmin) {
                res.status(403).json({
                    message: 'Super admins cannot be demoted through the API',
                });
                return;
            }

            target.isAdmin = false;
            await target.save();

            console.log(
                `Admin revoked from ${target.email} by ${req.session.user?.email}`
            );
            res.json({ message: 'Admin privileges revoked', user: target });
        } catch (error) {
            console.error('Error revoking admin:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

export default router;
