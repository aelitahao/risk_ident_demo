export function createRouter() {
  const routes = [];

  function add(method, pattern, handler) {
    const keys = [];
    const regex = new RegExp(
      '^' +
        pattern.replace(/:[A-Za-z_][A-Za-z0-9_]*/g, (m) => {
          keys.push(m.slice(1));
          return '([^/]+)';
        }) +
        '/?$',
    );
    routes.push({ method: method.toUpperCase(), regex, keys, handler });
  }

  function match(method, pathname) {
    for (const r of routes) {
      if (r.method !== method.toUpperCase()) continue;
      const m = pathname.match(r.regex);
      if (!m) continue;
      const params = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      return { handler: r.handler, params };
    }
    return null;
  }

  return { add, match };
}
