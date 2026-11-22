// capimm-figma — Figma → Roblox UI
figma.showUI(__html__, { width: 540, height: 720, themeColors: true });

const PD = { type: 'rbxType', fx: 'rbxFx', sound: 'rbxSound' };
const FONT = { family: 'Inter', style: 'Extra Bold' };

// ---------- helpers visuais (estilo Roblox: borda grossa, gradiente, sombra sólida) ----------
const hex = (h) => {
  h = h.replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16) / 255, g: parseInt(h.slice(2, 4), 16) / 255, b: parseInt(h.slice(4, 6), 16) / 255 };
};
const solid = (h) => ({ type: 'SOLID', color: hex(h) });
const vgrad = (a, b) => ({
  type: 'GRADIENT_LINEAR',
  gradientTransform: [[0, 1, 0], [-1, 0, 1]],
  gradientStops: [
    { position: 0, color: Object.assign(hex(a), { a: 1 }) },
    { position: 1, color: Object.assign(hex(b), { a: 1 }) },
  ],
});
const shadow = (y) => [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 1 }, offset: { x: 0, y: y }, radius: 0, spread: 0, visible: true, blendMode: 'NORMAL' }];
function outline(n, w) {
  n.strokes = [solid('#111111')];
  n.strokeWeight = w;
  try { n.strokeAlign = 'OUTSIDE'; } catch (e) {}
}
async function txt(str, size, color, stroke) {
  const t = figma.createText();
  t.fontName = FONT;
  t.characters = str;
  t.fontSize = size;
  t.fills = [solid(color)];
  if (stroke) outline(t, stroke);
  return t;
}
function centerText(t, w, h) {
  t.textAutoResize = 'NONE';
  t.resize(w, h);
  t.textAlignHorizontal = 'CENTER';
  t.textAlignVertical = 'CENTER';
}

async function makeButton(label, c1, c2, w, h) {
  const f = figma.createFrame();
  f.name = 'Button ' + label;
  f.resize(w, h);
  f.cornerRadius = 10;
  f.fills = [vgrad(c1, c2)];
  outline(f, 4);
  f.effects = shadow(5);
  f.clipsContent = false;
  const t = await txt(label, Math.round(h * 0.42), '#FFFFFF', 3);
  t.name = 'Label';
  centerText(t, w, h);
  f.appendChild(t);
  t.setPluginData(PD.type, 'textLabel');
  f.setPluginData(PD.type, 'imageButton');
  return f;
}
async function makeClose(size) {
  const f = await makeButton('X', '#ff6b5b', '#d62f2f', size, size);
  f.name = 'Close Button';
  return f;
}
async function makePanel(title) {
  const W = 440, H = 360, HH = 56;
  const f = figma.createFrame();
  f.name = 'Panel ' + title;
  f.resize(W, H);
  f.cornerRadius = 18;
  f.fills = [vgrad('#2b2f4a', '#171a2c')];
  outline(f, 5);
  f.effects = shadow(8);
  f.clipsContent = false;
  const head = figma.createFrame();
  head.name = 'Header';
  head.resize(W, HH);
  head.topLeftRadius = 18;
  head.topRightRadius = 18;
  head.bottomLeftRadius = 0;
  head.bottomRightRadius = 0;
  head.fills = [vgrad('#ffd23f', '#ff8a00')];
  f.appendChild(head);
  const t = await txt(title.toUpperCase(), 28, '#FFFFFF', 4);
  t.name = 'Title';
  centerText(t, W, HH);
  head.appendChild(t);
  t.setPluginData(PD.type, 'textLabel');
  const x = await makeClose(36);
  x.x = W - 36 - 10;
  x.y = 10;
  f.appendChild(x);
  const body = figma.createFrame();
  body.name = 'Body';
  body.x = 16;
  body.y = HH + 16;
  body.resize(W - 32, H - HH - 32);
  body.cornerRadius = 12;
  body.fills = [{ type: 'SOLID', color: hex('#000000'), opacity: 0.25 }];
  f.appendChild(body);
  return f;
}
async function makeCard(label) {
  const W = 120, H = 150;
  const f = figma.createFrame();
  f.name = 'Item Card';
  f.resize(W, H);
  f.cornerRadius = 12;
  f.fills = [vgrad('#3a3f63', '#232640')];
  f.strokes = [solid('#4fc3ff')];
  f.strokeWeight = 4;
  f.clipsContent = false;
  const icon = figma.createRectangle();
  icon.name = 'Icon';
  icon.resize(64, 64);
  icon.x = 28;
  icon.y = 14;
  icon.cornerRadius = 10;
  icon.fills = [{ type: 'SOLID', color: hex('#ffffff'), opacity: 0.12 }];
  f.appendChild(icon);
  const t = await txt(label, 14, '#FFFFFF', 2);
  t.name = 'Item Name';
  centerText(t, W, 22);
  t.y = 84;
  f.appendChild(t);
  t.setPluginData(PD.type, 'textLabel');
  const b = await makeButton('EQUIP', '#46e08a', '#1fae5c', 100, 30);
  b.x = 10;
  b.y = 110;
  f.appendChild(b);
  return f;
}
async function makeTabs() {
  const g = figma.createFrame();
  g.name = 'Tabs';
  g.fills = [];
  g.clipsContent = false;
  const defs = [['Admin', '#ff6b5b', '#d62f2f'], ['Event', '#b46bff', '#7a2fd6'], ['Player', '#4fc3ff', '#1f86d6']];
  let x = 0;
  for (const d of defs) {
    const b = await makeButton(d[0], d[1], d[2], 110, 40);
    b.cornerRadius = 20;
    b.x = x;
    g.appendChild(b);
    x += 120;
  }
  g.resize(x - 10, 46);
  return g;
}

