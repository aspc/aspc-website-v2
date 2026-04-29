import { NavPagesKey, NavSectionConfig, PageContent } from '@/types';

const officerGroups: string[] = ['Senate', 'Staff', 'CollegeStaff', 'Software'];

export const EMPTY_PAGES_MAP: Record<NavPagesKey, PageContent[]> = {
    about: [],
    members: [],
    resources: [],
    press: [],
};

export const NAV_SECTIONS: NavSectionConfig[] = [
    {
        label: 'About',
        key: 'about',
        pagesKey: 'about',
        extraLinks: [
            { label: 'SCS Internship', href: '/pages/about/scsabout' },
        ],
        submenu: {
            label: 'Officers',
            links: officerGroups.map((g) => ({
                label: g.replace(/([a-z])([A-Z])/g, '$1 $2'),
                href: `/staff/${g}`,
            })),
            pagesKey: 'members',
        },
    },
    {
        label: 'Reviews',
        key: 'reviews',
        extraLinks: [
            { label: 'Course Reviews', href: '/campus/courses' },
            { label: 'Instructor Reviews', href: '/campus/instructors' },
            { label: 'Housing Reviews', href: '/campus/housing' },
            { label: 'Event Reviews', href: '/open-forum' },
        ],
    },
    {
        label: 'Resources',
        key: 'resources',
        pagesKey: 'resources',
    },
    {
        label: 'Press Room',
        key: 'press',
        pagesKey: 'press',
    },
];
