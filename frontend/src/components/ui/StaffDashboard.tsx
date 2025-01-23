"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import Loading from "@/components/Loading";
import { StaffMember } from "@/types";
import Image from "next/image";

const StaffDashboard = () => {
    const { loading } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [existingMembers, setExistingMembers] = useState<StaffMember[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState<string>("");

    // Form state
    const [profilePicture, setProfilePicture] = useState<File | null>(null);
    const [profilePictureURL, setProfilePictureURL] = useState<string>("");
    const [name, setName] = useState<string>("");
    const [position, setPosition] = useState<string>("");
    const [bio, setBio] = useState<string>("");
    const [group, setGroup] = useState<string>("senate");
    const [id, setId] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);

    // Fetch existing members
    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const response = await fetch(
                    `${process.env.BACKEND_LINK}/api/members`
                );
                if (response.ok) {
                    const data = await response.json();
                    setExistingMembers(data);
                }
            } catch (error) {
                console.error("Error fetching members:", error);
            }
        };

        fetchMembers();
    }, []);

    // Fetch selected member data
    useEffect(() => {
        const fetchMemberData = async () => {
            if (!selectedMemberId) return;

            try {
                setIsLoading(true);
                const response = await fetch(
                    `${process.env.BACKEND_LINK}/api/members/${selectedMemberId}`
                );

                if (response.ok) {
                    const data = await response.json();
                    setName(data.name);
                    setPosition(data.position);
                    setBio(data.bio);
                    setGroup(data.group);
                    setId(data.id);

                    // If there's a profile picture, set its URL
                    setProfilePictureURL(
                        data.profilePic
                          ? `${process.env.BACKEND_LINK}/api/members/profile-pic/${data.profilePic}`
                          : ""
                      );
                }
            } catch (error) {
                console.error("Error fetching member data:", error);
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
        setName("");
        setPosition("");
        setBio("");
        setGroup("senate");
        setId("");
        setProfilePicture(null);
        setProfilePictureURL("");
        setSelectedMemberId("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setIsLoading(true);
            const formData = new FormData();
            if (profilePicture) {
                formData.append("file", profilePicture);
            } else {
                formData.append("file", "");
            }
            formData.append("id", id);
            formData.append("name", name);
            formData.append("position", position);
            formData.append("bio", bio);
            formData.append("group", group);

            const url = selectedMemberId
                ? `${process.env.BACKEND_LINK}/api/members/${selectedMemberId}`
                : `${process.env.BACKEND_LINK}/api/members`;

            const method = selectedMemberId ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                body: formData,
            });

            if (!response.ok) throw new Error("Failed to save staff data");

            alert("Staff member saved successfully!");
            resetForm();
            setIsEditing(false);
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            console.error("Error saving staff data:", error);
            alert("Failed to save staff data");
        } finally {
            setIsLoading(false);
        }
    };

    if (loading || isLoading) return <Loading />;

    if (!isEditing) {
        return (
            <div className="p-8">
                <h1 className="text-3xl font-bold mb-6">Staff Management</h1>
                <div className="space-y-4">
                    <button
                        onClick={() => {
                            setIsEditing(true);
                            resetForm();
                        }}
                        className="bg-blue-500 text-white px-6 py-3 rounded hover:bg-blue-600 w-full"
                    >
                        Add New Staff Member
                    </button>

                    <div>
                        <h2 className="text-xl font-bold mb-4">
                            Edit Existing Staff
                        </h2>
                        <select
                            className="w-full p-4 border rounded mb-4"
                            value={selectedMemberId}
                            onChange={(e) => {
                                setSelectedMemberId(e.target.value);
                                if (e.target.value) {
                                    setIsEditing(true);
                                }
                            }}
                        >
                            <option value="">
                                Select a staff member to edit
                            </option>
                            {existingMembers.map((member) => (
                                <option key={member.id} value={member.id}>
                                    {member.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="min-h-screen bg-gray-100 p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">
                    {selectedMemberId
                        ? "Edit Staff Member"
                        : "Add New Staff Member"}
                </h1>
                <button
                    type="button"
                    onClick={() => {
                        setIsEditing(false);
                        resetForm();
                    }}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                    Back
                </button>
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
                                // If image fails to load, clear the URL
                                setProfilePictureURL("");
                            }}
                        />
                    </div>
                )}
                <input
                    type="file"
                    onChange={handlePictureUpload}
                    accept="image/*"
                    required
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
                    <option value="finance">Finance</option>
                    <option value="studentAffairs">Student Affairs</option>
                    <option value="academicAffairs">Academic Affairs</option>
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
                    ? "Saving..."
                    : selectedMemberId
                    ? "Update Member"
                    : "Add Member"}
            </button>
        </form>
    );
};

export default StaffDashboard;
