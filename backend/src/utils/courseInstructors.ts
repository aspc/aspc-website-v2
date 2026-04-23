/**
 * Instructor associations on a course: prefer Pomona API CxIDs when the migration
 * filled {@code all_instructor_cxids}; otherwise use legacy {@code all_instructor_ids}.
 * Legacy IDs remain for edge cases until coverage is complete; callers should not
 * merge both lists for display.
 */

export type InstructorAssociationMode = 'cxid' | 'legacy';

export interface CourseInstructorAssociation {
    mode: InstructorAssociationMode;
    keys: number[];
}

export function getCourseInstructorAssociationKeys(course: {
    all_instructor_cxids?: number[];
    all_instructor_ids?: number[];
}): CourseInstructorAssociation {
    const cx = course.all_instructor_cxids;
    if (Array.isArray(cx) && cx.length > 0) {
        return { mode: 'cxid', keys: cx };
    }
    const ids = course.all_instructor_ids;
    return { mode: 'legacy', keys: Array.isArray(ids) ? ids : [] };
}

/**
 * When saving a review, pick the CxID for this instructor that matches the course's
 * API-derived list when possible; otherwise first known CxID on the instructor doc.
 */
export function pickInstructorCxidForCourse(
    instructor: { cxids?: number[] },
    courseCxids: number[] | undefined
): number | undefined {
    const fromInstructor = (instructor.cxids ?? []).filter(
        (n) => typeof n === 'number' && !Number.isNaN(n)
    );
    if (fromInstructor.length === 0) return undefined;

    const onCourse = courseCxids?.filter(
        (n) => typeof n === 'number' && !Number.isNaN(n)
    );
    if (onCourse?.length) {
        const overlap = fromInstructor.find((c) => onCourse.includes(c));
        if (overlap !== undefined) return overlap;
    }

    return fromInstructor[0];
}
