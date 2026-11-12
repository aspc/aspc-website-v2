'use client';
import { useState, useEffect, FormEvent } from 'react';
import { AdminRoleOption, AdminUser } from '@/types';

const AdminsDashboard = ({
    canManageAll,
    currentUserEmail,
    currentUserRole,
}: {
    canManageAll: boolean;
    currentUserEmail: string;
    currentUserRole?: string;
}) => {
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [roles, setRoles] = useState<AdminRoleOption[]>([]);
    const [email, setEmail] = useState<string>('');
    const [nameQuery, setNameQuery] = useState<string>('');
    const [selectedRole, setSelectedRole] = useState<string>('');
    const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<AdminUser[] | null>(
        null
    );
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');
    const [pendingRemoval, setPendingRemoval] = useState<AdminUser | null>(
        null
    );
    const [showEmailForm, setShowEmailForm] = useState(false);

    const roleLabel = (roleId?: string) =>
        roles.find((role) => role.id === roleId)?.label ?? roleId ?? 'No role';

    const fetchAdmins = async () => {
        try {
            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/admin/users/admins`,
                {
                    credentials: 'include',
                }
            );
            if (response.ok) {
                const data = await response.json();
                setAdmins(data);
            }
        } catch (error) {
            console.error('Error fetching admins:', error);
        }
    };

    const fetchRoles = async () => {
        try {
            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/admin/users/roles`,
                {
                    credentials: 'include',
                }
            );
            if (response.ok) {
                const data: AdminRoleOption[] = await response.json();
                setRoles(data);
            }
        } catch (error) {
            console.error('Error fetching roles:', error);
        }
    };

    useEffect(() => {
        if (canManageAll) fetchAdmins();
        fetchRoles();
    }, [canManageAll]);

    const searchUsers = async (query: string) => {
        setError('');
        setSuccessMessage('');

        try {
            setIsLoading(true);
            const params = new URLSearchParams({ q: query.trim() });
            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/admin/users/search?${params}`,
                {
                    credentials: 'include',
                }
            );
            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Search failed');
                return;
            }

            setSearchResults(data);
        } catch (error) {
            console.error('Error searching users:', error);
            setError('Search failed');
        } finally {
            setIsLoading(false);
        }
    };
    const handleSearch = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const query = new FormData(e.currentTarget).get('q');
        await searchUsers(typeof query == 'string' ? query : '');
    };

    const handleAssignRole = async (user: AdminUser) => {
        setError('');
        setSuccessMessage('');

        if (assigningUserId !== user._id) {
            setAssigningUserId(user._id);
            setSelectedRole('');
            return;
        }

        if (!selectedRole) {
            setError('Select a role before assigning');
            return;
        }

        try {
            setIsLoading(true);
            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/admin/users/admins`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: user.email,
                        role: selectedRole,
                    }),
                }
            );

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || 'Failed to assign role');
            }

            await Promise.all([fetchAdmins(), fetchRoles()]);

            setSearchResults(null);
            setAssigningUserId(null);
            setSelectedRole('');
            setNameQuery('');
            setEmail('');
            setShowEmailForm(false);
            setSuccessMessage(
                `You assigned ${roleLabel(selectedRole)} to ${user.firstName} ${user.lastName}.`
            );
        } catch (error) {
            console.error('Error assigning role:', error);
            setError(
                error instanceof Error ? error.message : 'Failed to assign role'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelAssign = () => {
        setAssigningUserId(null);
        setSelectedRole('');
        setError('');
    };

    const handleConfirmRemove = async () => {
        if (!pendingRemoval) return;
        const admin = pendingRemoval;
        setError('');
        setSuccessMessage('');

        try {
            setIsLoading(true);
            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/admin/users/admins/${admin._id}`,
                {
                    method: 'DELETE',
                    credentials: 'include',
                }
            );

            if (!response.ok) {
                const data = await response.json();
                setError(data.message || 'Failed to remove role');
                return;
            }

            await Promise.all([fetchAdmins(), fetchRoles()]);
            setSearchResults(
                (prev) =>
                    prev?.map((u) =>
                        u._id === admin._id
                            ? {
                                  ...u,
                                  isAdmin: false,
                                  isSuperAdmin: false,
                                  role: undefined,
                              }
                            : u
                    ) ?? null
            );
        } catch (error) {
            console.error('Error removing role:', error);
            setError('Failed to remove role');
        } finally {
            setIsLoading(false);
            setPendingRemoval(null);
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">
                {canManageAll ? 'Manage Roles' : 'Transfer your role'}
            </h2>

            {/* Find by name */}
            <form onSubmit={handleSearch} className="mb-6">
                <label className="block text-sm font-medium mb-2">
                    Find by name
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        name="q"
                        value={nameQuery}
                        onChange={(e) => setNameQuery(e.target.value)}
                        placeholder="First or last name"
                        required
                        minLength={2}
                        className="flex-1 p-2 border border-gray-300 rounded"
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                        Search
                    </button>
                </div>
            </form>

            {successMessage && (
                <p className="text-green-600 text-sm mb-4">{successMessage}</p>
            )}

            {/* Find by email, hidden until requested */}
            {showEmailForm ? (
                <form onSubmit={handleSearch} className="mb-6">
                    <label className="block text-sm font-medium mb-2">
                        Find by Pomona email
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            name="q"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="student@mymail.pomona.edu"
                            required
                            minLength={2}
                            className="flex-1 p-2 border border-gray-300 rounded"
                        />
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                        >
                            Search
                        </button>
                    </div>
                </form>
            ) : (
                <button
                    type="button"
                    onClick={() => setShowEmailForm(true)}
                    className="text-sm text-blue-600 hover:underline mb-6"
                >
                    Or find by email
                </button>
            )}

            {/* Search results, shared by both lookups */}
            {searchResults && (
                <ul className="mb-6 divide-y divide-gray-200 border border-gray-200 rounded">
                    {searchResults.map((user) => (
                        <li
                            key={user._id}
                            className="flex items-center justify-between p-3"
                        >
                            <div>
                                <p className="font-medium">
                                    {user.firstName} {user.lastName}
                                </p>
                                <p className="text-sm text-gray-600">
                                    {user.email}
                                </p>
                                {user.role && (
                                    <p className="text-sm text-gray-500">
                                        {roleLabel(user.role)}
                                    </p>
                                )}
                            </div>
                            {assigningUserId === user._id && (
                                <select
                                    value={selectedRole}
                                    onChange={(e) =>
                                        setSelectedRole(e.target.value)
                                    }
                                    className="p-2 border border-gray-300 rounded"
                                    aria-label={`Role for ${user.firstName} ${user.lastName}`}
                                >
                                    <option value="">Select a role</option>
                                    {roles
                                        .filter(
                                            (role) =>
                                                canManageAll ||
                                                role.id === currentUserRole
                                        )
                                        .map((role) => (
                                            <option
                                                key={role.id}
                                                value={role.id}
                                                disabled={
                                                    Boolean(role.takenBy) &&
                                                    !role.multiple &&
                                                    role.takenBy?.email !==
                                                        currentUserEmail
                                                }
                                            >
                                                {role.label}
                                                {role.superAdmin
                                                    ? ' (super admin)'
                                                    : ''}
                                                {role.takenBy
                                                    ? ` — taken by ${role.takenBy.firstName} ${role.takenBy.lastName}`
                                                    : ''}
                                            </option>
                                        ))}
                                </select>
                            )}
                            <button
                                type="button"
                                onClick={() => handleAssignRole(user)}
                                disabled={
                                    isLoading ||
                                    (assigningUserId === user._id &&
                                        (!selectedRole ||
                                            user.role === selectedRole))
                                }
                                className="bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
                            >
                                Assign role
                            </button>
                            {assigningUserId === user._id && (
                                <button
                                    type="button"
                                    onClick={handleCancelAssign}
                                    disabled={isLoading}
                                    className="px-3 py-1.5 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 text-sm"
                                >
                                    Cancel
                                </button>
                            )}
                        </li>
                    ))}
                    {searchResults.length === 0 && (
                        <li className="p-3 text-gray-500">
                            No matching users found.
                        </li>
                    )}
                </ul>
            )}

            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

            {canManageAll && (
                <>
                    <h3 className="text-lg font-semibold mb-3">
                        Current admins
                    </h3>
                    <ul className="divide-y divide-gray-200 border border-gray-200 rounded">
                        {admins.map((admin) => (
                            <li
                                key={admin._id}
                                className="flex items-center justify-between p-3"
                            >
                                <div>
                                    <p className="font-medium">
                                        {admin.firstName} {admin.lastName}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        {admin.email}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {roleLabel(admin.role)}
                                        {admin.isSuperAdmin
                                            ? ' · Super admin'
                                            : ''}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setPendingRemoval(admin)}
                                    disabled={isLoading}
                                    className="bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600 disabled:opacity-50 text-sm"
                                >
                                    Remove
                                </button>
                            </li>
                        ))}
                        {admins.length === 0 && (
                            <li className="p-3 text-gray-500">
                                No admins found.
                            </li>
                        )}
                    </ul>
                </>
            )}

            {/* Remove confirmation */}
            {pendingRemoval && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">
                            Remove role
                        </h2>
                        <p className="text-gray-700 mb-6">
                            Are you sure you want to remove{' '}
                            <span className="font-semibold">
                                {roleLabel(pendingRemoval.role)}
                            </span>{' '}
                            from{' '}
                            <span className="font-semibold">
                                {pendingRemoval.firstName}{' '}
                                {pendingRemoval.lastName}
                            </span>
                            ?
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setPendingRemoval(null)}
                                disabled={isLoading}
                                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmRemove}
                                disabled={isLoading}
                                className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminsDashboard;
