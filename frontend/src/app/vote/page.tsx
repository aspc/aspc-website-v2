'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Check, Timer, AlertCircle } from 'lucide-react';
import BallotSection from '@/components/vote/BallotSection';
import BallotCountdown from '@/components/vote/BallotCountdown';
import { Button } from '@/components/ui/Button';
import { ICandidateFrontend, IRankingState } from '@/types';

/**
 * --- MOCK DATA ---
 */
const MOCK_ELECTION = {
    _id: '65a123abc',
    name: '2026 Student Union General Election',
    description:
        'Annual leadership election. You must rank all candidates within an activated category to complete that ballot.',
    startDate: '2026-02-01T09:00:00.000Z',
    endDate: '2026-02-15T17:00:00.000Z',
};

const MOCK_CANDIDATES = [
    {
        _id: 'c1',
        name: 'Marcus Thorne',
        position: 'President',
        description: 'Focused on campus sustainability and transparency.',
        electionId: '65a123abc',
    },
    {
        _id: 'c2',
        name: 'Elena Rodriguez',
        position: 'President',
        description: 'Advocating for expanded mental health resources.',
        electionId: '65a123abc',
    },
    {
        _id: 'c3',
        name: 'Jordan Smith',
        position: 'President',
        description: 'Aims to improve internship placement programs.',
        electionId: '65a123abc',
    },
    {
        _id: 'c4',
        name: 'Sarah Jenkins',
        position: 'Vice President',
        description: 'Expert in student event coordination.',
        electionId: '65a123abc',
    },
    {
        _id: 'c5',
        name: 'Kevin Zhao',
        position: 'Vice President',
        description: 'Dedicated to enhancing campus digital infrastructure.',
        electionId: '65a123abc',
    },
];

export default function VotePage() {
    const [ballots, setBallots] = useState<
        Record<string, ICandidateFrontend[]>
    >({});
    const [activeBallots, setActiveBallots] = useState<Record<string, boolean>>(
        {}
    );
    const [rankings, setRankings] = useState<Record<string, IRankingState>>({});
    const [showConfirm, setShowConfirm] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    useEffect(() => {
        const grouped = MOCK_CANDIDATES.reduce(
            (acc: Record<string, ICandidateFrontend[]>, c) => {
                if (!acc[c.position]) acc[c.position] = [];
                acc[c.position].push(c);
                return acc;
            },
            {}
        );
        setBallots(grouped);
    }, []);

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

    if (isSubmitted) {
        return (
            <div className="max-w-xl mx-auto py-32 px-6 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-100 mb-6 animate-bounce">
                    <Check className="w-10 h-10 text-emerald-600" />
                </div>
                <h1 className="text-3xl font-black text-[#001f3f] uppercase tracking-tighter">
                    Vote Confirmed
                </h1>
                <p className="text-slate-500 mt-2 font-medium">
                    Your ranked ballot has been securely processed.
                </p>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-white text-slate-900 font-sans pb-24">
            <div className="max-w-4xl mx-auto px-6 pt-16">
                <header className="mb-12 border-b-2 border-slate-900 pb-10 flex flex-col md:flex-row justify-between items-start gap-8">
                    <div className="flex-1">
                        <h1 className="text-3xl font-black text-[#001f3f] uppercase tracking-tighter mb-4 leading-none">
                            {MOCK_ELECTION.name}
                        </h1>
                        <p className="text-sm text-slate-500 font-medium italic">
                            {MOCK_ELECTION.description}
                        </p>
                    </div>
                    <div className="bg-slate-50 p-4 border border-slate-200 rounded-md">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <Timer className="w-3 h-3" /> Time Left
                        </p>
                        <BallotCountdown endDate={MOCK_ELECTION.endDate} />
                    </div>
                </header>

                {Object.entries(ballots).map(([pos, cands]) => (
                    <BallotSection
                        key={pos}
                        position={pos}
                        candidates={cands}
                        isActive={!!activeBallots[pos]}
                        onToggle={handleToggle}
                        onRankChange={handleRankUpdate}
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
                                        const c = MOCK_CANDIDATES.find(
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
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                            <div className="flex flex-col gap-3 pt-4 border-t">
                                <Button
                                    variant="success"
                                    onClick={() => setIsSubmitted(true)}
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
