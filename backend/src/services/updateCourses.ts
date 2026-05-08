import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
import { Courses } from '../models/Courses';
import { Instructors } from '../models/People';
import {
    stripMiddleName,
    normalizeInstructorName,
} from '../utils/instructorNames';

interface InstructorLean {
    id: number;
    name: string;
    cxids?: number[];
    courses?: Array<{
        courseId: number;
        courseCode: string;
        courseName: string;
    }>;
}

dotenv.config();

interface SyncSummary {
    termKey: string;
    timestamp: string;
    coursesCreated: number;
    coursesUpdated: number;
    coursesSkipped: number;
    uniqueCourses: number;
    errors: number;
    errorDetails: string[];
}

// Interface for API Response
interface APIInstructor {
    EmailAddress: string | null;
    Name: string;
    CxID: number;
}

interface APISchedule {
    BuildingCode: string | null;
    Building: string;
    Campus: string;
    MeetTime: string;
    Room: string;
    Weekdays: string;
}

interface APICourse {
    Catalog: string;
    CourseCode: string;
    CourseStatus: string;
    Credits: string;
    Department: string;
    Description: string;
    GradingStyle: string;
    Instructors: APIInstructor[];
    Name: string;
    Note: string;
    PermCount: number | null;
    PrimaryAssociation: string;
    Requisites: string;
    Schedules: APISchedule[];
    SeatsFilled: number | null;
    SeatsTotal: number | null;
    Session: string;
    SubSession: string;
    Year: string;
}

interface APICourseArea {
    Code: string;
    Description: string;
}

// Global mappings - separate for departments and requirements
let departmentMap: Map<string, string> = new Map();
let requirementMap: Map<string, string> = new Map();

// Fetch department/course area mappings and separate into departments vs requirements
async function fetchDepartmentMappings(apiKey: string): Promise<void> {
    try {
        const response = await axios.get(
            'https://jicsweb.pomona.edu/api/CourseAreas',
            {
                headers: {
                    'Authorization-Token': apiKey,
                },
            }
        );

        const courseAreas: APICourseArea[] = response.data;

        // Separate departments from requirements based on first character
        courseAreas.forEach((area) => {
            if (area.Code && area.Code.length > 0) {
                if (/^\d/.test(area.Code)) {
                    // Starts with number - it's a requirement
                    requirementMap.set(area.Code, area.Description);
                } else {
                    // Starts with letter - it's a department
                    departmentMap.set(area.Code, area.Description);
                }
            }
        });

        console.log(`Loaded ${departmentMap.size} department mappings`);
        console.log(`Loaded ${requirementMap.size} requirement mappings`);
    } catch (error: any) {
        console.error('Error fetching department mappings:', error.message);
        throw error;
    }
}

// Fetch courses for a specific course area (could be department or requirement)
async function fetchCoursesForArea(
    termKey: string,
    courseArea: string,
    apiKey: string
): Promise<APICourse[]> {
    try {
        const encodedTerm = encodeURIComponent(termKey);
        const encodedArea = encodeURIComponent(courseArea);
        const url = `https://jicsweb.pomona.edu/api/Courses/${encodedTerm}/${encodedArea}`;

        const isRequirement = /^\d/.test(courseArea);

        console.log(
            `  Fetching ${isRequirement ? 'requirement' : 'department'} ${courseArea}...`
        );

        const response = await axios.get(url, {
            headers: {
                'Authorization-Token': apiKey,
            },
        });

        const courses: APICourse[] = response.data;
        console.log(`    ✓ Found ${courses.length} courses`);

        return courses;
    } catch (error: any) {
        if (error.response) {
            if (error.response.status === 404) {
                console.log(`    ⚠ No courses found for ${courseArea}`);
            } else {
                console.log(
                    `    ⚠ Error ${error.response.status} for ${courseArea}`
                );
            }
        } else {
            console.log(
                `    ⚠ Error fetching ${courseArea}: ${error.message}`
            );
        }
        return [];
    }
}

