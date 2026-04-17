const MojazAPI = (() => {
  const baseUrl = (() => {
    const configured = window.__MOJAZ_API_BASE__ || "";
    if (!configured) return window.location.origin;

    try {
      return new URL(configured, window.location.origin).toString().replace(/\/$/, "");
    } catch {
      return window.location.origin;
    }
  })();

  async function request(method, path, body) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const message = payload && typeof payload.message === "string"
        ? payload.message
        : `HTTP ${response.status}`;
      throw new Error(message);
    }

    return payload;
  }

  function login(username, password) {
    return request("POST", "/auth/login", { username, password });
  }

  function getUsers() {
    return request("GET", "/auth/users");
  }

  function getAll(category) {
    const query = category ? `?category=${encodeURIComponent(category)}` : "";
    return request("GET", `/news${query}`);
  }

  function getById(id) {
    return request("GET", `/news/${encodeURIComponent(id)}`);
  }

  function getCategories() {
    return request("GET", "/news/categories");
  }

  function add(item) {
    return request("POST", "/news", item);
  }

  function update(id, item) {
    return request("PUT", `/news/${encodeURIComponent(id)}`, item);
  }

  function remove(id) {
    return request("DELETE", `/news/${encodeURIComponent(id)}`);
  }

  return {
    login,
    getUsers,
    getAll,
    getById,
    getCategories,
    add,
    update,
    remove
  };
})();

window.MojazAPI = MojazAPI;
