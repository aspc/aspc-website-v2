import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { SAMLUser } from '../../models/People';
import { isSuperAdmin } from '../../middleware/authMiddleware';
import {
    ADMIN_ROLES,
    MULTI_ADMIN_ROLE_IDS,
    isKnownAdminRole,
    privilegesForRole,
} from '../../constants/adminRoles';

const router = express.Router();

// Fields returned to the client. Never include the SAML id.
const ADMIN_FIELDS = 'firstName lastName email role isAdmin isSuperAdmin';

const isDuplicateRoleError = (error: unknown) =>
    Boolean(
        error &&
            typeof error === 'object' &&
            'code' in error &&
            (error as { code?: number }).code === 11000
    );

/**
 * @route   GET /api/admin/users/roles
 * @desc    List assignable roles and which ones are already taken
 * @access  isSuperAdmin
 */
router.get('/roles', isSuperAdmin, async (_req: Request, res: Response) => {
    try {
        const holders = await SAMLUser.find({
            role: { $exists: true, $ne: '' },
        }).select('email firstName lastName role');

        const takenByRole = new Map(
            holders.map((user) => [
                user.role as string,
                {
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                },
            ])
        );

        res.json(
            ADMIN_ROLES.map((role) => ({
                ...role,
                takenBy: takenByRole.get(role.id) ?? null,
            }))
        );
    } catch (error) {
        console.error('Error listing roles:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   GET /api/admin/users/search?q=<text>
 * @desc    Find users by first name, last name, or email so a super admin
 *          can pick the right person before granting a role
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
 * @desc    List all users with a role (admins)
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
 * @desc    Assign a unique role to an existing user, looked up by email.
 *          Having a role makes them an admin. President, Chief of Staff,
 *          and SDG are super admins.
 * @access  isSuperAdmin
 */
router.post('/admins', isSuperAdmin, async (req: Request, res: Response) => {
    try {
        const { email, role } = req.body;

        if (!email || typeof email !== 'string') {
            res.status(400).json({ message: 'Email is required' });
            return;
        }

        if (!role || typeof role !== 'string' || !isKnownAdminRole(role)) {
            res.status(400).json({ message: 'A valid role is required' });
            return;
        }

        const normalizedEmail = email.trim().toLowerCase();
        const isMultiRole = MULTI_ADMIN_ROLE_IDS.includes(
            role as (typeof MULTI_ADMIN_ROLE_IDS)[number]
        );
        const holder = isMultiRole
            ? null
            : await SAMLUser.findOne({ role }).select(ADMIN_FIELDS);

        const isReplacingOwnRole =
            holder &&
            holder.email !== normalizedEmail &&
            holder.email === req.session.user?.email;

        if (holder && holder.email !== normalizedEmail && !isReplacingOwnRole) {
            res.status(409).json({
                message: `Role is already assigned to ${holder.email}`,
            });
            return;
        }

        const privileges = privilegesForRole(role);
        const user = await SAMLUser.findOne({ email: normalizedEmail });

        if (!user) {
            res.status(404).json({
                message:
                    'User not found. They must log in at least once first.',
            });
            return;
        }

        // A super admin may hand off their own unique role while assigning it
        // to the replacement. The old role must be released first because of
        // the unique role index; restore it if assigning the replacement
        // fails.
        if (isReplacingOwnRole && holder) {
            await SAMLUser.findByIdAndUpdate(holder._id, {
                $unset: { role: 1 },
                $set: privilegesForRole(null),
            });
        }

        let updatedUser;
        try {
            updatedUser = await SAMLUser.findOneAndUpdate(
                { email: normalizedEmail },
                { $set: { role, ...privileges } },
                { new: true }
            ).select(ADMIN_FIELDS);
        } catch (error) {
            if (isReplacingOwnRole && holder) {
                await SAMLUser.findByIdAndUpdate(holder._id, {
                    $set: {
                        role: holder.role,
                        ...privilegesForRole(holder.role),
                    },
                });
            }
            throw error;
        }

        console.log(
            `Role ${role} granted to ${updatedUser?.email} by ${req.session.user?.email}`
        );
        res.json({ message: 'Role assigned', user: updatedUser });
    } catch (error) {
        if (isDuplicateRoleError(error)) {
            res.status(409).json({
                message: 'Role is already assigned to someone else',
            });
            return;
        }
        console.error('Error granting role:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   DELETE /api/admin/users/admins/:id
 * @desc    Remove a user's role (and admin privileges) by MongoDB _id
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

            if (req.session.user?.email === target.email) {
                res.status(403).json({
                    message: 'You cannot remove your own role',
                });
                return;
            }

            const privileges = privilegesForRole(null);
            const updated = await SAMLUser.findByIdAndUpdate(
                id,
                { $unset: { role: 1 }, $set: privileges },
                { new: true }
            ).select(ADMIN_FIELDS);

            console.log(
                `Role revoked from ${target.email} by ${req.session.user?.email}`
            );
            res.json({ message: 'Role revoked', user: updated });
        } catch (error) {
            console.error('Error revoking role:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

export default router;