// Fetch all courses from both departments and requirements
async function fetchAllCoursesFromAPI(
    termKey: string,
    apiKey: string
): Promise<{ course: APICourse; sourceArea: string }[]> {
    try {
        const allCoursesWithSource: {
            course: APICourse;
            sourceArea: string;
        }[] = [];

        const allAreaCodes = [
            ...Array.from(departmentMap.keys()),
            ...Array.from(requirementMap.keys()),
        ];

        console.log(
            `\nFetching courses from ${departmentMap.size} departments and ${requirementMap.size} requirements...`
        );

        let successfulAreas = 0;
        let failedAreas = 0;

        for (const areaCode of allAreaCodes) {
            const courses = await fetchCoursesForArea(
                termKey,
                areaCode,
                apiKey
            );

            if (courses.length > 0) {
                courses.forEach((course) => {
                    allCoursesWithSource.push({ course, sourceArea: areaCode });
                });
                successfulAreas++;
            } else {
                failedAreas++;
            }

            // Small delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        console.log(`\n=== Fetch Summary ===`);
        console.log(`Successful areas: ${successfulAreas}`);
        console.log(`Failed/empty areas: ${failedAreas}`);
        console.log(`Total course entries: ${allCoursesWithSource.length}`);

        return allCoursesWithSource;
    } catch (error: any) {
        console.error('Error fetching all courses:', error.message);
        throw error;
    }
}

// Helper function to strip section number from course code and normalize spacing
function stripSectionNumber(courseCode: string): string {
    // 1. Remove section suffix (e.g., "-01", "-02")
    const base = courseCode.replace(/-[0-9A-Z]+$/, '').trim();
    // 2. Normalize internal whitespace to single spaces
    return base.replace(/\s+/g, ' ');
}

// Helper function to generate code_slug from code
function generateCodeSlug(code: string): string {
    // Standardize format to DEPTNUM-SCHOOL (e.g., "ANTH087-SC")
    // to match migration refactor-course-slug.ts
    const cleanCode = code.replace(/\s+/g, '').toUpperCase();
    const schoolMatch = cleanCode.match(/^(.+?)([A-Z]{2})$/);

    if (schoolMatch) {
        const [, baseCode, schoolCode] = schoolMatch;
        return `${baseCode}-${schoolCode}`;
    }

    return cleanCode;
}

// Helper function to get the next available ID
async function getNextCourseId(): Promise<number> {
    const maxCourse = await Courses.findOne().sort({ id: -1 }).exec();
    return maxCourse ? maxCourse.id + 1 : 1;
}

// Helper function to extract department code from course code
function extractDepartmentCode(courseCode: string): string {
    const match = courseCode.match(/^([A-Z]+)/);
    return match ? match[1] : '';
}

// Helper function to get department names from department code
function getDepartmentNames(deptCode: string): string[] {
    if (!deptCode) return [];

    const deptName = departmentMap.get(deptCode);
    if (deptName) return [deptName];

    return [deptCode];
}

// Helper function to get the next available instructor ID
async function getNextInstructorId(): Promise<number> {
    const max = await Instructors.findOne()
        .sort({ id: -1 })
        .select('id')
        .lean();
    return max ? max.id + 1 : 1;
}

// Main function to process courses with source tracking
async function updateCoursesFromAPI(
    coursesWithSource: { course: APICourse; sourceArea: string }[],
    termKey: string
): Promise<SyncSummary> {
    const summary: SyncSummary = {
        termKey,
        timestamp: new Date().toISOString(),
        coursesCreated: 0,
        coursesUpdated: 0,
        coursesSkipped: 0,
        uniqueCourses: 0,
        errors: 0,
        errorDetails: [],
    };

    try {
        const processedCourses: Set<string> = new Set();
        const [nextCourseIdInit, nextInstructorIdInit, allDbInstructors] =
            await Promise.all([
                getNextCourseId(),
                getNextInstructorId(),
                Instructors.find({}).lean(),
            ]);
        let nextCourseId = nextCourseIdInit;
        let nextInstructorId = nextInstructorIdInit;
        const instructorByCxid = new Map<number, InstructorLean>();
        const instructorByName = new Map<string, InstructorLean>();
        for (const inst of allDbInstructors) {
            for (const cxid of inst.cxids ?? []) {
                instructorByCxid.set(cxid, inst);
            }
            instructorByName.set(normalizeInstructorName(inst.name), inst);
        }

        for (const { course: apiCourse, sourceArea } of coursesWithSource) {
            try {
                const courseCode = stripSectionNumber(apiCourse.CourseCode);
                const courseCodeSlug = generateCodeSlug(courseCode);

                const isRequirement = /^\d/.test(sourceArea);

                // Extract instructor CxIDs from API payload
                const instructorCxids = [
                    ...new Set(
                        apiCourse.Instructors?.map((i) => i.CxID).filter(
                            (id) => id != null && !isNaN(id)
                        ) || []
                    ),
                ];

                let existingCourse = await Courses.findOne({
                    $or: [{ code_slug: courseCodeSlug }, { code: courseCode }],
                });

                let resolvedCourseId: number;
                let resolvedCourseName: string;

                if (existingCourse) {
                    let updated = false;

                    if (existingCourse.code_slug !== courseCodeSlug) {
                        existingCourse.code_slug = courseCodeSlug;
                        updated = true;
                    }

                    if (existingCourse.code !== courseCode) {
                        existingCourse.code = courseCode;
                        updated = true;
                    }

                    if (!existingCourse.term_keys.includes(termKey)) {
                        existingCourse.term_keys.push(termKey);
                        updated = true;
                    }

                    if (isRequirement) {
                        if (
                            !existingCourse.requirement_codes.includes(
                                sourceArea
                            )
                        ) {
                            existingCourse.requirement_codes.push(sourceArea);
                            const requirementName =
                                requirementMap.get(sourceArea) || sourceArea;
                            existingCourse.requirement_names.push(
                                requirementName
                            );
                            updated = true;
                            console.log(
                                `  + Added requirement: ${sourceArea} - ${requirementName}`
                            );
                        }
                    } else {
                        const deptName =
                            departmentMap.get(sourceArea) || sourceArea;
                        if (
                            !existingCourse.department_names.includes(deptName)
                        ) {
                            existingCourse.department_names.push(deptName);
                            updated = true;
                            console.log(`  + Added department: ${deptName}`);
                        }
                    }

                    if (instructorCxids.length > 0) {
                        if (!existingCourse.all_instructor_cxids) {
                            existingCourse.all_instructor_cxids = [];
                        }
                        instructorCxids.forEach((cxid) => {
                            if (
                                !existingCourse.all_instructor_cxids!.includes(
                                    cxid
                                )
                            ) {
                                existingCourse.all_instructor_cxids!.push(cxid);
                                updated = true;
                                console.log(
                                    `  + Added instructor CxID: ${cxid}`
                                );
                            }
                        });
                    }

                    resolvedCourseId = existingCourse.id;
                    resolvedCourseName = existingCourse.name;

                    if (updated) {
                        await existingCourse.save();
                        console.log(`  ✓ Updated course ${courseCode}`);
                        summary.coursesUpdated++;
                    } else {
                        summary.coursesSkipped++;
                    }
                } else {
                    const nextId = nextCourseId++;
                    const deptCode = extractDepartmentCode(courseCode);

                    let departmentNames: string[] = [];
                    let requirementCodes: string[] = [];
                    let requirementNames: string[] = [];

                    if (isRequirement) {
                        requirementCodes = [sourceArea];
                        requirementNames = [
                            requirementMap.get(sourceArea) || sourceArea,
                        ];
                        departmentNames = getDepartmentNames(deptCode);
                    } else {
                        departmentNames = [
                            departmentMap.get(sourceArea) || sourceArea,
                        ];
                    }

                    const newCourse = new Courses({
                        id: nextId,
                        code: courseCode,
                        code_slug: courseCodeSlug,
                        name: apiCourse.Name
                            ? apiCourse.Name.trim()
                            : 'Untitled Course',
                        department_names: departmentNames,
                        requirement_codes: requirementCodes,
                        requirement_names: requirementNames,
                        term_keys: [termKey],
                        description: apiCourse.Description || '',
                        all_instructor_ids: [],
                        all_instructor_cxids: instructorCxids,
                    });

                    resolvedCourseId = nextId;
                    resolvedCourseName = apiCourse.Name
                        ? apiCourse.Name.trim()
                        : 'Untitled Course';

                    await newCourse.save();
                    console.log(`  ✓ Created course ${courseCode}`);
                    summary.coursesCreated++;
                }

                // Sync instructor documents for this course.
                // Tier 1: CxID lookup (handles same school, name variant this term).
                // Tier 2: stripped-name lookup (same person, different school → different CxID).
                for (const apiInstructor of apiCourse.Instructors ?? []) {
                    if (!apiInstructor.CxID || isNaN(apiInstructor.CxID))
                        continue;

                    const courseRef = {
                        courseId: resolvedCourseId,
                        courseCode: generateCodeSlug(courseCode),
                        courseName: resolvedCourseName,
                    };
                    const normalizedName = normalizeInstructorName(
                        apiInstructor.Name
                    );

                    let match =
                        instructorByCxid.get(apiInstructor.CxID) ??
                        instructorByName.get(normalizedName);

                    if (match) {
                        const needsCxid = !(match.cxids ?? []).includes(
                            apiInstructor.CxID
                        );
                        const needsCourse = !(match.courses ?? []).some(
                            (c) => c.courseId === resolvedCourseId
                        );

                        if (needsCxid || needsCourse) {
                            await Instructors.updateOne(
                                { id: match.id },
                                {
                                    ...(needsCxid && {
                                        $addToSet: {
                                            cxids: apiInstructor.CxID,
                                        },
                                    }),
                                    ...(needsCourse && {
                                        $push: { courses: courseRef },
                                    }),
                                }
                            );
                            // Keep in-memory state current so repeat appearances
                            // of the same course (from a different source area)
                            // don't trigger a second $push.
                            if (needsCxid) {
                                if (!match.cxids) match.cxids = [];
                                match.cxids.push(apiInstructor.CxID);
                                instructorByCxid.set(apiInstructor.CxID, match);
                            }
                            if (needsCourse) {
                                if (!match.courses) match.courses = [];
                                match.courses.push(courseRef);
                            }
                        }
                    } else {
                        const newDoc = {
                            id: nextInstructorId++,
                            name: stripMiddleName(apiInstructor.Name),
                            cxids: [apiInstructor.CxID],
                            numReviews: 0,
                            courses: [courseRef],
                        };
                        await Instructors.create(newDoc);
                        instructorByCxid.set(
                            apiInstructor.CxID,
                            newDoc as InstructorLean
                        );
                        instructorByName.set(
                            normalizedName,
                            newDoc as InstructorLean
                        );
                        console.log(
                            `  + New instructor: ${newDoc.name} (CxID ${apiInstructor.CxID})`
                        );
                    }
                }

                processedCourses.add(courseCode);
            } catch (error: any) {
                console.error(
                    `  ✗ Error processing ${apiCourse.CourseCode}:`,
                    error.message
                );
                summary.errors++;
                summary.errorDetails.push(
                    `${apiCourse.CourseCode}: ${error.message}`
                );
            }
        }

        summary.uniqueCourses = processedCourses.size;

        console.log('\n=== Processing Summary ===');
        console.log(`Courses created: ${summary.coursesCreated}`);
        console.log(`Courses updated: ${summary.coursesUpdated}`);
        console.log(`Courses skipped: ${summary.coursesSkipped}`);
        console.log(`Unique courses: ${summary.uniqueCourses}`);
        console.log(`Errors: ${summary.errors}`);

        return summary;
    } catch (error: any) {
        console.error('Fatal error processing courses:', error.message);
        throw error;
    }
}

async function main() {
    const API_KEY = process.env.COURSE_API_KEY;
    if (!API_KEY) {
        console.error('Error: COURSE_API_KEY environment variable is not set');
        process.exit(1);
    }

    const TERM_KEY = process.argv[2];
    if (!TERM_KEY) {
        console.error(
            'Error: term key argument is required (e.g. `tsx updateCourses.ts "2026;SP"`)'
        );
        process.exit(1);
    }

    try {
        const MONGODB_URI =
            process.env.MONGODB_URI_PROD ||
            'mongodb://localhost:27017/school-platform';
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        console.log('Fetching course areas...');
        await fetchDepartmentMappings(API_KEY);

        const coursesWithSource = await fetchAllCoursesFromAPI(
            TERM_KEY,
            API_KEY
        );

        console.log('\nProcessing courses...');
        await updateCoursesFromAPI(coursesWithSource, TERM_KEY);

        console.log('\n✓ Script completed successfully');
    } catch (error: any) {
        console.error('Error in main:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

if (require.main === module) {
    main();
}

export {
    updateCoursesFromAPI,
    stripSectionNumber,
    generateCodeSlug,
    fetchAllCoursesFromAPI,
    fetchDepartmentMappings,
};
