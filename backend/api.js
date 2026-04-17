/**
 * مُوجز 24 — API Client
 * يستبدل localStorage بـ REST API على الباك إند
 * استخدامه مطابق لـ MojazNewsStore و MojazAuth
 */

const MojazAPI = (() => {
  const BASE = window.location.origin;

  async function request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(BASE + path, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  async function login(username, password) {
    try {
      const data = await request('POST', '/auth/login', { username, password });
      if (data.success) sessionStorage.setItem('mojaz24-session', JSON.stringify(data.session));
      return data;
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  function logout() {
    sessionStorage.removeItem('mojaz24-session');
    window.location.href = 'login.html';
  }

  function getSession() {
    try {
      const raw = sessionStorage.getItem('mojaz24-session');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function isLoggedIn()  { return !!getSession(); }
  function canWrite()    { const s = getSession(); return s && (s.role === 'admin' || s.role === 'journalist'); }
  function isAdmin()     { const s = getSession(); return s && s.role === 'admin'; }
  function requireAuth(redirect) {
    if (!isLoggedIn()) { window.location.href = redirect || 'login.html'; return false; }
    return true;
  }

  // ── News CRUD ─────────────────────────────────────────────────────────────

  function getAll(category)        { return request('GET', '/news' + (category ? `?category=${encodeURIComponent(category)}` : '')); }
  function getById(id)             { return request('GET', `/news/${id}`); }
  function getCategories()         { return request('GET', '/news/categories'); }
  function add(item)               { return request('POST', '/news', item); }
  function update(id, item)        { return request('PUT', `/news/${id}`, item); }
  function remove(id)              { return request('DELETE', `/news/${id}`); }
  function getByCategory(category) { return getAll(category); }

  return {
    // Auth
    login, logout, getSession, isLoggedIn, canWrite, isAdmin, requireAuth,
    // News
    getAll, getById, getCategories, add, update, remove, getByCategory
  };
})();

window.MojazAPI = MojazAPI;
