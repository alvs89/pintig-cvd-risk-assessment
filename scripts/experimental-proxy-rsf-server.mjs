// Local research-only bridge for the sealed questionnaire-aligned proxy model.
// It listens on loopback only, accepts no patient identifier and persists nothing.
import http from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runner = path.join(workspace, "analysis", "scripts", "rsf27_questionnaire_aligned_v1", "predict_local.R");
const model = path.join(workspace, "analysis", "results", "rsf27_questionnaire_aligned_proxy_20261103_v3", "model_RESEARCH_ONLY.rds");
const port = Number.parseInt(process.env.PINTIG_EXPERIMENTAL_MODEL_PORT || "8766", 10);
const allowedOrigins = new Set(["http://127.0.0.1:5173", "http://127.0.0.1:5174"]);
const send = (res, status, payload) => { res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }); res.end(JSON.stringify(payload)); };
const readJson = async (req) => {
  const chunks = []; let length = 0;
  for await (const chunk of req) { length += chunk.length; if (length > 64 * 1024) throw new Error("request-too-large"); chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};
const callR = async (payload) => {
  const dir = await mkdtemp(path.join(tmpdir(), "pintig-proxy-"));
  const input = path.join(dir, `${randomUUID()}.json`), output = path.join(dir, `${randomUUID()}.json`);
  try {
    await writeFile(input, JSON.stringify(payload), { encoding: "utf8", mode: 0o600 });
    await new Promise((resolve, reject) => {
      const child = spawn("C:\\Program Files\\R\\R-4.6.1\\bin\\Rscript.exe", [runner, input, output], { cwd: workspace, windowsHide: true, stdio: "ignore" });
      child.once("error", reject); child.once("exit", code => code === 0 ? resolve() : reject(new Error("model-failed")));
    });
    return JSON.parse(await readFile(output, "utf8"));
  } finally { await rm(dir, { recursive: true, force: true }); }
};

http.createServer(async (req, res) => {
  if (req.socket.remoteAddress !== "127.0.0.1" && req.socket.remoteAddress !== "::1") return send(res, 403, { error: "loopback-only" });
  if (req.method === "GET" && req.url === "/health") return send(res, 200, { status: "ready", model: "rsf27-questionnaire-aligned-proxy-20261103-v3", researchOnly: true });
  if (req.method !== "POST" || req.url !== "/experimental-proxy-risk") return send(res, 404, { error: "not-found" });
  if (!allowedOrigins.has(req.headers.origin || "") || req.headers["x-pintig-research"] !== "questionnaire-proxy-local-only") return send(res, 403, { error: "local-research-origin-required" });
  try { send(res, 200, await callR(await readJson(req))); }
  catch (error) { send(res, 422, { error: "prediction-unavailable", reason: error instanceof Error ? error.message : "invalid-request" }); }
}).listen(port, "127.0.0.1", () => console.log(`PINTIG experimental proxy RSF: http://127.0.0.1:${port}`));
