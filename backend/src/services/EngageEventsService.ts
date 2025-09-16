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

    constructor() {
        if (!process.env.ENGAGE_API_URL || !process.env.ENGAGE_API_KEY) {
            throw new Error('ENGAGE_API_URL and ENGAGE_API_KEY must be set');
        }
        this.apiUrl = process.env.ENGAGE_API_URL;
        this.apiKey = process.env.ENGAGE_API_KEY;
    }

    async getEvents(startTime: number, endTime: number): Promise<Event[]> {
        try {
            const response = await axios.get(this.apiUrl, {
                headers: {
                    Accept: 'application/json',
                    'X-Engage-Api-Key': this.apiKey,
                },
                params: {
                    startDate: startTime,
                    endDate: endTime,
                },
            });

            const engageEvents = response.data.items;
            return engageEvents
                .filter((event: any) => !this.shouldSkipEvent(event))
                .map((event: any) => this.formatEvent(event));
        } catch (error) {
            console.error('Error fetching Engage events:', error);
            throw error;
        }
    }

    private shouldSkipEvent(event: any): boolean {
        const filter = ['Sunday Practice', 'General Meetings'];
        return (
            filter.includes(event.eventName.trim()) ||
            event.typeName === 'Organization Only'
        );
    }

    private formatEvent(event: any): Event {
        // TODO: TEMPORARY SOLUTION Production environment: subtract 8 hours from start and end times
        if (process.env.NODE_ENV === 'production') {
            // Subtract 8 hours for production environment
            const startDateTime = new Date(parseInt(event.startDateTime));
            const endDateTime = new Date(parseInt(event.endDateTime));

            startDateTime.setTime(startDateTime.getTime() - 7 * 60 * 60 * 1000);
            endDateTime.setTime(endDateTime.getTime() - 7 * 60 * 60 * 1000);

            return {
                name: event.eventName,
                location: event.otherLocation || 'N/A',
                description: event.description,
                host: event.organizationName,
                details_url: event.eventUrl,
                start: startDateTime.toLocaleString(),
                end: endDateTime.toLocaleString(),
                status: 'approved',
            };
        }

        // Non-production environment
        return {
            name: event.eventName,
            location: event.otherLocation || 'N/A',
            description: event.description,
            host: event.organizationName,
            details_url: event.eventUrl,
            start: new Date(parseInt(event.startDateTime)).toLocaleString(),
            end: new Date(parseInt(event.endDateTime)).toLocaleString(),
            status: 'approved',
        };
    }
}

export default new EngageEventsService();
