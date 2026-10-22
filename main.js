const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const cp = require('child_process');
const { Client } = require('minecraft-launcher-core');
const { Auth } = require('msmc');

const DATA = app.getPath('userData');
const MC_ROOT = path.join(DATA, 'minecraft');      // shared: versions, libraries, assets
const INST_DIR = path.join(DATA, 'instances');     // one folder per instance (mods, saves, config)
const JAVA_DIR = path.join(DATA, 'java');
const SETTINGS_FILE = path.join(DATA, 'settings.json');
const UA = { 'User-Agent': 'kiln-launcher/0.2.0' };
const CLIENT_MC_VERSION = '1.21.1';                // default version for the first instance
const SUPPORTED_CLIENT = ['1.20.1', '1.20.4', '1.20.6', '1.21', '1.21.1']; // versions the Kiln client mod is built for
const FABRIC_API_ID = 'P7dR8mSH';                  // Fabric API on Modrinth

// Optional CurseForge key, bundled with the app (never shown in the UI).
const CF_KEY = (() => {
  try { return fs.readFileSync(path.join(__dirname, 'curseforge-key.txt'), 'utf8').trim(); }
  catch { return process.env.CURSEFORGE_API_KEY || ''; }
})();

const moduleList = () => JSON.parse(fs.readFileSync(path.join(__dirname, 'modules.json'), 'utf8'));
const moduleDefaults = () => Object.fromEntries(moduleList().map((x) => [x.id, x.default]));
const HUD_DEFAULTS = { _hudX: 4, _hudY: 4, _hudScale: 1 };

const DEFAULTS = { ramGb: 4, javaPath: '', background: '', accent: '#7cc4ff', authCache: null, account: null, uuid: null, active: null };
const loadSettings = () => {
  try { return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) }; }
  catch { return { ...DEFAULTS }; }
};
const saveSettings = (s) => { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2)); };

let win;
const send = (ch, data) => win && !win.isDestroyed() && win.webContents.send(ch, data);

