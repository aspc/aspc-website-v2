'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Loading from '@/components/Loading';

const SenatorPage = () => {
  const { user, loading } = useAuth();
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePictureURL, setProfilePictureURL] = useState<string>('');
  const [aboutMe, setAboutMe] = useState<string>('Tell the community about yourself...');
  const [campaignInfo, setCampaignInfo] = useState<string>('Details about your campaign...');
  const [workingOn, setWorkingOn] = useState<string>('Share ongoing projects...');
  const [hopeToAccomplish, setHopeToAccomplish] = useState<string>('Outline your goals...');
  const [announcements, setAnnouncements] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [announcementsRes, meetingsRes] = await Promise.all([
          fetch('/api/senator/announcements', { credentials: 'include' }),
          fetch('/api/senator/meetings', { credentials: 'include' }),
        ]);

        if (announcementsRes.ok) setAnnouncements(await announcementsRes.json());
        if (meetingsRes.ok) setMeetings(await meetingsRes.json());
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handlePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProfilePicture(file);
      const objectURL = URL.createObjectURL(file);
      setProfilePictureURL(objectURL);

      try {
        const formData = new FormData();
        formData.append('profilePicture', file);

        const response = await fetch('/api/senator/profile-picture', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (!response.ok) throw new Error('Failed to upload profile picture.');
        alert('Profile picture uploaded successfully!');
      } catch (error) {
        console.error('Error uploading picture:', error);
        alert('Failed to upload profile picture.');
      }
    }
  };

  const handleSave = async (field: string, value: string) => {
    try {
      const response = await fetch(`/api/senator/${field}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ value }),
      });

      if (!response.ok) throw new Error(`Failed to save ${field}.`);
      alert(`${field.replace(/-/g, ' ')} updated successfully!`);
    } catch (error) {
      console.error(`Error saving ${field}:`, error);
      alert(`Failed to update ${field.replace(/-/g, ' ')}.`);
    }
  };

  if (loading || isLoading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-6">Senator Page</h1>

      {/* Profile Picture */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Profile Picture</h2>
        {profilePictureURL && <img src={profilePictureURL} alt="Profile" className="mb-4 w-32 h-32 rounded-full" />}
        <input type="file" onChange={handlePictureUpload} />
      </div>

      {/* About Me */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">About Me</h2>
        <textarea
          className="w-full p-4 border rounded mb-4"
          value={aboutMe}
          onChange={(e) => setAboutMe(e.target.value)}
        />
        <button
          onClick={() => handleSave('about-me', aboutMe)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Save
        </button>
      </div>

      {/* Campaign Information */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Campaign Information</h2>
        <textarea
          className="w-full p-4 border rounded mb-4"
          value={campaignInfo}
          onChange={(e) => setCampaignInfo(e.target.value)}
        />
        <button
          onClick={() => handleSave('campaign-info', campaignInfo)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Save
        </button>
      </div>

      {/* What We Are Working On */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">What We Are Working On</h2>
        <textarea
          className="w-full p-4 border rounded mb-4"
          value={workingOn}
          onChange={(e) => setWorkingOn(e.target.value)}
        />
        <button
          onClick={() => handleSave('working-on', workingOn)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Save
        </button>
      </div>

      {/* What We Hope to Accomplish */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">What We Hope to Accomplish</h2>
        <textarea
          className="w-full p-4 border rounded mb-4"
          value={hopeToAccomplish}
          onChange={(e) => setHopeToAccomplish(e.target.value)}
        />
        <button
          onClick={() => handleSave('hope-to-accomplish', hopeToAccomplish)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Save
        </button>
      </div>

      {/* Announcements */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Announcements</h2>
        {/* Add functionality for editing announcements */}
      </div>

      {/* Upcoming Meetings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Upcoming Meetings</h2>
        {/* Add functionality for editing meetings */}
      </div>
    </div>
  );
};

export default SenatorPage;