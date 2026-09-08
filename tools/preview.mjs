import { spawn, execFileSync } from "node:child_process";
import { readFile, mkdir, writeFile, unlink } from "node:fs/promises";
import { openSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url)).replace(/\/$/, "");
const folder = new URL("../.local/", import.meta.url),
  file = new URL("preview.json", folder);
const port = 5296;
const exists = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
const owned = (pid) => {
  try {
    const cwd = execFileSync(
      "lsof",
      ["-a", "-p", String(pid), "-d", "cwd", "-Fn"],
      { encoding: "utf8" },
    )
      .split("\n")
      .find((x) => x.startsWith("n"))
      ?.slice(1);
    const cmd = execFileSync("ps", ["-p", String(pid), "-o", "command="], {
      encoding: "utf8",
    });
    return (
      cwd === root &&
      cmd.includes("vite/bin/vite.js") &&
      cmd.includes(String(port))
    );
  } catch {
    return false;
  }
};
let previous;
try {
  previous = JSON.parse(await readFile(file, "utf8"));
} catch {
  /* first run */
}
if (process.argv[2] === "stop") {
  if (previous && exists(previous.pid)) {
    if (!owned(previous.pid))
      throw new Error(
        "Saved PID no longer belongs to this checkout. No process was stopped.",
      );
    process.kill(previous.pid, "SIGTERM");
    console.log("GEX preview stopped.");
  } else console.log("No GEX-owned preview is running.");
  await unlink(file).catch(() => {});
} else {
  if (previous && exists(previous.pid) && owned(previous.pid)) {
    console.log(`GEX preview already running: http://127.0.0.1:${port}/gex/`);
    process.exit(0);
  }
  let listening = false;
  try {
    listening = !!execFileSync(
      "lsof",
      ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"],
      { encoding: "utf8" },
    ).trim();
  } catch {
    /* no listener */
  }
  if (listening)
    throw new Error(
      `Port ${port} is occupied by another process. No process was stopped.`,
    );
  await mkdir(folder, { recursive: true });
  const log = openSync(new URL("preview.log", folder), "a");
  const child = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--strictPort",
    ],
    { cwd: root, detached: true, stdio: ["ignore", log, log] },
  );
  await writeFile(
    file,
    JSON.stringify({ pid: child.pid, cwd: root, port }) + "\n",
  );
  child.unref();
  console.log(`GEX preview starting: http://127.0.0.1:${port}/gex/`);
}
