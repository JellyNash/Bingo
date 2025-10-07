const API_BASE = (import.meta.env.VITE_API_URL ?? "").trim().replace(/\/$/, "");

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${normalizedPath}` : normalizedPath;
}

export async function authenticateWithPin(pin: string) {
  const res = await fetch(buildUrl("/gamemaster/auth"), {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({ pin })
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json().catch(() => ({}));
}

export async function apiSessionPost(path: string, body?: any) {
  const headers: Record<string, string> = {};
  let payload: string | undefined = undefined;

  if (body !== undefined) {
    headers["content-type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(buildUrl(path), {
    method: "POST",
    headers,
    credentials: "include",
    body: payload
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json().catch(() => ({}));
}

export async function apiPost(path: string, token: string, body?: any) {
  const res = await fetch(buildUrl(path), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`
    },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json().catch(() => ({}));
}

export async function apiGet(path: string, token?: string) {
  const headers: Record<string, string> = {
    "content-type": "application/json"
  };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(path), {
    method: "GET",
    headers,
    credentials: "include"
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json().catch(() => ({}));
}

export async function fetchGameMasterSession() {
  const res = await fetch(buildUrl("/gamemaster/session"), {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export async function bindGameMasterSession(gameId: string) {
  const res = await fetch(buildUrl("/gamemaster/session/bind"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ gameId }),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export async function requestScreenLaunch(gameId: string) {
  const res = await fetch(buildUrl("/gamemaster/launch-screen"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ gameId }),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export async function uploadAudioPack(formData: FormData, onProgress?: (progress: number) => void) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (error) {
          resolve({});
        }
      } else {
        reject(new Error(`${xhr.status} ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });

    xhr.open('POST', buildUrl('/gamemaster/audio-packs/upload'));
    xhr.withCredentials = true;
    xhr.send(formData);
  });
}

export async function listAudioPacks(type?: 'music' | 'sfx' | 'voice') {
  const params = type ? `?type=${type.toUpperCase()}` : '';
  const res = await fetch(buildUrl(`/gamemaster/audio-packs${params}`), {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export async function deleteAudioPack(packId: string) {
  const res = await fetch(buildUrl(`/gamemaster/audio-packs/${packId}`), {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json().catch(() => ({}));
}

export async function getGameAudioSettings(gameId: string) {
  const res = await fetch(buildUrl(`/games/${gameId}/audio-settings`), {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export async function updateGameAudioSettings(gameId: string, settings: any) {
  const res = await fetch(buildUrl(`/games/${gameId}/audio-settings`), {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json().catch(() => ({}));
}
