import {
    Check,
    ChevronDown,
    ChevronUp,
    GripVertical,
    PenLine,
    Plus,
    RotateCcw,
    Trash2,
    X,
} from 'lucide-react';
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { ICandidateFrontend, IRankingState } from '@/types';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export interface WriteInSearchResult {
    firstName: string;
    lastName: string;
}

interface BallotSectionProps {
    position: string;
    candidates: ICandidateFrontend[];
    isActive: boolean;
    onToggle: (pos: string) => void;
    onRankChange: (pos: string, ranking: IRankingState) => void;
    onSearchWriteInCandidates?: (
        query: string
    ) => Promise<WriteInSearchResult[]>;
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
    onSearchWriteInCandidates,
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
    /** HTML5 DnD does not run on touch; use tap reorder controls instead. */
    const [isCoarsePointer, setIsCoarsePointer] = useState(false);

    const [showWriteInForm, setShowWriteInForm] = useState(false);
    const [writeInSearchQuery, setWriteInSearchQuery] = useState('');
    const [writeInSearchResults, setWriteInSearchResults] = useState<
        WriteInSearchResult[]
    >([]);
    const [writeInSearchLoading, setWriteInSearchLoading] = useState(false);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [writeInLoading, setWriteInLoading] = useState(false);
    const [writeInError, setWriteInError] = useState('');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Debounced search: only run after DEBOUNCE_MS of no typing, and only if query >= MIN_QUERY_LENGTH
    useEffect(() => {
        if (!onSearchWriteInCandidates) return;
        const q = writeInSearchQuery.trim();
        if (q.length < MIN_QUERY_LENGTH) {
            setWriteInSearchResults([]);
            setShowSearchDropdown(q.length > 0);
            return;
        }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            debounceRef.current = null;
            setWriteInSearchLoading(true);
            try {
                const results = await onSearchWriteInCandidates(q);
                setWriteInSearchResults(results);
                setShowSearchDropdown(true);
            } finally {
                setWriteInSearchLoading(false);
            }
        }, DEBOUNCE_MS);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [writeInSearchQuery, onSearchWriteInCandidates]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node)
            ) {
                setShowSearchDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const mq = window.matchMedia('(pointer: coarse)');
        const update = () => setIsCoarsePointer(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    useEffect(() => {
        onRankChange(position, {
            candidateIds: ranked.map((c) => c._id),
            isComplete: unranked.length === 0 && ranked.length > 0,
        });
    }, [ranked, unranked, position, onRankChange]);

    const allCandidateIds = useMemo(
        () =>
            new Set([
                ...unranked.map((c) => c._id),
                ...ranked.map((c) => c._id),
            ]),
        [unranked, ranked]
    );

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

    /** Move ranked item from `fromIndex` to `toIndex` (works for touch reorder). */
    const moveRankedToIndex = (fromIndex: number, toIndex: number) => {
        if (
            fromIndex === toIndex ||
            fromIndex < 0 ||
            toIndex < 0 ||
            fromIndex >= ranked.length ||
            toIndex >= ranked.length
        ) {
            return;
        }
        setRanked((prev) => {
            const next = [...prev];
            const [item] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, item);
            return next;
        });
    };

    const isPreview = !onCreateWriteIn;

    const submitWriteIn = useCallback(
        async (firstName: string, lastName: string) => {
            if (isPreview || !onCreateWriteIn) return;
            const fullName = `${firstName} ${lastName}`.toLowerCase();
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
                    firstName,
                    lastName,
                    position
                );
                if (typeof result === 'string') {
                    setWriteInError(result);
                    return;
                }
                if (allCandidateIds.has(result._id)) {
                    setWriteInError(
                        'This candidate is already on your ballot.'
                    );
                    return;
                }
                setUnranked((prev) => [...prev, result]);
                setWriteInSearchQuery('');
                setWriteInSearchResults([]);
                setShowWriteInForm(false);
            } catch {
                setWriteInError('Something went wrong. Please try again.');
            } finally {
                setWriteInLoading(false);
            }
        },
        [
            isPreview,
            onCreateWriteIn,
            position,
            unranked,
            ranked,
            allCandidateIds,
        ]
    );

    const handleSelectSearchResult = useCallback(
        (r: WriteInSearchResult) => {
            setShowSearchDropdown(false);
            submitWriteIn(r.firstName, r.lastName);
        },
        [submitWriteIn]
    );

    const handleReset = () => {
        const writeIns = [...unranked, ...ranked].filter((c) => c.writeIn);
        setUnranked([...initialShuffled, ...writeIns]);
        setRanked([]);
        setShowWriteInForm(false);
        setWriteInSearchQuery('');
        setWriteInSearchResults([]);
        setWriteInError('');
    };

    return (
        <div
            className={`mb-10 border rounded-md transition-all ${isActive ? 'border-[#001f3f] bg-white shadow-sm' : 'border-slate-200 bg-slate-50/50'}`}
        >
            <div className="p-5 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div
                        onClick={() => onToggle(position)}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer transition-colors shrink-0 ${isActive ? 'bg-[#001f3f] border-[#001f3f]' : 'bg-white border-slate-300'}`}
                    >
                        {isActive && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <h2
                        className={`text-xl font-black uppercase tracking-tight break-words ${isActive ? 'text-[#001f3f]' : 'text-slate-400'}`}
                    >
                        {position.replace(/_/g, ' ')}
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
                                    <div
                                        className="space-y-2"
                                        ref={dropdownRef}
                                    >
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Search by name (min 2 characters)"
                                                value={writeInSearchQuery}
                                                onChange={(e) => {
                                                    setWriteInSearchQuery(
                                                        e.target.value
                                                    );
                                                    setWriteInError('');
                                                }}
                                                onFocus={() =>
                                                    writeInSearchQuery.trim()
                                                        .length >=
                                                        MIN_QUERY_LENGTH &&
                                                    setShowSearchDropdown(true)
                                                }
                                                disabled={isPreview}
                                                autoComplete="off"
                                                className="w-full px-3 py-2.5 border border-slate-200 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#001f3f] focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400"
                                            />
                                            {writeInSearchLoading && (
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                                                    Searching...
                                                </span>
                                            )}
                                            {showSearchDropdown && (
                                                <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-auto rounded-md border border-slate-200 bg-white shadow-lg py-1 text-sm">
                                                    {writeInSearchResults.length ===
                                                        0 &&
                                                    !writeInSearchLoading ? (
                                                        <li className="px-3 py-2 text-slate-500 italic">
                                                            {writeInSearchQuery.trim()
                                                                .length <
                                                            MIN_QUERY_LENGTH
                                                                ? `Type at least ${MIN_QUERY_LENGTH} characters`
                                                                : 'No matching candidates'}
                                                        </li>
                                                    ) : (
                                                        writeInSearchResults.map(
                                                            (r, i) => (
                                                                <li
                                                                    key={`${r.firstName}-${r.lastName}-${i}`}
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            handleSelectSearchResult(
                                                                                r
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            writeInLoading
                                                                        }
                                                                        className="w-full px-3 py-2 text-left hover:bg-slate-100 font-medium text-slate-700 disabled:opacity-50"
                                                                    >
                                                                        {
                                                                            r.firstName
                                                                        }{' '}
                                                                        {
                                                                            r.lastName
                                                                        }
                                                                    </button>
                                                                </li>
                                                            )
                                                        )
                                                    )}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                    {isPreview && (
                                        <p className="text-amber-600 text-xs font-bold italic">
                                            Students will be able to search and
                                            write in a candidate here.
                                        </p>
                                    )}
                                    {writeInError && (
                                        <p className="text-red-500 text-xs font-bold">
                                            {writeInError}
                                        </p>
                                    )}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setShowWriteInForm(false);
                                                setWriteInSearchQuery('');
                                                setWriteInSearchResults([]);
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
                        {isCoarsePointer && ranked.length > 0 && (
                            <p className="text-[11px] text-slate-500 mb-3 leading-snug">
                                Use the arrows to change ranking order on this
                                device.
                            </p>
                        )}
                        <div className="space-y-2">
                            {ranked.length === 0 ? (
                                <div className="h-20 border-2 border-dashed border-slate-200 rounded-md flex items-center justify-center text-slate-400 text-xs font-bold text-center px-4">
                                    Move candidates here to rank them
                                </div>
                            ) : (
                                ranked.map((c, i) => (
                                    <div
                                        key={c._id}
                                        draggable={!isCoarsePointer}
                                        onDragStart={() => {
                                            if (!isCoarsePointer)
                                                setDraggedId(c._id);
                                        }}
                                        onDragOver={(e) =>
                                            handleDragOver(e, c._id)
                                        }
                                        onDragEnd={() => setDraggedId(null)}
                                        className={`p-3 border-2 border-[#001f3f] rounded-md flex items-center gap-2 sm:gap-3 bg-white ${!isCoarsePointer ? 'cursor-move' : ''} ${draggedId === c._id ? 'opacity-20' : ''}`}
                                    >
                                        {isCoarsePointer ? (
                                            <div className="flex flex-col shrink-0 border border-slate-200 rounded-md overflow-hidden bg-slate-50">
                                                <button
                                                    type="button"
                                                    aria-label={`Move ${c.name} up in ranking`}
                                                    disabled={i === 0}
                                                    onClick={() =>
                                                        moveRankedToIndex(
                                                            i,
                                                            i - 1
                                                        )
                                                    }
                                                    className="p-1.5 text-slate-600 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none"
                                                >
                                                    <ChevronUp className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    aria-label={`Move ${c.name} down in ranking`}
                                                    disabled={
                                                        i === ranked.length - 1
                                                    }
                                                    onClick={() =>
                                                        moveRankedToIndex(
                                                            i,
                                                            i + 1
                                                        )
                                                    }
                                                    className="p-1.5 text-slate-600 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none border-t border-slate-200"
                                                >
                                                    <ChevronDown className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
                                        )}
                                        <span className="font-black text-[#001f3f] text-sm w-6 sm:w-4 shrink-0 text-center sm:text-left">
                                            #{i + 1}
                                        </span>
                                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                            {c.writeIn && (
                                                <PenLine className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                            )}
                                            <span className="font-bold text-slate-800 text-sm truncate">
                                                {c.name}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeFromRanked(c)}
                                            className="text-slate-300 hover:text-red-500 shrink-0 p-1"
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
