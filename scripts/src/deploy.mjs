#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

const PORT = process.env.PORT ?? "9091";
const BASE_PATH = process.env.BASE_PATH ?? "/";

function run(cmd, args, cwd = repoRoot) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
      env: { ...process.env, PORT, BASE_PATH },
    });
    proc.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
    proc.on("error", reject);
  });
}

async function main() {
  if (!existsSync(path.join(repoRoot, "node_modules"))) {
    console.log("→ Installing dependencies");
    await run("pnpm", ["install", "--frozen-lockfile=false"]);
  }

  console.log("→ Pushing database schema");
  await run("pnpm", ["--filter", "@workspace/db", "run", "push"]);

  console.log("→ Building frontend");
  await run("pnpm", ["--filter", "@workspace/bon-barang", "run", "build"]);

  console.log("→ Building API server");
  await run("pnpm", ["--filter", "@workspace/api-server", "run", "build"]);

  console.log(`→ Starting API server on port ${PORT}`);
  await run("pnpm", ["--filter", "@workspace/api-server", "run", "start"]);
}

main().catch((err) => {
  console.error("Deploy failed:", err.message);
  process.exit(1);
});
