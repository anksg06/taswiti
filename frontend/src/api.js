const TOKEN_KEY = "client_token";

const API_BASE = import.meta.env.VITE_API_URL || "";

function getToken() {
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token =
      crypto.randomUUID?.() ??
      "t-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 14);
    localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Client-Token": getToken(),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = data?.detail;
    const msg = Array.isArray(detail) ? detail[0]?.msg : detail;
    throw new Error(msg || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  createPoll: (title, options, visibility = "public", durationSeconds = 86400) =>
    request("/api/polls", {
      method: "POST",
      body: JSON.stringify({
        title,
        options,
        visibility,
        duration_seconds: durationSeconds,
      }),
    }),
  listPolls: () => request("/api/polls"),
  getPoll: (id) => request(`/api/polls/${id}`),
  vote: (id, optionIndex) =>
    request(`/api/polls/${id}/vote`, {
      method: "POST",
      body: JSON.stringify({ option_index: optionIndex }),
    }),
};