const MojazAuth = (function () {
  const SESSION_KEY = "mojaz24-session";

  async function login(username, password) {
    try {
      const result = await window.MojazAPI.login(username, password);
      if (result && result.success && result.session) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(result.session));
      }
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message || "تعذر تسجيل الدخول"
      };
    }
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = "Login.html";
  }

  function getSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function isLoggedIn() {
    return !!getSession();
  }

  function canWrite() {
    const session = getSession();
    return !!session && (session.role === "admin" || session.role === "journalist");
  }

  function isAdmin() {
    const session = getSession();
    return !!session && session.role === "admin";
  }

  function requireAuth(redirectTo) {
    if (!isLoggedIn()) {
      window.location.href = redirectTo || "Login.html";
      return false;
    }
    return true;
  }

  async function getUsers() {
    try {
      return await window.MojazAPI.getUsers();
    } catch {
      return [];
    }
  }

  return {
    login,
    logout,
    getSession,
    isLoggedIn,
    canWrite,
    isAdmin,
    requireAuth,
    getUsers
  };
})();
