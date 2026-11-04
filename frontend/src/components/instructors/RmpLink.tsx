'use client';
import { useState } from 'react';
import {
    buildRmpProfessorUrl,
    buildRmpSearchUrl,
    parseRmpProfessorId,
} from '@/utils/rateMyProfessors';

interface RmpLinkProps {
    instructorId: string;
    instructorName: string;
    instructorSchool?: string;
    rmpId: number | null | undefined;
    rmpCheckedAt: string | null | undefined;
    isAdmin: boolean;
    onChange: (rmpId: number | null, rmpCheckedAt: string) => void;
}

const buttonClass =
    'inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50';

/**
 * Rate My Professors link for an instructor, in one of three states:
 *  - rmpId set: direct link to the professor's page
 *  - checked but not found: plain "not found" text
 *  - never checked: link to an RMP search for the name
 * Admins additionally get a small control to set or clear the id by hand.
 */
export const RmpLink = ({
    instructorId,
    instructorName,
    instructorSchool,
    rmpId,
    rmpCheckedAt,
    isAdmin,
    onChange,
}: RmpLinkProps): JSX.Element => {
    const [editing, setEditing] = useState(false);
    const [input, setInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const save = async (nextId: number | null): Promise<void> => {
        setSaving(true);
        setError(null);
        try {
            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/instructors/${instructorId}/rmp`,
                {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rmpId: nextId }),
                }
            );
            if (!response.ok) {
                const data = await response.json().catch(() => null);
                throw new Error(data?.message || `Request failed (${response.status})`);
            }
            const updated = await response.json();
            onChange(updated.rmpId ?? null, updated.rmpCheckedAt);
            setEditing(false);
            setInput('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleSave = (): void => {
        const parsed = parseRmpProfessorId(input);
        if (parsed === null) {
            setError('Paste an RMP professor URL or numeric id');
            return;
        }
        void save(parsed);
    };

    let status: JSX.Element;
    if (rmpId) {
        status = (
            <a
                href={buildRmpProfessorUrl(rmpId)}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass}
            >
                View on Rate My Professors
            </a>
        );
    } else if (rmpCheckedAt) {
        status = (
            <span className="text-sm text-gray-500">
                Not found on Rate My Professors
            </span>
        );
    } else {
        status = (
            <a
                href={buildRmpSearchUrl(instructorName, instructorSchool)}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass}
            >
                Search on Rate My Professors
            </a>
        );
    }

    return (
        <div className="mb-2">
            <div className="flex flex-wrap items-center gap-3">
                {status}
                {isAdmin && !editing && (
                    <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="text-sm text-indigo-600 hover:underline"
                    >
                        Edit RMP link
                    </button>
                )}
            </div>

            {isAdmin && editing && (
                <div className="mt-2 p-3 bg-white border border-gray-200 rounded-md text-sm">
                    <label className="block text-gray-700 mb-1">
                        RMP professor URL or id
                    </label>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="https://www.ratemyprofessors.com/professor/123456"
                        className="w-full max-w-md px-2 py-1 border border-gray-300 rounded-md mb-2"
                        disabled={saving}
                    />
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="px-3 py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            Save
                        </button>
                        <button
                            type="button"
                            onClick={() => void save(null)}
                            disabled={saving}
                            className="px-3 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Mark as not on RMP
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setEditing(false);
                                setInput('');
                                setError(null);
                            }}
                            disabled={saving}
                            className="px-3 py-1 text-gray-500 hover:underline"
                        >
                            Cancel
                        </button>
                    </div>
                    {error && <p className="mt-2 text-red-600">{error}</p>}
                </div>
            )}
        </div>
    );
};
