import { useEffect, useState } from 'react';
import { IElectionFrontend } from '@/types';

type ElectionResult = {
    election: IElectionFrontend | null;
    isActive: boolean;
};

const NO_ELECTION: ElectionResult = { election: null, isActive: false };

let inflight: Promise<ElectionResult> | null = null;

const fetchElection = async (): Promise<ElectionResult> => {
    try {
        const res = await fetch(
            `${process.env.BACKEND_LINK}/api/voting/election`,
            { credentials: 'include' }
        );
        if (!res.ok) return NO_ELECTION;

        const data: IElectionFrontend = await res.json();
        const now = new Date();
        const isActive =
            new Date(data.startDate) <= now && new Date(data.endDate) > now;
        return { election: isActive ? data : null, isActive };
    } catch (error) {
        console.error('Error fetching election:', error);
        return NO_ELECTION;
    }
};

const getElection = (): Promise<ElectionResult> => {
    if (!inflight) {
        inflight = fetchElection();
    }
    return inflight;
};

export function useElection() {
    const [result, setResult] = useState<ElectionResult>(NO_ELECTION);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        getElection().then((r) => {
            if (!cancelled) {
                setResult(r);
                setLoading(false);
            }
        });
        return () => {
            cancelled = true;
        };
    }, []);

    return {
        election: result.election,
        showElection: result.isActive,
        loading,
    };
}
