'use client';

import React, { useState, useEffect } from 'react';
import {
    Check,
    AlertCircle,
    GripVertical,
    X,
    Calendar,
    Clock,
    Timer,
} from 'lucide-react';

/**
 * --- MOCK DATA (Matching Backend Schema) ---
 */
const MOCK_ELECTION = {
    _id: '65a123abc',
    name: 'Spring 2026 ASPC Elections',
    description:
        'Spring campus leadership positions. Please rank candidates in order of preference for each category.',
    startDate: '2026-02-01T09:00:00.000Z',
    endDate: '2026-02-15T17:00:00.000Z',
    isActive: true,
};

const MOCK_CANDIDATES = [
    {
        _id: 'c1',
        electionId: '65a123abc',
        name: 'Sydney Tai',
        position: 'President',
        description:
            'Focused on campus sustainability and transparency in student government funding.',
    },
    {
        _id: 'c2',
        electionId: '65a123abc',
        name: 'Grace Zheng',
        position: 'President',
        description:
            'Advocating for expanded mental health resources and 24/7 library access.',
    },
    {
        _id: 'c3',
        electionId: '65a123abc',
        name: 'Anbo Li',
        position: 'President',
        description:
            'Aims to improve internship placement programs and alumni networking.',
    },
    {
        _id: 'c4',
        electionId: '65a123abc',
        name: 'Dadda',
        position: 'Vice President',
        description:
            'Expert in student event coordination and club engagement.',
    },
    {
        _id: 'c5',
        electionId: '65a123abc',
        name: 'Mamma',
        position: 'Vice President',
        description:
            'Dedicated to enhancing the campus digital infrastructure and Wi-Fi coverage.',
    },
];

/**
 * --- LIVE COUNTDOWN COMPONENT ---
 */
