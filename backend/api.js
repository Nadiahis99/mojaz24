/**
 * مُوجز 24 — API Client (Final Version)
 * تم التعديل ليتوافق مع مسارات Vercel وإرسال بيانات الأمان
 */

const MojazAPI = (() => {
  // تحديد العنوان الأساسي: إذا كان محلياً نستخدم منفذ 3000، وإذا كان مرفوعاً نستخدم الدومين الحالي
  const BASE = window.location.hostname === 'localhost' 
               ? 'http://localhost:3000' 
               : window.location.origin;

  // دالة جلب الجلسة من sessionStorage
  function getSession() {
    try {
      const raw = sessionStorage.getItem('mojaz24-session');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  // الدالة المركزية لإرسال الطلبات للسيرفر
  async function request(method, path, body) {
    const session = getSession();
    
    /**
     * تعديل جوهري: إضافة /api للمسار ليتوافق مع إعدادات vercel.json
     * هذا يضمن أن الطلب يذهب لملف backend/server.js وليس لمجلد الفرونت اند
     */
    const apiPath = `/api${path}`;

    const opts = {
      method,
      headers: { 
        'Content-Type': 'application/json',
        // إرسال بيانات المستخدم لكي يتحقق السيرفر من الصلاحيات (Admin/Journalist)
        'x-user-session': session ? JSON.stringify(session) : ''
      }
    };

    if (body) opts.body = JSON.stringify(body);

    try {
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
      // المسار سيصبح تلقائياً /api/auth/login
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

  // جلب كل الأخبار (أو حسب القسم)
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
    // Auth
    login, logout, getSession, isLoggedIn, canWrite, isAdmin, requireAuth,
    // News
    getAll, getById, getCategories, add, update, remove, getByCategory
  };
})();

// إتاحة الكود للاستخدام في جميع صفحات المشروع
window.MojazAPI = MojazAPI;
