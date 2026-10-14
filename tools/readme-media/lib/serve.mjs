// Tiny static file server for the built demo (SPA fallback to index.html).
import http from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".json": "application/json",
};

export function serve(root, port) {
  const server = http.createServer((req, res) => {
    const clean = normalize(decodeURIComponent(req.url.split("?")[0])).replace(
      /^(\.\.[/\\])+/,
      "",
    );
    let file = join(root, clean);
    if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory())
      file = join(root, "index.html");
    res.setHeader("content-type", TYPES[extname(file)] || "application/octet-stream");
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}
