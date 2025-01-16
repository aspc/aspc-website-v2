'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Loading from '@/components/Loading';

const StaffPage = () => {
  const { user, loading } = useAuth();
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePictureURL, setProfilePictureURL] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [position, setPosition] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [group, setGroup] = useState<string>('Senate'); // Default to 'Senate'
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // TODO: Replace with actual backend API endpoint
        const response = await fetch('/api/staff', { credentials: 'include' });

        if (response.ok) {
          const data = await response.json();
          setName(data.name || '');
          setPosition(data.position || '');
          setBio(data.bio || '');
          setGroup(data.group || 'Senate');
          setProfilePictureURL(data.profilePictureURL || '');
        }
      } catch (error) {
        console.error('Error fetching staff data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handlePictureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProfilePicture(file);
      setProfilePictureURL(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!name || !position || !bio || !group){
      alert('Please fill in all fields')
      return;
    }
    try {
      setIsLoading(true);

      const formData = new FormData();
      if (profilePicture) formData.append('profilePicture', profilePicture);
      formData.append('name', name);
      formData.append('position', position);
      formData.append('bio', bio);
      formData.append('group', group);

      // TODO: Replace with actual backend API endpoint
      const response = await fetch('/api/staff/update', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to save staff data.');
      alert('Staff data updated successfully!');
    } catch (error) {
      console.error('Error saving staff data:', error);
      alert('Failed to update staff data.');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || isLoading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Staff Page</h1>

      {/* Profile Picture */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Picture</h2>
        {profilePictureURL && <img src={profilePictureURL} alt="Profile" className="mb-4 w-32 h-32 rounded-full" />}
        <input type="file" onChange={handlePictureUpload} />
      </div>

      {/* Name */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Name</h2>
        <input
          className="w-full p-4 border rounded"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {/* Position */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Position</h2>
        <input
          className="w-full p-4 border rounded"
          type="text"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
        />
      </div>

      {/* Bio */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">About Me</h2>
        <textarea
          className="w-full p-4 border rounded"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </div>

      {/* Group */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Group</h2>
        <select
          className="w-full p-4 border rounded mb-4"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
        >
          <option value="Senate">Senate</option>
          <option value="Staff">Staff</option>
          <option value="SDG">SDG</option>
        </select>
        {/* Selected Group */}
        <p className="text-gray-700 mt-2">
          <strong>Selected Group:</strong> {group}
        </p>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        className="bg-blue-500 text-white px-6 py-3 rounded hover:bg-blue-600 w-full"
      >
        Submit
      </button>
    </div>
  );
};

export default StaffPage;