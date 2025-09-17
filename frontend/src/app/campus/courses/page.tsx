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
import type { Course, Instructor, SchoolKey, CourseCardProps } from '@/types';

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

const CourseSearchComponent = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [courseNumber, setCourseNumber] = useState('');
    const [selectedSchools, setSelectedSchools] = useState<
        Record<SchoolKey, boolean>
    >({
        PO: true,
        CM: true,
        HM: true,
        SC: true,
        PZ: true,
    });
    const [results, setResults] = useState<Course[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [instructorCache, setInstructorCache] = useState<
        Record<number, Instructor>
    >({});
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

    const fetchInstructors = useCallback(
        async (ids: number[]): Promise<void> => {
            try {
                const uncachedIds = ids.filter((id) => !instructorCache[id]);

                if (uncachedIds.length === 0) return;

                const responses = await Promise.all(
                    uncachedIds.map((id) =>
                        axios
                            .get<Instructor>(
                                `${process.env.BACKEND_LINK}/api/instructors/${id}`,
                                {
                                    timeout: 3000,
                                    withCredentials: true,
                                }
                            )
                            .catch(() => null)
                    )
                );

                setInstructorCache((prev) => ({
                    ...prev,
                    ...responses.reduce(
                        (acc, res) => {
                            if (res && res.data) {
                                acc[res.data.id] = res.data;
                            }
                            return acc;
                        },
                        {} as Record<number, Instructor>
                    ),
                }));
            } catch (err) {
                if (!axios.isCancel(err)) {
                    console.error('Error fetching instructors:', err);
                }
                throw err;
            }
        },
        [instructorCache]
    );

    const performSearch = useCallback(
        async (
            term: string,
            number: string,
            schools: Record<SchoolKey, boolean>
        ) => {
            if ((!term || term.length < 2) && !number) {
                setResults([]);
                setLoading(false);
                return;
            }

            const source = createCancelTokenSource();

            try {
                setLoading(true);
                setError(null);

                const activeSchools = Object.entries(schools)
                    .filter(([_, isSelected]) => isSelected)
                    .map(([school]) => school);

                const response = await axios.get<Course[]>(
                    `${process.env.BACKEND_LINK}/api/courses`,
                    {
                        params: {
                            search: term,
                            number: number,
                            schools: activeSchools.join(','),
                            limit: 100,
                        },
                        timeout: 5000,
                        cancelToken: source.token,
                        withCredentials: true,
                    }
                );

                setResults(response.data);

                const instructorIds = response.data
                    .slice(0, 20)
                    .flatMap((course) => course.all_instructor_ids || []);

                if (instructorIds.length > 0) {
                    fetchInstructors(instructorIds);
                }
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
        },
        [fetchInstructors]
    );

    const debouncedSearch = useMemo(
        () => debounce(performSearch, 300, { leading: false, trailing: true }),
        [performSearch]
    );

    useEffect(() => {
        if (searchTerm.trim() || courseNumber.trim()) {
            debouncedSearch(searchTerm, courseNumber, selectedSchools);
        } else {
            setResults([]);
        }

        return () => {
            debouncedSearch.cancel();
            if (cancelTokenSourceRef.current) {
                cancelTokenSourceRef.current.cancel('Component unmounted');
            }
        };
    }, [searchTerm, courseNumber, selectedSchools, debouncedSearch]);

    const handleSchoolToggle = (school: SchoolKey) => {
        setSelectedSchools((prev) => {
            const allSelected = Object.values(prev).every(Boolean);

            if (allSelected) {
                return Object.fromEntries(
                    Object.keys(prev).map((k) => [k, k === school])
                ) as typeof prev;
            }

            const newState = {
                ...prev,
                [school]: !prev[school],
            };

            const anySelected = Object.values(newState).some(Boolean);

            if (!anySelected) {
                return Object.fromEntries(
                    Object.keys(prev).map((k) => [k, true])
                ) as typeof prev;
            }

            return newState;
        });
    };

    const sortedResults = useMemo(() => {
        return [...results].sort((a, b) => a.code.localeCompare(b.code));
    }, [results]);

    const extractSchoolCode = (code: string): SchoolKey => {
        const schoolCode = code.slice(-2);
        return schoolData[schoolCode as SchoolKey]
            ? (schoolCode as SchoolKey)
            : 'PO';
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6">
            <div className="bg-gray-50 rounded-lg shadow-md p-6 mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
                    5C Course Search
                </h1>

                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div className="flex-1">
                        <label
                            htmlFor="search-term"
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            Course Name or Code
                        </label>
                        <input
                            id="search-term"
                            type="text"
                            placeholder="Search by name or code (min 2 chars)"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoComplete="off"
                        />
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Schools:
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {(Object.keys(selectedSchools) as SchoolKey[]).map(
                            (school) => (
                                <button
                                    key={school}
                                    type="button"
                                    onClick={() => handleSchoolToggle(school)}
                                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                        selectedSchools[school]
                                            ? `${schoolData[school].buttonColor} border-2 border-white shadow-md`
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border-2 border-transparent'
                                    }`}
                                >
                                    {schoolData[school].name}
                                </button>
                            )
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
                    <p>{error}</p>
                </div>
            )}

            <div className="space-y-4">
                {sortedResults.length > 0 ? (
                    <>
                        <div className="flex justify-between items-center">
                            <p className="text-gray-600 text-sm">
                                Showing {sortedResults.length}{' '}
                                {sortedResults.length === 1
                                    ? 'result'
                                    : 'results'}
                            </p>
                        </div>

                        {sortedResults.map((course) => (
                            <CourseCard
                                key={course._id}
                                course={course}
                                schoolCode={extractSchoolCode(course.code)}
                                instructorCache={instructorCache}
                                onInstructorLoad={fetchInstructors}
                            />
                        ))}
                    </>
                ) : (
                    !loading &&
                    (searchTerm || courseNumber) && (
                        <div className="text-center py-8 text-gray-500">
                            No courses found matching your search criteria.
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

const CourseCardComponent = ({
    course,
    schoolCode,
    instructorCache,
    onInstructorLoad,
}: CourseCardProps) => {
    useEffect(() => {
        const loadInstructors = async () => {
            if (course.all_instructor_ids?.length) {
                const hasUncached = course.all_instructor_ids.some(
                    (id) => !instructorCache[id]
                );
                if (hasUncached) {
                    await onInstructorLoad(course.all_instructor_ids);
                }
            }
        };

        loadInstructors();
    }, [course.all_instructor_ids, instructorCache, onInstructorLoad]);

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow relative">
            <div
                className={`${schoolData[schoolCode].bgColor} h-2 w-full`}
            ></div>

            <div className="p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-1">
                            {course.code}: {course.name}
                        </h3>
                    </div>
                    <span
                        className={`${schoolData[schoolCode].buttonColor} text-xs px-2 py-1 rounded-full border`}
                    >
                        {schoolData[schoolCode].name}
                    </span>
                </div>

                {course.description && (
                    <p className="text-gray-700 mb-4">{course.description}</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {course.department_names?.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-gray-600">
                                Departments:
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {course.department_names.map((dept, index) => (
                                    <span
                                        key={index}
                                        className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded"
                                    >
                                        {dept}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {course.requirement_names?.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-gray-600">
                                Graduation Requirement:
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {course.requirement_names.map((req, index) => (
                                    <span
                                        key={index}
                                        className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded"
                                    >
                                        {req}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-between">
                    <div className="mb-4">
                        <p className="text-sm font-medium text-gray-600">
                            Instructors:
                        </p>
                        {course.all_instructor_ids?.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-1">
                                {course.all_instructor_ids
                                    .map((id) => instructorCache[id])
                                    .filter((instructor) => instructor?.name)
                                    .map((instructor) => (
                                        <div
                                            key={instructor.id}
                                            className={`${schoolData[schoolCode].bgColor} bg-opacity-20 px-2 py-1 rounded-md border ${schoolData[schoolCode].bgColor} border-opacity-30`}
                                        >
                                            <a
                                                href={`/campus/instructors/${instructor.id}`}
                                                className={`${schoolData[schoolCode].textColor} text-sm font-medium`}
                                            >
                                                {instructor.name}
                                            </a>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>

                    <div className="mt-4">
                        <a
                            href={`/campus/courses/${course.id}`}
                            className={`inline-block ${schoolData[schoolCode].buttonColor} px-4 py-2 rounded-md font-medium hover:opacity-90 transition-opacity text-center`}
                        >
                            View Course Reviews
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CourseCard = React.memo(CourseCardComponent);
CourseCard.displayName = 'CourseCard';

export default CourseSearchComponent;
