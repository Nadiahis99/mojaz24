/**
 * مُوجز 24 — API Client (Final Version)
 * تم التعديل لضمان التوافق التام مع Vercel Rewrites
 */

const MojazAPI = (() => {
  // تحديد العنوان الأساسي
  const BASE = window.location.hostname === 'localhost' 
               ? 'http://localhost:3000' 
               : window.location.origin;

  function getSession() {
    try {
      const raw = sessionStorage.getItem('mojaz24-session');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  async function request(method, path, body) {
    const session = getSession();
    
    // تأكد من أن المسار يبدأ بـ /api ليتوافق مع vercel.json
    // قمنا بإضافة شرط لمنع تكرار كلمة api إذا كانت موجودة بالفعل في الـ path
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const apiPath = cleanPath.startsWith('/api') ? cleanPath : `/api${cleanPath}`;

    const opts = {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'x-user-session': session ? JSON.stringify(session) : ''
      }
    };

    if (body) opts.body = JSON.stringify(body);

    try {
      // إرسال الطلب للرابط الكامل
      const res = await fetch(BASE + apiPath, opts);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (error) {
      console.error("API Request Error:", error);
      throw error;
    }
  }

  // ── Auth (تسجيل الدخول) ──────────────────────────────────────────────────

  async function login(username, password) {
    try {
      const data = await request('POST', '/auth/login', { username, password });
      if (data.success) {
        sessionStorage.setItem('mojaz24-session', JSON.stringify(data.session));
      }
      return data;
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  function logout() {
    sessionStorage.removeItem('mojaz24-session');
    window.location.href = 'login.html';
  }

  function isLoggedIn()  { return !!getSession(); }
  function canWrite()    { const s = getSession(); return s && (s.role === 'admin' || s.role === 'journalist'); }
  function isAdmin()     { const s = getSession(); return s && s.role === 'admin'; }

  function requireAuth(redirect) {
    if (!isLoggedIn()) { 
      window.location.href = redirect || 'login.html'; 
      return false; 
    }
    return true;
  }

  // ── News CRUD (إدارة الأخبار) ─────────────────────────────────────────────

  function getAll(category) { 
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return request('GET', '/news' + query); 
  }

  function getById(id)             { return request('GET', `/news/${id}`); }
  function getCategories()         { return request('GET', '/news/categories'); }
  function add(item)               { return request('POST', '/news', item); }
  function update(id, item)        { return request('PUT', `/news/${id}`, item); }
  function remove(id)              { return request('DELETE', `/news/${id}`); }
  function getByCategory(category) { return getAll(category); }

  return {
    login, logout, getSession, isLoggedIn, canWrite, isAdmin, requireAuth,
    getAll, getById, getCategories, add, update, remove, getByCategory
  };
})();

window.MojazAPI = MojazAPI;
