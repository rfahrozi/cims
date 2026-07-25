function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class Router {
  #routes = [];

  add(method, path, handler, options = {}) {
    const names = [];
    const segments = path.split('/').map((segment) => {
      if (!segment.startsWith(':')) return escapeRegex(segment);
      const match = segment.match(/^:([A-Za-z0-9_]+)(.*)$/);
      if (!match) return escapeRegex(segment);
      names.push(match[1]);
      return `([^/]+)${escapeRegex(match[2])}`;
    });
    this.#routes.push({method: method.toUpperCase(), path, regex: new RegExp(`^${segments.join('/')}$`), names, handler, options});
  }

  match(method, pathname) {
    for (const route of this.#routes) {
      if (route.method !== method.toUpperCase()) continue;
      const match = pathname.match(route.regex);
      if (!match) continue;
      const params = {};
      route.names.forEach((name, index) => { params[name] = decodeURIComponent(match[index + 1]); });
      return {...route, params};
    }
    return undefined;
  }
}
