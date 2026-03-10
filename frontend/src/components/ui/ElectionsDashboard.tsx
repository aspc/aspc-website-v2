'use client';

import { useState, useEffect, useCallback } from 'react';
import Loading from '@/components/Loading';
import { IElectionFrontend, ICandidateFrontend, IRankingState } from '@/types';
import { Timer, AlertCircle } from 'lucide-react';
import BallotSection from '@/components/vote/BallotSection';
import BallotCountdown from '@/components/vote/BallotCountdown';
import { Button } from '@/components/ui/Button';

const SENATE_POSITIONS = {
    PRESIDENT: 'president',
    VP_FINANCE: 'VP_finance',
    VP_STUDENT_AFFAIRS: 'VP_student_affairs',
    VP_ACADEMIC_AFFAIRS: 'VP_academic_affairs',
    COMMISSIONER_ATHLETICS: 'commissioner_athletics',
    COMMISSIONER_CAMPUS_EVENTS: 'commissioner_campus_events',
    COMMISSIONER_EQUITY_INCLUSION: 'commissioner_equity_inclusion',
    COMMISSIONER_FACILITIES_ENVIRONMENT: 'commissioner_facilities_environment',
    COMMISSIONER_WELFARE: 'commissioner_welfare',
    SENIOR_CLASS_PRESIDENT: 'senior_class_president',
    JUNIOR_CLASS_PRESIDENT: 'junior_class_president',
    SOPHOMORE_CLASS_PRESIDENT: 'sophomore_class_president',
    FIRST_YEAR_CLASS_PRESIDENT: 'first_year_class_president',
    NORTH_CAMPUS_REPRESENTATIVE: 'north_campus_representative',
    SOUTH_CAMPUS_REPRESENTATIVE: 'south_campus_representative',
    TRUSTEE_REPRESENTATIVE_FINANCE: 'trustee_representative_finance',
    TRUSTEE_REPRESENTATIVE_STUDENT_AFFAIRS:
        'trustee_representative_student_affairs',
    TRUSTEE_REPRESENTATIVE_EDUCATIONAL_QUALITY:
        'trustee_representative_educational_quality',
    COMMENCEMENT_SPEAKER: 'commencement_speaker',
    CLASS_NAME: 'class_name',
} as const;

type SenatePosition = (typeof SENATE_POSITIONS)[keyof typeof SENATE_POSITIONS];

const formatPositionLabel = (value: string) =>
    value
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

