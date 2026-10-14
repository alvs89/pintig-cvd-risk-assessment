// Serve the production frontend locally; no API or database is implemented here.
import http from "node:http";
import { readFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const workspace = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const root = path.join(workspace, "dist");
try {
  await access(path.join(root, "index.html"));
} catch {
  console.error("The React build is missing. Run npm run build first.");
  process.exit(1);
}
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};
const port = Number.parseInt(process.env.PORT || "5174", 10);
const server = http.createServer(async (req, res) => {
  if (!["GET", "HEAD"].includes(req.method ?? "")) {
    res.writeHead(405);
    res.end();
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(
      new URL(req.url ?? "/", "http://localhost").pathname,
    );
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }
  let target = path.resolve(
    root,
    "." + (pathname === "/" ? "/index.html" : pathname),
  );
  const reference = pathname === "/legacy/PINTIG_Web_Application_v27.html";
  if (reference)
    target = path.join(workspace, "legacy", "PINTIG_Web_Application_v27.html");
  if (
    !reference &&
    (!target.startsWith(root + path.sep) ||
      pathname.split("/").some((segment) => segment.startsWith(".")))
  ) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  try {
    const data = await readFile(target);
    res.writeHead(200, {
      "Content-Type": mime[path.extname(target)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(`PINTIG frontend: http://127.0.0.1:${port}/`),
);
