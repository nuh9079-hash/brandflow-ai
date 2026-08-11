import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import ngrok from "@ngrok/ngrok";

const root = process.cwd();
const envPath = path.join(root, ".env.local");
const callbackPath = "/api/connections/instagram/callback";

function readEnvironment() {
  if (!fs.existsSync(envPath)) return new Map();
  const values = new Map();
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) values.set(match[1], match[2].trim());
  }
  return values;
}

function updateEnvironment(updates) {
  const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8").split(/\r?\n/) : [];
  const pending = new Map(Object.entries(updates));
  const output = existing.flatMap((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=/);
    if (!match || !pending.has(match[1])) return [line];
    const value = pending.get(match[1]);
    pending.delete(match[1]);
    return [`${match[1]}=${value}`];
  });
  while (output.length && output.at(-1) === "") output.pop();
  for (const [name, value] of pending) output.push(`${name}=${value}`);
  fs.writeFileSync(envPath, `${output.join("\n")}\n`, "utf8");
}

async function waitForApplication(publicUrl) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(publicUrl, {
        redirect: "manual",
        headers: { "ngrok-skip-browser-warning": "1" },
      });
      if (response.status < 500) return response.status;
    } catch {
      // Next.js may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Next.js ngrok adresinden 30 saniye içinde yanıt vermedi.");
}

const fileEnvironment = readEnvironment();
for (const [name, value] of fileEnvironment) {
  if (!process.env[name]) process.env[name] = value;
}

const authtoken = process.env.NGROK_AUTHTOKEN?.trim();
const domain = process.env.NGROK_DOMAIN?.trim();
if (!authtoken) {
  console.error("NGROK_AUTHTOKEN bulunamadı. Ngrok dashboard > Your Authtoken değerini .env.local dosyasına ekleyin.");
  process.exit(1);
}

let listener;
let nextProcess;

async function shutdown(code = 0) {
  if (nextProcess && !nextProcess.killed) nextProcess.kill("SIGTERM");
  if (listener) await listener.close().catch(() => undefined);
  process.exit(code);
}

try {
  listener = await ngrok.forward({
    addr: 3000,
    authtoken,
    ...(domain ? { domain } : {}),
  });

  const publicUrl = listener.url()?.replace(/\/$/, "");
  if (!publicUrl?.startsWith("https://")) throw new Error("Ngrok geçerli bir HTTPS adresi döndürmedi.");
  const redirectUri = `${publicUrl}${callbackPath}`;

  updateEnvironment({
    NEXT_PUBLIC_APP_URL: publicUrl,
    INSTAGRAM_REDIRECT_URI: redirectUri,
  });

  console.log(`Ngrok hazır: ${publicUrl}`);
  console.log(`Instagram OAuth Redirect URI: ${redirectUri}`);

  const command = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", "npm run dev"] : ["run", "dev"];
  nextProcess = spawn(command, args, {
    cwd: root,
    env: { ...process.env, NEXT_PUBLIC_APP_URL: publicUrl, INSTAGRAM_REDIRECT_URI: redirectUri },
    stdio: "inherit",
  });

  nextProcess.on("exit", (code) => void shutdown(code ?? 1));
  const status = await waitForApplication(publicUrl);
  console.log(`BrandFlow ngrok üzerinden erişilebilir (HTTP ${status}).`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Ngrok geliştirme ortamı başlatılamadı.");
  await shutdown(1);
}

process.on("SIGINT", () => void shutdown(0));
process.on("SIGTERM", () => void shutdown(0));
