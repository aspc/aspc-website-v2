export const SENATE_POSITIONS = {
    PRESIDENT: 'president',
    VP_FINANCE: 'vp_finance',
    VP_STUDENT_AFFAIRS: 'vp_student_affairs',
    VP_ACADEMIC_AFFAIRS: 'vp_academic_affairs',
    COMMISSIONER_ATHLETICS: 'commissioner_athletics',
    COMMISSIONER_CAMPUS_EVENTS: 'commissioner_campus_events',
    COMMISSIONER_EQUITY_INCLUSION: 'commissioner_equity_inclusion',
    COMMISSIONER_FACILITIES_ENVIRONMENT: 'commissioner_facilities_environment',
    COMMISSIONER_WELFARE: 'commissioner_welfare',
    SENIOR_CLASS_PRESIDENT: 'senior_class_president',
    JUNIOR_CLASS_PRESIDENT: 'junior_class_president',
    SOPHOMORE_CLASS_PRESIDENT: 'sophomore_class_president',
    FIRST_YEAR_CLASS_PRESIDENT: 'first_year_class_president',
    NORTH_CAMPUS_REPRESENTATIVE: 'north_campus_representative',
    SOUTH_CAMPUS_REPRESENTATIVE: 'south_campus_representative',
    TRUSTEE_REPRESENTATIVE_FINANCE: 'trustee_representative_finance',
    TRUSTEE_REPRESENTATIVE_STUDENT_AFFAIRS:
        'trustee_representative_student_affairs',
    TRUSTEE_REPRESENTATIVE_EDUCATIONAL_QUALITY:
        'trustee_representative_educational_quality',
    COMMENCEMENT_SPEAKER: 'commencement_speaker',
    CLASS_NAME: 'class_name',
} as const;

export const FALL_POSITIONS = [
    SENATE_POSITIONS.FIRST_YEAR_CLASS_PRESIDENT,
    SENATE_POSITIONS.NORTH_CAMPUS_REPRESENTATIVE,
    SENATE_POSITIONS.SOUTH_CAMPUS_REPRESENTATIVE,
] as const;

export const SPRING_POSITIONS = Object.values(SENATE_POSITIONS).filter(
    (pos) => !(FALL_POSITIONS as readonly string[]).includes(pos)
);

export const getPositionsForSemester = (
    semester: 'spring' | 'fall' | 'other'
) => {
    if (semester === 'fall') {
        return [...FALL_POSITIONS];
    }

    if (semester === 'spring') {
        return [...SPRING_POSITIONS];
    }

    return null;
};
