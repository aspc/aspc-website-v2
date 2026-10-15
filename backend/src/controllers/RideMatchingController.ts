import { Request, Response } from 'express';
import axios from 'axios';
import RideMatchingService, {
    RideMatchRiderInput,
} from '../services/RideMatchingService';

const REQUIRED_RIDER_FIELDS = [
    'user_id',
    'flight_id',
    'date',
    'earliest_time',
    'latest_time',
    'airport',
    'to_airport',
    'school',
] as const;

const isValidRider = (r: unknown): r is RideMatchRiderInput => {
    if (!r || typeof r !== 'object') return false;
    const rider = r as Record<string, unknown>;
    return (
        typeof rider.user_id === 'string' &&
        typeof rider.flight_id === 'number' &&
        typeof rider.date === 'string' &&
        typeof rider.earliest_time === 'string' &&
        typeof rider.latest_time === 'string' &&
        typeof rider.airport === 'string' &&
        typeof rider.to_airport === 'boolean' &&
        typeof rider.school === 'string'
    );
};

export const getRideMatchingStatus = async (req: Request, res: Response) => {
    try {
        const status = await RideMatchingService.getStatus();
        res.json(status);
    } catch (error) {
        console.error('Error checking ride matching status:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const runRideMatching = async (req: Request, res: Response) => {
    const { daysAhead, daysAheadStart, riders } = req.body ?? {};

    if (riders !== undefined) {
        if (!Array.isArray(riders) || riders.length === 0) {
            res.status(400).json({
                message: 'riders must be a non-empty array.',
            });
            return;
        }
        if (!riders.every(isValidRider)) {
            res.status(400).json({
                message: `Each rider needs: ${REQUIRED_RIDER_FIELDS.join(', ')}.`,
            });
            return;
        }
    } else {
        if (daysAhead !== undefined && typeof daysAhead !== 'number') {
            res.status(400).json({ message: 'daysAhead must be a number.' });
            return;
        }
        if (
            daysAheadStart !== undefined &&
            typeof daysAheadStart !== 'number'
        ) {
            res.status(400).json({
                message: 'daysAheadStart must be a number.',
            });
            return;
        }
    }

    if (!RideMatchingService.isConfigured()) {
        res.status(503).json({
            message:
                'The ride matching service is not configured. Set ML_SERVICE_URL on the backend.',
        });
        return;
    }

    try {
        const result = await RideMatchingService.runMatching({
            riders,
            daysAhead,
            daysAheadStart,
        });
        res.json(result);
    } catch (error) {
        console.error('Error running ride matching:', error);

        if (axios.isAxiosError(error)) {
            if (error.response) {
                // Relay the ML service's own error detail (e.g. its Supabase
                // env vars aren't set) instead of masking it as a generic 500.
                res.status(error.response.status).json({
                    message:
                        error.response.data?.detail ||
                        'The ride matching service rejected the request.',
                });
                return;
            }
            res.status(502).json({
                message: 'Failed to reach the ride matching service.',
            });
            return;
        }

        res.status(500).json({ message: 'Server error' });
    }
};
