const $ = (s) => document.querySelector(s);
const view = $('#view');
const esc = (t = '') => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : n || 0);
const svg = (d, cls = '') => `<svg viewBox="0 0 24 24" class="${cls}">${d}</svg>`;
const ICON = {
  instances: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  browse: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  installed: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  modules: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
};
const NAV = [['instances', 'Instances'], ['browse', 'Mod browser'], ['installed', 'Installed mods'], ['modules', 'Client modules'], ['settings', 'Settings']];
const SWATCHES = ['#7cc4ff', '#b794f6', '#ff8fab', '#ffb86b', '#6ee7b7'];

let settings = {}, instances = [], activeId = null, page = 'instances';
let browse = { source: 'modrinth', query: '', page: 0, items: [] };
let playing = false, versions = null;

const active = () => instances.find((i) => i.id === activeId) || instances[0] || null;
function toast(msg, err) {
  const t = $('#toast'); t.textContent = msg; t.className = err ? 'err' : ''; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 4500);
}
const clean = (e) => String(e && e.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const run = async (fn) => {
  try { return await fn(); }
  catch (e) {
    const m = clean(e);
    if (m.includes('NOT_SIGNED_IN')) { showLogin('Your session expired. Please sign in again.'); return; }
    toast(m, true);
  }
};

function applyLook() {
  document.documentElement.style.setProperty('--accent', settings.accent || '#7cc4ff');
  $('#bg').style.backgroundImage = settings.background ? `url("file:///${encodeURI(settings.background.replace(/\\/g, '/'))}")` : '';
}

/* ---------- login / account ---------- */
function showLogin(msg) { $('#app').hidden = true; $('#login').hidden = false; $('#loginmsg').textContent = msg || ''; }
async function enterApp(acc) {
  $('#login').hidden = true; $('#app').hidden = false;
  settings.account = acc.name; settings.uuid = acc.uuid;
  drawAccount(); await refreshInstances(); go(page);
}
function drawAccount() {
  $('#account').innerHTML = `
    <img alt="" src="https://mc-heads.net/avatar/${esc(settings.uuid)}/72" onerror="this.style.visibility='hidden'">
    <div style="min-width:0"><div class="nm">${esc(settings.account)}</div><button class="link" id="signout">Sign out</button></div>`;
  $('#signout').onclick = async () => { await api.invoke('auth:logout'); showLogin('Signed out.'); };
}
$('#loginbtn').onclick = async () => {
  const b = $('#loginbtn'); b.disabled = true; $('#loginmsg').textContent = 'Waiting for Microsoft…';
  try { await enterApp(await api.invoke('auth:login')); }
  catch (e) { $('#loginmsg').textContent = /closed/i.test(clean(e)) ? 'Sign-in window was closed.' : clean(e); }
  b.disabled = false;
};

/* ---------- shell ---------- */
async function refreshInstances() {
  const r = await api.invoke('instances:list');
  instances = r.list; activeId = r.active;
  $('#instsel').innerHTML = instances.map((i) => `<option value="${esc(i.id)}" ${i.id === activeId ? 'selected' : ''}>${esc(i.name)} · ${esc(i.version)}</option>`).join('') || '<option>No instances</option>';
  $('#playbtn').disabled = !instances.length || playing;
  drawPlayBtn();
}
function drawPlayBtn() {
  $('#playbtn').innerHTML = playing ? 'Running…' : `${svg('<path d="M7 4.5v15l13-7.5z"/>', 'fill')} Play`;
  $('#playbtn').disabled = playing || !instances.length;
}
$('#instsel').onchange = async (e) => { activeId = e.target.value; await api.invoke('instances:setActive', activeId); browse.items = []; go(page); };
$('#playbtn').onclick = () => active() && play(active().id);

$('#nav').innerHTML = NAV.map(([k, n]) => `<button data-p="${k}">${svg(ICON[k])}<span>${n}</span></button>`).join('');
$('#nav').querySelectorAll('button').forEach((b) => (b.onclick = () => go(b.dataset.p)));
function go(p) {
  page = p;
  $('#nav').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.p === p));
  $('#title').textContent = NAV.find((n) => n[0] === p)[1];
  $('#instsel').hidden = p === 'settings';
  pages[p]();
}
function play(id) {
  run(async () => {
    playing = true; drawPlayBtn(); showDock('Starting…');
    try { await api.invoke('play', id); }
    catch (e) { playing = false; drawPlayBtn(); hideDock(); throw e; }
  });
}

