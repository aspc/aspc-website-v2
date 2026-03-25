import 'express-session';

declare module 'express-session' {
    interface SessionData {
        authRequest?: string;
        user?: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            sessionIndex: {
                authnInstant: string;
                sessionIndex: string;
            };
            nameID: string;
        };
    }
}

export {};
