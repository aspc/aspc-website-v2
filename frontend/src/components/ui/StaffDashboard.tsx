'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Loading from '@/components/Loading';
import { StaffMember } from '@/types';
import Image from 'next/image';

const StaffDashboard = () => {
    const { loading } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [existingMembers, setExistingMembers] = useState<StaffMember[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState<string>('');
    const [isCreatingNew, setIsCreatingNew] = useState(false);

    // Form state
    const [profilePicture, setProfilePicture] = useState<File | null>(null);
    const [profilePictureURL, setProfilePictureURL] = useState<string>('');
    const [name, setName] = useState<string>('');
    const [position, setPosition] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [bio, setBio] = useState<string>('');
    const [group, setGroup] = useState<string>('senate');
    const [id, setId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const fetchMembers = async () => {
        try {
            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/members`,
                {
                    credentials: 'include',
                }
            );
            if (response.ok) {
                const data = await response.json();
                setExistingMembers(data);
            }
        } catch (error) {
            console.error('Error fetching members:', error);
        }
    };

    // Fetch existing members
    useEffect(() => {
        fetchMembers();
    }, []);

    // Fetch selected member data
    useEffect(() => {
        const fetchMemberData = async () => {
            if (!selectedMemberId) return;

            try {
                setIsLoading(true);
                const response = await fetch(
                    `${process.env.BACKEND_LINK}/api/members/${selectedMemberId}`,
                    {
                        credentials: 'include',
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    setName(data.name);
                    setPosition(data.position);
                    setEmail(data.email || '');
                    setBio(data.bio);
                    setGroup(data.group);
                    setId(data.id);

                    // If there's a profile picture, set its URL
                    setProfilePictureURL(
                        data.profilePic
                            ? `${process.env.BACKEND_LINK}/api/members/profile-pic/${data.profilePic}`
                            : ''
                    );
                }
            } catch (error) {
                console.error('Error fetching member data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMemberData();
    }, [selectedMemberId]);

    const handlePictureUpload = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        if (file) {
            setProfilePicture(file);
            setProfilePictureURL(URL.createObjectURL(file));
        }
    };

    const resetForm = () => {
        setName('');
        setPosition('');
        setEmail('');
        setBio('');
        setGroup('senate');
        setId('');
        setProfilePicture(null);
        setProfilePictureURL('');
        setSelectedMemberId('');
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this member?')) {
            try {
                setIsLoading(true);
                const response = await fetch(
                    `${process.env.BACKEND_LINK}/api/members/${selectedMemberId}`,
                    {
                        method: 'DELETE',
                        credentials: 'include',
                    }
                );

                if (!response.ok) {
                    throw new Error('Failed to delete member');
                }

                fetchMembers();

                alert('Member deleted successfully!');
                setTimeout(() => window.location.reload(), 1000);
            } catch (error) {
                console.error('Error deleting staff data:', error);
                alert('Failed to delete staff data');
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setIsLoading(true);
            const formData = new FormData();
            if (profilePicture) {
                formData.append('file', profilePicture);
            }
            formData.append('id', id);
            formData.append('name', name);
            formData.append('position', position);
            formData.append('email', email);
            formData.append('bio', bio);
            formData.append('group', group);

            const url = selectedMemberId
                ? `${process.env.BACKEND_LINK}/api/members/${selectedMemberId}`
                : `${process.env.BACKEND_LINK}/api/members`;

            const method = selectedMemberId ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method,
                credentials: 'include',
                body: formData,
            });

            if (!response.ok) throw new Error('Failed to save staff data');

            alert('Staff member saved successfully!');
            resetForm();
            setIsEditing(false);
            setIsCreatingNew(false);
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            console.error('Error saving staff data:', error);
            alert('Failed to save staff data');
        } finally {
            setIsLoading(false);
        }
    };

    if (loading || isLoading) return <Loading />;

    if (!isEditing && !isCreatingNew) {
        return (
            <div className="bg-gray-100 p-6 lg:p-8">
                {/* Header */}
                <header className="mb-6 border-b border-gray-300 pb-4">
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">
                        Staff Management
                    </h1>
                </header>

                {/* Add / Edit Events */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <section className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow transition-shadow">
                        <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center gap-2">
                            Add New Staff/Senate Member
                        </h2>
                        <p className="text-gray-600 text-sm mb-4">
                            Create a profile for a new ASPC member.
                        </p>
                        <button
                            onClick={() => {
                                setIsEditing(false);
                                setIsCreatingNew(true);
                                setSelectedMemberId('');
                                resetForm();
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="bg-blue-600 text-white px-5 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors w-full sm:w-auto"
                        >
                            + Add New Member
                        </button>
                    </section>

                    <section className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow transition-shadow">
                        <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center gap-2">
                            Edit Existing Member
                        </h2>
                        <p className="text-gray-600 text-sm mb-4">
                            Select an existing member to edit their information.
                        </p>

                        <select
                            className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                            value={selectedMemberId}
                            onChange={(e) => {
                                setSelectedMemberId(e.target.value);
                                if (e.target.value) setIsEditing(true);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                        >
                            <option value="">Select a member to edit</option>
                            {existingMembers.map((member) => (
                                <option key={member.id} value={member.id}>
                                    {member.position}
                                </option>
                            ))}
                        </select>
                    </section>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="min-h-screen bg-gray-100 p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">
                    {selectedMemberId
                        ? 'Edit Staff Member'
                        : 'Add New Staff Member'}
                </h1>
                <div className="flex space-x-4 mb-6">
                    {!isCreatingNew && (
                        <button
                            type="button"
                            onClick={() => {
                                handleDelete();
                            }}
                            className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                        >
                            Delete Member
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            setIsEditing(false);
                            setIsCreatingNew(false);
                            resetForm();
                        }}
                        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                    >
                        Back
                    </button>
                </div>
            </div>

            {/* ID */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Staff ID
                </h2>
                <input
                    className="w-full p-4 border rounded"
                    type="text"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    required
                />
            </div>

            {/* Profile Picture */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Profile Picture
                </h2>
                {profilePictureURL && (
                    <div className="mb-4">
                        <Image
                            src={profilePictureURL}
                            alt="Profile"
                            width={128}
                            height={128}
                            className="w-32 h-32 rounded-full object-cover"
                            onError={() => {
                                setProfilePictureURL('');
                            }}
                        />
                    </div>
                )}
                <input
                    type="file"
                    onChange={handlePictureUpload}
                    accept="image/*"
                />
            </div>

            {/* Name */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Name
                </h2>
                <input
                    className="w-full p-4 border rounded"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
            </div>

            {/* Position */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Position
                </h2>
                <input
                    className="w-full p-4 border rounded"
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    required
                />
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Email
                </h2>
                <input
                    className="w-full p-4 border rounded"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@aspc.pomona.edu"
                    required
                />
            </div>

            {/* Bio */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    About Me
                </h2>
                <textarea
                    className="w-full p-4 border rounded"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    required
                />
            </div>

            {/* Group */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Group
                </h2>
                <select
                    className="w-full p-4 border rounded mb-4"
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    required
                >
                    <option value="senate">Senate</option>
                    <option value="staff">Staff</option>
                    <option value="college-staff">College Staff</option>
                    <option value="software">Software Dev Group</option>
                </select>
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                disabled={isLoading}
                className="bg-blue-500 text-white px-6 py-3 rounded hover:bg-blue-600 w-full disabled:bg-blue-300"
            >
                {isLoading
                    ? 'Saving...'
                    : selectedMemberId
                      ? 'Update Member'
                      : 'Add Member'}
            </button>
        </form>
    );
};

export default StaffDashboard;