// ---------- seleção ----------
function sendSelection() {
  const s = figma.currentPage.selection, n = s[0];
  figma.ui.postMessage({
    type: 'selection',
    count: s.length,
    name: n ? n.name : '',
    nodeType: n ? n.type : '',
    rbxType: n ? n.getPluginData(PD.type) || 'auto' : 'auto',
    fx: n ? JSON.parse(n.getPluginData(PD.fx) || '[]') : [],
    sound: n ? JSON.parse(n.getPluginData(PD.sound) || 'null') : null,
  });
}
figma.on('selectionchange', sendSelection);

// ---------- serialização para o Roblox ----------
const rnd = (k, v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v);
function fillOf(n) {
  if (!('fills' in n) || n.fills === figma.mixed) return null;
  const f = n.fills.find((x) => x.visible !== false);
  if (!f) return null;
  const op = f.opacity == null ? 1 : f.opacity;
  if (f.type === 'SOLID') return { color: f.color, opacity: op };
  if (f.type === 'GRADIENT_LINEAR') {
    return { color: f.gradientStops[0].color, opacity: op, stops: f.gradientStops.map((s) => ({ pos: s.position, color: s.color })) };
  }
  if (f.type === 'IMAGE') return { image: true };
  return null;
}
function strokeOf(n) {
  if (!('strokes' in n) || !n.strokes.length || n.strokes[0].type !== 'SOLID') return null;
  const w = typeof n.strokeWeight === 'number' ? n.strokeWeight : 0;
  return w > 0 ? { color: n.strokes[0].color, weight: w } : null;
}
function ser(n, ox, oy, imgs) {
  const o = { name: n.name, type: n.type, x: n.x - ox, y: n.y - oy, w: n.width, h: n.height, visible: n.visible };
  const tag = n.getPluginData(PD.type) || 'auto';
  const fx = JSON.parse(n.getPluginData(PD.fx) || '[]');
  const snd = JSON.parse(n.getPluginData(PD.sound) || 'null');
  if (fx.length) o.fx = fx;
  if (snd) o.sound = snd;
  o.stroke = strokeOf(n);
  const kids = 'children' in n && n.type !== 'TEXT' ? n.children : [];
  if (n.type === 'TEXT') {
    o.text = n.characters;
    o.fontSize = typeof n.fontSize === 'number' ? n.fontSize : 18;
    const f = n.fills !== figma.mixed && n.fills.find((x) => x.type === 'SOLID');
    o.textColor = f ? f.color : { r: 1, g: 1, b: 1 };
    o.align = n.textAlignHorizontal;
    o.rbx = tag === 'textBox' ? 'textBox' : 'textLabel';
  } else {
    o.fill = fillOf(n);
    o.radius = typeof n.cornerRadius === 'number' ? n.cornerRadius : n.topLeftRadius || 0;
    if (o.fill && o.fill.image) {
      if (kids.length) o.fill = null; // arte só vale em camadas sem filhos
      else {
        const key = (n.name || 'img').replace(/[^A-Za-z0-9_-]+/g, '_') + '_' + n.id.replace(/[^0-9A-Za-z]+/g, '_');
        o.asset = key;
        imgs.push({ node: n, key: key });
      }
    }
    let r = tag;
    if (r === 'auto') {
      const interactive = o.sound || fx.some((e) => ['lift', 'enlarge', 'tilt', 'press'].indexOf(e.id) >= 0) || /btn|button/i.test(n.name);
      r = interactive ? 'imageButton' : o.asset ? 'imageLabel' : 'frame';
    }
    if (r === 'textLabel' || r === 'textBox') r = 'frame';
    o.rbx = r;
  }
  const cox = n.type === 'GROUP' ? n.x : 0, coy = n.type === 'GROUP' ? n.y : 0;
  if (kids.length) o.children = kids.filter((c) => c.visible).map((c) => ser(c, cox, coy, imgs));
  return o;
}

