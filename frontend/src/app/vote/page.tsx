'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Check, Timer, AlertCircle, AlertTriangle } from 'lucide-react';
import BallotSection from '@/components/vote/BallotSection';
import BallotCountdown from '@/components/vote/BallotCountdown';
import { Button } from '@/components/ui/Button';
import Loading from '@/components/Loading';
import LoginRequired from '@/components/LoginRequired';
import { useAuth } from '@/hooks/useAuth';
import { ICandidateFrontend, IRankingState, IElectionFrontend } from '@/types';

export default function VotePage() {
    const { user, loading: authLoading } = useAuth();

    const [election, setElection] = useState<IElectionFrontend | null>(null);
    const [ballots, setBallots] = useState<
        Record<string, ICandidateFrontend[]>
    >({});
    const [activeBallots, setActiveBallots] = useState<Record<string, boolean>>(
        {}
    );
    const [rankings, setRankings] = useState<Record<string, IRankingState>>({});
    const [showConfirm, setShowConfirm] = useState(false);

    // States for election status
    const [hasVoted, setHasVoted] = useState(false);
    const [isElectionOver, setIsElectionOver] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (authLoading || !user) return;

        const fetchData = async () => {
            try {
                const backendLink = process.env.BACKEND_LINK;

                // 1. Get Most Recent Election
                const electionRes = await fetch(
                    `${backendLink}/api/voting/election`,
                    {
                        credentials: 'include',
                    }
                );

                if (!electionRes.ok)
                    throw new Error('Failed to fetch election');
                const electionData: IElectionFrontend =
                    await electionRes.json();
                setElection(electionData);

                // Check if election is over
                const endDate = new Date(electionData.endDate).getTime();
                const now = Date.now();
                if (now > endDate) {
                    setIsElectionOver(true);
                    setIsLoadingData(false);
                    return; // Stop here if election is over
                }

                // 2. Check Vote Status
                const statusRes = await fetch(
                    `${backendLink}/api/voting/votestatus/${electionData._id}`,
                    {
                        credentials: 'include',
                    }
                );

                if (!statusRes.ok)
                    throw new Error('Failed to fetch vote status');
                const statusData = await statusRes.json();

                if (statusData.hasVoted) {
                    setHasVoted(true);
                    setIsLoadingData(false);
                    return; // Stop here if user already voted
                }

                // 3. Get Ballot/Candidates (Only if not voted)
                const ballotRes = await fetch(
                    `${backendLink}/api/voting/ballot/${electionData._id}`,
                    {
                        credentials: 'include',
                    }
                );

                if (!ballotRes.ok) throw new Error('Failed to fetch ballot');
                const ballotData = await ballotRes.json();
                console.log('Ballot Data:', ballotData);

                // Group candidates by position
                const grouped = ballotData.data.reduce(
                    (
                        acc: Record<string, ICandidateFrontend[]>,
                        c: ICandidateFrontend
                    ) => {
                        if (!acc[c.position]) acc[c.position] = [];
                        acc[c.position].push(c);
                        return acc;
                    },
                    {}
                );
                setBallots(grouped);
            } catch (err) {
                console.error(err);
                setError('No active election found or failed to load data.');
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchData();
    }, [user, authLoading]);

    const allCandidatesRef = useRef<Map<string, ICandidateFrontend>>(new Map());

    useEffect(() => {
        Object.values(ballots)
            .flat()
            .forEach((c) => allCandidatesRef.current.set(c._id, c));
    }, [ballots]);

    const handleToggle = (pos: string) => {
        setActiveBallots((prev) => ({ ...prev, [pos]: !prev[pos] }));
    };

    const handleRankUpdate = useCallback(
        (pos: string, state: IRankingState) => {
            setRankings((prev) => ({ ...prev, [pos]: state }));
        },
        []
    );

    const handleCreateWriteIn = useCallback(
        async (
            firstName: string,
            lastName: string,
            position: string
        ): Promise<ICandidateFrontend | string> => {
            if (!election) return 'No active election.';
            try {
                const res = await fetch(
                    `${process.env.BACKEND_LINK}/api/voting/${election._id}/write-in`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ firstName, lastName, position }),
                    }
                );
                const json = await res.json();
                if (!res.ok) {
                    return json.message || 'Failed to add write-in candidate.';
                }
                const candidate: ICandidateFrontend = {
                    ...json.data,
                    writeIn: true,
                };
                allCandidatesRef.current.set(candidate._id, candidate);
                return candidate;
            } catch {
                return 'Something went wrong. Please try again.';
            }
        },
        [election]
    );

    const handleSubmitVote = async () => {
        if (!election) return;

        try {
            // Prepare payload: map rankings to arrays of IDs
            const payload = {
                votes: Object.entries(rankings)
                    .filter(([pos]) => activeBallots[pos])
                    .map(([pos, state]) => ({
                        position: pos,
                        ranking: state.candidateIds,
                    })),
            };
            console.log('Submitting payload:', payload);

            const res = await fetch(
                `${process.env.BACKEND_LINK}/api/voting/${election._id}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload),
                }
            );

            if (res.ok) {
                setHasVoted(true);
                setShowConfirm(false);
            } else {
                const data = await res.json();
                alert(
                    data.message || 'Failed to submit vote. Please try again.'
                );
            }
        } catch (e) {
            console.error(e);
            alert('An error occurred.');
        }
    };

    if (authLoading || isLoadingData) return <Loading />;
    if (!user) return <LoginRequired />;

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-slate-500">
                <AlertTriangle className="w-12 h-12 mb-4 text-amber-500" />
                <p>{error}</p>
            </div>
        );
    }

    if (isElectionOver) {
        return (
            <div className="max-w-xl mx-auto py-32 px-6 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 border-2 border-slate-200 mb-6">
                    <Timer className="w-10 h-10 text-slate-500" />
                </div>
                <h1 className="text-3xl font-black text-[#001f3f] uppercase tracking-tighter">
                    Election Ended
                </h1>
                <p className="text-slate-500 mt-2 font-medium">
                    The voting period for <strong>{election?.name}</strong> has
                    concluded.
                </p>
            </div>
        );
    }

    if (hasVoted) {
        return (
            <div className="max-w-xl mx-auto py-32 px-6 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-100 mb-6 animate-bounce">
                    <Check className="w-10 h-10 text-emerald-600" />
                </div>
                <h1 className="text-3xl font-black text-slate-100 uppercase tracking-tighter">
                    Vote Confirmed
                </h1>
                <p className="text-slate-300 mt-2 font-medium">
                    Your ranked ballot has been securely processed.
                </p>
            </div>
        );
    }

    const activeKeys = Object.keys(activeBallots).filter(
        (k) => activeBallots[k]
    );
    const canSubmit =
        activeKeys.length > 0 &&
        activeKeys.every((k) => rankings[k]?.isComplete);

    return (
        <main className="min-h-screen bg-white text-slate-900 font-sans pb-24">
            <div className="max-w-4xl mx-auto px-6 pt-16">
                <header className="mb-12 border-b-2 border-slate-900 pb-10 flex flex-col md:flex-row justify-between items-start gap-8">
                    <div className="flex-1">
                        <h1 className="text-3xl font-black text-[#001f3f] uppercase tracking-tighter mb-4 leading-none">
                            {election?.name}
                        </h1>
                        <p className="text-sm text-slate-500 font-medium italic">
                            {election?.description}
                        </p>
                    </div>
                    {election && (
                        <div className="bg-slate-50 p-4 border border-slate-200 rounded-md">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                <Timer className="w-3 h-3" /> Time Left
                            </p>
                            <BallotCountdown endDate={election.endDate} />
                        </div>
                    )}
                </header>

                {Object.entries(ballots).map(([pos, cands]) => (
                    <BallotSection
                        key={pos}
                        position={pos}
                        candidates={cands}
                        isActive={!!activeBallots[pos]}
                        onToggle={handleToggle}
                        onRankChange={handleRankUpdate}
                        onCreateWriteIn={handleCreateWriteIn}
                    />
                ))}

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
                        onClick={() => setShowConfirm(true)}
                    >
                        REVIEW & CAST VOTE
                    </Button>
                </div>
            </div>

            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => setShowConfirm(false)}
                    />
                    <div className="relative bg-white rounded-md shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
                        <div className="p-5 border-b bg-slate-50 flex justify-between items-center font-black text-[#001f3f] uppercase">
                            Final Review
                        </div>
                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            {activeKeys.map((pos) => (
                                <div
                                    key={pos}
                                    className="border border-slate-200 rounded-md overflow-hidden"
                                >
                                    <div className="bg-[#001f3f] px-4 py-2 text-white text-[10px] font-black uppercase">
                                        {pos}
                                    </div>
                                    {rankings[pos].candidateIds.map((id, i) => {
                                        const c =
                                            allCandidatesRef.current.get(id) ??
                                            ballots[pos]?.find(
                                                (cand) => cand._id === id
                                            );
                                        return (
                                            <div
                                                key={id}
                                                className="p-3 bg-white border-b flex gap-4 items-center last:border-0 font-bold text-slate-700"
                                            >
                                                <span className="text-slate-300">
                                                    #{i + 1}
                                                </span>{' '}
                                                {c?.name}
                                                {c?.writeIn && (
                                                    <span className="text-[10px] font-black text-amber-500 uppercase">
                                                        Write-in
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                            <div className="flex flex-col gap-3 pt-4 border-t">
                                <Button
                                    variant="success"
                                    onClick={handleSubmitVote}
                                >
                                    CONFIRM SUBMISSION
                                </Button>
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="text-sm font-bold text-slate-400 hover:text-slate-600 uppercase"
                                >
                                    Go Back
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
