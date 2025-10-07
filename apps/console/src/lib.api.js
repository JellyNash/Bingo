const API_BASE = (import.meta.env.VITE_API_URL ?? "").trim().replace(/\/$/, "");
function buildUrl(path) {
    if (/^https?:\/\//i.test(path)) {
        return path;
    }
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return API_BASE ? `${API_BASE}${normalizedPath}` : normalizedPath;
}
export async function authenticateWithPin(pin) {
    const res = await fetch(buildUrl("/gamemaster/auth"), {
        method: "POST",
        headers: {
            "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ pin })
    });
    if (!res.ok)
        throw new Error(`${res.status} ${res.statusText}`);
    return res.json().catch(() => ({}));
}
export async function apiSessionPost(path, body) {
    const headers = {};
    let payload = undefined;
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
    if (!res.ok)
        throw new Error(`${res.status} ${res.statusText}`);
    return res.json().catch(() => ({}));
}
export async function apiPost(path, token, body) {
    const res = await fetch(buildUrl(path), {
        method: "POST",
        headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`
        },
        credentials: "include",
        body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok)
        throw new Error(`${res.status} ${res.statusText}`);
    return res.json().catch(() => ({}));
}
export async function apiGet(path, token) {
    const headers = {
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
    if (!res.ok)
        throw new Error(`${res.status} ${res.statusText}`);
    return res.json().catch(() => ({}));
}
export async function fetchGameMasterSession() {
    const res = await fetch(buildUrl("/gamemaster/session"), {
        method: "GET",
        credentials: "include",
    });
    if (!res.ok)
        throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
}
export async function bindGameMasterSession(gameId) {
    const res = await fetch(buildUrl("/gamemaster/session/bind"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ gameId }),
    });
    if (!res.ok)
        throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
}
export async function requestScreenLaunch(gameId) {
    const res = await fetch(buildUrl("/gamemaster/launch-screen"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ gameId }),
    });
    if (!res.ok)
        throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
}
export async function uploadAudioPack(formData, onProgress) {
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
                }
                catch (error) {
                    resolve({});
                }
            }
            else {
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
export async function listAudioPacks(type) {
    const params = type ? `?type=${type.toUpperCase()}` : '';
    const res = await fetch(buildUrl(`/gamemaster/audio-packs${params}`), {
        method: "GET",
        credentials: "include",
    });
    if (!res.ok)
        throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
}
export async function deleteAudioPack(packId) {
    const res = await fetch(buildUrl(`/gamemaster/audio-packs/${packId}`), {
        method: "DELETE",
        credentials: "include",
    });
    if (!res.ok)
        throw new Error(`${res.status} ${res.statusText}`);
    return res.json().catch(() => ({}));
}
export async function getGameAudioSettings(gameId) {
    const res = await fetch(buildUrl(`/games/${gameId}/audio-settings`), {
        method: "GET",
        credentials: "include",
    });
    if (!res.ok)
        throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
}
export async function updateGameAudioSettings(gameId, settings) {
    const res = await fetch(buildUrl(`/games/${gameId}/audio-settings`), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settings),
    });
    if (!res.ok)
        throw new Error(`${res.status} ${res.statusText}`);
    return res.json().catch(() => ({}));
}
