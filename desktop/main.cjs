#!/usr/bin/env node
/**
 * Electron main process — offline-first Windows desktop shell.
 * Daytime: all data stays on this PC (embedded Postgres in AppData).
 * Night: copies JSON backup into a OneDrive/Google Drive sync folder.
 */
const { app, BrowserWindow, Tray, Menu, nativeImage, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const http = require("http");
const EmbeddedPostgres = require("embedded-postgres").default;

const PORT = Number(process.env.SHIFTGRID_PORT || 3847);
const PG_PORT = Number(process.env.SHIFTGRID_PG_PORT || 55432);
const isDev = !app.isPackaged;

function dataRoot() {
  return process.env.SHIFTGRID_DATA_DIR || path.join(app.getPath("userData"));
}

function ensureDirs() {
  const root = dataRoot();
  fs.mkdirSync(path.join(root, "pgdata"), { recursive: true });
  fs.mkdirSync(path.join(root, "backups"), { recursive: true });
  return root;
}

function backupConfigPath() {
  return path.join(dataRoot(), "backup-config.json");
}

function readBackupConfig() {
  const defaults = {
    enabled: true,
    localBackupDir: path.join(dataRoot(), "backups"),
    cloudSyncDir: "",
    nightlyTime: "22:00",
    lastBackupAt: null,
    lastBackupError: null,
  };
  try {
    return { ...defaults, ...JSON.parse(fs.readFileSync(backupConfigPath(), "utf8")) };
  } catch {
    return defaults;
  }
}

function writeBackupConfig(patch) {
  const next = { ...readBackupConfig(), ...patch };
  fs.writeFileSync(backupConfigPath(), JSON.stringify(next, null, 2));
  return next;
}

function waitForUrl(url, timeoutMs = 120000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) resolve(true);
        else if (Date.now() - start > timeoutMs) reject(new Error("Timeout waiting for app"));
        else setTimeout(tick, 800);
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) reject(new Error("Timeout waiting for app"));
        else setTimeout(tick, 800);
      });
    };
    tick();
  });
}

let mainWindow = null;
let tray = null;
let pg = null;
let nextProc = null;
let backupTimer = null;

async function startPostgres() {
  const root = ensureDirs();
  const databaseDir = path.join(root, "pgdata");
  pg = new EmbeddedPostgres({
    databaseDir,
    user: "shiftgrid",
    password: "shiftgrid",
    port: PG_PORT,
    persistent: true,
  });
  if (!fs.existsSync(path.join(databaseDir, "PG_VERSION"))) {
    await pg.initialise();
  }
  await pg.start();
  try {
    await pg.createDatabase("shiftgrid");
  } catch {
    // exists
  }
  process.env.DATABASE_URL = `postgresql://shiftgrid:shiftgrid@127.0.0.1:${PG_PORT}/shiftgrid`;
  process.env.SHIFTGRID_DATA_DIR = root;
  process.env.SHIFTGRID_DESKTOP = "1";
  process.env.AUTH_TRUST_HOST = "true";
  process.env.NEXTAUTH_URL = `http://127.0.0.1:${PORT}`;
  if (!process.env.AUTH_SECRET) {
    process.env.AUTH_SECRET = "desktop-local-secret-change-me";
  }
}

function startNextServer() {
  const env = {
    ...process.env,
    PORT: String(PORT),
    HOSTNAME: "127.0.0.1",
    DATABASE_URL: process.env.DATABASE_URL,
    SHIFTGRID_DATA_DIR: dataRoot(),
    SHIFTGRID_DESKTOP: "1",
  };

  if (isDev) {
    nextProc = spawn(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["prisma", "migrate", "deploy"],
      { cwd: app.getAppPath(), env, shell: true, stdio: "inherit" },
    );
    return new Promise((resolve) => {
      nextProc.on("exit", () => {
        nextProc = spawn(
          process.platform === "win32" ? "npx.cmd" : "npx",
          ["next", "dev", "-p", String(PORT), "-H", "127.0.0.1"],
          { cwd: app.getAppPath(), env, shell: true, stdio: "inherit" },
        );
        resolve();
      });
    });
  }

  // Production: run standalone server.js from Next build
  const standalone = path.join(process.resourcesPath, "app", "server.js");
  const fallback = path.join(app.getAppPath(), ".next", "standalone", "server.js");
  const serverJs = fs.existsSync(standalone) ? standalone : fallback;
  nextProc = spawn(process.execPath, [serverJs], {
    cwd: path.dirname(serverJs),
    env,
    stdio: "inherit",
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: "ShiftGrid",
    icon: path.join(app.getAppPath(), "public", "logo.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  mainWindow.on("close", (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(app.getAppPath(), "public", "brand", "shiftgrid-logo.png");
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    : nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip("ShiftGrid (offline desktop)");
  const menu = Menu.buildFromTemplate([
    {
      label: "Open ShiftGrid",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: "Backup now",
      click: () => runLocalBackup(),
    },    {
      label: "Open data folder",
      click: () => shell.openPath(dataRoot()),
    },
    { type: "separator" },
    {
      label: "Quit",
      click: async () => {
        app.isQuitting = true;
        await shutdown();
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(menu);
  tray.on("double-click", () => mainWindow?.show());
}

function runLocalBackup() {
  const env = {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL,
    SHIFTGRID_DATA_DIR: dataRoot(),
  };
  const child = spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["tsx", "scripts/backup-now.mjs"],
    { cwd: app.getAppPath(), env, shell: true, stdio: "inherit" },
  );
  child.on("exit", (code) => {
    if (code !== 0) {
      writeBackupConfig({ lastBackupError: `Backup exited with code ${code}` });
      dialog.showErrorBox("Backup failed", `Exit code ${code}. Check the data folder.`);
    } else {
      writeBackupConfig({ lastBackupAt: new Date().toISOString(), lastBackupError: null });
    }
  });
}

function scheduleNightlyBackup() {
  if (backupTimer) clearInterval(backupTimer);
  backupTimer = setInterval(() => {
    const config = readBackupConfig();
    if (!config.enabled) return;
    const [hh, mm] = String(config.nightlyTime || "22:00").split(":").map(Number);
    const now = new Date();
    if (now.getHours() !== hh || now.getMinutes() !== mm) return;
    if (config.lastBackupAt) {
      const last = new Date(config.lastBackupAt);
      if (last.toDateString() === now.toDateString()) return;
    }
    runLocalBackup();
  }, 30 * 1000);
}

async function shutdown() {
  if (backupTimer) clearInterval(backupTimer);
  if (nextProc && !nextProc.killed) {
    nextProc.kill();
  }
  if (pg) {
    try {
      await pg.stop();
    } catch {
      // ignore
    }
  }
}

app.whenReady().then(async () => {
  try {
    writeBackupConfig({}); // ensure config file exists with defaults
    await startPostgres();
    await startNextServer();
    await waitForUrl(`http://127.0.0.1:${PORT}/api/health`);
    createWindow();
    createTray();
    scheduleNightlyBackup();
  } catch (error) {
    dialog.showErrorBox("ShiftGrid failed to start", String(error?.message || error));
    await shutdown();
    app.quit();
  }
});

app.on("window-all-closed", (e) => {
  e.preventDefault();
});

app.on("before-quit", async (e) => {
  if (!app.isQuitting) {
    e.preventDefault();
    app.isQuitting = true;
    await shutdown();
    app.quit();
  }
});
