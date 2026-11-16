/* USAFL Umpires hub — the small part of Supabase the hub needs, with no library.
   Sign-in is by emailed link (no passwords). The key below is the project's publishable key:
   it is meant to be public, and row-level security decides what each signed-in person can read. */
window.Hub = (function () {
  "use strict";
  const URL = "https://lsdmvfsxvvohmfnanvcn.supabase.co";
  const KEY = "sb_publishable_XUtCxEy5YmdO2Ssc_WUF6A_mf0TqZUp";
  const STORE = "usafl.hub.session";

  let session = null;
  try { session = JSON.parse(localStorage.getItem(STORE)); } catch (e) {}
  const save = (s) => { session = s; try { s ? localStorage.setItem(STORE, JSON.stringify(s)) : localStorage.removeItem(STORE); } catch (e) {} };
  const userId = (jwt) => { try { return JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).sub; } catch (e) { return null; } };
  const keep = (t) => save({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: Math.floor(Date.now() / 1000) + (+t.expires_in || 3600), user_id: userId(t.access_token) });

  async function call(path, opts = {}, signedIn = false) {
    const headers = Object.assign({ apikey: KEY, "Content-Type": "application/json" }, opts.headers);
    if (signedIn) { await fresh(); headers.Authorization = "Bearer " + session.access_token; }
    const res = await fetch(URL + path, Object.assign({}, opts, { headers }));
    const text = await res.text();
    let body = null; try { body = text ? JSON.parse(text) : null; } catch (e) {}
    if (!res.ok) { const err = new Error((body && (body.msg || body.message || body.error_description)) || "Request failed"); err.status = res.status; throw err; }
    return body;
  }

  // Swap the refresh token for a new access token a minute before the old one runs out.
  let refreshing = null;
  function fresh() {
    if (!session) { const e = new Error("Not signed in"); e.status = 401; return Promise.reject(e); }
    if (session.expires_at - 60 > Date.now() / 1000) return Promise.resolve();
    if (!refreshing) {
      refreshing = call("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: session.refresh_token }) })
        .then(keep, (e) => { if (e.status && e.status < 500) save(null); throw e; })
        .finally(() => { refreshing = null; });
    }
    return refreshing;
  }

  return {
    get signedIn() { return !!(session && session.user_id); },
    // Emails a sign-in link. A new address gets an account (and a profile row, role "applicant").
    sendLink(email, backTo) {
      return call("/auth/v1/otp?redirect_to=" + encodeURIComponent(backTo), { method: "POST", body: JSON.stringify({ email, create_user: true }) });
    },
    // The emailed link comes back as #access_token=…&refresh_token=… (or #error=…). Returns "in", "error" or null.
    takeRedirect(hash) {
      const p = new URLSearchParams(hash.replace(/^#/, ""));
      if (p.get("access_token") && p.get("refresh_token")) { keep({ access_token: p.get("access_token"), refresh_token: p.get("refresh_token"), expires_in: p.get("expires_in") }); return "in"; }
      if (p.get("error") || p.get("error_code")) return "error";
      return null;
    },
    async signOut() {
      try { await call("/auth/v1/logout?scope=local", { method: "POST" }, true); } catch (e) {}
      save(null);
    },
    forget() { save(null); },
    async profile() {
      const rows = await call("/rest/v1/profiles?select=*&id=eq." + session.user_id, {}, true);
      return rows[0] || null;
    },
    async saveProfile(fields) {
      const rows = await call("/rest/v1/profiles?id=eq." + session.user_id, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(fields) }, true);
      return rows[0];
    },
  };
})();
