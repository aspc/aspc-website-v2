import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { SAMLUser } from '../../models/People';
import { isSuperAdmin } from '../../middleware/authMiddleware';

const router = express.Router();

// Fields returned to the client. Never include the SAML id.
const ADMIN_FIELDS = 'firstName lastName email isAdmin isSuperAdmin';

/**
 * @route   GET /api/admin/users/search?q=<text>
 * @desc    Find users by first name, last name, or email so a super admin
 *          can pick the right person before granting admin
 * @access  isSuperAdmin
 */
router.get('/search', isSuperAdmin, async (req: Request, res: Response) => {
    try {
        const raw = typeof req.query.q === 'string' ? req.query.q.trim() : '';

        if (raw.length < 2) {
            res.status(400).json({
                message: 'Search text must be at least 2 characters',
            });
            return;
        }

        // Escape regex metacharacters so user input is matched literally
        const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(escaped, 'i');

        const users = await SAMLUser.find({
            $or: [
                { firstName: pattern },
                { lastName: pattern },
                { email: pattern },
            ],
        })
            .select(ADMIN_FIELDS)
            .sort({ lastName: 1, firstName: 1 })
            .limit(10);

        res.json(users);
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

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

        // Only isAdmin is ever written here. isSuperAdmin only ever changes
        // through the transfer route below.
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

            // Super admins cannot be demoted here (including yourself). The
            // role only moves through the transfer route below.
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

/**
 * @route   POST /api/admin/users/superadmin/transfer
 * @desc    Hand the caller's super admin role to an existing admin. The
 *          caller steps down to a regular admin. Other super admins are
 *          left untouched.
 * @access  isSuperAdmin
 */
router.post(
    '/superadmin/transfer',
    isSuperAdmin,
    async (req: Request, res: Response) => {
        try {
            const { targetId } = req.body;

            if (
                typeof targetId !== 'string' ||
                !mongoose.Types.ObjectId.isValid(targetId)
            ) {
                res.status(400).json({ message: 'Invalid user id' });
                return;
            }

            const actor = await SAMLUser.findOne({
                id: req.session.user?.id,
            });

            // The middleware already checked this, but the role could have
            // moved between that check and now.
            if (!actor || !actor.isSuperAdmin) {
                res.status(403).json({
                    message: 'Super admin access required',
                });
                return;
            }

            if (String(actor._id) === targetId) {
                res.status(400).json({
                    message: 'You cannot transfer super admin to yourself',
                });
                return;
            }

            const target =
                await SAMLUser.findById(targetId).select(ADMIN_FIELDS);

            if (!target) {
                res.status(404).json({ message: 'User not found' });
                return;
            }

            if (target.isSuperAdmin) {
                res.status(400).json({
                    message: 'That user is already a super admin',
                });
                return;
            }

            if (!target.isAdmin) {
                res.status(400).json({
                    message:
                        'Super admin can only be transferred to a current admin',
                });
                return;
            }

            // Promote first, demote second. If the second write fails we end
            // up with one extra super admin, which can be fixed from the
            // dashboard. The reverse order could leave the role with nobody.
            // The filter re-checks the target so a concurrent revoke or
            // transfer cannot slip through.
            const promoted = await SAMLUser.findOneAndUpdate(
                {
                    _id: targetId,
                    isAdmin: true,
                    isSuperAdmin: { $ne: true },
                },
                { $set: { isSuperAdmin: true } },
                { new: true }
            ).select(ADMIN_FIELDS);

            if (!promoted) {
                res.status(409).json({
                    message:
                        'That user changed while transferring. Please try again.',
                });
                return;
            }

            // isAdmin is set explicitly so a super admin whose isAdmin flag
            // was never set by hand still keeps dashboard access.
            await SAMLUser.updateOne(
                { _id: actor._id },
                { $set: { isSuperAdmin: false, isAdmin: true } }
            );

            console.log(
                `Super admin transferred from ${actor.email} to ${promoted.email}`
            );
            res.json({
                message: 'Super admin transferred',
                user: promoted,
            });
        } catch (error) {
            console.error('Error transferring super admin:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

export default router;