const toTitleCase = (str: string) =>
    str
        .split(' ')
        .map(
            (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(' ');

interface PreviewBallotProps {
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    candidates: ICandidateFrontend[];
    onClose: () => void;
}

const PreviewBallot = ({
    name,
    description,
    startDate,
    endDate,
    candidates,
    onClose,
}: PreviewBallotProps) => {
    const [ballots, setBallots] = useState<
        Record<string, ICandidateFrontend[]>
    >({});
    const [activeBallots, setActiveBallots] = useState<Record<string, boolean>>(
        {}
    );
    const [rankings, setRankings] = useState<Record<string, IRankingState>>({});

    useEffect(() => {
        const nonWriteIn = candidates.filter((c) => !c.writeIn);
        const grouped = nonWriteIn.reduce(
            (acc: Record<string, ICandidateFrontend[]>, c) => {
                if (!acc[c.position]) acc[c.position] = [];
                acc[c.position].push(c);
                return acc;
            },
            {}
        );
        setBallots(grouped);
    }, [candidates]);

    const handleToggle = (pos: string) => {
        setActiveBallots((prev) => ({ ...prev, [pos]: !prev[pos] }));
    };

    const handleRankUpdate = useCallback(
        (pos: string, state: IRankingState) => {
            setRankings((prev) => ({ ...prev, [pos]: state }));
        },
        []
    );

    const activeKeys = Object.keys(activeBallots).filter(
        (k) => activeBallots[k]
    );
    const canSubmit =
        activeKeys.length > 0 &&
        activeKeys.every((k) => rankings[k]?.isComplete);

    return (
        <main className="min-h-screen bg-white text-slate-900 font-sans pb-24">
            {/* Preview banner */}
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between">
                <span className="text-sm text-amber-700 font-medium">
                    Ballot Preview — This is how students will see the ballot
                </span>
                <button
                    type="button"
                    onClick={onClose}
                    className="bg-slate-600 text-white px-4 py-1.5 rounded-md text-sm hover:bg-slate-700 transition-colors"
                >
                    Close Preview
                </button>
            </div>

            <div className="max-w-4xl mx-auto px-6 pt-16">
                <header className="mb-12 border-b-2 border-slate-900 pb-10 flex flex-col md:flex-row justify-between items-start gap-8">
                    <div className="flex-1">
                        <h1 className="text-3xl font-black text-[#001f3f] uppercase tracking-tighter mb-4 leading-none">
                            {name || 'Untitled Election'}
                        </h1>
                        <p className="text-sm text-slate-500 font-medium italic">
                            {description ||
                                'No description provided for this election.'}
                        </p>
                        {startDate && endDate && (
                            <p className="text-xs text-slate-400 mt-2">
                                Voting Period:{' '}
                                {new Date(startDate).toLocaleString()} &ndash;{' '}
                                {new Date(endDate).toLocaleString()}
                            </p>
                        )}
                    </div>
                    {endDate && (
                        <div className="bg-slate-50 p-4 border border-slate-200 rounded-md">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                <Timer className="w-3 h-3" /> Time Left
                            </p>
                            <BallotCountdown endDate={endDate} />
                        </div>
                    )}
                </header>

                {Object.keys(ballots).length > 0 ? (
                    Object.entries(ballots).map(([pos, cands]) => (
                        <BallotSection
                            key={pos}
                            position={pos}
                            candidates={cands}
                            isActive={!!activeBallots[pos]}
                            onToggle={handleToggle}
                            onRankChange={handleRankUpdate}
                        />
                    ))
                ) : (
                    <div className="text-center py-16 text-slate-400">
                        <p className="text-lg font-bold">
                            No candidates added yet
                        </p>
                        <p className="text-sm mt-1">
                            Add candidates in the editor to see them here.
                        </p>
                    </div>
                )}

                <div className="mt-16 bg-slate-50 p-8 border border-slate-200 rounded-md text-center">
                    {activeKeys.length > 0 && !canSubmit && (
                        <p className="text-amber-600 text-xs font-bold mb-4 flex items-center justify-center gap-2">
                            <AlertCircle className="w-4 h-4" /> Please finish
                            ranking all candidates in your active ballots.
                        </p>
                    )}
                    <Button
                        className="w-full sm:w-auto min-w-[320px] py-4 text-lg"
                        disabled={!canSubmit}
                    >
                        REVIEW & CAST VOTE
                    </Button>
                </div>
            </div>
        </main>
    );
};

const ElectionsDashboard = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    const [elections, setElections] = useState<IElectionFrontend[]>([]);
    const [selectedElectionId, setSelectedElectionId] = useState<string>('');

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [voterRequirement, setVoterRequirement] = useState('all');

    const [candidates, setCandidates] = useState<ICandidateFrontend[]>([]);
    const [candidateName, setCandidateName] = useState('');
    const [candidatePosition, setCandidatePosition] = useState('');
    const [customPosition, setCustomPosition] = useState('');
    const [customPositions, setCustomPositions] = useState<string[]>([]);
    const [editingCandidateId, setEditingCandidateId] = useState<string | null>(
        null
    );
    const [showCandidateForm, setShowCandidateForm] = useState(false);

    const toDatetimeLocal = (dateString: string) => {
        const date = new Date(dateString);
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - offset * 60 * 1000);
        return localDate.toISOString().slice(0, 16);
    };

    const fetchElections = async () => {
        try {
            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/admin/elections`,
                { credentials: 'include' }
            );
            if (response.ok) {
                const data = await response.json();
                setElections(data);
            }
        } catch (error) {
            console.error('Error fetching elections:', error);
        }
    };

    const fetchCandidates = async (electionId: string) => {
        try {
            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/admin/elections/${electionId}/candidates`,
                { credentials: 'include' }
            );
            if (response.ok) {
                const data = await response.json();
                setCandidates(data);
            }
        } catch (error) {
            console.error('Error fetching candidates:', error);
        }
    };

    useEffect(() => {
        fetchElections();
    }, []);

    useEffect(() => {
        if (!selectedElectionId) return;

        const fetchElectionData = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(
                    `${process.env.BACKEND_LINK}/api/admin/elections/${selectedElectionId}`,
                    { credentials: 'include' }
                );
                if (response.ok) {
                    const data = await response.json();
                    setName(data.name);
                    setDescription(data.description || '');
                    setStartDate(toDatetimeLocal(data.startDate));
                    setEndDate(toDatetimeLocal(data.endDate));
                }
                await fetchCandidates(selectedElectionId);
            } catch (error) {
                console.error('Error fetching election:', error);
            } finally {
                setIsLoading(false);
                setIsEditing(true);
            }
        };

        fetchElectionData();
    }, [selectedElectionId]);

    const resetForm = () => {
        setName('');
        setDescription('');
        setStartDate('');
        setEndDate('');
        setVoterRequirement('all');
        setCandidates([]);
        resetCandidateForm();
    };

    const resetCandidateForm = () => {
        setCandidateName('');
        setCandidatePosition('');
        setCustomPosition('');
        setEditingCandidateId(null);
        setShowCandidateForm(false);
    };

    const handleSaveElection = async () => {
        if (!name || !startDate || !endDate) {
            alert('Please fill in all required fields.');
            return;
        }

        if (new Date(startDate) >= new Date(endDate)) {
            alert('Start date must be before end date.');
            return;
        }

        try {
            setIsLoading(true);
            const url = selectedElectionId
                ? `${process.env.BACKEND_LINK}/api/admin/elections/${selectedElectionId}`
                : `${process.env.BACKEND_LINK}/api/admin/elections`;
            const method = selectedElectionId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description,
                    startDate: new Date(startDate).toISOString(),
                    endDate: new Date(endDate).toISOString(),
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to save election');
            }

            const savedElection = await response.json();

            if (isCreatingNew) {
                const localCandidates = candidates.filter((c) =>
                    c._id.startsWith('local-')
                );
                for (const candidate of localCandidates) {
                    await fetch(
                        `${process.env.BACKEND_LINK}/api/admin/elections/${savedElection._id}/candidates`,
                        {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                name: candidate.name,
                                position: candidate.position,
                            }),
                        }
                    );
                }

                setSelectedElectionId(savedElection._id);
                setIsCreatingNew(false);
                setIsEditing(true);
                await fetchCandidates(savedElection._id);
            }

            alert('Election saved successfully!');
            fetchElections();
        } catch (error) {
            console.error('Error saving election:', error);
            alert(
                error instanceof Error ? error.message : 'Error saving election'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteElection = async () => {
        if (
            !window.confirm(
                'Are you sure you want to delete this election? This will also delete all associated candidates and votes.'
            )
        )
            return;

        const now = new Date();
        const isActive =
            startDate &&
            endDate &&
            now >= new Date(startDate) &&
            now <= new Date(endDate);

        if (
            isActive &&
            !window.confirm(
                'This election is currently ACTIVE. Students may be voting right now. Deleting it will permanently remove all votes cast so far. Are you SURE?'
            )
        )
            return;

        try {
            setIsLoading(true);
            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/admin/elections/${selectedElectionId}`,
                { method: 'DELETE', credentials: 'include' }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to delete election');
            }

            alert('Election deleted successfully!');
            resetForm();
            setIsEditing(false);
            setIsCreatingNew(false);
            setSelectedElectionId('');
            fetchElections();
        } catch (error) {
            console.error('Error deleting election:', error);
            alert(
                error instanceof Error
                    ? error.message
                    : 'Error deleting election'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveCandidate = async () => {
        const resolvedPosition =
            candidatePosition === '__other__'
                ? toTitleCase(customPosition.trim())
                : candidatePosition;

        if (!candidateName || !resolvedPosition) {
            alert('Please fill in candidate name and position.');
            return;
        }

        // Remember custom positions for reuse in the dropdown
        if (candidatePosition === '__other__' && resolvedPosition) {
            setCustomPositions((prev) =>
                prev.includes(resolvedPosition)
                    ? prev
                    : [...prev, resolvedPosition]
            );
        }

        // No election saved yet so store candidate locally
        if (!selectedElectionId) {
            if (editingCandidateId) {
                setCandidates((prev) =>
                    prev.map((c) =>
                        c._id === editingCandidateId
                            ? {
                                  ...c,
                                  name: candidateName,
                                  position: resolvedPosition,
                              }
                            : c
                    )
                );
            } else {
                setCandidates((prev) => [
                    ...prev,
                    {
                        _id: `local-${Date.now()}`,
                        electionId: '',
                        name: candidateName,
                        position: resolvedPosition,
                    },
                ]);
            }
            resetCandidateForm();
            return;
        }

        try {
            setIsLoading(true);
            const url = editingCandidateId
                ? `${process.env.BACKEND_LINK}/api/admin/elections/${selectedElectionId}/candidates/${editingCandidateId}`
                : `${process.env.BACKEND_LINK}/api/admin/elections/${selectedElectionId}/candidates`;
            const method = editingCandidateId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: candidateName,
                    position: resolvedPosition,
                }),
            });

            if (!response.ok) throw new Error('Failed to save candidate');

            resetCandidateForm();
            await fetchCandidates(selectedElectionId);
        } catch (error) {
            console.error('Error saving candidate:', error);
            alert('Error saving candidate');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteCandidate = async (candidateId: string) => {
        if (!window.confirm('Are you sure you want to delete this candidate?'))
            return;

        if (candidateId.startsWith('local-')) {
            setCandidates((prev) => prev.filter((c) => c._id !== candidateId));
            return;
        }

        try {
            setIsLoading(true);
            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/admin/elections/${selectedElectionId}/candidates/${candidateId}`,
                { method: 'DELETE', credentials: 'include' }
            );

            if (!response.ok) throw new Error('Failed to delete candidate');

            await fetchCandidates(selectedElectionId);
        } catch (error) {
            console.error('Error deleting candidate:', error);
            alert('Error deleting candidate');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditCandidate = (candidate: ICandidateFrontend) => {
        setCandidateName(candidate.name);
        const presetPositions: SenatePosition[] =
            Object.values(SENATE_POSITIONS);

        const isPresetPosition = presetPositions.includes(
            candidate.position as SenatePosition
        );

        const isKnownCustom = customPositions.includes(candidate.position);
        if (isPresetPosition || isKnownCustom) {
            setCandidatePosition(candidate.position);
            setCustomPosition('');
        } else {
            setCandidatePosition('__other__');
            setCustomPosition(candidate.position);
        }
        setEditingCandidateId(candidate._id);
        setShowCandidateForm(true);
    };

    const getElectionStatus = () => {
        if (!startDate || !endDate) return 'Draft';
        const now = new Date();
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (now < start) return candidates.length > 0 ? 'Configured' : 'Draft';
        if (now >= start && now <= end) return 'Active';
        return 'Ended';
    };

    const formatDateRange = () => {
        if (!startDate || !endDate) return 'Not set';
        const start = new Date(startDate);
        const end = new Date(endDate);
        return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    };

    if (isLoading && !isEditing && !isCreatingNew) return <Loading />;

    if (!isEditing && !isCreatingNew) {
        return (
            <div className="bg-gray-100 p-6 lg:p-8">
                <header className="mb-6 border-b border-gray-300 pb-4">
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">
                        Election Management
                    </h1>
                    <p className="text-gray-600 text-base">
                        Create and manage student elections and ballots.
                    </p>
                </header>

                <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-5">
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">
                        Overview
                    </h2>
                    <p className="text-gray-700 text-sm mb-3">
                        From here, you can manage all student elections:
                    </p>
                    <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1 mb-3">
                        <li>
                            <strong>Create new elections</strong> with voting
                            periods and candidates.
                        </li>
                        <li>
                            <strong>Edit or update</strong> existing elections.
                        </li>
                        <li>
                            <strong>Manage candidates</strong> for each
                            position.
                        </li>
                    </ul>
                    <div className="w-fit p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-blue-700 text-sm leading-snug">
                            <strong>Tip: </strong>
                            Elections use ranked choice voting. Students will
                            order candidates from most to least preferred.
                        </p>
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <section className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow transition-shadow">
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">
                            Create New Election
                        </h2>
                        <p className="text-gray-600 text-sm mb-4">
                            Set up a new student election from scratch.
                        </p>
                        <button
                            onClick={() => {
                                setIsCreatingNew(true);
                                setIsEditing(false);
                                setSelectedElectionId('');
                                resetForm();
                                window.scrollTo({
                                    top: 0,
                                    behavior: 'smooth',
                                });
                            }}
                            className="bg-blue-600 text-white px-5 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors"
                        >
                            + New Election
                        </button>
                    </section>

                    <section className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow transition-shadow">
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">
                            Edit Existing Election
                        </h2>
                        <p className="text-gray-600 text-sm mb-4">
                            Select an election to edit its details and
                            candidates.
                        </p>
                        <select
                            className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                            value={selectedElectionId}
                            onChange={(e) => {
                                setSelectedElectionId(e.target.value);
                                window.scrollTo({
                                    top: 0,
                                    behavior: 'smooth',
                                });
                            }}
                        >
                            <option value="">Select an election to edit</option>
                            {elections.map((election) => (
                                <option key={election._id} value={election._id}>
                                    {election.name} (
                                    {new Date(
                                        election.startDate
                                    ).toLocaleDateString()}
                                    )
                                </option>
                            ))}
                        </select>
                    </section>
                </div>
            </div>
        );
    }

    if (showPreview) {
        return (
            <PreviewBallot
                name={name}
                description={description}
                startDate={startDate}
                endDate={endDate}
                candidates={candidates}
                onClose={() => setShowPreview(false)}
            />
        );
    }

    return (
        <div className="bg-gray-50 p-6 lg:p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    {isCreatingNew ? 'Create New Election' : 'Edit Election'}
                </h1>
                <div className="flex space-x-3">
                    {!isCreatingNew && (
                        <button
                            type="button"
                            onClick={handleDeleteElection}
                            className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 text-sm"
                        >
                            Delete Election
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            setIsEditing(false);
                            setIsCreatingNew(false);
                            setSelectedElectionId('');
                            resetForm();
                        }}
                        className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 text-sm"
                    >
                        Back
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content — Left 2/3 */}
                <div className="contents">
                    {/* Election Information */}
                    <div className="lg:col-span-2 lg:row-start-1 h-full">
                        <div className="bg-white rounded-lg shadow p-6 h-full">
                            <h2 className="text-lg font-semibold text-gray-900 mb-1">
                                Election Information
                            </h2>
                            <p className="text-sm text-gray-500 mb-4">
                                Set up the basic details for your election
                            </p>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Election Title
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Student Government Elections 2026"
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y min-h-[80px]"
                                    value={description}
                                    onChange={(e) =>
                                        setDescription(e.target.value)
                                    }
                                    placeholder="Vote for your student government representatives. This election uses ranked choice voting - order candidates from most to least preferred."
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Voting Starts
                                    </label>
                                    <input
                                        type="datetime-local"
                                        className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        value={startDate}
                                        onChange={(e) =>
                                            setStartDate(e.target.value)
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Voting Ends
                                    </label>
                                    <input
                                        type="datetime-local"
                                        className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        value={endDate}
                                        onChange={(e) =>
                                            setEndDate(e.target.value)
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Candidates */}
                    <div className="lg:col-span-3 lg:row-start-2">
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center justify-between mb-1">
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Candidates
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => {
                                        resetCandidateForm();
                                        setShowCandidateForm(true);
                                    }}
                                    className="bg-[#001f3f] text-white px-4 py-2 rounded-md text-sm hover:bg-[#003366] transition-colors flex items-center gap-1"
                                >
                                    + Add Candidate
                                </button>
                            </div>
                            <p className="text-sm text-gray-500 mb-4">
                                Add and manage candidates for this election
                            </p>

                            {/* Add/Edit Candidate Form */}
                            <div
                                className={`overflow-hidden transition-all duration-200 ease-in-out ${
                                    showCandidateForm
                                        ? 'max-h-96 opacity-100 mb-4'
                                        : 'max-h-0 opacity-0 mb-0'
                                }`}
                            >
                                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                    <h3 className="text-sm font-semibold text-gray-800 mb-3">
                                        {editingCandidateId
                                            ? 'Edit Candidate'
                                            : 'New Candidate'}
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                        <input
                                            type="text"
                                            className="p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            value={candidateName}
                                            onChange={(e) =>
                                                setCandidateName(e.target.value)
                                            }
                                            placeholder="Candidate name"
                                        />
                                        <div className="space-y-2">
                                            <select
                                                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                value={candidatePosition}
                                                onChange={(e) => {
                                                    setCandidatePosition(
                                                        e.target.value
                                                    );
                                                    if (
                                                        e.target.value !==
                                                        '__other__'
                                                    ) {
                                                        setCustomPosition('');
                                                    }
                                                }}
                                            >
                                                <option value="">
                                                    Select a position
                                                </option>
                                                {Object.values(
                                                    SENATE_POSITIONS
                                                ).map((pos) => (
                                                    <option
                                                        key={pos}
                                                        value={pos}
                                                    >
                                                        {formatPositionLabel(
                                                            pos
                                                        )}
                                                    </option>
                                                ))}
                                                {customPositions.length > 0 && (
                                                    <optgroup label="Custom Positions">
                                                        {customPositions.map(
                                                            (pos) => (
                                                                <option
                                                                    key={pos}
                                                                    value={pos}
                                                                >
                                                                    {pos}
                                                                </option>
                                                            )
                                                        )}
                                                    </optgroup>
                                                )}
                                                <option value="__other__">
                                                    Other (custom)
                                                </option>
                                            </select>
                                            {candidatePosition ===
                                                '__other__' && (
                                                <input
                                                    type="text"
                                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                    value={customPosition}
                                                    onChange={(e) =>
                                                        setCustomPosition(
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Enter custom position name"
                                                />
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={handleSaveCandidate}
                                            className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm hover:bg-blue-700"
                                        >
                                            {editingCandidateId
                                                ? 'Update'
                                                : 'Add'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={resetCandidateForm}
                                            className="bg-gray-200 text-gray-700 px-4 py-1.5 rounded-md text-sm hover:bg-gray-300"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Candidates List — grouped by position */}
                            {candidates.length > 0 ? (
                                <div className="space-y-5">
                                    {Object.entries(
                                        candidates.reduce(
                                            (
                                                acc: Record<
                                                    string,
                                                    ICandidateFrontend[]
                                                >,
                                                c
                                            ) => {
                                                if (!acc[c.position])
                                                    acc[c.position] = [];
                                                acc[c.position].push(c);
                                                return acc;
                                            },
                                            {}
                                        )
                                    ).map(([position, positionCandidates]) => (
                                        <div key={position}>
                                            <h3 className="text-sm font-semibold text-gray-700 mb-2 border-b border-gray-100 pb-1">
                                                {formatPositionLabel(position)}
                                            </h3>
                                            <div className="space-y-2">
                                                {positionCandidates.map(
                                                    (candidate) => (
                                                        <div
                                                            key={candidate._id}
                                                            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg transition-all duration-150"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-sm">
                                                                    {candidate.name
                                                                        .charAt(
                                                                            0
                                                                        )
                                                                        .toUpperCase()}
                                                                </div>
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {
                                                                        candidate.name
                                                                    }
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleEditCandidate(
                                                                            candidate
                                                                        )
                                                                    }
                                                                    className="p-1.5 text-gray-400 hover:text-blue-600 transition"
                                                                    title="Edit candidate"
                                                                >
                                                                    <svg
                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                        width="16"
                                                                        height="16"
                                                                        viewBox="0 0 24 24"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        strokeWidth="2"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                    >
                                                                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                                                        <path d="m15 5 4 4" />
                                                                    </svg>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleDeleteCandidate(
                                                                            candidate._id
                                                                        )
                                                                    }
                                                                    className="p-1.5 text-gray-400 hover:text-red-600 transition"
                                                                    title="Delete candidate"
                                                                >
                                                                    <svg
                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                        width="16"
                                                                        height="16"
                                                                        viewBox="0 0 24 24"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        strokeWidth="2"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                    >
                                                                        <path d="M3 6h18" />
                                                                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400 text-sm text-center py-4">
                                    No candidates added yet.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar — Right 1/3 */}
                <div className="lg:col-start-3 lg:row-start-1 space-y-6">
                    {/* Election Summary */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            Election Summary
                        </h2>

                        <div className="space-y-3 mb-6">
                            <div>
                                <div className="text-xs text-blue-600 font-medium">
                                    Status
                                </div>
                                <div className="text-sm font-semibold text-gray-900">
                                    {getElectionStatus()}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-blue-600 font-medium">
                                    Total Candidates
                                </div>
                                <div className="text-sm font-semibold text-gray-900">
                                    {candidates.length}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-blue-600 font-medium">
                                    Voting Period
                                </div>
                                <div className="text-sm font-semibold text-gray-900">
                                    {formatDateRange()}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={() => setShowPreview(true)}
                                className="w-full border border-gray-300 text-gray-700 px-4 py-2.5 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                                Preview Ballot
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveElection}
                                disabled={isLoading}
                                className="w-full bg-[#001f3f] text-white px-4 py-2.5 rounded-md text-sm font-medium hover:bg-[#003366] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                    <polyline points="17 21 17 13 7 13 7 21" />
                                    <polyline points="7 3 7 8 15 8" />
                                </svg>
                                {isLoading ? 'Saving...' : 'Save Election'}
                            </button>
                        </div>
                    </div>

                    {/* Quick Tips */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-3">
                            Quick Tips
                        </h2>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li className="flex items-start gap-2">
                                <span className="text-gray-400 mt-0.5">
                                    &bull;
                                </span>
                                Set voting times to maximize student
                                participation
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-gray-400 mt-0.5">
                                    &bull;
                                </span>
                                Test the ballot before publishing to students
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ElectionsDashboard;
