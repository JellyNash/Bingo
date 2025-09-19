const API = import.meta.env.VITE_API_URL as string;

export async function apiPost(path: string, token: string, body?: any) {
  const res = await fetch(API + path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json().catch(() => ({}));
}