/* ---------- dock ---------- */
function showDock(t) { $('#dock').hidden = false; $('#dstatus').textContent = t; $('#prog').style.width = '0'; $('#log').textContent = ''; }
function hideDock() { $('#dock').hidden = true; }
$('#dlog').onclick = () => ($('#log').hidden = !$('#log').hidden);
api.on('status', (t) => { $('#dock').hidden = false; $('#dstatus').textContent = t; });
api.on('progress', (p) => { if (p && p.total) $('#prog').style.width = Math.min(100, (p.task / p.total) * 100) + '%'; });
api.on('log', (t) => { const l = $('#log'); l.textContent += t + '\n'; l.scrollTop = l.scrollHeight; });
api.on('closed', () => { playing = false; drawPlayBtn(); hideDock(); toast('Game closed'); });

/* ---------- modal ---------- */
function modal(html) { const m = $('#modal'); m.innerHTML = `<div class="dialog">${html}</div>`; m.hidden = false; m.onclick = (e) => e.target === m && closeModal(); }
function closeModal() { $('#modal').hidden = true; $('#modal').innerHTML = ''; }

async function newInstanceDialog() {
  if (!versions) { try { versions = await api.invoke('versions:list'); } catch (e) { return toast('Could not load versions. Check your internet.', true); } }
  modal(`<h3>New instance</h3>
    <div class="field"><label>Name</label><input id="n-name" value="My instance" maxlength="40"></div>
    <div class="field"><label>Mod loader</label>
      <div class="tabs" id="n-loader" style="margin:0"><button data-l="fabric" class="on">Fabric (mods)</button><button data-l="vanilla">Vanilla</button></div></div>
    <div class="field"><label>Minecraft version</label><select id="n-ver"></select>
      <label class="row small muted" style="font-weight:400"><input type="checkbox" id="n-all"> Show snapshots and old versions</label></div>
    <div class="row" style="justify-content:flex-end"><button class="btn ghost" id="n-cancel">Cancel</button><button class="btn" id="n-ok">Create</button></div>`);
  let loader = 'fabric';
  const fillVersions = () => {
    const all = $('#n-all').checked;
    let list = versions.mojang.filter((v) => all || v.type === 'release');
    if (loader === 'fabric') { const f = new Set(versions.fabric); list = list.filter((v) => f.has(v.id)); }
    $('#n-ver').innerHTML = list.map((v) => `<option value="${esc(v.id)}">${esc(v.id)}${v.type === 'release' ? '' : ' (' + v.type.replace('_', ' ') + ')'}</option>`).join('');
    if (list.some((v) => v.id === '1.21.1')) $('#n-ver').value = '1.21.1';
  };
  fillVersions();
  $('#n-all').onchange = fillVersions;
  $('#n-loader').querySelectorAll('button').forEach((b) => (b.onclick = () => {
    loader = b.dataset.l; $('#n-loader').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); fillVersions();
  }));
  $('#n-cancel').onclick = closeModal;
  $('#n-ok').onclick = () => run(async () => {
    await api.invoke('instances:create', { name: $('#n-name').value, version: $('#n-ver').value, loader });
    closeModal(); await refreshInstances(); go('instances');
  });
}

