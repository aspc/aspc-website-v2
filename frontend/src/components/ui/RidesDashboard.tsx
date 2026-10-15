'use client';
import { useState, useEffect, FormEvent } from 'react';
import {
    RideMatchServiceStatus,
    RideMatchResponse,
    RideMatchGroup,
    RideMatchRiderInput,
    UnmatchedRider,
} from '@/types';

const REASON_LABELS: Record<string, string> = {
    no_time_overlap: "No time overlap with other riders' windows",
    terminal_mismatch: 'Terminal mismatch with nearby riders',
    bag_capacity: 'Group would exceed bag capacity',
    dominated_by_better_pair: 'A better-matching pair took priority',
    singleton_bucket:
        'No other riders in the same airport/direction/school group',
    unknown: 'No reason recorded',
};

const humanizeReason = (reason: string): string =>
    REASON_LABELS[reason] ?? reason.replaceAll('_', ' ');

const formatTime = (value: string): string => {
    if (!value) return '—';
    const [h, m] = value.split(':');
    const hour = parseInt(h, 10);
    if (Number.isNaN(hour)) return value;
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${hour12}:${m} ${period}`;
};

const tomorrowISODate = (): string => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
};

const withSeconds = (hhmm: string): string =>
    hhmm.length === 5 ? `${hhmm}:00` : hhmm;

type Mode = 'database' | 'manual';

const RidesDashboard = () => {
    const [status, setStatus] = useState<RideMatchServiceStatus | null>(null);
    const [mode, setMode] = useState<Mode>('database');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [result, setResult] = useState<RideMatchResponse | null>(null);

    // Database mode
    const [daysAheadStart, setDaysAheadStart] = useState<string>('');
    const [daysAhead, setDaysAhead] = useState<string>('10');

    // Manual mode: riders built up one at a time, sent as-is to the matcher.
    const [testRiders, setTestRiders] = useState<RideMatchRiderInput[]>([]);
    const [nextRiderId, setNextRiderId] = useState(1);
    const [draftName, setDraftName] = useState('');
    const [draftDate, setDraftDate] = useState(tomorrowISODate());
    const [draftEarliest, setDraftEarliest] = useState('08:00');
    const [draftLatest, setDraftLatest] = useState('10:00');
    const [draftAirport, setDraftAirport] = useState('LAX');
    const [draftToAirport, setDraftToAirport] = useState(true);
    const [draftSchool, setDraftSchool] = useState('POMONA');
    const [draftTerminal, setDraftTerminal] = useState('');
    const [draftBagsNo, setDraftBagsNo] = useState('0');
    const [draftBagsNoLarge, setDraftBagsNoLarge] = useState('0');

    const fetchStatus = async () => {
        try {
            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/admin/rides/status`,
                { credentials: 'include' }
            );
            if (response.ok) {
                setStatus(await response.json());
            }
        } catch (err) {
            console.error('Error checking ride matching status:', err);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const handleAddRider = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const id = nextRiderId;

        setTestRiders((prev) => [
            ...prev,
            {
                user_id: `test-${id}`,
                flight_id: id,
                name: draftName.trim() || `Rider ${id}`,
                date: draftDate,
                earliest_time: withSeconds(draftEarliest),
                latest_time: withSeconds(draftLatest),
                airport: draftAirport.trim().toUpperCase() || 'LAX',
                to_airport: draftToAirport,
                school: draftSchool.trim() || 'POMONA',
                terminal: draftTerminal.trim() || undefined,
                bags_no: draftBagsNo ? Number(draftBagsNo) : 0,
                bags_no_large: draftBagsNoLarge ? Number(draftBagsNoLarge) : 0,
            },
        ]);
        setNextRiderId((n) => n + 1);
        setDraftName('');
    };

    const handleRemoveRider = (flightId: number) => {
        setTestRiders((prev) => prev.filter((r) => r.flight_id !== flightId));
    };

    const handleRun = async () => {
        setError('');
        setResult(null);

        if (mode === 'manual' && testRiders.length === 0) {
            setError('Add at least one test rider first.');
            return;
        }

        try {
            setIsLoading(true);
            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/admin/rides/run`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(
                        mode === 'manual'
                            ? { riders: testRiders }
                            : {
                                  daysAhead: daysAhead
                                      ? Number(daysAhead)
                                      : undefined,
                                  daysAheadStart: daysAheadStart
                                      ? Number(daysAheadStart)
                                      : undefined,
                              }
                    ),
                }
            );

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Ride matching run failed');
            }

            setResult(data);
        } catch (err) {
            console.error('Error running ride matching:', err);
            setError(
                err instanceof Error ? err.message : 'Ride matching run failed'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const canRun =
        !!status?.configured &&
        !!status?.reachable &&
        (mode === 'database' || testRiders.length > 0);

    return (
        <div>
            <h2 className="text-2xl font-bold mb-2">Ride Matching</h2>
            <p className="text-sm text-gray-600 mb-6">
                Preview shared airport ride groups. This only reads from the
                database — nothing is written back, no rides are assigned, until
                you act on the results elsewhere.
            </p>

            {status && !status.configured && (
                <div className="mb-6 p-4 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
                    The ride matching service isn&apos;t configured on the
                    backend yet. Set <code>ML_SERVICE_URL</code> and restart the
                    server.
                </div>
            )}
            {status?.configured && !status.reachable && (
                <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
                    {status.message ||
                        'Could not reach the ride matching service.'}
                </div>
            )}
            {mode === 'database' &&
                status?.configured &&
                status.reachable &&
                !status.supabaseConfigured && (
                    <div className="mb-6 p-4 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
                        Connected to the ride matching service, but it has no
                        database credentials configured, so it has no real
                        riders to fetch yet. Try &quot;Manual test riders&quot;
                        instead — that mode doesn&apos;t need the database.
                    </div>
                )}

            <div className="flex gap-2 mb-6">
                <button
                    type="button"
                    onClick={() => setMode('database')}
                    className={`px-3 py-1.5 rounded text-sm ${
                        mode === 'database'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200'
                    }`}
                >
                    From database
                </button>
                <button
                    type="button"
                    onClick={() => setMode('manual')}
                    className={`px-3 py-1.5 rounded text-sm ${
                        mode === 'manual'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200'
                    }`}
                >
                    Manual test riders
                </button>
            </div>

            {mode === 'database' ? (
                <div className="mb-6 flex flex-wrap items-end gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            From (days from today)
                        </label>
                        <input
                            type="number"
                            min={0}
                            value={daysAheadStart}
                            onChange={(e) => setDaysAheadStart(e.target.value)}
                            placeholder="tomorrow"
                            className="w-36 p-2 border border-gray-300 rounded"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Through (days from today)
                        </label>
                        <input
                            type="number"
                            min={0}
                            value={daysAhead}
                            onChange={(e) => setDaysAhead(e.target.value)}
                            className="w-36 p-2 border border-gray-300 rounded"
                        />
                    </div>
                </div>
            ) : (
                <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-4">
                        These riders are made up for testing — they&apos;re not
                        real students and nothing here is saved. Add a few with
                        overlapping times and the same airport/direction to see
                        how the algorithm groups them.
                    </p>

                    <form
                        onSubmit={handleAddRider}
                        className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border border-gray-200 rounded mb-4"
                    >
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-xs font-medium mb-1">
                                Name
                            </label>
                            <input
                                type="text"
                                value={draftName}
                                onChange={(e) => setDraftName(e.target.value)}
                                placeholder={`Rider ${nextRiderId}`}
                                className="w-full p-2 border border-gray-300 rounded text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">
                                Date
                            </label>
                            <input
                                type="date"
                                required
                                value={draftDate}
                                onChange={(e) => setDraftDate(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">
                                Earliest time
                            </label>
                            <input
                                type="time"
                                required
                                value={draftEarliest}
                                onChange={(e) =>
                                    setDraftEarliest(e.target.value)
                                }
                                className="w-full p-2 border border-gray-300 rounded text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">
                                Latest time
                            </label>
                            <input
                                type="time"
                                required
                                value={draftLatest}
                                onChange={(e) => setDraftLatest(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">
                                Airport
                            </label>
                            <input
                                type="text"
                                value={draftAirport}
                                onChange={(e) =>
                                    setDraftAirport(e.target.value)
                                }
                                placeholder="LAX"
                                className="w-full p-2 border border-gray-300 rounded text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">
                                Direction
                            </label>
                            <select
                                value={draftToAirport ? 'to' : 'from'}
                                onChange={(e) =>
                                    setDraftToAirport(e.target.value === 'to')
                                }
                                className="w-full p-2 border border-gray-300 rounded text-sm"
                            >
                                <option value="to">To airport</option>
                                <option value="from">From airport</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">
                                School
                            </label>
                            <input
                                type="text"
                                value={draftSchool}
                                onChange={(e) => setDraftSchool(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">
                                Terminal (optional)
                            </label>
                            <input
                                type="text"
                                value={draftTerminal}
                                onChange={(e) =>
                                    setDraftTerminal(e.target.value)
                                }
                                className="w-full p-2 border border-gray-300 rounded text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">
                                Normal bags
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={draftBagsNo}
                                onChange={(e) => setDraftBagsNo(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">
                                Large bags
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={draftBagsNoLarge}
                                onChange={(e) =>
                                    setDraftBagsNoLarge(e.target.value)
                                }
                                className="w-full p-2 border border-gray-300 rounded text-sm"
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                type="submit"
                                className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900 text-sm w-full"
                            >
                                Add rider
                            </button>
                        </div>
                    </form>

                    {testRiders.length > 0 && (
                        <div className="overflow-x-auto mb-2">
                            <table className="w-full text-sm border border-gray-200 rounded">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-2 text-left">Name</th>
                                        <th className="p-2 text-left">Date</th>
                                        <th className="p-2 text-left">
                                            Window
                                        </th>
                                        <th className="p-2 text-left">
                                            Airport
                                        </th>
                                        <th className="p-2 text-left">
                                            School
                                        </th>
                                        <th className="p-2 text-left">Bags</th>
                                        <th className="p-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {testRiders.map((r) => (
                                        <tr
                                            key={r.flight_id}
                                            className="border-t border-gray-200"
                                        >
                                            <td className="p-2">{r.name}</td>
                                            <td className="p-2">{r.date}</td>
                                            <td className="p-2">
                                                {formatTime(r.earliest_time)} –{' '}
                                                {formatTime(r.latest_time)}
                                            </td>
                                            <td className="p-2">
                                                {r.airport}{' '}
                                                {r.to_airport
                                                    ? '(to)'
                                                    : '(from)'}
                                            </td>
                                            <td className="p-2">{r.school}</td>
                                            <td className="p-2">
                                                {(r.bags_no || 0) +
                                                    (r.bags_no_large || 0)}
                                            </td>
                                            <td className="p-2 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleRemoveRider(
                                                            r.flight_id
                                                        )
                                                    }
                                                    className="text-red-600 hover:underline text-xs"
                                                >
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {testRiders.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setTestRiders([])}
                            className="text-xs text-gray-500 hover:underline"
                        >
                            Clear all test riders
                        </button>
                    )}
                </div>
            )}

            <button
                type="button"
                onClick={handleRun}
                disabled={isLoading || !canRun}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 mb-4"
            >
                {isLoading ? 'Running…' : 'Run Matching Preview'}
            </button>

            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

            {result && (
                <div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                        {[
                            ['Buckets', result.summary.buckets],
                            ['Groups formed', result.summary.groups],
                            ['Riders matched', result.summary.matched_riders],
                            [
                                'Riders unmatched',
                                result.summary.unmatched_riders,
                            ],
                        ].map(([label, value]) => (
                            <div
                                key={label}
                                className="border border-gray-200 rounded p-4 text-center"
                            >
                                <p className="text-2xl font-bold">{value}</p>
                                <p className="text-xs text-gray-600">{label}</p>
                            </div>
                        ))}
                    </div>

                    <h3 className="text-lg font-semibold mb-3">
                        Proposed groups ({result.matches.length})
                    </h3>
                    <div className="mb-8 overflow-x-auto">
                        <table className="w-full text-sm border border-gray-200 rounded">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-2 text-left">#</th>
                                    <th className="p-2 text-left">Bucket</th>
                                    <th className="p-2 text-left">Date</th>
                                    <th className="p-2 text-left">
                                        Pickup time
                                    </th>
                                    <th className="p-2 text-left">Riders</th>
                                    <th className="p-2 text-left">Bags</th>
                                    <th className="p-2 text-left">Uber type</th>
                                    <th className="p-2 text-left">
                                        Subsidized
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.matches.map((m: RideMatchGroup) => (
                                    <tr
                                        key={m.ride_id}
                                        className="border-t border-gray-200"
                                    >
                                        <td className="p-2">{m.ride_id}</td>
                                        <td className="p-2">{m.bucket_key}</td>
                                        <td className="p-2">{m.date}</td>
                                        <td className="p-2">
                                            {formatTime(
                                                m.suggested_time.includes('T')
                                                    ? m.suggested_time.split(
                                                          'T'
                                                      )[1]
                                                    : m.suggested_time
                                            )}
                                        </td>
                                        <td className="p-2">
                                            {m.riders
                                                .map((r) => r.name || r.user_id)
                                                .join(', ')}
                                        </td>
                                        <td className="p-2">{m.bags_total}</td>
                                        <td className="p-2">
                                            {m.ride_type || m.uber_type || '—'}
                                        </td>
                                        <td className="p-2">
                                            {m.subsidized ? (
                                                <span className="text-green-700 font-medium">
                                                    Yes
                                                </span>
                                            ) : (
                                                'No'
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {result.matches.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="p-3 text-gray-500 text-center"
                                        >
                                            No groups formed.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <h3 className="text-lg font-semibold mb-3">
                        Unmatched riders ({result.unmatched.length})
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border border-gray-200 rounded">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-2 text-left">Rider</th>
                                    <th className="p-2 text-left">Airport</th>
                                    <th className="p-2 text-left">Date</th>
                                    <th className="p-2 text-left">Window</th>
                                    <th className="p-2 text-left">
                                        Why unmatched
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.unmatched.map((r: UnmatchedRider) => (
                                    <tr
                                        key={r.flight_id}
                                        className="border-t border-gray-200"
                                    >
                                        <td className="p-2">
                                            {r.name || r.user_id}
                                        </td>
                                        <td className="p-2">
                                            {r.airport}{' '}
                                            {r.to_airport ? '(to)' : '(from)'}
                                        </td>
                                        <td className="p-2">{r.date}</td>
                                        <td className="p-2">
                                            {formatTime(r.earliest_time)} –{' '}
                                            {formatTime(r.latest_time)}
                                        </td>
                                        <td className="p-2">
                                            {humanizeReason(r.reason)}
                                        </td>
                                    </tr>
                                ))}
                                {result.unmatched.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="p-3 text-gray-500 text-center"
                                        >
                                            Everyone was matched.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RidesDashboard;
