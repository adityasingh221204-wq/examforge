// EXAMFORGE — Cloudflare Worker entrypoint: serves the built SPA from static assets.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Hash routing means every route is index.html; unknown asset paths fall back to it.
    const res = await env.ASSETS.fetch(request);
    if (res.status === 404 && request.method === 'GET' && !url.pathname.includes('.')) {
      return env.ASSETS.fetch(new Request(new URL('/', url), request));
    }
    return res;
  },
};
