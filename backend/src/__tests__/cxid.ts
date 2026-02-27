import axios from 'axios';
import * as fs from 'fs';

// ============================================================================
// PHASE 1: Build Complete CxID Mappings
// ============================================================================
// This script fetches ALL historical course data from the Pomona API
// and builds mappings needed for the CxID migration

interface APIInstructor {
    EmailAddress: string | null;
    Name: string;
    CxID: number;
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
    PermCount: string | null;
    PrimaryAssociation: string;
    Requisites: string;
    Schedules: any[];
    SeatsFilled: string | null;
    SeatsTotal: string | null;
    Session: string;
    SubSession: string;
    Year: string;
}

interface CourseArea {
    Code: string;
    Description: string;
}

interface CxIDMapping {
    courseCode: string; // Format: "GOVT156C-CM" to match code_slug
    termKey: string;
    instructorName: string;
    cxid: number;
}

interface InstructorCxIDs {
    name: string;
    cxids: Set<number>;
}

interface CourseCxIDs {
    courseCode: string; // Format: "GOVT156C-CM" to match code_slug
    cxids: Set<number>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate all term keys from 2002;FA to current term
 */
function generateTermKeys(): string[] {
    const terms: string[] = [];
    const currentYear = 2025;
    const currentMonth = 11; // November

    // Determine current term (FA if after July, SP otherwise)
    const currentTerm = currentMonth >= 7 ? 'FA' : 'SP';

    for (let year = 2002; year <= currentYear; year++) {
        // Spring term
        if (year > 2002 || currentTerm === 'SP') {
            terms.push(`${year};SP`);
        }

        // Fall term
        if (
            year < currentYear ||
            (year === currentYear && currentTerm === 'FA')
        ) {
            terms.push(`${year};FA`);
        }
    }

    return terms;
}

/**
 * Fetch all course areas from API
 */
async function fetchCourseAreas(): Promise<string[]> {
    try {
        console.log('Fetching course areas...');
        const response = await axios.get<CourseArea[]>(
            'https://jicsweb.pomona.edu/api/CourseAreas'
        );

        // Filter for codes that start with letters (not numbers)
        const letterCodes = response.data
            .map((area) => area.Code)
            .filter((code) => /^[A-Z]/.test(code));

        console.log(`Found ${letterCodes.length} course areas:`, letterCodes);
        return letterCodes;
    } catch (error) {
        console.error('Error fetching course areas:', error);
        throw error;
    }
}

/**
 * Fetch courses for a specific term and course area
 */
async function fetchCourses(
    termKey: string,
    courseArea: string
): Promise<APICourse[]> {
    try {
        const url = `https://jicsweb.pomona.edu/api/Courses/${termKey}/${courseArea}`;
        const response = await axios.get<APICourse[]>(url, {
            headers: { 'Authorization-Token': 'INSERT TOKEN' },
        });
        return response.data;
    } catch (error: any) {
        if (error.response?.status === 404) {
            // No courses for this term/area combination - this is normal
            return [];
        }
        console.error(
            `Error fetching ${termKey}/${courseArea}:`,
            error.message
        );
        return [];
    }
}

/**
 * Add delay between requests to avoid rate limiting
 */
function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract base course code from full course code
 * Handles formats like:
 *   "CSCI005  HM-01" -> "CSCI005"
 *   "MUS 130  SC-01" -> "MUS130"
 *   "MATH 058BL  PO-01" -> "MATH058BL"
 *   "BIOL 052R  HM-01" -> "BIOL052R"
 */
function extractBaseCourseCode(courseCode: string): string {
    // Remove ALL whitespace first
    const noWhitespace = courseCode.replace(/\s+/g, '');

    // Remove section suffix (e.g., "HM-01" or "PO-01")
    // Match: course code until we hit a 2-letter school code followed by optional -##
    const match = noWhitespace.match(/^([A-Z0-9]+?)([A-Z]{2})(-\d+)?$/i);

    if (match) {
        // Return just the course code part (without school and section)
        return match[1].toUpperCase();
    }

    // Fallback: return everything before any hyphen
    return noWhitespace.split('-')[0].toUpperCase();
}

/**
 * Extract school code from API course code or use PrimaryAssociation
 * School codes are ONLY 2 letters: HM, PO, CM, SC, PZ
 * Handles formats like:
 *   "CSCI005  HM-01" -> "HM"
 *   "MUS 130  SC-01" -> "SC"
 *   "BIOL 052R  HM-01" -> "HM"
 */
function extractSchoolCode(
    courseCode: string,
    primaryAssociation: string
): string {
    // Remove ALL whitespace
    const noWhitespace = courseCode.replace(/\s+/g, '');

    // Match: course code followed by 2-letter school code, optionally followed by -## section
    // Examples: "CSCI005HM-01", "MUS130SC-01", "BIOL052RHM-01"
    const match = noWhitespace.match(/([A-Z]{2})(?:-\d+)?$/i);

    if (match) {
        return match[1].toUpperCase();
    }

    // Fall back to PrimaryAssociation
    return primaryAssociation || 'UNK';
}

// ============================================================================
// Main Migration Logic
// ============================================================================

async function buildCxIDMappings() {
    console.log('='.repeat(80));
    console.log('PHASE 1: Building CxID Mappings from Historical API Data');
    console.log('='.repeat(80));

    console.log('Step 1: Fetching course areas...');
    const courseAreas = await fetchCourseAreas();

    // Step 2: Generate all term keys
    const termKeys = generateTermKeys();
    console.log(
        `\nGenerated ${termKeys.length} term keys from 2002;FA to present`
    );
    console.log(
        `First term: ${termKeys[0]}, Last term: ${termKeys[termKeys.length - 1]}`
    );

    // Test extraction logic with examples
    console.log('\n' + '='.repeat(80));
    console.log('Testing Extraction Logic (2-letter school codes only):');
    console.log('='.repeat(80));
    const testCases = [
        {
            input: 'CSCI005  HM-01',
            expectedBase: 'CSCI005',
            expectedSchool: 'HM',
        },
        {
            input: 'MUS 130  SC-01',
            expectedBase: 'MUS130',
            expectedSchool: 'SC',
        },
        {
            input: 'MATH 058BL  PO-01',
            expectedBase: 'MATH058BL',
            expectedSchool: 'PO',
        },
        {
            input: 'HIST 100AI  PO-01',
            expectedBase: 'HIST100AI',
            expectedSchool: 'PO',
        },
        {
            input: 'BIOL 052R  HM-01',
            expectedBase: 'BIOL052R',
            expectedSchool: 'HM',
        },
    ];

    testCases.forEach((test) => {
        const base = extractBaseCourseCode(test.input);
        const school = extractSchoolCode(test.input, 'TEST');
        const result = `${base}-${school}`;
        const expected = `${test.expectedBase}-${test.expectedSchool}`;
        const status = result === expected ? '✓' : '✗';
        console.log(
            `${status} "${test.input}" → "${result}" ${result === expected ? '' : `(expected: "${expected}")`}`
        );
    });
    console.log('='.repeat(80) + '\n');

    // Data structures to build
    const cxidMappings: CxIDMapping[] = [];
    const instructorCxIDsMap = new Map<string, Set<number>>(); // instructor name -> all their CxIDs
    const courseCxIDsMap = new Map<string, Set<number>>(); // course code -> all CxIDs that taught it

    let totalCourses = 0;
    let totalInstructors = 0;
    let coursesWithoutInstructors = 0;

    // Step 3: Fetch all courses for all terms and areas
    console.log('\nFetching course data...');
    console.log(
        'This may take a while - processing',
        termKeys.length * courseAreas.length,
        'combinations'
    );

    let requestCount = 0;

    for (const termKey of termKeys) {
        console.log(`\nProcessing ${termKey}...`);

        for (const courseArea of courseAreas) {
            requestCount++;

            // Add delay every 10 requests to be nice to the API
            if (requestCount % 10 === 0) {
                await delay(1000); // 1 second delay
                console.log(
                    `  Progress: ${requestCount}/${termKeys.length * courseAreas.length} requests`
                );
            }

            const courses = await fetchCourses(termKey, courseArea);

            if (courses.length === 0) continue;

            totalCourses += courses.length;

            // Process each course
            for (const course of courses) {
                const baseCourseCode = extractBaseCourseCode(course.CourseCode);
                const schoolCode = extractSchoolCode(
                    course.CourseCode,
                    course.PrimaryAssociation
                );

                // Skip courses without instructors or with invalid instructor data
                if (!course.Instructors || !Array.isArray(course.Instructors)) {
                    // This is normal - some courses might not have instructors assigned yet
                    coursesWithoutInstructors++;
                    continue;
                }

                // Skip courses with empty instructor array
                if (course.Instructors.length === 0) {
                    coursesWithoutInstructors++;
                    continue;
                }

                // Create hyphenated code to match MongoDB code_slug: "CSCI005-HM"
                const hyphenatedCode = `${baseCourseCode}-${schoolCode}`;

                // Initialize course CxIDs set if needed
                if (!courseCxIDsMap.has(hyphenatedCode)) {
                    courseCxIDsMap.set(hyphenatedCode, new Set());
                }

                // Process each instructor
                for (const instructor of course.Instructors) {
                    // Skip if instructor data is invalid
                    if (!instructor || !instructor.Name || !instructor.CxID) {
                        console.warn(
                            `  ⚠️  Invalid instructor data in ${baseCourseCode} ${schoolCode} (${termKey})`
                        );
                        continue;
                    }

                    totalInstructors++;

                    // Add to mappings array (with hyphenated code!)
                    cxidMappings.push({
                        courseCode: hyphenatedCode,
                        termKey: termKey,
                        instructorName: instructor.Name,
                        cxid: instructor.CxID,
                    });

                    // Add to instructor CxIDs map
                    if (!instructorCxIDsMap.has(instructor.Name)) {
                        instructorCxIDsMap.set(instructor.Name, new Set());
                    }
                    instructorCxIDsMap
                        .get(instructor.Name)!
                        .add(instructor.CxID);

                    // Add to course CxIDs map (with hyphenated code!)
                    courseCxIDsMap.get(hyphenatedCode)!.add(instructor.CxID);
                }
            }
        }
    }

    // Step 4: Convert Maps to serializable objects
    const instructorCxIDsList: { name: string; cxids: number[] }[] = [];
    instructorCxIDsMap.forEach((cxids, name) => {
        instructorCxIDsList.push({
            name,
            cxids: Array.from(cxids).sort(),
        });
    });

    const courseCxIDsList: { courseCode: string; cxids: number[] }[] = [];
    courseCxIDsMap.forEach((cxids, hyphenatedCode) => {
        courseCxIDsList.push({
            courseCode: hyphenatedCode, // Already in "CSCI005-HM" format
            cxids: Array.from(cxids).sort(),
        });
    });

    // Step 5: Save mappings to files
    console.log('\n' + '='.repeat(80));
    console.log('Saving mappings to files...');

    const outputDir = './migration-data';
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save complete CxID mappings (course + term + instructor -> CxID)
    fs.writeFileSync(
        `${outputDir}/cxid-mappings.json`,
        JSON.stringify(cxidMappings, null, 2)
    );
    console.log(
        `✓ Saved ${cxidMappings.length} CxID mappings to cxid-mappings.json`
    );

    // Save instructor CxIDs (instructor name -> all their CxIDs)
    fs.writeFileSync(
        `${outputDir}/instructor-cxids.json`,
        JSON.stringify(instructorCxIDsList, null, 2)
    );
    console.log(
        `✓ Saved ${instructorCxIDsList.length} instructors to instructor-cxids.json`
    );

    // Save course CxIDs (course code -> all CxIDs that taught it)
    fs.writeFileSync(
        `${outputDir}/course-cxids.json`,
        JSON.stringify(courseCxIDsList, null, 2)
    );
    console.log(
        `✓ Saved ${courseCxIDsList.length} courses to course-cxids.json`
    );

    // Save summary statistics
    const summary = {
        totalTermsProcessed: termKeys.length,
        totalCourseAreasProcessed: courseAreas.length,
        totalCoursesFound: totalCourses,
        coursesWithoutInstructors: coursesWithoutInstructors,
        totalInstructorInstances: totalInstructors,
        uniqueInstructors: instructorCxIDsList.length,
        uniqueCourses: courseCxIDsList.length,
        uniqueCxIDs: new Set(cxidMappings.map((m) => m.cxid)).size,
        instructorsWithMultipleCxIDs: instructorCxIDsList.filter(
            (i) => i.cxids.length > 1
        ).length,
        dateGenerated: new Date().toISOString(),
    };

    fs.writeFileSync(
        `${outputDir}/summary.json`,
        JSON.stringify(summary, null, 2)
    );

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('PHASE 1 COMPLETE - Summary:');
    console.log('='.repeat(80));
    console.log(`Terms processed: ${summary.totalTermsProcessed}`);
    console.log(`Course areas processed: ${summary.totalCourseAreasProcessed}`);
    console.log(`Total courses found: ${summary.totalCoursesFound}`);
    console.log(
        `Courses without instructors: ${summary.coursesWithoutInstructors}`
    );
    console.log(
        `Total instructor instances: ${summary.totalInstructorInstances}`
    );
    console.log(`Unique instructors: ${summary.uniqueInstructors}`);
    console.log(`Unique courses: ${summary.uniqueCourses}`);
    console.log(`Unique CxIDs: ${summary.uniqueCxIDs}`);
    console.log(
        `Instructors with multiple CxIDs: ${summary.instructorsWithMultipleCxIDs}`
    );
    console.log('\nAll data saved to ./migration-data/ directory');
    console.log('='.repeat(80));
}

// ============================================================================
// Execute
// ============================================================================

buildCxIDMappings()
    .then(() => {
        console.log('\n✅ Phase 1 completed successfully!');
        console.log('\nNext steps:');
        console.log('  1. Review the generated files in ./migration-data/');
        console.log('  2. Proceed to Phase 2: Update Instructors schema');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Error during Phase 1:', error);
        process.exit(1);
    });
