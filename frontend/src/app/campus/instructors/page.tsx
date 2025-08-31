'use client';

import React, {
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
} from 'react';
import axios, { CancelTokenSource } from 'axios';
import { debounce } from 'lodash';
import type { Instructor, SchoolKey } from '@/types';

const schoolData = {
    PO: {
        name: 'Pomona',
        bgColor: 'bg-blue-400',
        buttonColor: 'bg-blue-100 text-blue-800 border-blue-300',
        textColor: 'text-blue-800',
    },
    CM: {
        name: 'Claremont McKenna',
        bgColor: 'bg-red-400',
        buttonColor: 'bg-red-100 text-red-800 border-red-300',
        textColor: 'text-red-800',
    },
    HM: {
        name: 'Harvey Mudd',
        bgColor: 'bg-yellow-300',
        buttonColor: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        textColor: 'text-yellow-800',
    },
    SC: {
        name: 'Scripps',
        bgColor: 'bg-green-200',
        buttonColor: 'bg-green-100 text-green-800 border-green-300',
        textColor: 'text-green-800',
    },
    PZ: {
        name: 'Pitzer',
        bgColor: 'bg-orange-300',
        buttonColor: 'bg-orange-100 text-orange-800 border-orange-300',
        textColor: 'text-orange-800',
    },
};

const InstructorSearch = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<Instructor[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const cancelTokenSourceRef = useRef<CancelTokenSource | null>(null);

    const createCancelTokenSource = () => {
        if (cancelTokenSourceRef.current) {
            cancelTokenSourceRef.current.cancel(
                'Operation canceled due to new request'
            );
        }
        cancelTokenSourceRef.current = axios.CancelToken.source();
        return cancelTokenSourceRef.current;
    };

    const formatFullName = (s: string) => {
        const parts = s.trim().split(/\s+/);
        return s.includes(',') || parts.length !== 2 ? s : `${parts[1]}, ${parts[0]}`;
    };

    const performSearch = useCallback(async (term: string) => {
        if (!term || term.length < 2) {
            setResults([]);
            setLoading(false);
            return;
        }

        const source = createCancelTokenSource();

        try {
            setLoading(true);
            setError(null);

            const response = await axios.get<Instructor[]>(
                `${process.env.BACKEND_LINK}/api/instructors`,
                {
                    params: {
                        search: formatFullName(term),
                        limit: 50,
                    },
                    timeout: 5000,
                    cancelToken: source.token,
                }
            );

            setResults(response.data);
        } catch (err) {
            if (axios.isCancel(err)) {
                console.log('Request canceled:', err.message);
                return;
            }
            console.error('Search error:', err);
            setError('Failed to fetch results. Please try again.');
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const debouncedSearch = useMemo(
        () => debounce(performSearch, 300),
        [performSearch]
    );

    useEffect(() => {
        if (searchTerm.trim()) {
            debouncedSearch(searchTerm);
        } else {
            setResults([]);
        }

        return () => {
            debouncedSearch.cancel();
            cancelTokenSourceRef.current?.cancel('Component unmounted');
        };
    }, [searchTerm, debouncedSearch]);

    const filteredResults = useMemo(() => {
        return [...results].sort((a, b) => a.name.localeCompare(b.name));
    }, [results]);

    // Helper function to get school styling or default to Pomona if school is missing
    const getSchoolStyling = (school?: string) => {
        if (!school || !schoolData[school as SchoolKey]) {
            return schoolData['PO']; // Default to Pomona styling if school is missing or invalid
        }
        return schoolData[school as SchoolKey];
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6">
            <div className="bg-gray-50 rounded-lg shadow-md p-6 mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
                    Instructor Search
                </h1>

                <div className="flex flex-col gap-4 mb-4">
                    <div>
                        <label
                            htmlFor="instructor-search"
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            Instructor Name
                        </label>
                        <input
                            id="instructor-search"
                            type="text"
                            placeholder="Search by instructor name (min 2 chars)"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoComplete="off"
                        />
                    </div>
                </div>
            </div>

            {loading && (
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            )}

            {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
                    <p>{error}</p>
                </div>
            )}

            <div className="space-y-4">
                {!loading && filteredResults.length > 0 ? (
                    <>
                        <div className="flex justify-between items-center">
                            <p className="text-gray-600 text-sm">
                                Showing {filteredResults.length}{' '}
                                {filteredResults.length === 1
                                    ? 'instructor'
                                    : 'instructors'}
                            </p>
                        </div>

                        <div className="space-y-4">
                            {filteredResults.map((instructor) => {
                                const schoolStyle = getSchoolStyling(
                                    instructor.school
                                );

                                return (
                                    <div
                                        key={instructor.id}
                                        className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow relative"
                                    >
                                        <div
                                            className={`${schoolStyle.bgColor} h-2 w-full`}
                                        ></div>

                                        <div className="p-6 flex justify-between items-center">
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-800">
                                                    {instructor.name}
                                                </h3>
                                                {instructor.school && (
                                                    <span
                                                        className={`${schoolStyle.buttonColor} text-xs px-2 py-1 rounded-full border mt-1 inline-block`}
                                                    >
                                                        {schoolData[
                                                            instructor.school as SchoolKey
                                                        ]?.name ||
                                                            instructor.school}
                                                    </span>
                                                )}
                                            </div>

                                            <a
                                                href={`/campus/instructors/${instructor.id}`}
                                                className={`${schoolStyle.buttonColor} px-4 py-2 rounded-md font-medium hover:opacity-90 transition-opacity text-center`}
                                            >
                                                View Reviews
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    !loading &&
                    searchTerm && (
                        <div className="text-center py-8 text-gray-500">
                            No instructors found matching {'"'}
                            {searchTerm}
                            {'"'}
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default InstructorSearch;