/* ---------- pages ---------- */
const pages = {
  async instances() {
    view.innerHTML = `<p class="sub">Each instance has its own version, mods, worlds and settings.</p>
      <div class="grid">${instances.map((i) => `
        <div class="card icard ${i.id === activeId ? 'on' : ''}" data-id="${esc(i.id)}">
          <div><div class="nm">${esc(i.name)}</div>
            <div class="badges" style="margin-top:8px"><span class="badge">${esc(i.version)}</span><span class="badge ${i.loader === 'fabric' ? 'fab' : ''}">${i.loader === 'fabric' ? 'Fabric' : 'Vanilla'}</span></div></div>
          <div class="row">
            <button class="btn" data-play="${esc(i.id)}" ${playing ? 'disabled' : ''}>${svg('<path d="M7 4.5v15l13-7.5z"/>', 'fill')} Play</button>
            <span class="grow"></span>
            <button class="btn ghost icon" data-open="${esc(i.id)}" title="Open folder" aria-label="Open folder">${svg(ICON.folder)}</button>
            <button class="btn ghost icon" data-del="${esc(i.id)}" title="Delete" aria-label="Delete">${svg(ICON.trash)}</button>
          </div>
        </div>`).join('')}
        <div class="card icard newcard" id="newinst">${svg(ICON.plus, '')}&nbsp; New instance</div>
      </div>`;
    $('#newinst').onclick = newInstanceDialog;
    view.querySelectorAll('.icard[data-id]').forEach((c) => (c.onclick = async (e) => {
      if (e.target.closest('button')) return;
      activeId = c.dataset.id; await api.invoke('instances:setActive', activeId); await refreshInstances(); pages.instances();
    }));
    view.querySelectorAll('[data-play]').forEach((b) => (b.onclick = async () => { await api.invoke('instances:setActive', b.dataset.play); activeId = b.dataset.play; play(b.dataset.play); }));
    view.querySelectorAll('[data-open]').forEach((b) => (b.onclick = () => api.invoke('open:folder', b.dataset.open)));
    view.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
      const i = instances.find((x) => x.id === b.dataset.del);
      if (!confirm(`Delete "${i.name}"? Its worlds and mods will be removed.`)) return;
      await api.invoke('instances:delete', i.id); await refreshInstances(); pages.instances();
    }));
  },

  async browse() {
    const fabs = instances.filter((i) => i.loader === 'fabric');
    if (!fabs.length) return (view.innerHTML = '<div class="empty">You need a Fabric instance to install mods. Create one in Instances.</div>');
    if (!fabs.some((i) => i.id === browse.target)) browse.target = (fabs.find((i) => i.id === activeId) || fabs[0]).id;
    const inst = fabs.find((i) => i.id === browse.target);
    if (!settings.curseforge) browse.source = 'modrinth';
    view.innerHTML = `
      <div class="row" style="margin-bottom:14px">
        <input id="q" placeholder="Search any mod…" style="width:360px" value="${esc(browse.query)}" autofocus>
        <span class="muted small">Install to</span>
        <select id="target">${fabs.map((i) => `<option value="${esc(i.id)}" ${i.id === browse.target ? 'selected' : ''}>${esc(i.name)} · ${esc(i.version)}</option>`).join('')}</select>
      </div>
      ${settings.curseforge ? `<div class="tabs"><button data-src="modrinth" class="${browse.source === 'modrinth' ? 'on' : ''}">Modrinth</button><button data-src="curseforge" class="${browse.source === 'curseforge' ? 'on' : ''}">CurseForge</button></div>` : ''}
      <p class="sub">Showing Fabric mods that work on Minecraft ${esc(inst.version)}.</p>
      <div class="grid" id="grid"></div>
      <div style="margin:18px 0"><button class="btn ghost" id="more" hidden>Load more</button></div>`;
    view.querySelectorAll('[data-src]').forEach((b) => (b.onclick = () => { browse.source = b.dataset.src; browse.page = 0; browse.items = []; pages.browse(); }));
    $('#target').onchange = (e) => { browse.target = e.target.value; browse.page = 0; browse.items = []; pages.browse(); };
    let timer;
    const search = (reset) => run(async () => {
      if (reset) { browse.page = 0; browse.items = []; browse.query = $('#q').value.trim(); }
      const items = await api.invoke('mods:search', { source: browse.source, query: browse.query, page: browse.page, instanceId: browse.target });
      browse.items = browse.items.concat(items);
      $('#more').hidden = items.length < 20; drawGrid();
    });
    $('#q').oninput = () => { clearTimeout(timer); timer = setTimeout(() => search(true), 350); };
    $('#q').onkeydown = (e) => { if (e.key === 'Enter') { clearTimeout(timer); search(true); } };
    $('#more').onclick = () => { browse.page++; search(false); };
    drawGrid();
    if (!browse.items.length) search(true);
  },

  async installed() {
    const inst = active();
    if (!inst) return (view.innerHTML = '<div class="empty">Create an instance first.</div>');
    const mods = await api.invoke('mods:list');
    view.innerHTML = `<p class="sub">${mods.length} mod${mods.length === 1 ? '' : 's'} in ${esc(inst.name)}</p>
      <div class="row" style="margin-bottom:16px"><button class="btn ghost" id="folder">${svg(ICON.folder)} Open folder</button></div>
      <div class="list">${mods.map((m) => `
        <div class="item ${m.enabled ? '' : 'off'}"><span class="n">${esc(m.file.replace(/\.disabled$/, ''))}</span>
        <span class="row"><button class="switch ${m.enabled ? 'on' : ''}" data-t="${esc(m.file)}" aria-label="Toggle"></button>
        <button class="btn danger icon" data-r="${esc(m.file)}" aria-label="Remove">${svg(ICON.trash)}</button></span></div>`).join('') || '<div class="empty">No mods yet. Find some in the Mod browser.</div>'}</div>`;
    $('#folder').onclick = () => api.invoke('open:folder', inst.id);
    view.querySelectorAll('[data-t]').forEach((b) => (b.onclick = async () => { await api.invoke('mods:toggle', b.dataset.t); pages.installed(); }));
    view.querySelectorAll('[data-r]').forEach((b) => (b.onclick = async () => { await api.invoke('mods:remove', b.dataset.r); pages.installed(); }));
  },

  async modules() {
    const inst = active();
    if (!inst) return (view.innerHTML = '<div class="empty">Create an instance first.</div>');
    const supported = await api.invoke('modules:supported');
    if (inst.loader !== 'fabric' || !supported.includes(inst.version)) {
      return (view.innerHTML = `<div class="empty">Client modules work on <b>Fabric</b> instances for Minecraft ${supported.join(', ')}. Switch to one of those, or create a new instance.</div>`);
    }
    const [list, st] = await Promise.all([api.invoke('modules:list'), api.invoke('modules:get')]);
    const cats = ['All', ...new Set(list.map((m) => m.category))];
    let cat = pages.modules.cat || 'All', q = '';
    const save = () => api.invoke('modules:set', st);
    const draw = () => {
      const shown = list.filter((m) => (cat === 'All' || m.category === cat) && m.name.toLowerCase().includes(q));
      $('#mcount').textContent = `${list.filter((m) => st[m.id]).length} of ${list.length} enabled for ${inst.name}`;
      $('#mgrid').innerHTML = shown.map((m) => `
        <div class="item"><div><div style="font-weight:600">${esc(m.name)}</div><div class="muted small">${esc(m.category)}</div></div>
        <button class="switch ${st[m.id] ? 'on' : ''}" data-m="${esc(m.id)}" aria-label="${esc(m.name)}"></button></div>`).join('') || '<div class="empty">No modules match.</div>';
      $('#mgrid').querySelectorAll('[data-m]').forEach((b) => (b.onclick = async () => {
        const mod = list.find((x) => x.id === b.dataset.m);
        st[mod.id] = !st[mod.id];
        if (st[mod.id] && mod.group) list.forEach((o) => { if (o !== mod && o.group === mod.group) st[o.id] = false; });
        await save(); draw();
      }));
    };
    view.innerHTML = `<p class="sub" id="mcount"></p>
      <div class="row" style="margin-bottom:14px"><input id="mq" placeholder="Search modules" style="width:260px"><button class="btn ghost" id="mreset">Reset to defaults</button></div>
      <div class="chips" id="mtabs">${cats.map((c) => `<button data-c="${esc(c)}" class="${c === cat ? 'on' : ''}">${esc(c)}</button>`).join('')}</div>
      <div class="field"><label>HUD position and size</label><div class="row">
        <input id="hx" type="number" style="width:84px" title="X" value="${st._hudX}"><input id="hy" type="number" style="width:84px" title="Y" value="${st._hudY}">
        <input id="hs" type="number" step="0.1" min="0.5" max="3" style="width:84px" title="Scale" value="${st._hudScale}"></div>
        <span class="muted small">X, Y and scale for the text readouts. In game: Right Shift opens the module menu, hold C to zoom.</span></div>
      <div class="list" id="mgrid" style="max-width:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr))"></div>`;
    $('#mq').oninput = (e) => { q = e.target.value.toLowerCase(); draw(); };
    $('#mtabs').querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => {
      cat = pages.modules.cat = b.dataset.c;
      $('#mtabs').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); draw();
    }));
    ['hx', 'hy', 'hs'].forEach((id) => ($('#' + id).onchange = () => {
      st._hudX = +$('#hx').value || 0; st._hudY = +$('#hy').value || 0; st._hudScale = Math.min(3, Math.max(0.5, +$('#hs').value || 1)); save();
    }));
    $('#mreset').onclick = async () => { list.forEach((m) => (st[m.id] = m.default)); Object.assign(st, { _hudX: 4, _hudY: 4, _hudScale: 1 }); await save(); pages.modules(); };
    draw();
  },

  async settings() {
    view.innerHTML = `<p class="sub">Applies to all instances.</p>
      <div class="field"><label>Memory: <span id="ramv">${settings.ramGb}</span> GB</label><input type="range" id="ram" min="2" max="16" value="${settings.ramGb}"></div>
      <div class="field"><label>Custom Java path (optional)</label><input id="java" placeholder="Leave empty. Kiln downloads the right Java automatically." value="${esc(settings.javaPath)}"></div>
      <div class="field"><label>Accent color</label><div class="swatches">${SWATCHES.map((c) => `<button data-c="${c}" style="background:${c}" class="${c === settings.accent ? 'on' : ''}" aria-label="${c}"></button>`).join('')}</div></div>
      <div class="field"><label>Background image</label><div class="row"><button class="btn ghost" id="bgp">Choose image</button><button class="btn ghost" id="bgc">Reset</button></div></div>
      <button class="btn" id="save">Save</button>
      <p class="muted small" style="margin-top:22px">Kiln v${esc(settings.version || '')}</p>`;
    $('#ram').oninput = (e) => ($('#ramv').textContent = e.target.value);
    view.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => {
      settings.accent = b.dataset.c; applyLook();
      view.querySelectorAll('[data-c]').forEach((x) => x.classList.toggle('on', x === b));
    }));
    $('#bgp').onclick = async () => { const p = await api.invoke('bg:pick'); if (p) { settings.background = p; applyLook(); } };
    $('#bgc').onclick = async () => { settings.background = ''; await api.invoke('settings:set', { background: '' }); applyLook(); };
    $('#save').onclick = async () => {
      Object.assign(settings, { ramGb: +$('#ram').value, javaPath: $('#java').value.trim() });
      await api.invoke('settings:set', { ramGb: settings.ramGb, javaPath: settings.javaPath, accent: settings.accent });
      toast('Saved');
    };
  },
};

