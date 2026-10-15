import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Shapes mirror the JSON returned by the ML microservice's POST /match.
export interface RideMatchRider {
    user_id: string;
    flight_id: number;
    name: string | null;
}

export interface RideMatchGroup {
    ride_id: number;
    bucket_key: string;
    date: string;
    num_riders: number;
    suggested_time: string;
    earliest_time: string;
    latest_time: string;
    considered_bags: number;
    bags_total: number;
    riders: RideMatchRider[];
    subsidized: boolean;
    ride_type: string | null;
    uber_type: string | null;
}

export interface UnmatchedRider {
    user_id: string;
    flight_id: number;
    name: string | null;
    airport: string;
    to_airport: boolean;
    date: string;
    earliest_time: string;
    latest_time: string;
    bucket_key: string;
    reason: string;
    details: Record<string, unknown>;
}

export interface RideMatchSummary {
    buckets: number;
    groups: number;
    matched_riders: number;
    unmatched_riders: number;
}

export interface RideMatchResponse {
    status: string;
    summary: RideMatchSummary;
    matches: RideMatchGroup[];
    unmatched: UnmatchedRider[];
}

export interface RideMatchServiceStatus {
    configured: boolean;
    reachable: boolean;
    supabaseConfigured?: boolean;
    message?: string;
}

// A hand-entered test rider, sent straight through to the ML service instead
// of it fetching real riders from Supabase. Mirrors RiderInput in
// ml_microservice/app/main.py.
export interface RideMatchRiderInput {
    user_id: string;
    flight_id: number;
    date: string;
    earliest_time: string;
    latest_time: string;
    airport: string;
    to_airport: boolean;
    school: string;
    terminal?: string | null;
    flight_no?: number | null;
    airline_iata?: string | null;
    name?: string | null;
    bags_no?: number;
    bags_no_large?: number;
    bag_no_personal?: number;
}

// Unlike EngageEventsService, this does NOT throw at construction time if
// ML_SERVICE_URL is unset — the rides feature is optional, and the rest of
// the backend must still start up fine without it configured.
class RideMatchingService {
    private get baseUrl(): string | undefined {
        return process.env.ML_SERVICE_URL;
    }

    private get apiKey(): string | undefined {
        return process.env.ML_SERVICE_API_KEY;
    }

    private headers(): Record<string, string> {
        return this.apiKey ? { 'X-API-Key': this.apiKey } : {};
    }

    isConfigured(): boolean {
        return !!this.baseUrl;
    }

    async getStatus(): Promise<RideMatchServiceStatus> {
        if (!this.baseUrl) {
            return {
                configured: false,
                reachable: false,
                message: 'ML_SERVICE_URL is not set on the backend.',
            };
        }

        try {
            const response = await axios.get(this.baseUrl, {
                headers: this.headers(),
                timeout: 5000,
            });
            return {
                configured: true,
                reachable: true,
                supabaseConfigured: !!response.data?.supabase_configured,
            };
        } catch (error) {
            console.error('Ride matching service unreachable:', error);
            return {
                configured: true,
                reachable: false,
                message: 'Could not reach the ride matching service.',
            };
        }
    }

    async runMatching(params: {
        riders?: RideMatchRiderInput[];
        daysAhead?: number;
        daysAheadStart?: number;
    }): Promise<RideMatchResponse> {
        if (!this.baseUrl) {
            throw new Error('ML_SERVICE_URL must be set to run ride matching.');
        }

        // Riders supplied directly (manual testing) bypass the ML service's
        // own Supabase fetch entirely — days_ahead/_start are meaningless then.
        const body = params.riders
            ? { riders: params.riders }
            : {
                  days_ahead: params.daysAhead,
                  days_ahead_start: params.daysAheadStart,
              };

        const response = await axios.post<RideMatchResponse>(
            `${this.baseUrl}/match`,
            body,
            { headers: this.headers(), timeout: 30000 }
        );
        return response.data;
    }
}

export default new RideMatchingService();