// ---------- mensagens da UI ----------
figma.ui.onmessage = async (m) => {
  const s = figma.currentPage.selection;
  const needSel = () => {
    if (!s.length) { figma.notify('Selecione uma camada no Figma.'); return true; }
    return false;
  };
  switch (m.type) {
    case 'ready': {
      const repo = await figma.clientStorage.getAsync('repo');
      const rbx = await figma.clientStorage.getAsync('rbx');
      figma.ui.postMessage({ type: 'settings', repo: repo || null, rbx: rbx || null });
      sendSelection();
      break;
    }
    case 'save-repo':
      await figma.clientStorage.setAsync('repo', m.repo);
      break;
    case 'save-rbx':
      await figma.clientStorage.setAsync('rbx', m.rbx);
      break;
    case 'open-url':
      if (/^https:\/\//.test(m.url)) figma.openExternal(m.url);
      break;
    case 'notify':
      figma.notify(m.text);
      break;
    case 'set-type':
      if (needSel()) break;
      s.forEach((n) => n.setPluginData(PD.type, m.value === 'auto' ? '' : m.value));
      sendSelection();
      break;
    case 'fx-toggle':
      if (needSel()) break;
      s.forEach((n) => {
        const list = JSON.parse(n.getPluginData(PD.fx) || '[]');
        const i = list.findIndex((e) => e.id === m.id);
        if (i >= 0) list.splice(i, 1);
        else list.push({ id: m.id, speed: 1, strength: 1 });
        n.setPluginData(PD.fx, list.length ? JSON.stringify(list) : '');
      });
      sendSelection();
      break;
    case 'fx-params':
      if (needSel()) break;
      s.forEach((n) => {
        const list = JSON.parse(n.getPluginData(PD.fx) || '[]');
        const e = list.find((x) => x.id === m.id);
        if (e) { e.speed = m.speed; e.strength = m.strength; n.setPluginData(PD.fx, JSON.stringify(list)); }
      });
      break;
    case 'fx-clear':
      figma.currentPage.findAll((n) => n.getPluginData(PD.fx) !== '').forEach((n) => n.setPluginData(PD.fx, ''));
      figma.notify('Efeitos removidos desta página.');
      sendSelection();
      break;
    case 'set-sound':
      if (needSel()) break;
      s.forEach((n) => n.setPluginData(PD.sound, m.id ? JSON.stringify({ id: m.id, volume: m.volume }) : ''));
      figma.notify(m.id ? 'Som aplicado.' : 'Som removido.');
      sendSelection();
      break;
    case 'create': {
      await figma.loadFontAsync(FONT);
      let node;
      if (m.kind === 'panel') node = await makePanel('Shop');
      else if (m.kind === 'button') node = await makeButton('CLAIM', '#46e08a', '#1fae5c', 170, 52);
      else if (m.kind === 'close') node = await makeClose(40);
      else if (m.kind === 'card') node = await makeCard('Sword');
      else if (m.kind === 'tabs') node = await makeTabs();
      if (!node) break;
      const c = figma.viewport.center;
      node.x = Math.round(c.x - node.width / 2);
      node.y = Math.round(c.y - node.height / 2);
      figma.currentPage.selection = [node];
      figma.viewport.scrollAndZoomIntoView([node]);
      break;
    }
    case 'insert-image': {
      const img = figma.createImage(m.bytes);
      const sz = await img.getSizeAsync();
      const r = figma.createRectangle();
      r.name = m.name;
      const k = m.size > 0 ? m.size / Math.max(sz.width, sz.height) : 1;
      r.resize(Math.max(1, Math.round(sz.width * k)), Math.max(1, Math.round(sz.height * k)));
      r.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: 'FILL' }];
      const c = figma.viewport.center;
      r.x = Math.round(c.x - r.width / 2);
      r.y = Math.round(c.y - r.height / 2);
      figma.currentPage.selection = [r];
      break;
    }
    case 'export': {
      const roots = m.scope === 'page' ? figma.currentPage.children.slice() : s.slice();
      if (!roots.length) { figma.notify('Selecione uma camada ou escolha "Página inteira".'); break; }
      const minX = Math.min.apply(null, roots.map((r) => r.x));
      const minY = Math.min.apply(null, roots.map((r) => r.y));
      const imgs = [];
      const data = { v: 1, roots: roots.map((r) => ser(r, minX, minY, imgs)) };
      const images = [];
      for (const it of imgs) {
        const bytes = await it.node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: m.scale || 1 } });
        images.push({ key: it.key, name: it.key + '.png', bytes: bytes });
      }
      figma.ui.postMessage({ type: 'export-result', roots: data.roots, images: images });
      break;
    }
  }
};
