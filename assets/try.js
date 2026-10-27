// The Bubbleshift try-out: drag a file in the pretend Finder window and tap Shift, Command or Option.
// It mirrors the app's drag selector (same rings, sizes, stick-and-release targeting and springs);
// nothing is converted or uploaded, the "new" files only exist on this page.
(() => {
  const root = document.querySelector('[data-try]');
  if (!root) return;
  const stage = root.querySelector('.stage'), grid = root.querySelector('.files'), layer = root.querySelector('.ring');
  const coach = root.querySelector('.coach'), toastEl = root.querySelector('.toast'), keysEl = root.querySelector('.keys');
  const assets = root.dataset.assets || 'assets/';
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touchy = matchMedia('(pointer: coarse)').matches;

  // ---- What the app offers, per file type (Converter.formats, FileAction.supports, FileCommand) ----
  const IMAGE = ['heic', 'jpg', 'jpeg', 'png', 'tiff', 'gif', 'bmp', 'avif', 'ico'], VIDEO = ['mov', 'mp4', 'm4v'];
  const AUDIO = ['m4a', 'wav', 'aiff', 'flac'], DOCS = ['docx', 'odt', 'rtf', 'txt', 'html'];
  const kind = f => f.folder ? 'folder' : f.ext === 'pdf' ? 'pdf' : f.ext === 'zip' ? 'zip' : IMAGE.includes(f.ext) ? 'image'
    : VIDEO.includes(f.ext) ? 'video' : AUDIO.includes(f.ext) ? 'audio' : DOCS.includes(f.ext) ? 'doc' : 'other';
  const OUT = {
    image: ['png', 'jpg', 'heic', 'avif', 'tiff', 'gif', 'bmp', 'pdf', 'ico'], pdf: ['docx', 'png', 'jpg', 'txt'],
    video: ['mp4', 'mov', 'hevc', 'gif', 'm4a'], audio: ['m4a', 'wav', 'aiff', 'flac', 'alac'],
    doc: ['pdf', 'docx', 'odt', 'rtf', 'txt', 'html'], folder: ['zip'], zip: ['unzip'], other: [],
  };
  const formatsFor = f => OUT[kind(f)].filter(x => x !== ({ jpeg: 'jpg' }[f.ext] || f.ext));
  function commonFormats(items) {
    const shared = formatsFor(items[0]).filter(x => items.every(f => formatsFor(f).includes(x)));
    return items.length > 1 ? shared.filter(x => x !== 'zip').concat('zip') : shared;
  }
  const LOSSY = ['jpg', 'jpeg', 'heic'], REWRITABLE = [...LOSSY, 'png', 'tiff', 'bmp'], METADATA = [...LOSSY, 'png', 'tiff'];
  const ACTIONS = {
    compress: f => REWRITABLE.includes(f.ext) || kind(f) === 'pdf' || kind(f) === 'video',
    merge: f => kind(f) === 'image' || kind(f) === 'pdf',
    split: f => kind(f) === 'pdf',
    resize: f => REWRITABLE.includes(f.ext),
    crop: f => REWRITABLE.includes(f.ext),
    strip: f => METADATA.includes(f.ext) || kind(f) === 'video',
    ocr: f => kind(f) === 'image' || kind(f) === 'pdf',
    mute: f => kind(f) === 'video',
    cutout: f => kind(f) === 'image',
  };
  const actionsFor = items => Object.keys(ACTIONS).filter(a =>
    (a !== 'merge' || items.length > 1) && (a !== 'crop' || items.length === 1) && items.every(ACTIONS[a]));
  const COMMANDS = ['airdrop', 'copypath', 'copyfiles', 'copyto', 'terminal'];
  const SIZES = ['resize@2048', 'resize@3840', 'resize@50%', 'resize@1080'];   // the last-used size sits where Resize was

  // ---- Looks (FormatStyle) ----
  const T = { red: '255,115,107', blue: '102,158,255', cyan: '92,219,235', pink: '255,107,184', yellow: '250,217,89',
    violet: '158,128,255', sand: '219,194,128', grey: '184,199,224', green: '89,217,140', purple: '199,140,255',
    steel: '153,189,242', orange: '255,168,77' };
  const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const I = {
    photo: svg('<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4 18 5-5 4 4 3-3 4 4"/>'),
    doc: svg('<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 15h5M10 18h3"/>'),
    rich: svg('<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><rect x="9.5" y="11" width="6" height="4.5" rx="1"/><path d="M10 18h5"/>'),
    code: svg('<path d="m9 8-4 4 4 4M15 8l4 4-4 4"/>'),
    film: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9.5h4M3 14.5h4M17 9.5h4M17 14.5h4"/>'),
    sparkles: svg('<path d="M12 3c.6 4 2 5.4 6 6-4 .6-5.4 2-6 6-.6-4-2-5.4-6-6 4-.6 5.4-2 6-6zM18.5 15c.3 1.7.8 2.2 2.5 2.5-1.7.3-2.2.8-2.5 2.5-.3-1.7-.8-2.2-2.5-2.5 1.7-.3 2.2-.8 2.5-2.5z"/>'),
    wave: svg('<path d="M4 10v4M8 6v12M12 9v6M16 4v16M20 10v4"/>'),
    zip: svg('<path d="M7 3h10v18H7z"/><path d="M12 3v2m0 2v2m0 2v2"/><rect x="10.5" y="13" width="3" height="4" rx="1"/>'),
    box: svg('<rect x="3" y="4" width="18" height="5" rx="1.2"/><path d="M5 9v10h14V9M10 13h4"/>'),
    text: svg('<path d="M4 6h16M4 10h11M4 14h16M4 18h9"/>'),
    app: svg('<rect x="4" y="4" width="16" height="16" rx="4" stroke-dasharray="3 2.4"/>'),
    sheet: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14h18M9 4v16"/>'),
    compress: svg('<path d="M14 10h5M14 10V5M14 10l6-6M10 14H5M10 14v5M10 14l-6 6"/>'),
    merge: svg('<rect x="8" y="3" width="12" height="15" rx="2"/><path d="M5 7v12a2 2 0 0 0 2 2h9"/>'),
    scissors: svg('<circle cx="6" cy="7" r="2.5"/><circle cx="6" cy="17" r="2.5"/><path d="M8.2 8.3 20 18M8.2 15.7 20 6"/>'),
    aspect: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 12V9h3M17 12v3h-3"/>'),
    crop: svg('<path d="M6 2v16h16M2 6h16v16"/>'),
    location: svg('<path d="M12 21s-6-5.6-6-11a6 6 0 0 1 9.6-4.8M18 9.5c0 1-.3 2.2-.8 3.3M14.5 16.8 12 21"/><path d="m3 3 18 18"/>'),
    viewfinder: svg('<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M9 9h6M12 9v7"/>'),
    mute: svg('<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="m17 9 4 6M21 9l-4 6"/>'),
    wand: svg('<path d="m4 20 11-11M13 7l2-2 4 4-2 2"/><path d="M19 3v2M18 4h2M5 5v2M4 6h2M19 15v2M18 16h2"/>'),
    airdrop: svg('<circle cx="12" cy="12" r="1.8"/><path d="M8.5 15.5a5 5 0 1 1 7 0M5.6 18.4a9 9 0 1 1 12.8 0"/>'),
    link: svg('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    clipboard: svg('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6"/>'),
    folder: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
    folderplus: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 10v6M9 13h6"/>'),
    terminal: svg('<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="m7 9 3 3-3 3M12 15h5"/>'),
  };
  const ACTION = {
    compress: ['Compress', 'Compress', 'Compressing…', I.compress, T.cyan],
    merge: ['Merge', 'Merge into one PDF', 'Merging…', I.merge, T.red],
    split: ['Split', 'Split into pages', 'Splitting…', I.scissors, T.red],
    resize: ['Resize', 'Resize to 2048 px · hold for sizes', 'Resizing…', I.aspect, T.blue],
    crop: ['Crop', 'Crop…', 'Cropping…', I.crop, T.blue],
    strip: ['Clean', 'Remove location & metadata', 'Removing metadata…', I.location, T.green],
    ocr: ['Text', 'Extract text', 'Reading text…', I.viewfinder, T.grey],
    mute: ['Mute', 'Remove sound', 'Removing sound…', I.mute, T.pink],
    cutout: ['Cutout', 'Remove background', 'Removing background…', I.wand, T.purple],
  };
  const COMMAND = {
    airdrop: ['AirDrop', 'Send with AirDrop', I.airdrop], copypath: ['Path', 'Copy path', I.link],
    copyfiles: ['Copy', 'Copy, then paste anywhere', I.clipboard], copyto: ['Copy to', 'Copy to a folder…', I.folderplus],
    terminal: ['Terminal', 'Open in Terminal', I.terminal],
  };
  function look(key) {
    if (key.startsWith('resize@')) { const v = key.slice(7); const short = v.endsWith('%') ? v : v + ' px';
      return { tint: T.blue, icon: I.aspect, label: short, title: 'Resize to ' + short, progress: 'Resizing…' }; }
    if (ACTION[key]) { const [label, title, progress, icon, tint] = ACTION[key]; return { tint, icon, label, title, progress }; }
    if (COMMAND[key]) { const [label, title, icon] = COMMAND[key]; return { tint: T.steel, icon, label, title, progress: 'Done' }; }
    const fmt = {
      pdf: [T.red, I.rich], docx: [T.blue, I.doc], rtf: [T.blue, I.doc], odt: [T.blue, I.doc], html: [T.blue, I.code],
      ico: [T.cyan, I.app], txt: [T.grey, I.text], xlsx: [T.green, I.sheet], mp4: [T.pink, I.film], mov: [T.pink, I.film],
      hevc: [T.pink, I.film], gif: [T.yellow, I.sparkles], m4a: [T.violet, I.wave], wav: [T.violet, I.wave],
      aiff: [T.violet, I.wave], flac: [T.violet, I.wave], alac: [T.violet, I.wave], zip: [T.sand, I.zip],
      unzip: [T.sand, I.box],
    }[key] || [T.cyan, I.photo];
    const up = key.toUpperCase();
    return { tint: fmt[0], icon: fmt[1], label: key === 'unzip' ? 'Unzip' : up,
      title: key === 'zip' ? 'Compress to ZIP' : key === 'unzip' ? 'Unzip here' : 'Convert to ' + up,
      progress: key === 'zip' ? 'Zipping…' : key === 'unzip' ? 'Unzipping…' : `Converting to ${up}…` };
  }

  // ---- The pretend folder ----
  const START = [
    { name: 'Coast', ext: 'heic', thumb: 'coast' }, { name: 'Itinerary', ext: 'pdf' }, { name: 'Tickets', ext: 'pdf' },
    { name: 'Clip', ext: 'mov', thumb: 'clip' }, { name: 'Notes', ext: 'docx' }, { name: 'Photos', ext: '', folder: true },
  ];
  let files, selected, uid = 0;
  const BADGE = { pdf: T.red, docx: T.blue, odt: T.blue, rtf: T.blue, html: T.blue, txt: '120,130,150', zip: '170,140,80',
    m4a: T.violet, wav: T.violet, aiff: T.violet, flac: T.violet, gif: '220,170,30', mov: T.pink, mp4: T.pink };
  const fileName = f => f.folder ? f.name : `${f.name}.${f.ext}`;
  function iconHTML(f) {
    if (f.folder) return `<svg viewBox="0 0 64 52"><path d="M4 10a4 4 0 0 1 4-4h14l5 5h29a4 4 0 0 1 4 4v29a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" fill="#3e8ef7"/><path d="M4 18a4 4 0 0 1 4-4h48a4 4 0 0 1 4 4v26a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" fill="#6cb2ff"/></svg>`;
    if (f.thumb && kind(f) !== 'pdf' && kind(f) !== 'doc' && kind(f) !== 'audio')
      return `<img class="thumb${f.cut ? ' cut' : ''}${f.cropped ? ' cropped' : ''}" src="${assets}${f.thumb === 'clip' ? 'coast' : f.thumb}.jpg" alt=""${f.thumb === 'clip' ? ' style="filter:hue-rotate(150deg) saturate(1.3);border-color:#222;border-width:3px 2px"' : ''}>`;
    const c = BADGE[f.ext] || T.cyan;
    return `<div class="fdoc" style="--c:rgb(${c})"><span>${(f.ext || '').toUpperCase()}</span></div>`;
  }
  function render(fresh = []) {
    grid.innerHTML = '';
    for (const f of files) {
      const el = document.createElement('div');
      el.className = 'file' + (selected.has(f) ? ' sel' : '') + (fresh.includes(f) ? ' new' : '');
      el.innerHTML = `<div class="icon">${iconHTML(f)}</div><div class="name">${fileName(f)}</div>`;
      el.file = f;
      grid.appendChild(el);
    }
    const last = [...grid.children].find(el => fresh.includes(el.file));
    if (last) grid.scrollTo({ top: Math.max(0, last.offsetTop - grid.clientHeight + last.offsetHeight + 16), behavior: calm ? 'auto' : 'smooth' });
  }
  function reset() { files = START.map(f => ({ ...f })); selected = new Set(); render(); }
  function free(name, ext, folder) {
    const taken = n => files.some(f => f.name === n && f.ext === ext && !!f.folder === !!folder);
    if (!taken(name)) return name;
    let i = 2; while (taken(`${name} ${i}`)) i++;
    return `${name} ${i}`;
  }

  // ---- Toast and coach ----
  let toastTimer;
  function toast(text) {
    toastEl.textContent = text; toastEl.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('on'), 3200);
  }

  // ---- Geometry, scaled down on small screens ----
  let S = 1, M;
  function measure() {
    S = Math.min(1, Math.max(0.66, stage.clientWidth / 860));
    stage.style.setProperty('--s', S);
    M = { center: 138 * S, sat: 76 * S, orbit: 152 * S };
    M.grab = M.sat * 0.75; M.release = M.sat * 1.25; M.ring = M.orbit + M.sat / 2 + 8;
  }
  const local = e => { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // ---- Springs: response/damping like SwiftUI's ----
  const SP = { appear: [0.28, 0.86], attach: [0.32, 0.8], follow: [0.12, 0.86], gulp: [0.42, 0.42], collapse: [0.3, 1] };
  function spring(v, target, [response, damping], dt) {
    if (calm) { v.x = target; v.v = 0; return; }
    const k = (2 * Math.PI / response) ** 2, c = 4 * Math.PI * damping / response;
    for (let t = 0; t < dt; t += 1 / 240) { const h = Math.min(1 / 240, dt - t); v.v += (-k * (v.x - target) - c * v.v) * h; v.x += v.v * h; }
  }
  const S1 = x => ({ x, v: 0 });

  // ---- Drag state ----
  let press = null, drag = null, armed = null, raf = 0, last = 0;
  const RINGS = { formats: '⇧', actions: '⌘', files: '⌥' };
  const ringFrom = e => (e.metaKey || e.ctrlKey) ? 'actions' : e.altKey ? 'files' : e.shiftKey ? 'formats' : null;

  function ghostFor(items, at) {
    const g = document.createElement('div');
    g.className = 'ghost';
    g.innerHTML = (items[1] ? `<div class="icon stack">${iconHTML(items[1])}</div>` : '') + `<div class="icon">${iconHTML(items[0])}</div>`
      + (items.length > 1 ? `<div class="count">${items.length}</div>` : '');
    stage.appendChild(g);
    g.style.transform = `translate(${at.x}px, ${at.y}px)`;
    return g;
  }

  function begin(p) {
    const f = press.el.file;
    if (!selected.has(f)) { if (!touchy) selected.clear(); selected.add(f); }
    const items = files.filter(x => selected.has(x));
    const icon = press.el.querySelector('.icon').getBoundingClientRect(), r = stage.getBoundingClientRect();
    const origin = { x: icon.left - r.left, y: icon.top - r.top };
    drag = { items, p, origin, grip: { x: press.p.x - origin.x, y: press.p.y - origin.y }, ring: null, since: performance.now(), sats: [] };
    drag.ghost = ghostFor(items, origin);
    drag.gs = 1;
    drag.ghost.style.setProperty('--gx', drag.grip.x + 'px'); drag.ghost.style.setProperty('--gy', drag.grip.y + 'px');
    // Restyle in place: the pressed element keeps the touch's pointer capture.
    for (const el of grid.children) { el.classList.toggle('sel', selected.has(el.file)); el.classList.toggle('lifted', selected.has(el.file)); }
    if (armed) openRing(armed);
    loop();
  }

  function options(kind) {
    if (drag.bloomed) return SIZES;
    return kind === 'formats' ? commonFormats(drag.items) : kind === 'actions' ? actionsFor(drag.items) : COMMANDS;
  }

  function openRing(kind) {
    if (!drag || drag.popped != null) return;
    const fresh = !drag.ring;
    drag.ring = kind;
    if (fresh) {
      const W = stage.clientWidth, H = stage.clientHeight, R = M.ring;
      const fit = (v, size) => size < 2 * R ? size / 2 : Math.min(Math.max(v, R), size - R);
      drag.hub = { x: fit(drag.p.x, W), y: fit(drag.p.y, H) };
      layer.innerHTML = '';
      layer.style.opacity = 1;
      const halo = document.createElement('div');
      halo.className = 'halo';
      const d = M.orbit * 2.7;
      Object.assign(halo.style, { width: d + 'px', height: d + 'px', left: drag.hub.x - d / 2 + 'px', top: drag.hub.y - d / 2 + 'px' });
      layer.appendChild(halo);
      const hub = document.createElement('div');
      hub.className = 'bubble hub';
      Object.assign(hub.style, { width: M.center + 'px', height: M.center + 'px' });
      hub.innerHTML = `<div class="in"><div class="mini">${iconHTML(drag.items[0])}</div><div class="title"></div><div class="hint"></div></div>`;
      layer.appendChild(hub);
      drag.hubEl = hub; drag.hubScale = S1(0.6); drag.hubOpacity = 0; drag.hubSpring = SP.appear;
    }
    drag.bloomed = false; drag.rotation = 0;
    build();
    coach.classList.remove('on'); keysEl.classList.remove('nudge');
    for (const k of keysEl.children) k.classList.toggle('on', k.dataset.ring === kind);
  }

  // The satellites, appearing from the center one after another.
  function build() {
    for (const s of drag.sats) s.el.remove();
    drag.keys = options(drag.ring);
    drag.target = null; drag.resting = null;
    const n = drag.keys.length;
    drag.sats = drag.keys.map((key, i) => {
      const L = look(key), el = document.createElement('div');
      el.className = 'bubble sat';
      el.style.cssText = `width:${M.sat}px;height:${M.sat}px;--t:${L.tint}`;
      el.innerHTML = `<div class="in">${L.icon}<span class="label">${L.label}</span></div>`;
      layer.insertBefore(el, drag.hubEl);
      const h = home(i, n), from = { x: drag.hub.x - h.x, y: drag.hub.y - h.y };
      return { el, key, look: L, ox: S1(from.x), oy: S1(from.y), sc: S1(0.3), op: 0, born: performance.now() + i * 15, lit: false, litAt: 0 };
    });
    hubText();
  }

  function home(i, n = drag.keys.length) {
    const a = -Math.PI / 2 + i * 2 * Math.PI / Math.max(n, 1) + (drag.rotation || 0);
    return { x: drag.hub.x + Math.cos(a) * M.orbit, y: drag.hub.y + Math.sin(a) * M.orbit };
  }

  function hubText() {
    const items = drag.items, f = items[0], hub = drag.hubEl;
    hub.querySelector('.title').textContent = items.length > 1 ? `${items.length} files` : f.folder ? 'Folder' : f.ext.toUpperCase();
    let hint;
    if (drag.popped != null) hint = drag.sats[drag.popped].look.progress;
    else if (drag.target != null) hint = drag.sats[drag.target].look.title;
    else if (drag.bloomed) hint = 'Choose a size · center to go back';
    else if (!drag.keys.length) hint = drag.ring === 'formats' ? 'No shared format' : 'No actions for these files';
    else hint = drag.ring === 'formats' ? 'Drop on a format' : 'Drop on an action';
    hub.querySelector('.hint').textContent = hint;
  }

  // Options stick to the dragged file: the nearest within grabbing distance attaches,
  // and an attached one holds on until pulled past its release distance.
  function targetAt(p) {
    if (drag.target != null && dist(p, home(drag.target)) <= M.release) return drag.target;
    if (dist(p, drag.hub) <= M.center / 2) return null;
    let best = null, d = Infinity;
    drag.keys.forEach((_, i) => { const x = dist(p, home(i)); if (x < d) { d = x; best = i; } });
    return d <= M.grab ? best : null;
  }

  function track() {
    if (!drag.ring || drag.popped != null) return;
    const now = performance.now();
    if (drag.bloomed && dist(drag.p, drag.hub) <= M.center / 2) { drag.bloomed = false; drag.rotation = 0; build(); }
    let next = targetAt(drag.p);
    if (next != null && drag.keys[next] === 'resize') {
      if (!drag.resting || drag.resting.i !== next) drag.resting = { i: next, t: now };
      else if (now - drag.resting.t > 350) {
        drag.rotation = next * 2 * Math.PI / drag.keys.length;
        drag.bloomed = true; build(); next = targetAt(drag.p);
      }
    } else drag.resting = null;
    if (next !== drag.target) {
      drag.target = next;
      drag.sats.forEach((s, i) => { const lit = i === next; if (lit !== s.lit) { s.lit = lit; s.litAt = now; s.el.classList.toggle('lit', lit); } });
      hubText();
    }
  }

  function loop() {
    cancelAnimationFrame(raf);
    last = performance.now();
    const step = now => {
      if (!drag) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      // While an option holds the file, the file shrinks a little so the option's label shows through.
      const held = drag.ring && drag.target != null;
      drag.ghost.classList.toggle('held', !!held && !drag.done);
      if (!drag.done) drag.gs += ((held ? 0.72 : 1) - drag.gs) * Math.min(1, dt * 16);
      drag.ghost.style.transform = `translate(${drag.p.x - drag.grip.x}px, ${drag.p.y - drag.grip.y}px) scale(${drag.done ? 0.5 : drag.gs.toFixed(3)})`;
      if (!drag.ring && !coach.classList.contains('on') && now - drag.since > 400 && !drag.done) {
        coach.textContent = touchy ? 'Now tap a key below ↓' : 'Now tap ⇧ Shift (or ⌘, ⌥)';
        coach.classList.add('on'); keysEl.classList.add('nudge');
      }
      if (coach.classList.contains('on')) coach.style.transform = `translate(${drag.p.x + 26}px, ${drag.p.y + 30}px)`;
      if (drag.ring) { track(); paint(now, dt); }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  function paint(now, dt) {
    const n = drag.keys.length, W = stage.clientWidth, H = stage.clientHeight, inset = M.sat * 0.55 + 4;
    drag.sats.forEach((s, i) => {
      const h = home(i, n);
      let tx = 0, ty = 0, ts = 1, to = 1, sp = SP.attach;
      if (now < s.born) { tx = s.ox.x; ty = s.oy.x; ts = 0.3; to = 0; }
      else if (now - s.born < 450 && !s.lit) sp = SP.appear;
      if (drag.popped != null) {
        if (drag.popped === i) { tx = s.ox.x; ty = s.oy.x; ts = 1.7; to = 0; sp = SP.collapse; }
        else { tx = drag.hub.x - h.x; ty = drag.hub.y - h.y; ts = 0.3; to = 0; sp = SP.collapse; }
      } else if (s.lit && !calm) {
        tx = Math.min(Math.max(drag.p.x, inset), W - inset) - h.x; ty = Math.min(Math.max(drag.p.y, inset), H - inset) - h.y;
        ts = 1.1; sp = now - s.litAt < 300 ? SP.attach : SP.follow;
      } else if (s.lit) ts = 1.1;
      spring(s.ox, tx, sp, dt); spring(s.oy, ty, sp, dt); spring(s.sc, ts, sp, dt);
      s.op += (to - s.op) * Math.min(1, dt * (drag.popped != null ? 9 : 14));
      if (calm) s.op = to;
      s.el.style.opacity = s.op.toFixed(3);
      s.el.style.transform = `translate(${h.x + s.ox.x - M.sat / 2}px, ${h.y + s.oy.x - M.sat / 2}px) scale(${s.sc.x.toFixed(4)})`;
    });
    spring(drag.hubScale, 1, drag.hubSpring, dt);
    drag.hubOpacity += (1 - drag.hubOpacity) * Math.min(1, dt * 14);
    drag.hubEl.style.opacity = calm ? 1 : drag.hubOpacity.toFixed(3);
    drag.hubEl.style.transform = `translate(${drag.hub.x - M.center / 2}px, ${drag.hub.y - M.center / 2}px) scale(${drag.hubScale.x.toFixed(4)})`;
  }

  function finish(dropped) {
    const d = drag;
    coach.classList.remove('on'); keysEl.classList.remove('nudge');
    for (const k of keysEl.children) k.classList.toggle('on', k.dataset.ring === armed);
    if (dropped && d.ring && d.target != null) {
      d.popped = d.target; d.done = true;
      hubText();
      // The center "gulps" the file, then springs back.
      d.hubScale.x = 0.84; d.hubScale.v = 0; d.hubSpring = SP.gulp;
      d.ghost.classList.add('gone');
      const key = d.keys[d.target];
      setTimeout(() => { layer.style.transition = 'opacity .2s'; layer.style.opacity = 0; }, 420);
      setTimeout(() => { if (drag === d) end(); perform(key, d.items); }, 640);
      return;
    }
    // Nothing chosen: the files slide back, like a cancelled Finder drag.
    d.done = true;
    layer.style.transition = 'opacity .2s'; layer.style.opacity = 0;
    cancelAnimationFrame(raf);
    d.ghost.classList.add('back');
    d.ghost.style.transform = `translate(${d.origin.x}px, ${d.origin.y}px)`;
    d.ghost.style.opacity = 0.2;
    setTimeout(() => { if (drag === d) end(); render(); }, 330);
  }
  function end() {
    cancelAnimationFrame(raf);
    if (drag) drag.ghost.remove();
    layer.innerHTML = ''; layer.style.transition = ''; layer.style.opacity = 1;
    drag = null;
  }

  // ---- What a drop produces: new files beside the originals, named as the app names them ----
  const DIR = '~/Desktop/Demo/';
  function perform(key, items) {
    const one = items[0], made = [];
    const add = (name, ext, extra = {}) => { const f = { name: free(name, ext, extra.folder), ext, ...extra }; made.push(f); return f; };
    const image = ext => IMAGE.includes(ext);
    const thumbFrom = (src, ext) => (image(ext) || VIDEO.includes(ext) || ext === 'gif') && src.thumb ? { thumb: src.thumb } : {};
    let note = '';
    if (COMMAND[key]) {
      const paths = items.map(f => DIR + fileName(f));
      if (key === 'copypath') {
        navigator.clipboard?.writeText(paths.join('\n')).catch(() => {});
        return toast(`Copied ${paths.length > 1 ? paths.length + ' paths' : paths[0]}. Try pasting it.`);
      }
      return toast({ airdrop: 'In Bubbleshift, AirDrop opens with the files ready to send.',
        copyfiles: 'Copied. In Bubbleshift, you can paste the files into any folder, mail or message.',
        copyto: 'In Bubbleshift, you pick a folder and the files are copied there.',
        terminal: 'In Bubbleshift, Terminal opens in the file’s folder.' }[key]);
    }
    if (key === 'zip') add(items.length > 1 ? 'Archive' : one.name, 'zip');
    else if (key === 'unzip') add(one.name, '', { folder: true });
    else if (key === 'merge') { add(one.name + ' merged', 'pdf'); note = 'In Bubbleshift, you first drag the files into the order you want.'; }
    else for (const f of items) {
      const ext = f.ext;
      if (key.startsWith('resize')) { add(f.name + ' resized', ext, thumbFrom(f, ext)); note = `${look(key.includes('@') ? key : 'resize@2048').title}. Rest on Resize to choose other sizes.`; }
      else if (key === 'compress') { const to = LOSSY.includes(ext) || kind(f) !== 'image' ? ext : 'jpg'; add(f.name + ' compressed', to, thumbFrom(f, to)); }
      else if (key === 'crop') { add(f.name + ' cropped', ext, { ...thumbFrom(f, ext), cropped: true }); note = 'In Bubbleshift, a crop editor opens first so you can set the frame.'; }
      else if (key === 'split') add(f.name + '-split', '', { folder: true });
      else if (key === 'strip') { add(f.name + ' clean', ext, thumbFrom(f, ext)); note = 'Location, date and camera details removed. The original keeps them.'; }
      else if (key === 'ocr') add(f.name, 'txt');
      else if (key === 'mute') add(f.name + ' muted', ext, thumbFrom(f, ext));
      else if (key === 'cutout') add(f.name + ' cutout', 'png', { ...thumbFrom(f, 'png'), cut: true });
      else {
        const ext2 = { hevc: 'mp4', alac: 'm4a' }[key] || key, suffix = { hevc: ' HEVC', alac: ' ALAC' }[key] || '';
        add(f.name + suffix, ext2, thumbFrom(f, ext2));
      }
    }
    const after = Math.max(...items.map(f => files.indexOf(f)));
    files.splice(after + 1, 0, ...made);
    selected = new Set(made);
    render(made);
    toast(note || (made.length > 1 ? `${made.length} new files, right beside the originals.` : `${fileName(made[0])} is ready, right beside the original.`));
  }

  // ---- Input ----
  grid.addEventListener('pointerdown', e => {
    if (e.button > 0 || drag) return;
    const el = e.target.closest('.file');
    if (!el) { selected.clear(); render(); return; }
    press = { el, p: local(e), id: e.pointerId, touch: e.pointerType !== 'mouse', mods: e.metaKey || e.shiftKey };
    e.preventDefault();
  });
  window.addEventListener('pointermove', e => {
    if (press && e.pointerId === press.id && !drag) {
      const p = local(e);
      if (dist(p, press.p) > (press.touch ? 8 : 4)) begin(p);
    }
    if (drag && e.pointerId === press?.id && !drag.done) {
      drag.p = local(e);
      const want = ringFrom(e);
      if (want && want !== drag.ring) openRing(want);
    }
  }, { passive: true });
  window.addEventListener('pointerup', e => {
    if (!press || e.pointerId !== press.id) return;
    if (drag && !drag.done) { drag.p = local(e); track(); finish(true); }
    else if (!drag) {
      const f = press.el.file;
      if (press.touch || press.mods) { selected.has(f) ? selected.delete(f) : selected.add(f); }
      else { selected = new Set([f]); }
      render();
    }
    press = null;
  });
  window.addEventListener('pointercancel', e => { if (press && e.pointerId === press.id) { if (drag && !drag.done) finish(false); press = null; } });
  window.addEventListener('keydown', e => {
    if (!drag || drag.done) return;
    if (e.key === 'Escape') { finish(false); press = null; return; }
    const want = { Shift: 'formats', Meta: 'actions', Control: 'actions', Alt: 'files' }[e.key];
    if (want) { e.preventDefault(); openRing(want); }
  });
  // On-screen keys: tap during a drag (with a second finger), or before it to have the ring ready.
  for (const k of keysEl.children) {
    k.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      const want = k.dataset.ring;
      if (drag && !drag.done) { openRing(want); return; }
      armed = armed === want ? null : want;
      for (const x of keysEl.children) x.classList.toggle('on', x.dataset.ring === armed);
      if (armed) toast(`${RINGS[armed]} is ready. Now drag a file.`);
    });
    k.addEventListener('click', e => e.preventDefault());
  }
  root.querySelector('[data-reset]').addEventListener('click', reset);
  addEventListener('resize', () => { if (!drag) measure(); });

  measure();
  reset();
})();
