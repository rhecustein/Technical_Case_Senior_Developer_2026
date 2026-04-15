import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { OdooConfig, OdooSession } from './interfaces/odoo-config.interface';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params: Record<string, unknown>;
  id: number;
}

interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data: unknown;
  };
}

interface AuthResult {
  uid: number;
  session_id?: string;
}

@Injectable()
export class OdooClientService implements OnModuleInit {
  private readonly logger = new Logger(OdooClientService.name);
  private readonly config: OdooConfig;
  private session: OdooSession | null = null;
  private readonly sessionTtlMs = 30 * 60 * 1000; // 30 minutes
  private readonly http: AxiosInstance;
  private requestId = 0;

  constructor() {
    this.config = {
      url: process.env['ODOO_URL'] ?? 'http://odoo:8069',
      database: process.env['ODOO_DATABASE'] ?? 'odoo',
      username: process.env['ODOO_USERNAME'] ?? 'admin',
      password: process.env['ODOO_PASSWORD'] ?? 'admin',
      apiKey: process.env['ODOO_API_KEY'] ?? '',
    };

    this.http = axios.create({
      baseURL: this.config.url,
      timeout: 120000,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {}),
      },
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.authenticate();
    } catch (err) {
      this.logger.warn('Initial Odoo authentication failed — will retry on first request');
    }
  }

  /**
   * Authenticate against Odoo and cache the session.
   * Only re-authenticates if session is expired or missing.
   */
  async authenticate(): Promise<number> {
    if (this.isSessionValid()) {
      return this.session!.uid;
    }

    this.logger.log('Authenticating with Odoo (session cache miss)...');

    const body: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'call',
      id: this.nextId(),
      params: {
        db: this.config.database,
        login: this.config.username,
        password: this.config.password,
      },
    };

    const response = await this.http.post<JsonRpcResponse<AuthResult>>(
      '/web/session/authenticate',
      body,
    );

    const result = response.data.result;
    if (!result?.uid) {
      throw new Error('Odoo authentication failed — check credentials and database name');
    }

    const sessionCookie = response.headers['set-cookie']?.[0] ?? '';
    const sessionId = this.extractSessionId(sessionCookie);

    this.session = {
      uid: result.uid,
      sessionId,
      authenticatedAt: new Date(),
    };

    // Attach session cookie for subsequent requests
    this.http.defaults.headers.common['Cookie'] = sessionCookie;

    this.logger.log(`Odoo authenticated successfully. UID: ${result.uid}`);
    return result.uid;
  }

  async execute<T = unknown>(
    model: string,
    method: string,
    args: unknown[],
    kwargs: Record<string, unknown> = {},
  ): Promise<T> {
    const uid = await this.authenticate();

    const body: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'call',
      id: this.nextId(),
      params: {
        model,
        method,
        args,
        kwargs,
      },
    };

    try {
      const response = await this.http.post<JsonRpcResponse<T>>(
        `/web/dataset/call_kw/${model}/${method}`,
        body,
      );

      if (response.data.error) {
        throw new Error(`Odoo RPC error: ${JSON.stringify(response.data.error)}`);
      }

      return response.data.result as T;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        // Session expired — clear cache and retry once
        this.logger.warn('Session expired, re-authenticating...');
        this.session = null;
        return this.execute<T>(model, method, args, kwargs);
      }
      throw err;
    }
  }

  async searchRead<T = unknown>(
    model: string,
    domain: unknown[],
    fields: string[],
    options: { offset?: number; limit?: number; order?: string } = {},
  ): Promise<T[]> {
    return this.execute<T[]>(model, 'search_read', [domain], {
      fields,
      ...options,
    });
  }

  async searchCount(model: string, domain: unknown[]): Promise<number> {
    return this.execute<number>(model, 'search_count', [domain]);
  }

  async create(model: string, vals: Record<string, unknown>): Promise<number> {
    return this.execute<number>(model, 'create', [vals]);
  }

  async write(
    model: string,
    ids: number[],
    vals: Record<string, unknown>,
  ): Promise<boolean> {
    return this.execute<boolean>(model, 'write', [ids, vals]);
  }

  async unlink(model: string, ids: number[]): Promise<boolean> {
    return this.execute<boolean>(model, 'unlink', [ids]);
  }

  private isSessionValid(): boolean {
    if (!this.session) return false;
    const elapsed = Date.now() - this.session.authenticatedAt.getTime();
    return elapsed < this.sessionTtlMs;
  }

  private extractSessionId(cookieHeader: string): string {
    const match = /session_id=([^;]+)/.exec(cookieHeader);
    return match?.[1] ?? '';
  }

  private nextId(): number {
    return ++this.requestId;
  }
}