function createWindow() {
  win = new BrowserWindow({
    width: 1180, height: 740, minWidth: 980, minHeight: 640,
    backgroundColor: '#121118', autoHideMenuBar: true, title: 'Kiln',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

/* ---------- helpers ---------- */
async function jget(url, headers = {}) {
  const r = await fetch(url, { headers: { ...UA, ...headers } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} for ${url}`);
  return r.json();
}
async function download(url, dest) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`Download failed (${r.status})`);
  fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
}
const enc = encodeURIComponent;

/* ---------- instances ---------- */
const instPath = (id) => path.join(INST_DIR, id);
function listInstances() {
  fs.mkdirSync(INST_DIR, { recursive: true });
  return fs.readdirSync(INST_DIR).map((id) => {
    try { return JSON.parse(fs.readFileSync(path.join(INST_DIR, id, 'instance.json'), 'utf8')); } catch { return null; }
  }).filter(Boolean).sort((a, b) => a.created - b.created);
}
const getInstance = (id) => listInstances().find((i) => i.id === id) || null;
function activeInstance() {
  const all = listInstances();
  return all.find((i) => i.id === loadSettings().active) || all[0] || null;
}
function createInstance({ name, version, loader }) {
  const id = (name || 'instance').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) + '-' + Date.now().toString(36);
  const inst = { id, name: (name || 'New instance').trim(), version, loader: loader === 'vanilla' ? 'vanilla' : 'fabric', created: Date.now() };
  fs.mkdirSync(path.join(instPath(id), 'mods'), { recursive: true });
  fs.mkdirSync(path.join(instPath(id), 'config'), { recursive: true });
  fs.writeFileSync(path.join(instPath(id), 'instance.json'), JSON.stringify(inst, null, 2));
  const s = loadSettings(); s.active = id; saveSettings(s);
  return inst;
}
const instFor = (id) => { const i = id ? getInstance(id) : activeInstance(); if (!i) throw new Error('Create an instance first.'); return i; };
const needActive = () => { const i = activeInstance(); if (!i) throw new Error('Create an instance first.'); return i; };
const modsDirOf = (inst) => { const d = path.join(instPath(inst.id), 'mods'); fs.mkdirSync(d, { recursive: true }); return d; };

app.whenReady().then(() => {
  const first = !fs.existsSync(INST_DIR);
  fs.mkdirSync(MC_ROOT, { recursive: true });
  if (first) createInstance({ name: 'My instance', version: CLIENT_MC_VERSION, loader: 'fabric' });
  createWindow();
  setupUpdater();
});
app.on('window-all-closed', () => app.quit());

ipcMain.handle('instances:list', () => ({ list: listInstances(), active: (activeInstance() || {}).id || null }));
ipcMain.handle('instances:create', (_e, args) => createInstance(args));
ipcMain.handle('instances:setActive', (_e, id) => { const s = loadSettings(); s.active = id; saveSettings(s); return true; });
ipcMain.handle('instances:rename', (_e, { id, name }) => {
  const inst = getInstance(id); if (!inst) return false;
  inst.name = String(name).trim() || inst.name;
  fs.writeFileSync(path.join(instPath(id), 'instance.json'), JSON.stringify(inst, null, 2)); return true;
});
ipcMain.handle('instances:delete', (_e, id) => {
  if (!getInstance(id)) return false;
  fs.rmSync(instPath(id), { recursive: true, force: true });
  const s = loadSettings(); if (s.active === id) { s.active = null; saveSettings(s); }
  return true;
});
ipcMain.handle('open:folder', (_e, id) => shell.openPath(instPath(id)));

/* ---------- versions ---------- */
let versionCache = null;
async function getVersions() {
  if (versionCache) return versionCache;
  const [m, f] = await Promise.all([
    jget('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'),
    jget('https://meta.fabricmc.net/v2/versions/game'),
  ]);
  versionCache = { mojang: m.versions.map((v) => ({ id: v.id, type: v.type, url: v.url })), fabric: f.map((v) => v.version), latest: m.latest };
  return versionCache;
}
ipcMain.handle('versions:list', async () => {
  const v = await getVersions();
  return { mojang: v.mojang.map(({ id, type }) => ({ id, type })), fabric: v.fabric, latest: v.latest };
});

/* ---------- settings / background ---------- */
ipcMain.handle('settings:get', () => {
  const s = loadSettings(); delete s.authCache;
  return { ...s, curseforge: !!CF_KEY };
});
ipcMain.handle('settings:set', (_e, patch) => { saveSettings({ ...loadSettings(), ...patch }); return true; });
ipcMain.handle('bg:pick', async () => {
  const r = await dialog.showOpenDialog(win, { filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }], properties: ['openFile'] });
  if (r.canceled) return null;
  const dest = path.join(DATA, 'background' + path.extname(r.filePaths[0]));
  fs.copyFileSync(r.filePaths[0], dest);
  const s = loadSettings(); s.background = dest; saveSettings(s);
  return dest;
});

/* ---------- auth ---------- */
ipcMain.handle('auth:status', () => { const s = loadSettings(); return s.authCache ? { name: s.account, uuid: s.uuid } : null; });
ipcMain.handle('auth:login', async () => {
  const auth = new Auth('select_account');
  const xbox = await auth.launch('electron');
  const mc = await xbox.getMinecraft();
  const s = loadSettings();
  s.authCache = xbox.save(); s.account = mc.profile.name; s.uuid = mc.profile.id;
  saveSettings(s);
  return { name: s.account, uuid: s.uuid };
});
ipcMain.handle('auth:logout', () => { const s = loadSettings(); s.authCache = null; s.account = null; s.uuid = null; saveSettings(s); return true; });
async function silentAuth() {
  const s = loadSettings();
  if (!s.authCache) throw new Error('NOT_SIGNED_IN');
  try {
    const xbox = await new Auth('select_account').refresh(s.authCache);
    const mc = await xbox.getMinecraft();
    s.authCache = xbox.save(); saveSettings(s);
    return mc.mclc();
  } catch { throw new Error('NOT_SIGNED_IN'); }
}

/* ---------- Java (auto-downloaded per Minecraft version) ---------- */
async function requiredJava(mc) {
  const v = await getVersions();
  const e = v.mojang.find((x) => x.id === mc);
  if (!e) return 21;
  const j = await jget(e.url);
  const major = (j.javaVersion && j.javaVersion.majorVersion) || 8;
  return major === 16 ? 17 : major;
}
function findJavaBin(dir, depth = 0) {
  if (depth > 5 || !fs.existsSync(dir)) return null;
  const exe = process.platform === 'win32' ? 'javaw.exe' : 'java';
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isFile() && ent.name === exe && path.basename(dir) === 'bin') return p;
    if (ent.isDirectory()) { const r = findJavaBin(p, depth + 1); if (r) return r; }
  }
  return null;
}
async function ensureJava(major) {
  const dir = path.join(JAVA_DIR, String(major));
  let bin = findJavaBin(dir);
  if (bin) return bin;
  fs.mkdirSync(dir, { recursive: true });
  const os = { win32: 'windows', darwin: 'mac', linux: 'linux' }[process.platform];
  const arch = process.arch === 'arm64' ? 'aarch64' : 'x64';
  const ext = os === 'windows' ? 'zip' : 'tar.gz';
  const file = path.join(dir, 'jre.' + ext);
  send('status', `Downloading Java ${major}…`);
  await download(`https://api.adoptium.net/v3/binary/latest/${major}/ga/${os}/${arch}/jre/hotspot/normal/eclipse`, file);
  send('status', `Installing Java ${major}…`);
  if (ext === 'zip') cp.execFileSync('powershell', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${file}' -DestinationPath '${dir}' -Force`]);
  else cp.execFileSync('tar', ['-xzf', file, '-C', dir]);
  fs.unlinkSync(file);
  bin = findJavaBin(dir);
  if (!bin) throw new Error(`Couldn't install Java ${major}`);
  if (os !== 'windows') fs.chmodSync(bin, 0o755);
  return bin;
}

/* ---------- Fabric ---------- */
async function ensureFabric(mcVersion) {
  const list = await jget(`https://meta.fabricmc.net/v2/versions/loader/${mcVersion}`);
  if (!list.length) throw new Error(`Fabric doesn't support ${mcVersion}`);
  const loader = list[0].loader.version;
  const id = `fabric-loader-${loader}-${mcVersion}`;
  const dir = path.join(MC_ROOT, 'versions', id);
  const file = path.join(dir, `${id}.json`);
  if (!fs.existsSync(file)) {
    const profile = await jget(`https://meta.fabricmc.net/v2/versions/loader/${mcVersion}/${loader}/profile/json`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(profile));
  }
  return id;
}

/* ---------- mods (always for the active instance) ---------- */
function assertFabric(inst) {
  if (inst.loader !== 'fabric') throw new Error('This is a Vanilla instance. Create a Fabric instance to use mods.');
}
async function searchMods({ source, query = '', page = 0, instanceId }) {
  const inst = instFor(instanceId); assertFabric(inst);
  const mc = inst.version, limit = 20;
  if (source === 'modrinth') {
    const facets = JSON.stringify([['project_type:mod'], ['categories:fabric'], [`versions:${mc}`]]);
    const d = await jget(`https://api.modrinth.com/v2/search?query=${enc(query)}&facets=${enc(facets)}&index=${query ? 'relevance' : 'downloads'}&limit=${limit}&offset=${page * limit}`);
    return d.hits.map((h) => ({ source, id: h.project_id, title: h.title, desc: h.description, icon: h.icon_url, downloads: h.downloads, author: h.author }));
  }
  if (!CF_KEY) throw new Error('CurseForge is not available in this build.');
  const d = await jget(`https://api.curseforge.com/v1/mods/search?gameId=432&classId=6&gameVersion=${mc}&modLoaderType=4&searchFilter=${enc(query)}&sortField=${query ? 1 : 6}&sortOrder=desc&pageSize=${limit}&index=${page * limit}`, { 'x-api-key': CF_KEY, Accept: 'application/json' });
  return d.data.map((m) => ({
    source, id: String(m.id), title: m.name, desc: m.summary, icon: m.logo && m.logo.thumbnailUrl, downloads: m.downloadCount,
    author: (m.authors && m.authors[0] && m.authors[0].name) || '', page: m.links && m.links.websiteUrl,
  }));
}
async function installModrinth(id, inst, seen = new Set()) {
  if (seen.has(id)) return; seen.add(id);
  const vs = await jget(`https://api.modrinth.com/v2/project/${id}/version?loaders=${enc('["fabric"]')}&game_versions=${enc(JSON.stringify([inst.version]))}`);
  if (!vs.length) throw new Error(`No Fabric build for ${inst.version}`);
  const f = vs[0].files.find((x) => x.primary) || vs[0].files[0];
  await download(f.url, path.join(modsDirOf(inst), f.filename));
  for (const dep of vs[0].dependencies || []) {
    if (dep.dependency_type === 'required' && dep.project_id) await installModrinth(dep.project_id, inst, seen);
  }
}
async function installCurse(id, inst, pageUrl) {
  const d = await jget(`https://api.curseforge.com/v1/mods/${id}/files?gameVersion=${inst.version}&modLoaderType=4&pageSize=1`, { 'x-api-key': CF_KEY, Accept: 'application/json' });
  const f = d.data && d.data[0];
  if (!f) throw new Error(`No Fabric build for ${inst.version}`);
  if (!f.downloadUrl) {
    if (pageUrl) shell.openExternal(pageUrl);
    throw new Error('This author blocks third-party downloads. Opened the CurseForge page instead.');
  }
  await download(f.downloadUrl, path.join(modsDirOf(inst), f.fileName));
}
ipcMain.handle('mods:search', (_e, args) => searchMods(args));
ipcMain.handle('mods:install', async (_e, { source, id, page, instanceId }) => {
  const inst = instFor(instanceId); assertFabric(inst);
  if (source === 'modrinth') await installModrinth(id, inst); else await installCurse(id, inst, page);
  return true;
});
ipcMain.handle('mods:list', () => {
  const inst = needActive(); const dir = modsDirOf(inst);
  return fs.readdirSync(dir).filter((f) => /\.jar(\.disabled)?$/.test(f)).map((f) => ({ file: f, enabled: !f.endsWith('.disabled') }));
});
ipcMain.handle('mods:toggle', (_e, file) => {
  const dir = modsDirOf(needActive()); const from = path.join(dir, file);
  fs.renameSync(from, file.endsWith('.disabled') ? from.slice(0, -9) : from + '.disabled'); return true;
});
ipcMain.handle('mods:remove', (_e, file) => { fs.unlinkSync(path.join(modsDirOf(needActive()), file)); return true; });

/* ---------- client modules (per instance, read by the Fabric client mod) ---------- */
const modulesFile = (inst) => { const d = path.join(instPath(inst.id), 'config'); fs.mkdirSync(d, { recursive: true }); return path.join(d, 'kiln-modules.json'); };
ipcMain.handle('modules:list', () => moduleList());
ipcMain.handle('modules:get', () => {
  try { return { ...moduleDefaults(), ...HUD_DEFAULTS, ...JSON.parse(fs.readFileSync(modulesFile(needActive()), 'utf8')) }; }
  catch { return { ...moduleDefaults(), ...HUD_DEFAULTS }; }
});
ipcMain.handle('modules:set', (_e, state) => { fs.writeFileSync(modulesFile(needActive()), JSON.stringify(state, null, 2)); return true; });

/* ---------- play ---------- */
function bundledClientJar(version) {
  const base = app.isPackaged ? path.join(process.resourcesPath, 'resources') : path.join(__dirname, 'resources');
  return path.join(base, 'clients', `kiln-client-${version}.jar`);
}
ipcMain.handle('modules:supported', () => SUPPORTED_CLIENT);
let running = false;
ipcMain.handle('play', async (_e, id) => {
  if (running) throw new Error('A game is already running.');
  const inst = getInstance(id);
  if (!inst) throw new Error('Instance not found.');
  running = true;
  try {
    send('status', 'Signing in…');
    const authorization = await silentAuth();
    const s = loadSettings();

    const javaPath = s.javaPath || await ensureJava(await requiredJava(inst.version));

    const gameDir = instPath(inst.id);
    let custom;
    if (inst.loader === 'fabric') {
      send('status', 'Preparing Fabric…');
      custom = await ensureFabric(inst.version);
      if (!fs.readdirSync(modsDirOf(inst)).some((f) => /^fabric-api/i.test(f))) {
        send('status', 'Installing Fabric API…');
        await installModrinth(FABRIC_API_ID, inst);
      }
      const jar = bundledClientJar(inst.version);
      const target = path.join(modsDirOf(inst), 'kiln-client.jar');
      if (fs.existsSync(jar)) fs.copyFileSync(jar, target);
      else if (fs.existsSync(target)) fs.unlinkSync(target); // never leave a jar built for another version
    }

    const v = await getVersions();
    const meta = v.mojang.find((x) => x.id === inst.version);
    const launcher = new Client();
    launcher.on('progress', (p) => send('progress', { task: p.task, total: p.total }));
    launcher.on('download-status', (p) => send('progress', { task: p.current, total: p.total }));
    launcher.on('data', (d) => send('log', String(d)));
    launcher.on('debug', (d) => send('log', String(d)));
    launcher.on('close', (c) => { running = false; send('closed', c); });

    send('status', 'Launching…');
    await launcher.launch({
      authorization, root: MC_ROOT, javaPath,
      overrides: { gameDirectory: gameDir },
      version: custom ? { number: inst.version, type: 'release', custom } : { number: inst.version, type: (meta && meta.type) || 'release' },
      memory: { max: `${s.ramGb}G`, min: '1G' },
    });
    send('status', 'Game running');
    return true;
  } catch (e) { running = false; throw e; }
});

/* ---------- auto update (installed builds only, via GitHub Releases) ---------- */
let updateState = null;
ipcMain.handle('update:state', () => updateState);
ipcMain.handle('app:version', () => app.getVersion());
function setupUpdater() {
  if (!app.isPackaged) return;
  const { autoUpdater } = require('electron-updater');
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-available', (i) => { updateState = { state: 'downloading', version: i.version }; send('update', updateState); });
  autoUpdater.on('update-downloaded', (i) => { updateState = { state: 'ready', version: i.version }; send('update', updateState); });
  autoUpdater.on('error', () => {});
  ipcMain.handle('update:install', () => autoUpdater.quitAndInstall());
  const check = () => autoUpdater.checkForUpdates().catch(() => {});
  check();
  setInterval(check, 2 * 60 * 60 * 1000);
}
