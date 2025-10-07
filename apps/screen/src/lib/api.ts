const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface EstablishSessionResponse {
  token: string;
  gameId: string;
}

interface GameStateResponse {
  gameId: string;
  pin: string;
  status: string;
  drawnNumbers: number[];
  playerCount: number;
  qrCode?: string;
}

export async function establishScreenSession(launchToken: string): Promise<EstablishSessionResponse> {
  const response = await fetch(`${API_BASE_URL}/screen/establish-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ launchToken }),
  });
  if (!response.ok) {
    throw new Error(`Failed to establish session: ${response.statusText}`);
  }
  return response.json();
}

export async function getGameQRCode(gamePin: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/games/qr/${gamePin}`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch QR code: ${response.statusText}`);
  }
  const data = await response.json();
  return data.qrCode;
}

export function getUrlParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

export function cleanUrlParams(keys: string[]): void {
  const url = new URL(window.location.href);
  keys.forEach((k) => url.searchParams.delete(k));
  window.history.replaceState({}, document.title, url.toString());
}
