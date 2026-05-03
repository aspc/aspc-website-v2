import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

type Event = {
    name: string;
    location: string;
    description: string;
    host: string;
    details_url: string;
    start: string;
    end: string;
    status: string;
};

class EngageEventsService {
    private apiUrl: string;
    private apiKey: string;
    private orgCache = new Map<number, string>();

    constructor() {
        if (!process.env.ENGAGE_API_URL || !process.env.ENGAGE_API_KEY) {
            throw new Error('ENGAGE_API_URL and ENGAGE_API_KEY must be set');
        }
        this.apiUrl = process.env.ENGAGE_API_URL;
        this.apiKey = process.env.ENGAGE_API_KEY;
    }

    async getEvents(startTime: number, endTime: number): Promise<Event[]> {
        try {
            let page = 1;
            const take = 100;

            while (true) {
                const response = await axios.get(
                    `https://engage-api.campuslabs.com/api/v3.0/organizations/organization`,
                    {
                        headers: { 'X-Engage-Api-Key': this.apiKey },
                        params: {
                            skip: (page - 1) * take,
                            take: take,
                        },
                    }
                );

                const items = response.data.items;
                for (const org of items) {
                    if (org.id && org.name) {
                        this.orgCache.set(org.id, org.name);
                    }
                }

                // stop when last page
                if (items.length < take) break;

                page++;
            }
        } catch (error) {
            console.error('Failed to fetch organizations:', error);
        }
        try {
            const response = await axios.get(this.apiUrl, {
                headers: {
                    Accept: 'application/json',
                    'X-Engage-Api-Key': this.apiKey,
                },
                params: {
                    startsAfter: new Date(startTime).toISOString(),
                    startsBefore: new Date(endTime).toISOString(),
                    take: 100,
                },
            });

            const engageEvents: any[] = response.data.items;
            return Promise.all(
                engageEvents
                    .filter((event) => !this.shouldSkipEvent(event))
                    .map((event) => this.formatEvent(event))
            );
        } catch (error) {
            console.error('Error fetching Engage events:', error);
            throw error;
        }
    }

    private shouldSkipEvent(event: any): boolean {
        const filter = ['Sunday Practice', 'General Meetings'];
        return (
            filter.includes(event.name?.trim()) ||
            event.visibility === 'InstitutionOnly'
        );
    }

    private async getOrgName(orgId: number): Promise<string> {
        if (this.orgCache.has(orgId)) {
            return this.orgCache.get(orgId)!;
        }
        return '';
    }

    private async formatEvent(event: any): Promise<Event> {
        const host = event.submittedByOrganizationId
            ? await this.getOrgName(event.submittedByOrganizationId)
            : '';

        return {
            name: event.name,
            location: event.address?.name || 'N/A',
            description: event.description,
            host,
            details_url: `https://claremont.campuslabs.com/engage/event/${event.id}`,
            start: new Date(event.startsOn).toLocaleString(),
            end: new Date(event.endsOn).toLocaleString(),
            status: event.state?.status?.toLowerCase() ?? 'approved',
        };
    }
}

export default new EngageEventsService();
