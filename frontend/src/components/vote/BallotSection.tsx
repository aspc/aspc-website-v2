import { Check, GripVertical, Plus, RotateCcw, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { ICandidateFrontend, IRankingState } from '@/types';

interface BallotSectionProps {
    position: string;
    candidates: ICandidateFrontend[];
    isActive: boolean;
    onToggle: (pos: string) => void;
    onRankChange: (pos: string, ranking: IRankingState) => void;
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
}: BallotSectionProps) {
    const initialShuffled = useMemo(
        () => shuffleArray(candidates),
        [candidates]
    );
    const [unranked, setUnranked] =
        useState<ICandidateFrontend[]>(initialShuffled);
    const [ranked, setRanked] = useState<ICandidateFrontend[]>([]);
    const [draggedId, setDraggedId] = useState<string | null>(null);

    useEffect(() => {
        onRankChange(position, {
            candidateIds: ranked.map((c) => c._id),
            isComplete: unranked.length === 0 && ranked.length > 0,
        });
    }, [ranked, unranked, position, onRankChange]);

    const addToRanked = (c: ICandidateFrontend) => {
        setUnranked((prev) => prev.filter((cand) => cand._id !== c._id));
        setRanked((prev) => [...prev, c]);
    };

    const removeFromRanked = (c: ICandidateFrontend) => {
        setRanked((prev) => prev.filter((cand) => cand._id !== c._id));
        setUnranked((prev) => [...prev, c]);
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
                        onClick={() => {
                            setUnranked(initialShuffled);
                            setRanked([]);
                        }}
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
                            {unranked.length === 0 ? (
                                <div className="h-20 border-2 border-dashed border-slate-100 rounded-md flex items-center justify-center text-slate-300 text-xs font-bold italic">
                                    No Candidates Remaining
                                </div>
                            ) : (
                                unranked.map((c) => (
                                    <div
                                        key={c._id}
                                        className="p-3 border border-slate-200 rounded-md flex items-center justify-between bg-white group hover:border-[#001f3f] transition-colors"
                                    >
                                        <span className="font-bold text-slate-700 text-sm">
                                            {c.name}
                                        </span>
                                        <button
                                            onClick={() => addToRanked(c)}
                                            className="p-1.5 bg-slate-50 rounded-md text-slate-400 group-hover:bg-[#001f3f] group-hover:text-white transition-all"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
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
                                        <span className="font-bold text-slate-800 text-sm flex-1">
                                            {c.name}
                                        </span>
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
