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
                // Not every IdP emits AuthnInstant, and nothing reads it.
                authnInstant?: string;
                sessionIndex: string;
            };
            nameID: string;
        };
    }
}

export {};
