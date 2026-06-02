Forum rebuild placeholder for breakcore.com.au.

## Preview (share while DNS is pending)

- GitHub Pages: https://aday1.github.io/breakcore-com-au/
- Cloudflare (when DNS active): https://breakcore.com.au/
- Local: `python -m http.server 8770` in `public/` (avoid port 8765 — Bitwig MCP)

Edit files under [public/](./public). Push to `main` deploys to Cloudflare Workers and GitHub Pages.