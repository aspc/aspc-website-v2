import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

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

  async getEvents(): Promise<any[]> {
    try {
      // Calculate time range in milliseconds
      const startTime = new Date();
      startTime.setDate(startTime.getDate() - 7); // 7 days ago
      const endTime = new Date();
      endTime.setDate(endTime.getDate() + 7); // 7 days from now

      const response = await axios.get(this.apiUrl, {
        headers: {
          'Accept': 'application/json',
          'X-Engage-Api-Key': this.apiKey
        },
        params: {
          startDate: startTime.getTime(),
          endDate: endTime.getTime()
        }
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
    return filter.includes(event.eventName.trim()) || event.typeName === 'Organization Only';
  }

  private formatEvent(event: any): any {
    // timezeone offset didnt work
    // const offset = new Date().getTimezoneOffset() * 60000;
    return {
      name: event.eventName,
      location: event.locationName || 'N/A',
      description: this.sanitizeHtml(event.description),
      host: event.organizationName,
      details_url: event.eventUrl,
      start: new Date(parseInt(event.startDateTime)).toLocaleString(),
      end: new Date(parseInt(event.endDateTime)).toLocaleString(),
      status: 'approved'
    };
  }

  private sanitizeHtml(html: string): string {
    if (!html) return '';
    
    return html
        // First replace common HTML entities
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        // Remove HTML tags
        .replace(/<[^>]*>/g, '')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim();
  } 
}

export default new EngageEventsService();
