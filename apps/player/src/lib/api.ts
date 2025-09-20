import type { paths } from '../types/openapi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type JoinResponse = paths['/join']['post']['responses']['200']['content']['application/json'];
type ResumeResponse = paths['/resume']['post']['responses']['200']['content']['application/json'];
type SnapshotResponse = paths['/games/{id}/snapshot']['get']['responses']['200']['content']['application/json'];
type MarkResponse = paths['/cards/{cardId}/mark']['post']['responses']['200']['content']['application/json'];
type ClaimResponse = paths['/cards/{cardId}/claim']['post']['responses']['200']['content']['application/json'];

export interface AuthState {
  sessionToken?: string;
  resumeToken?: string;
  onTokenUpdate?: (sessionToken: string) => void;
  onResumeToken?: (resumeToken: string) => void;
}

class ApiClient {
  private auth: AuthState = {};

  setAuth(auth: AuthState) {
    this.auth = auth;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.auth.sessionToken) {
      headers['Authorization'] = `Bearer ${this.auth.sessionToken}`;
    }

    let response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    // Handle 401 with resume retry
    if (response.status === 401 && this.auth.resumeToken) {
      const resumed = await this.resume(this.auth.resumeToken);
      if (resumed && resumed.sessionToken) {
        // Update token and retry
        this.auth.sessionToken = resumed.sessionToken;
        this.auth.onTokenUpdate?.(resumed.sessionToken);

        headers['Authorization'] = `Bearer ${resumed.sessionToken}`;
        response = await fetch(`${API_URL}${path}`, {
          ...options,
          headers,
        });
      }
    }

    if (!response.ok) {
      const error = await response.text().catch(() => '');
      throw new Error(`API Error ${response.status}: ${error}`);
    }

    return response.json();
  }

  async join(pin: string, nickname: string): Promise<JoinResponse> {
    return this.request<JoinResponse>('/join', {
      method: 'POST',
      body: JSON.stringify({ pin, nickname }),
    });
  }

  async resume(resumeToken: string): Promise<ResumeResponse | null> {
    try {
      return await this.request<ResumeResponse>('/resume', {
        method: 'POST',
        body: JSON.stringify({ resumeToken }),
      });
    } catch {
      return null;
    }
  }

  async getSnapshot(gameId: string): Promise<SnapshotResponse> {
    return this.request<SnapshotResponse>(`/games/${gameId}/snapshot`);
  }

  async markCell(
    cardId: string,
    position: number,
    marked: boolean
  ): Promise<MarkResponse> {
    const idemKey = crypto.randomUUID();
    return this.request<MarkResponse>(`/cards/${cardId}/mark`, {
      method: 'POST',
      body: JSON.stringify({ position, marked, idemKey }),
    });
  }

  async submitClaim(
    cardId: string,
    pattern: string
  ): Promise<ClaimResponse> {
    const idemKey = crypto.randomUUID();
    return this.request<ClaimResponse>(`/cards/${cardId}/claim`, {
      method: 'POST',
      body: JSON.stringify({ pattern, idemKey }),
    });
  }
}

export const api = new ApiClient();