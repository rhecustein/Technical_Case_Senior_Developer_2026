export interface OdooConfig {
  url: string;
  database: string;
  username: string;
  password: string;
  apiKey: string;
}

export interface OdooSession {
  uid: number;
  sessionId: string;
  authenticatedAt: Date;
}