function BallotCountdown({ endDate }: { endDate: string }) {
    const [timeLeft, setTimeLeft] = useState<{
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
    } | null>(null);

    useEffect(() => {
        const timer = setInterval(() => {
            const target = new Date(endDate).getTime();
            const now = new Date().getTime();
            const distance = target - now;

            if (distance < 0) {
                clearInterval(timer);
                setTimeLeft(null);
            } else {
                setTimeLeft({
                    days: Math.floor(distance / (1000 * 60 * 60 * 24)),
                    hours: Math.floor(
                        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
                    ),
                    minutes: Math.floor(
                        (distance % (1000 * 60 * 60)) / (1000 * 60)
                    ),
                    seconds: Math.floor((distance % (1000 * 60)) / 1000),
                });
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [endDate]);

    if (!timeLeft)
        return <div className="text-red-600 font-bold">VOTING CLOSED</div>;

    return (
        <div className="flex gap-2">
            {[
                { label: 'D', value: timeLeft.days },
                { label: 'H', value: timeLeft.hours },
                { label: 'M', value: timeLeft.minutes },
                { label: 'S', value: timeLeft.seconds },
            ].map((unit) => (
                <div key={unit.label} className="flex flex-col items-center">
                    <div className="bg-[#001f3f] text-white w-9 h-9 flex items-center justify-center font-bold rounded-md text-xs">
                        {String(unit.value).padStart(2, '0')}
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 mt-1">
                        {unit.label}
                    </span>
                </div>
            ))}
        </div>
    );
}

/**
 * --- UI COMPONENTS ---
 */
const Button = ({
    children,
    variant = 'primary',
    className = '',
    disabled,
    onClick,
}: any) => {
    const baseStyles =
        'inline-flex items-center justify-center rounded-md px-6 py-3 font-bold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed';
    const variants = {
        primary: 'bg-[#001f3f] text-white hover:bg-[#001429]',
        outline: 'border-2 border-[#001f3f] text-[#001f3f] hover:bg-slate-50',
        success: 'bg-emerald-700 text-white hover:bg-emerald-800',
    };
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${baseStyles} ${variants[variant as keyof typeof variants]} ${className}`}
        >
            {children}
        </button>
    );
};

const Modal = ({ isOpen, onClose, title, children }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative bg-white rounded-md shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200">
                <div className="flex items-center justify-between p-5 border-b bg-slate-50">
                    <h3 className="text-lg font-black text-[#001f3f] uppercase tracking-tight">
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-200 rounded transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

/**
 * --- BALLOT SECTION ---
 */
function BallotSection({ position, candidates, onRankChange }: any) {
    const [list, setList] = useState(candidates);
    const [draggedId, setDraggedId] = useState<string | null>(null);

    const handleDragStart = (id: string) => setDraggedId(id);

    const handleDragOver = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedId || draggedId === targetId) return;
        const newList = [...list];
        const draggedIdx = newList.findIndex((c) => c._id === draggedId);
        const targetIdx = newList.findIndex((c) => c._id === targetId);
        const [draggedItem] = newList.splice(draggedIdx, 1);
        newList.splice(targetIdx, 0, draggedItem);
        setList(newList);
        onRankChange(
            position,
            newList.map((c: any) => c._id)
        );
    };

    return (
        <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
                <div className="h-7 w-1.5 bg-[#001f3f] rounded-full" />
                <h2 className="text-2xl font-black text-[#001f3f] uppercase tracking-tighter">
                    {position}
                </h2>
            </div>
            <div className="space-y-3">
                {list.map((candidate: any, index: number) => (
                    <div
                        key={candidate._id}
                        draggable
                        onDragStart={() => handleDragStart(candidate._id)}
                        onDragOver={(e) => handleDragOver(e, candidate._id)}
                        onDragEnd={() => setDraggedId(null)}
                        className={`flex items-start gap-4 p-5 border rounded-md bg-white transition-all cursor-move shadow-sm ${
                            draggedId === candidate._id
                                ? 'opacity-20 border-dashed border-[#001f3f]'
                                : 'border-slate-200 hover:border-slate-400'
                        }`}
                    >
                        <GripVertical className="w-5 h-5 text-slate-300 mt-1 shrink-0" />
                        <div className="w-10 h-10 bg-[#001f3f] text-white flex items-center justify-center font-bold text-lg shrink-0 rounded-md">
                            {candidate.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                                <h4 className="font-bold text-slate-900 text-lg">
                                    {candidate.name}
                                </h4>
                                <div className="text-[10px] font-black bg-slate-100 text-[#001f3f] px-2 py-1 rounded-md uppercase tracking-widest border border-slate-200">
                                    RANK {index + 1}
                                </div>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                {candidate.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * --- MAIN PAGE ---
 */
export default function VotePage() {
    const [ballots, setBallots] = useState<Record<string, any[]>>({});
    const [rankings, setRankings] = useState<Record<string, string[]>>({});
    const [showConfirm, setShowConfirm] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    useEffect(() => {
        const grouped = MOCK_CANDIDATES.reduce((acc: any, candidate) => {
            if (!acc[candidate.position]) acc[candidate.position] = [];
            acc[candidate.position].push(candidate);
            return acc;
        }, {});

        Object.keys(grouped).forEach((pos) => {
            grouped[pos].sort((a: any, b: any) => a.name.localeCompare(b.name));
        });

        setBallots(grouped);

        const initialRanks: any = {};
        Object.keys(grouped).forEach((pos) => {
            initialRanks[pos] = grouped[pos].map((c: any) => c._id);
        });
        setRankings(initialRanks);
    }, []);

    const handleRankChange = (position: string, newIds: string[]) => {
        setRankings((prev) => ({ ...prev, [position]: newIds }));
    };

    if (isSubmitted) {
        return (
            <div className="max-w-xl mx-auto py-32 px-6 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 mb-6 border-2 border-emerald-100">
                    <Check className="w-10 h-10 text-emerald-600" />
                </div>
                <h1 className="text-3xl font-black text-[#001f3f] mb-4 uppercase tracking-tighter">
                    Vote Confirmed
                </h1>
                <p className="text-slate-500 font-medium">
                    Your selection has been recorded.
                </p>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-white text-slate-900 font-sans pb-24">
            <div className="max-w-3xl mx-auto px-6 pt-2">
                {/* Election Header */}
                <header className="mb-2 border-b-2 border-slate-900 pb-2">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
                        <div className="flex-1">
                            <h1 className="text-3xl font-black text-[#001f3f] uppercase tracking-tighter leading-none mb-4">
                                {MOCK_ELECTION.name}
                            </h1>
                            <p className="text-md text-slate-600 font-medium leading-relaxed max-w-xl">
                                {MOCK_ELECTION.description}
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 border border-slate-200 rounded-md">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                    <Timer className="w-3 h-3" /> Time Remaining
                                </p>
                                <BallotCountdown
                                    endDate={MOCK_ELECTION.endDate}
                                />
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-md w-full">
                                <Calendar className="w-5 h-5 text-[#001f3f]" />
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                                        Voting Period
                                    </p>
                                    <p className="font-bold text-sm">
                                        {new Date(
                                            MOCK_ELECTION.startDate
                                        ).toLocaleDateString()}{' '}
                                        —{' '}
                                        {new Date(
                                            MOCK_ELECTION.endDate
                                        ).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Dynamic Ballot Sections */}
                {Object.entries(ballots).map(([position, candidates]) => (
                    <BallotSection
                        key={position}
                        position={position}
                        candidates={candidates}
                        onRankChange={handleRankChange}
                    />
                ))}

                {/* Submit Section */}
                <div className="mt-16 bg-slate-50 p-8 border border-slate-200 rounded-md text-center">
                    <h3 className="text-xl font-black text-[#001f3f] uppercase mb-2">
                        Finalize Your Ballot
                    </h3>
                    <p className="text-sm text-slate-500 mb-8 font-medium italic">
                        Ensure you have ranked candidates according to your
                        preference for all categories.
                    </p>
                    <Button
                        className="w-full sm:w-auto min-w-[300px] text-lg py-5"
                        onClick={() => setShowConfirm(true)}
                    >
                        REVIEW & SUBMIT VOTE
                    </Button>
                </div>
            </div>

            <Modal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                title="Verify Your Full Ballot"
            >
                <div className="space-y-8">
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-md flex gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                        <p className="text-sm font-medium text-amber-800 leading-tight">
                            Please review all rankings carefully. This
                            submission is final and cannot be retracted once
                            confirmed.
                        </p>
                    </div>

                    <div className="space-y-6">
                        {Object.entries(ballots).map(([position]) => {
                            const currentRankingIds = rankings[position] || [];
                            return (
                                <div
                                    key={position}
                                    className="border border-slate-200 rounded-md overflow-hidden"
                                >
                                    <div className="bg-[#001f3f] px-4 py-2">
                                        <p className="text-[10px] font-black text-white uppercase tracking-widest">
                                            {position}
                                        </p>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {currentRankingIds.map((id, i) => {
                                            const candidate =
                                                MOCK_CANDIDATES.find(
                                                    (c) => c._id === id
                                                );
                                            return (
                                                <div
                                                    key={id}
                                                    className="flex items-center gap-3 p-3 bg-white"
                                                >
                                                    <span className="font-black text-slate-300 w-5">
                                                        #{i + 1}
                                                    </span>
                                                    <span className="font-bold text-[#001f3f]">
                                                        {candidate?.name}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex flex-col gap-3 pt-6 border-t">
                        <Button
                            variant="success"
                            className="py-4"
                            onClick={() => setIsSubmitted(true)}
                        >
                            CONFIRM AND CAST BALLOT
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setShowConfirm(false)}
                        >
                            RETURN TO EDIT
                        </Button>
                    </div>
                </div>
            </Modal>
        </main>
    );
}
