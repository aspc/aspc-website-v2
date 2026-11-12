import { SENATE_POSITIONS } from './election.constants';

const labelFromId = (id: string) =>
    id
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

export const SUPER_ADMIN_ROLE_IDS = [
    'president',
    'chief_of_staff',
    'sdg',
] as const;

export const MULTI_ADMIN_ROLE_IDS = ['sdg'] as const;

export type AdminRole = {
    id: string;
    label: string;
    superAdmin: boolean;
    multiple?: boolean;
};

export const ADMIN_ROLES: AdminRole[] = [
    { id: 'president', label: 'President', superAdmin: true },
    {
        id: 'chief_of_staff',
        label: 'Chief of Staff',
        superAdmin: true,
    },
    {
        id: 'sdg',
        label: 'Software Development Group',
        superAdmin: true,
        multiple: true,
    },
    {
        id: 'director_of_elections',
        label: 'Director of Elections',
        superAdmin: false,
    },
    {
        id: 'director_of_operations',
        label: 'Director of Operations',
        superAdmin: false,
    },
    {
        id: 'director_of_public_relations',
        label: 'Director of Public Relations',
        superAdmin: false,
    },
    {
        id: 'director_of_community_partnerships',
        label: 'Director of Community Partnerships',
        superAdmin: false,
    },
    {
        id: 'senate_secretary',
        label: 'Senate Secretary',
        superAdmin: false,
    },
    {
        id: 'senior_treasurer',
        label: 'Senior Treasurer',
        superAdmin: false,
    },
    {
        id: 'junior_treasurer',
        label: 'Junior Treasurer',
        superAdmin: false,
    },
    ...Object.values(SENATE_POSITIONS)
        .filter(
            (id) =>
                id !== SENATE_POSITIONS.PRESIDENT &&
                id !== SENATE_POSITIONS.CLASS_NAME &&
                id !== SENATE_POSITIONS.COMMENCEMENT_SPEAKER
        )
        .map((id) => ({
            id,
            label: labelFromId(id),
            superAdmin: false,
        })),
];

const ADMIN_ROLE_IDS = new Set(ADMIN_ROLES.map((role) => role.id));
const SUPER_ADMIN_ROLE_ID_SET = new Set<string>(SUPER_ADMIN_ROLE_IDS);

export const isKnownAdminRole = (role: string): boolean =>
    ADMIN_ROLE_IDS.has(role);

export const isSuperAdminRole = (role: string | null | undefined): boolean =>
    Boolean(role && SUPER_ADMIN_ROLE_ID_SET.has(role));

export const privilegesForRole = (role: string | null | undefined) => {
    if (!role) {
        return { isAdmin: false, isSuperAdmin: false };
    }
    return {
        isAdmin: true,
        isSuperAdmin: isSuperAdminRole(role),
    };
};