function drawGrid() {
  const g = $('#grid'); if (!g) return;
  g.innerHTML = browse.items.map((m, i) => `
    <div class="card">${m.icon ? `<img src="${esc(m.icon)}" alt="">` : '<div class="ph"></div>'}
      <div style="min-width:0"><div class="t">${esc(m.title)}</div><div class="d">${esc(m.desc)}</div>
      <div class="row"><button class="btn" data-i="${i}">Install</button><span class="muted small">${fmt(m.downloads)} downloads</span></div></div>
    </div>`).join('') || '<div class="empty">No results.</div>';
  g.querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => run(async () => {
    const m = browse.items[+b.dataset.i]; b.disabled = true; b.textContent = 'Installing…';
    try { await api.invoke('mods:install', { source: m.source, id: m.id, page: m.page, instanceId: browse.target }); b.textContent = 'Installed'; }
    catch (e) { b.disabled = false; b.textContent = 'Install'; throw e; }
  })));
}

/* ---------- updates ---------- */
function showUpdate(u) {
  const b = $('#update');
  if (!u) { b.hidden = true; return; }
  b.hidden = false;
  b.innerHTML = u.state === 'ready'
    ? `<span>Kiln ${esc(u.version)} is ready to install.</span><button class="btn" id="upnow">Restart to update</button>`
    : `<span>Downloading update ${esc(u.version)}…</span>`;
  if (u.state === 'ready') $('#upnow').onclick = () => api.invoke('update:install');
}
api.on('update', showUpdate);

/* ---------- boot ---------- */
(async () => {
  settings = await api.invoke('settings:get');
  applyLook();
  api.invoke('update:state').then(showUpdate);
  settings.version = await api.invoke('app:version');
  const acc = await api.invoke('auth:status');
  if (acc) await enterApp(acc); else showLogin();
})();
