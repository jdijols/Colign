export type AuthMode = "mock" | "real";
export declare const authMode: AuthMode;
export declare const auth0Config: {
    domain: string;
    clientId: string;
    audience: string;
};
export declare const isReal: boolean;
