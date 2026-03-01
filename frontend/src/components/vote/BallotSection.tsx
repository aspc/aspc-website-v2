import {
    Check,
    GripVertical,
    PenLine,
    Plus,
    RotateCcw,
    Trash2,
    X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { ICandidateFrontend, IRankingState } from '@/types';

interface BallotSectionProps {
    position: string;
    candidates: ICandidateFrontend[];
    isActive: boolean;
    onToggle: (pos: string) => void;
    onRankChange: (pos: string, ranking: IRankingState) => void;
    onCreateWriteIn?: (
        firstName: string,
        lastName: string,
        position: string
    ) => Promise<ICandidateFrontend | string>;
}

const shuffleArray = (array: ICandidateFrontend[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

export default function BallotSection({
    position,
    candidates,
    isActive,
    onToggle,
    onRankChange,
    onCreateWriteIn,
}: BallotSectionProps) {
    const initialShuffled = useMemo(
        () => shuffleArray(candidates),
        [candidates]
    );
    const [unranked, setUnranked] =
        useState<ICandidateFrontend[]>(initialShuffled);
    const [ranked, setRanked] = useState<ICandidateFrontend[]>([]);
    const [draggedId, setDraggedId] = useState<string | null>(null);

    const [showWriteInForm, setShowWriteInForm] = useState(false);
    const [writeInFirst, setWriteInFirst] = useState('');
    const [writeInLast, setWriteInLast] = useState('');
    const [writeInLoading, setWriteInLoading] = useState(false);
    const [writeInError, setWriteInError] = useState('');

    useEffect(() => {
        onRankChange(position, {
            candidateIds: ranked.map((c) => c._id),
            isComplete: unranked.length === 0 && ranked.length > 0,
        });
    }, [ranked, unranked, position, onRankChange]);

    const allCandidateIds = new Set([
        ...unranked.map((c) => c._id),
        ...ranked.map((c) => c._id),
    ]);

    const hasWriteIn =
        unranked.some((c) => c.writeIn) || ranked.some((c) => c.writeIn);

    const addToRanked = (c: ICandidateFrontend) => {
        setUnranked((prev) => prev.filter((cand) => cand._id !== c._id));
        setRanked((prev) => [...prev, c]);
    };

    const removeFromRanked = (c: ICandidateFrontend) => {
        setRanked((prev) => prev.filter((cand) => cand._id !== c._id));
        setUnranked((prev) => [...prev, c]);
    };

    const removeWriteIn = (c: ICandidateFrontend) => {
        setUnranked((prev) => prev.filter((cand) => cand._id !== c._id));
        setRanked((prev) => prev.filter((cand) => cand._id !== c._id));
    };

    const handleDragOver = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedId || draggedId === targetId) return;
        const newList = [...ranked];
        const draggedIdx = newList.findIndex((c) => c._id === draggedId);
        const targetIdx = newList.findIndex((c) => c._id === targetId);
        if (draggedIdx === -1) return;
        const [draggedItem] = newList.splice(draggedIdx, 1);
        newList.splice(targetIdx, 0, draggedItem);
        setRanked(newList);
    };

    const isPreview = !onCreateWriteIn;

    const handleAddWriteIn = async () => {
        if (isPreview) return;

        if (!writeInFirst.trim() || !writeInLast.trim()) {
            setWriteInError('Both first and last name are required.');
            return;
        }

        const fullName =
            `${writeInFirst.trim()} ${writeInLast.trim()}`.toLowerCase();
        const alreadyOnBallot = [...unranked, ...ranked].some(
            (c) => c.name.toLowerCase() === fullName
        );
        if (alreadyOnBallot) {
            setWriteInError('This candidate is already on your ballot.');
            return;
        }

        setWriteInLoading(true);
        setWriteInError('');

        try {
            const result = await onCreateWriteIn(
                writeInFirst.trim(),
                writeInLast.trim(),
                position
            );

            if (typeof result === 'string') {
                setWriteInError(result);
                return;
            }

            if (allCandidateIds.has(result._id)) {
                setWriteInError('This candidate is already on your ballot.');
                return;
            }

            setUnranked((prev) => [...prev, result]);
            setWriteInFirst('');
            setWriteInLast('');
            setShowWriteInForm(false);
        } catch {
            setWriteInError('Something went wrong. Please try again.');
        } finally {
            setWriteInLoading(false);
        }
    };

    const handleReset = () => {
        const writeIns = [...unranked, ...ranked].filter((c) => c.writeIn);
        setUnranked([...initialShuffled, ...writeIns]);
        setRanked([]);
        setShowWriteInForm(false);
        setWriteInFirst('');
        setWriteInLast('');
        setWriteInError('');
    };

    return (
        <div
            className={`mb-10 border rounded-md transition-all ${isActive ? 'border-[#001f3f] bg-white shadow-sm' : 'border-slate-200 bg-slate-50/50'}`}
        >
            <div className="p-5 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-4">
                    <div
                        onClick={() => onToggle(position)}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${isActive ? 'bg-[#001f3f] border-[#001f3f]' : 'bg-white border-slate-300'}`}
                    >
                        {isActive && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <h2
                        className={`text-xl font-black uppercase tracking-tight ${isActive ? 'text-[#001f3f]' : 'text-slate-400'}`}
                    >
                        {position}
                    </h2>
                </div>
                {isActive && (
                    <button
                        onClick={handleReset}
                        className="text-[10px] font-black text-slate-400 hover:text-[#001f3f] flex items-center gap-1 uppercase tracking-widest"
                    >
                        <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                )}
            </div>

            <div
                className={`p-6 ${!isActive && 'opacity-30 pointer-events-none grayscale'}`}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Available Pool */}
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                            Available Candidates
                        </p>
                        <div className="space-y-2">
                            {unranked.length === 0 && !showWriteInForm ? (
                                <div className="h-20 border-2 border-dashed border-slate-100 rounded-md flex items-center justify-center text-slate-300 text-xs font-bold italic">
                                    No Candidates Remaining
                                </div>
                            ) : (
                                unranked.map((c) => (
                                    <div
                                        key={c._id}
                                        className="p-3 border border-slate-200 rounded-md flex items-center justify-between bg-white group hover:border-[#001f3f] transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            {c.writeIn && (
                                                <PenLine className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                            )}
                                            <span className="font-bold text-slate-700 text-sm">
                                                {c.name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {c.writeIn && (
                                                <button
                                                    onClick={() =>
                                                        removeWriteIn(c)
                                                    }
                                                    className="p-1.5 rounded-md text-slate-300 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => addToRanked(c)}
                                                className="p-1.5 bg-slate-50 rounded-md text-slate-400 group-hover:bg-[#001f3f] group-hover:text-white transition-all"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}

                            {/* Write-in Form */}
                            {showWriteInForm ? (
                                <div className="p-3 border-2 border-dashed border-amber-300 rounded-md bg-amber-50/50 space-y-3">
                                    <div className="flex items-center gap-2 text-amber-700">
                                        <PenLine className="w-4 h-4" />
                                        <span className="text-xs font-black uppercase tracking-wide">
                                            Write-in Candidate
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            placeholder="First Name"
                                            value={writeInFirst}
                                            onChange={(e) =>
                                                setWriteInFirst(e.target.value)
                                            }
                                            disabled={isPreview}
                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#001f3f] focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Last Name"
                                            value={writeInLast}
                                            onChange={(e) =>
                                                setWriteInLast(e.target.value)
                                            }
                                            disabled={isPreview}
                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#001f3f] focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400"
                                        />
                                    </div>
                                    {isPreview && (
                                        <p className="text-amber-600 text-xs font-bold italic">
                                            Students will be able to write in a
                                            candidate here.
                                        </p>
                                    )}
                                    {writeInError && (
                                        <p className="text-red-500 text-xs font-bold">
                                            {writeInError}
                                        </p>
                                    )}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleAddWriteIn}
                                            disabled={
                                                writeInLoading || isPreview
                                            }
                                            className="flex-1 py-2.5 bg-[#001f3f] text-white text-xs font-black uppercase tracking-wide rounded-md hover:bg-[#003366] transition-colors disabled:opacity-50"
                                        >
                                            {writeInLoading
                                                ? 'Adding...'
                                                : 'Add Candidate'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowWriteInForm(false);
                                                setWriteInFirst('');
                                                setWriteInLast('');
                                                setWriteInError('');
                                            }}
                                            className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                !hasWriteIn && (
                                    <button
                                        onClick={() => setShowWriteInForm(true)}
                                        className="w-full p-3 border-2 border-dashed border-slate-200 rounded-md flex items-center justify-center gap-2 text-slate-400 hover:border-amber-400 hover:text-amber-600 transition-colors text-xs font-black uppercase tracking-wide"
                                    >
                                        <PenLine className="w-3.5 h-3.5" />
                                        Add Write-in Candidate
                                    </button>
                                )
                            )}
                        </div>
                    </div>

                    {/* Ranking List */}
                    <div>
                        <p className="text-[10px] font-black text-[#001f3f] uppercase tracking-widest mb-4">
                            Final Ranking Order
                        </p>
                        <div className="space-y-2">
                            {ranked.length === 0 ? (
                                <div className="h-20 border-2 border-dashed border-slate-200 rounded-md flex items-center justify-center text-slate-400 text-xs font-bold text-center px-4">
                                    Move candidates here to rank them
                                </div>
                            ) : (
                                ranked.map((c, i) => (
                                    <div
                                        key={c._id}
                                        draggable
                                        onDragStart={() => setDraggedId(c._id)}
                                        onDragOver={(e) =>
                                            handleDragOver(e, c._id)
                                        }
                                        onDragEnd={() => setDraggedId(null)}
                                        className={`p-3 border-2 border-[#001f3f] rounded-md flex items-center gap-3 bg-white cursor-move ${draggedId === c._id ? 'opacity-20' : ''}`}
                                    >
                                        <GripVertical className="w-4 h-4 text-slate-300" />
                                        <span className="font-black text-[#001f3f] text-sm w-4">
                                            #{i + 1}
                                        </span>
                                        <div className="flex items-center gap-1.5 flex-1">
                                            {c.writeIn && (
                                                <PenLine className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                            )}
                                            <span className="font-bold text-slate-800 text-sm">
                                                {c.name}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => removeFromRanked(c)}
                                            className="text-slate-300 hover:text-red-500"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
