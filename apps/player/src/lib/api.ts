import type { paths, components } from '../types/openapi';

// Extract types from OpenAPI schema
type JoinRequest = components['schemas']['JoinRequest'];
type JoinResponse = components['schemas']['JoinResponse'];
type ResumeRequest = components['schemas']['ResumeRequest'];
type ResumeResponse = components['schemas']['ResumeResponse'];
type MarkRequest = components['schemas']['MarkRequest'];
type MarkResponse = components['schemas']['MarkResponse'];
type ClaimRequest = components['schemas']['ClaimRequest'];
type ClaimResponse = components['schemas']['ClaimResponse'];
type GameSnapshot = components['schemas']['GameSnapshot'];
type BingoPattern = components['schemas']['BingoPattern'];

export type { BingoPattern, JoinResponse, ResumeResponse, GameSnapshot, ClaimResponse, MarkResponse };

class ApiClient {
  private baseUrl: string;
  private sessionToken: string = '';
  private resumeToken: string = '';

  constructor(baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  setAuth(options: { sessionToken?: string; resumeToken?: string }) {
    if (options.sessionToken !== undefined) this.sessionToken = options.sessionToken;
    if (options.resumeToken !== undefined) this.resumeToken = options.resumeToken;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    retryOn401 = true
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.sessionToken) {
      headers['Authorization'] = `Bearer ${this.sessionToken}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    // Handle 401 with resume token retry
    if (response.status === 401 && retryOn401 && this.resumeToken) {
      try {
        const resumed = await this.resume(this.resumeToken);
        if (resumed && resumed.newSessionToken) {
          this.sessionToken = resumed.newSessionToken;
          // Retry original request with new token
          return this.request<T>(path, options, false);
        }
      } catch {
        // Resume failed, throw original 401
      }
    }

    if (!response.ok) {
      const error = await response.text().catch(() => '');
      throw new Error(`API Error ${response.status}: ${error}`);
    }

    return response.json();
  }

  // Core API methods matching OpenAPI contract
  async join(pin: string, nickname: string): Promise<JoinResponse> {
    const body: JoinRequest = { pin, nickname };
    const response = await this.request<JoinResponse>('/join', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    // Store tokens from response
    if (response.sessionToken) {
      this.sessionToken = response.sessionToken;
    }
    if (response.resumeToken) {
      this.resumeToken = response.resumeToken;
    }

    return response;
  }

  async resume(resumeToken: string): Promise<ResumeResponse | null> {
    try {
      const body: ResumeRequest = { resumeToken };
      const response = await this.request<ResumeResponse>(
        '/resume',
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
        false // Don't retry on 401 for resume itself
      );

      // Update session token from response
      if (response.newSessionToken) {
        this.sessionToken = response.newSessionToken;
      }

      return response;
    } catch {
      return null;
    }
  }

  async getSnapshot(gameId: string): Promise<GameSnapshot> {
    return this.request<GameSnapshot>(`/games/${gameId}/snapshot`);
  }

  async mark(
    gameId: string, // Not used in path but kept for consistency
    cardId: string,
    position: number,
    marked: boolean
  ): Promise<MarkResponse> {
    // Convert position to cell identifier (FREE for center, or letter+number)
    let positionStr: string;
    if (position === 12) {
      positionStr = 'FREE';
    } else {
      const col = position % 5;
      const row = Math.floor(position / 5);
      const letters = ['B', 'I', 'N', 'G', 'O'];
      positionStr = `${letters[col]}${row + 1}`;
    }

    const body: MarkRequest = {
      position: positionStr,
      marked,
      idempotencyKey: crypto.randomUUID(),
    };

    return this.request<MarkResponse>(`/cards/${cardId}/mark`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async claim(
    gameId: string, // Not used in path but kept for consistency
    cardId: string,
    pattern: BingoPattern
  ): Promise<ClaimResponse> {
    const body: ClaimRequest = {
      pattern,
      idempotencyKey: crypto.randomUUID(),
    };

    return this.request<ClaimResponse>(`/cards/${cardId}/claim`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}

export const api = new ApiClient();