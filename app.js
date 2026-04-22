// Amansala Ad Generator — brand-locked systematic variation engine.
// All DOM content is rendered from application-defined data, not user HTML input.

// ───────────────────────── Config ─────────────────────────

const AD_SIZES = [
  { w: 300,  h: 250,  name: '300x250',   cat: 'DSP',  layout: 'rect'     },
  { w: 728,  h: 90,   name: '728x90',    cat: 'DSP',  layout: 'leaderbd' },
  { w: 160,  h: 600,  name: '160x600',   cat: 'DSP',  layout: 'tall'     },
  { w: 320,  h: 50,   name: '320x50',    cat: 'DSP',  layout: 'mbanner'  },
  { w: 300,  h: 600,  name: '300x600',   cat: 'DSP',  layout: 'tall'     },
  { w: 320,  h: 100,  name: '320x100',   cat: 'DSP',  layout: 'mbanner'  },
  { w: 336,  h: 280,  name: '336x280',   cat: 'DSP',  layout: 'rect'     },
  { w: 970,  h: 90,   name: '970x90',    cat: 'DSP',  layout: 'leaderbd' },
  { w: 1080, h: 1080, name: '1080x1080', cat: 'Meta', layout: 'square'   },
  { w: 1080, h: 1920, name: '1080x1920', cat: 'Meta', layout: 'tall'     },
  { w: 1200, h: 628,  name: '1200x628',  cat: 'Meta', layout: 'rect'     },
];

// Which photo orientations work for which layout (in priority order)
const LAYOUT_ORIENT_PREFS = {
  rect:     ['landscape', 'square', 'portrait'],
  leaderbd: ['landscape', 'square'],
  tall:     ['portrait', 'square'],
  mbanner:  ['landscape', 'square'],
  square:   ['square', 'landscape', 'portrait'],
};

const PHOTO_COUNT = 13;
const PHOTOS = Array.from({length: PHOTO_COUNT}, (_, i) => ({
  idx: i,
  src: 'assets/photos/' + (i + 1) + '.png',
  orient: 'portrait',  // loaded async from actual image dimensions
  focal: { x: 50, y: 40 },  // % — default upper-middle
  tags: [],
  w: 0,
  h: 0,
}));

// ───────────────────────── State ─────────────────────────

let CAMPAIGNS = {};
let selectedPhotos = new Set();
let selectedLogo = 'black';
let selectedTreatment = 'espresso';
let generatedAds = [];
let activeFilter = 'all';
let taggerPhotoIdx = null;

// ───────────────────────── Init ─────────────────────────

async function init() {
  await loadCampaigns();
  await loadPhotoMetadata();
  renderPhotoGrid();
  populateCampaignSelect();
  loadCampaign(Object.keys(CAMPAIGNS)[0]);
}

async function loadCampaigns() {
  try {
    const r = await fetch('campaigns.json');
    CAMPAIGNS = await r.json();
  } catch (e) {
    console.error('campaigns.json load failed', e);
    CAMPAIGNS = { custom: { label: 'Custom', headlines: ['headline'], subtitle: '', body: '' } };
  }
}

function populateCampaignSelect() {
  const sel = document.getElementById('campaignSelect');
  sel.textContent = '';
  Object.entries(CAMPAIGNS).forEach(([k, v]) => {
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = v.label || k;
    sel.appendChild(opt);
  });
}

async function loadPhotoMetadata() {
  // Auto-detect orientation from actual image dimensions
  await Promise.all(PHOTOS.map(p => new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      p.w = img.naturalWidth;
      p.h = img.naturalHeight;
      const ratio = p.w / p.h;
      if (ratio > 1.2) p.orient = 'landscape';
      else if (ratio < 0.83) p.orient = 'portrait';
      else p.orient = 'square';
      resolve();
    };
    img.onerror = resolve;
    img.src = p.src;
  })));

  // Restore per-photo tags from localStorage
  try {
    const saved = JSON.parse(localStorage.getItem('amansala-photo-meta') || '{}');
    PHOTOS.forEach(p => {
      const s = saved[p.idx];
      if (s) {
        if (s.orient) p.orient = s.orient;
        if (s.focal) p.focal = s.focal;
        if (s.tags) p.tags = s.tags;
      }
    });
  } catch (e) { /* fresh start */ }
}

function savePhotoMetadata() {
  const out = {};
  PHOTOS.forEach(p => {
    out[p.idx] = { orient: p.orient, focal: p.focal, tags: p.tags };
  });
  localStorage.setItem('amansala-photo-meta', JSON.stringify(out));
}

// ───────────────────────── Photo grid ─────────────────────────

function renderPhotoGrid() {
  const grid = document.getElementById('photoGrid');
  grid.textContent = '';
  PHOTOS.forEach(p => {
    const tile = document.createElement('div');
    tile.className = 'photo-tile';
    if (selectedPhotos.has(p.idx)) tile.classList.add('selected');

    const img = document.createElement('img');
    img.src = p.src;
    img.loading = 'lazy';
    img.style.objectPosition = p.focal.x + '% ' + p.focal.y + '%';
    tile.appendChild(img);

    const badge = document.createElement('div');
    badge.className = 'orient-badge';
    badge.textContent = p.orient.slice(0, 4);
    tile.appendChild(badge);

    const check = document.createElement('div');
    check.className = 'tile-check';
    check.textContent = '✓';
    tile.appendChild(check);

    tile.onclick = (e) => {
      if (e.shiftKey) {
        openTagger(p.idx);
      } else {
        togglePhoto(p.idx);
      }
    };
    tile.oncontextmenu = (e) => {
      e.preventDefault();
      openTagger(p.idx);
    };
    tile.title = 'Click: select • Shift+click or right-click: tag';
    grid.appendChild(tile);
  });
  updatePhotoCount();
}

function updatePhotoCount() {
  document.getElementById('photoCount').textContent = selectedPhotos.size + ' selected';
}

function togglePhoto(idx) {
  if (selectedPhotos.has(idx)) selectedPhotos.delete(idx);
  else selectedPhotos.add(idx);
  renderPhotoGrid();
}

function selectAllPhotos() {
  PHOTOS.forEach(p => selectedPhotos.add(p.idx));
  renderPhotoGrid();
}

function selectByOrient(orient) {
  selectedPhotos.clear();
  PHOTOS.forEach(p => { if (p.orient === orient) selectedPhotos.add(p.idx); });
  renderPhotoGrid();
}

// ───────────────────────── Photo tagger ─────────────────────────

function openTagger(idx) {
  taggerPhotoIdx = idx;
  const p = PHOTOS[idx];
  document.getElementById('taggerImg').src = p.src;
  document.getElementById('taggerOrient').value = p.orient;
  document.getElementById('taggerTags').value = p.tags.join(', ');
  const dot = document.getElementById('focalDot');
  dot.style.left = p.focal.x + '%';
  dot.style.top = p.focal.y + '%';
  document.getElementById('taggerOverlay').classList.add('active');
}

function closeTagger() {
  document.getElementById('taggerOverlay').classList.remove('active');
  taggerPhotoIdx = null;
}

function setFocal(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  const dot = document.getElementById('focalDot');
  dot.style.left = x + '%';
  dot.style.top = y + '%';
  dot.dataset.x = x;
  dot.dataset.y = y;
}

function saveTagger() {
  if (taggerPhotoIdx === null) return;
  const p = PHOTOS[taggerPhotoIdx];
  const dot = document.getElementById('focalDot');
  const x = parseFloat(dot.dataset.x);
  const y = parseFloat(dot.dataset.y);
  if (!isNaN(x)) p.focal.x = x;
  if (!isNaN(y)) p.focal.y = y;
  p.orient = document.getElementById('taggerOrient').value;
  p.tags = document.getElementById('taggerTags').value
    .split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
  savePhotoMetadata();
  renderPhotoGrid();
  closeTagger();
}

// ───────────────────────── Headlines / campaign ─────────────────────────

function loadCampaign(name) {
  const c = CAMPAIGNS[name];
  if (!c) return;
  const list = document.getElementById('headlineList');
  list.textContent = '';
  c.headlines.forEach(h => addHeadline(h));
  document.getElementById('subtitleInput').value = c.subtitle || '';
  document.getElementById('bodyInput').value = c.body || '';
}

function addHeadline(text) {
  const list = document.getElementById('headlineList');
  const row = document.createElement('div');
  row.className = 'headline-row';
  const input = document.createElement('input');
  input.type = 'text';
  input.value = text || '';
  input.placeholder = 'headline (use \\n for line break)';
  const btn = document.createElement('button');
  btn.textContent = '×';
  btn.onclick = () => row.remove();
  row.appendChild(input);
  row.appendChild(btn);
  list.appendChild(row);
}

function selectLogo(el) {
  document.querySelectorAll('.logo-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  selectedLogo = el.dataset.logo;
}

function selectTreatment(el) {
  document.querySelectorAll('.treatment-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  selectedTreatment = el.dataset.treatment;
}

// ───────────────────────── Custom font upload ─────────────────────────

function loadCustomFont(input) {
  const file = input.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const font = new FontFace('ArchitypeBayer', 'url(' + url + ')');
  font.load().then(f => {
    document.fonts.add(f);
    alert('Custom headline font loaded. Re-generate to apply.');
  }).catch(err => {
    alert('Font load failed: ' + err.message);
  });
}

// ───────────────────────── Photo-to-size compatibility ─────────────────────────

function pickCompatiblePhotos(size) {
  const prefs = LAYOUT_ORIENT_PREFS[size.layout];
  const selected = Array.from(selectedPhotos).map(i => PHOTOS[i]);
  const matches = [];
  for (const orient of prefs) {
    const ofType = selected.filter(p => p.orient === orient);
    matches.push(...ofType);
  }
  return matches.length ? matches : selected;
}

// ───────────────────────── Generation ─────────────────────────

function gatherHeadlines() {
  return Array.from(document.querySelectorAll('.headline-row input'))
    .map(el => el.value.replace(/\\n/g, '\n'))
    .filter(h => h.trim());
}

function generateAds() {
  if (selectedPhotos.size === 0) { alert('Select at least one photo'); return; }
  const headlines = gatherHeadlines();
  if (headlines.length === 0) { alert('Add at least one headline'); return; }

  const subtitle = document.getElementById('subtitleInput').value;
  const body = document.getElementById('bodyInput').value;
  const overlay = document.getElementById('overlaySelect').value;

  generatedAds = [];
  AD_SIZES.forEach(size => {
    const photos = pickCompatiblePhotos(size);
    photos.forEach(photo => {
      headlines.forEach(headline => {
        generatedAds.push(buildAd({ photo, headline, subtitle, body, size, overlay }));
      });
    });
  });

  renderPreviews();
}

function generateFullMatrix() {
  if (selectedPhotos.size === 0) { selectAllPhotos(); }
  generateAds();
}

function buildAd({ photo, headline, subtitle, body, size, overlay }) {
  return {
    photo,
    headline,
    subtitle,
    body,
    size,
    overlay,
    treatment: selectedTreatment,
    logo: selectedLogo,
  };
}

// ───────────────────────── Rendering ─────────────────────────

function renderPreviews() {
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('previewArea').style.display = 'block';
  document.getElementById('downloadBar').style.display = 'flex';

  const uniquePhotos = new Set(generatedAds.map(a => a.photo.idx)).size;
  const uniqueHeadlines = new Set(generatedAds.map(a => a.headline)).size;

  const stats = [
    [generatedAds.length, 'variations'],
    [uniquePhotos, 'photos'],
    [uniqueHeadlines, 'headlines'],
    [AD_SIZES.length, 'sizes'],
  ];
  const statsBar = document.getElementById('statsBar');
  statsBar.textContent = '';
  stats.forEach(([n, lbl]) => {
    const chip = document.createElement('div');
    chip.className = 'stat-chip';
    const strong = document.createElement('strong');
    strong.textContent = n;
    chip.appendChild(strong);
    chip.appendChild(document.createTextNode(lbl));
    statsBar.appendChild(chip);
  });

  const filters = document.getElementById('sizeFilters');
  filters.textContent = '';
  ['all', ...AD_SIZES.map(s => s.name)].forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'size-filter' + (name === activeFilter ? ' active' : '');
    btn.textContent = name;
    btn.onclick = () => filterBy(name, btn);
    filters.appendChild(btn);
  });

  renderGrid();
}

function filterBy(name, btn) {
  activeFilter = name;
  document.querySelectorAll('.size-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderGrid();
}

function renderGrid() {
  const grid = document.getElementById('previewGrid');
  grid.textContent = '';
  const ads = activeFilter === 'all' ? generatedAds : generatedAds.filter(a => a.size.name === activeFilter);
  const MAX_PREVIEW_W = 320;

  ads.forEach(ad => {
    const scale = Math.min(MAX_PREVIEW_W / ad.size.w, 1, 320 / ad.size.h);
    const card = renderAdCard(ad, scale);
    grid.appendChild(card);
  });
}

// ───────────────────────── Single ad card ─────────────────────────

function renderAdCard(ad, scale) {
  const card = document.createElement('div');
  card.className = 'ad-card';

  const header = document.createElement('div');
  header.className = 'ad-card-header';
  const l = document.createElement('span');
  l.textContent = ad.size.name;
  const r = document.createElement('span');
  r.textContent = 'photo ' + (ad.photo.idx + 1) + ' • ' + ad.photo.orient.slice(0, 4);
  header.appendChild(l);
  header.appendChild(r);
  card.appendChild(header);

  const canvas = renderAdCanvas(ad, scale);
  card.appendChild(canvas);
  return card;
}

function renderAdCanvas(ad, scale) {
  const pw = Math.round(ad.size.w * scale);
  const ph = Math.round(ad.size.h * scale);

  const canvas = document.createElement('div');
  canvas.className = 'ad-canvas';
  canvas.style.cssText = 'width:' + pw + 'px;height:' + ph + 'px;position:relative;overflow:hidden;background:var(--cream);';
  canvas.dataset.realW = ad.size.w;
  canvas.dataset.realH = ad.size.h;

  // Photo (with focal-point object-position)
  const bg = document.createElement('img');
  bg.src = ad.photo.src;
  bg.crossOrigin = 'anonymous';
  bg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;' +
    'object-position:' + ad.photo.focal.x + '% ' + ad.photo.focal.y + '%;';
  canvas.appendChild(bg);

  // Overlay
  if (ad.overlay === 'warm-tint') {
    const o = document.createElement('div');
    o.style.cssText = 'position:absolute;inset:0;background:rgba(245,240,232,0.18);pointer-events:none;';
    canvas.appendChild(o);
  } else if (ad.overlay === 'bottom-fade') {
    const o = document.createElement('div');
    o.style.cssText = 'position:absolute;inset:0;background:linear-gradient(to bottom,transparent 40%,rgba(54,47,40,0.55) 100%);pointer-events:none;';
    canvas.appendChild(o);
  } else if (ad.overlay === 'top-fade') {
    const o = document.createElement('div');
    o.style.cssText = 'position:absolute;inset:0;background:linear-gradient(to bottom,rgba(54,47,40,0.55) 0%,transparent 50%);pointer-events:none;';
    canvas.appendChild(o);
  }

  // Text layer — delegate by layout
  const layout = ad.size.layout;
  const layers = LAYOUT_RENDERERS[layout](ad, pw, ph);
  layers.forEach(el => canvas.appendChild(el));

  return canvas;
}

// ───────────────────────── Layout renderers ─────────────────────────

function textColorFor(treatment) {
  switch (treatment) {
    case 'espresso': return '#574A3F';
    case 'cream':    return '#F5F0E8';
    case 'tan':      return '#B79D85';
    case 'auto':     return '#574A3F';  // TODO: sample photo luminance
    default:         return '#574A3F';
  }
}

function makeHeadline(text, color, fontSize, letterSpacing) {
  const el = document.createElement('div');
  el.style.cssText = 'font-family: var(--font-headline); ' +
    'font-size:' + fontSize + 'px; ' +
    'line-height:1.02; ' +
    'font-weight:400; ' +
    'letter-spacing:' + (letterSpacing || '0.02em') + '; ' +
    'color:' + color + '; ' +
    'text-transform:lowercase;';
  text.split('\n').forEach((line, i) => {
    if (i > 0) el.appendChild(document.createElement('br'));
    el.appendChild(document.createTextNode(line));
  });
  return el;
}

function makeLabel(text, color, size, spacing) {
  const el = document.createElement('div');
  el.style.cssText = 'font-family: var(--font-sans); ' +
    'font-size:' + size + 'px; ' +
    'font-weight:600; ' +
    'letter-spacing:' + (spacing || '0.18em') + '; ' +
    'text-transform:uppercase; ' +
    'color:' + color + ';';
  el.textContent = text;
  return el;
}

function makeBody(text, color, size) {
  const el = document.createElement('div');
  el.style.cssText = 'font-family: var(--font-sans); ' +
    'font-size:' + size + 'px; ' +
    'line-height:1.35; ' +
    'font-weight:400; ' +
    'color:' + color + ';';
  text.split('\n').forEach((line, i) => {
    if (i > 0) el.appendChild(document.createElement('br'));
    el.appendChild(document.createTextNode(line));
  });
  return el;
}

function makeLogo(variant, height, filterDrop) {
  const img = document.createElement('img');
  img.src = 'assets/logos/logo-' + variant + '.png';
  img.crossOrigin = 'anonymous';
  img.style.cssText = 'height:' + height + 'px;width:auto;display:block;' +
    (filterDrop ? 'filter:drop-shadow(0 1px 2px rgba(54,47,40,0.18));' : '');
  return img;
}

// All layouts return an array of absolutely-positioned DOM elements

const LAYOUT_RENDERERS = {

  // RECT: 300x250, 336x280, 1200x628 — logo top-left, headline bottom-left, subtitle top-right
  rect: (ad, pw, ph) => {
    const color = textColorFor(ad.treatment);
    const pad = Math.max(10, Math.round(pw * 0.045));
    const base = Math.min(pw, ph);
    const headlineSize = Math.round(base * 0.13);
    const subtitleSize = Math.max(7, Math.round(base * 0.035));
    const bodySize = Math.max(7, Math.round(base * 0.04));
    const logoH = Math.max(14, Math.round(base * 0.11));

    const headlineWrap = document.createElement('div');
    headlineWrap.style.cssText = 'position:absolute;left:' + pad + 'px;bottom:' + pad + 'px;right:' + pad + 'px;z-index:2;';
    headlineWrap.appendChild(makeHeadline(ad.headline, color, headlineSize, '0.01em'));
    if (ad.body) {
      const body = makeBody(ad.body, color, bodySize);
      body.style.marginTop = Math.round(headlineSize * 0.25) + 'px';
      body.style.opacity = '0.8';
      headlineWrap.appendChild(body);
    }

    const subWrap = document.createElement('div');
    subWrap.style.cssText = 'position:absolute;top:' + pad + 'px;right:' + pad + 'px;z-index:2;text-align:right;';
    if (ad.subtitle) subWrap.appendChild(makeLabel(ad.subtitle, color, subtitleSize, '0.18em'));

    const logoWrap = document.createElement('div');
    logoWrap.style.cssText = 'position:absolute;top:' + pad + 'px;left:' + pad + 'px;z-index:3;';
    logoWrap.appendChild(makeLogo(ad.logo, logoH, true));

    return [headlineWrap, subWrap, logoWrap];
  },

  // SQUARE: 1080x1080 — headline center, logo top, subtitle bottom
  square: (ad, pw, ph) => {
    const color = textColorFor(ad.treatment);
    const pad = Math.round(pw * 0.06);
    const headlineSize = Math.round(pw * 0.11);
    const subtitleSize = Math.round(pw * 0.025);
    const bodySize = Math.round(pw * 0.03);
    const logoH = Math.round(pw * 0.08);

    const logoWrap = document.createElement('div');
    logoWrap.style.cssText = 'position:absolute;top:' + pad + 'px;left:50%;transform:translateX(-50%);z-index:3;';
    logoWrap.appendChild(makeLogo(ad.logo, logoH, true));

    const headlineWrap = document.createElement('div');
    headlineWrap.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:2;text-align:center;width:80%;';
    headlineWrap.appendChild(makeHeadline(ad.headline, color, headlineSize, '0.02em'));

    const bottomWrap = document.createElement('div');
    bottomWrap.style.cssText = 'position:absolute;bottom:' + pad + 'px;left:0;right:0;text-align:center;z-index:2;';
    if (ad.subtitle) {
      const lbl = makeLabel(ad.subtitle, color, subtitleSize, '0.22em');
      bottomWrap.appendChild(lbl);
    }
    if (ad.body) {
      const body = makeBody(ad.body, color, bodySize);
      body.style.marginTop = '6px';
      body.style.opacity = '0.8';
      bottomWrap.appendChild(body);
    }

    return [logoWrap, headlineWrap, bottomWrap];
  },

  // TALL: 160x600, 300x600, 1080x1920 — logo top, headline upper-mid, body lower-mid
  tall: (ad, pw, ph) => {
    const color = textColorFor(ad.treatment);
    const pad = Math.max(8, Math.round(pw * 0.08));
    const base = pw;
    const headlineSize = Math.round(base * 0.17);
    const subtitleSize = Math.max(6, Math.round(base * 0.055));
    const bodySize = Math.max(7, Math.round(base * 0.065));
    const logoH = Math.max(14, Math.round(base * 0.18));

    const logoWrap = document.createElement('div');
    logoWrap.style.cssText = 'position:absolute;top:' + pad + 'px;left:50%;transform:translateX(-50%);z-index:3;';
    logoWrap.appendChild(makeLogo(ad.logo, logoH, true));

    const headlineWrap = document.createElement('div');
    headlineWrap.style.cssText = 'position:absolute;top:' + (pad + logoH + pad) + 'px;left:' + pad + 'px;right:' + pad + 'px;z-index:2;text-align:center;';
    headlineWrap.appendChild(makeHeadline(ad.headline, color, headlineSize, '0.01em'));
    if (ad.subtitle) {
      const sub = makeLabel(ad.subtitle, color, subtitleSize, '0.16em');
      sub.style.marginTop = Math.round(headlineSize * 0.35) + 'px';
      sub.style.opacity = '0.85';
      headlineWrap.appendChild(sub);
    }

    if (ad.body) {
      const bodyWrap = document.createElement('div');
      bodyWrap.style.cssText = 'position:absolute;bottom:' + pad + 'px;left:' + pad + 'px;right:' + pad + 'px;z-index:2;text-align:center;';
      const body = makeBody(ad.body, color, bodySize);
      body.style.opacity = '0.85';
      bodyWrap.appendChild(body);
      return [logoWrap, headlineWrap, bodyWrap];
    }

    return [logoWrap, headlineWrap];
  },

  // LEADERBOARD: 728x90, 970x90 — logo left, stacked text right
  leaderbd: (ad, pw, ph) => {
    const color = textColorFor(ad.treatment);
    const pad = Math.max(6, Math.round(ph * 0.12));
    const headlineSize = Math.round(ph * 0.42);
    const subtitleSize = Math.max(7, Math.round(ph * 0.12));
    const bodySize = Math.max(7, Math.round(ph * 0.15));
    const logoH = Math.round(ph * 0.55);
    const logoAreaW = Math.round(pw * 0.16);

    const logoWrap = document.createElement('div');
    logoWrap.style.cssText = 'position:absolute;left:' + pad + 'px;top:50%;transform:translateY(-50%);z-index:3;width:' + logoAreaW + 'px;display:flex;align-items:center;';
    logoWrap.appendChild(makeLogo(ad.logo, logoH, true));

    const textWrap = document.createElement('div');
    textWrap.style.cssText = 'position:absolute;left:' + (pad + logoAreaW + pad) + 'px;right:' + pad + 'px;top:50%;transform:translateY(-50%);z-index:2;';
    textWrap.appendChild(makeHeadline(ad.headline.replace(/\n/g, ' '), color, headlineSize, '0.01em'));
    if (ad.body) {
      const body = makeBody(ad.body.replace(/\n/g, ' '), color, bodySize);
      body.style.marginTop = '2px';
      body.style.opacity = '0.8';
      textWrap.appendChild(body);
    } else if (ad.subtitle) {
      const sub = makeLabel(ad.subtitle, color, subtitleSize, '0.18em');
      sub.style.marginTop = '2px';
      sub.style.opacity = '0.85';
      textWrap.appendChild(sub);
    }

    return [logoWrap, textWrap];
  },

  // MOBILE BANNER: 320x50, 320x100 — logo left, single-line headline right
  mbanner: (ad, pw, ph) => {
    const color = textColorFor(ad.treatment);
    const pad = Math.max(5, Math.round(ph * 0.12));
    const headlineSize = ph < 70 ? Math.round(ph * 0.45) : Math.round(ph * 0.32);
    const subtitleSize = Math.max(6, Math.round(ph * 0.12));
    const logoH = Math.round(ph * 0.55);
    const logoAreaW = Math.round(pw * 0.2);

    const logoWrap = document.createElement('div');
    logoWrap.style.cssText = 'position:absolute;left:' + pad + 'px;top:50%;transform:translateY(-50%);z-index:3;width:' + logoAreaW + 'px;';
    logoWrap.appendChild(makeLogo(ad.logo, logoH, true));

    const textWrap = document.createElement('div');
    textWrap.style.cssText = 'position:absolute;left:' + (pad + logoAreaW + pad) + 'px;right:' + pad + 'px;top:50%;transform:translateY(-50%);z-index:2;';
    textWrap.appendChild(makeHeadline(ad.headline.replace(/\n/g, ' '), color, headlineSize, '0.01em'));
    if (ph >= 70 && ad.subtitle) {
      const sub = makeLabel(ad.subtitle, color, subtitleSize, '0.18em');
      sub.style.opacity = '0.85';
      textWrap.appendChild(sub);
    }

    return [logoWrap, textWrap];
  },
};

// ───────────────────────── Download / export ─────────────────────────

async function downloadAll() {
  const btn = document.getElementById('dlBtn');
  btn.disabled = true;
  btn.textContent = 'Preparing fonts...';

  try {
    // Ensure fonts load before rasterizing
    await document.fonts.ready;

    if (typeof html2canvas === 'undefined') {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }

    const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm')).default;
    const zip = new JSZip();

    // Render each ad to a detached high-res node, then html2canvas it at full size
    for (let i = 0; i < generatedAds.length; i++) {
      const ad = generatedAds[i];
      btn.textContent = 'Rendering ' + (i + 1) + ' / ' + generatedAds.length;

      const offscreen = renderAdCanvas(ad, 1);  // scale = 1 → native size
      offscreen.style.position = 'absolute';
      offscreen.style.left = '-99999px';
      offscreen.style.top = '0';
      document.body.appendChild(offscreen);

      // Wait for images inside
      const imgs = offscreen.querySelectorAll('img');
      await Promise.all(Array.from(imgs).map(im => im.complete ? Promise.resolve() :
        new Promise(res => { im.onload = im.onerror = res; })));

      const rendered = await html2canvas(offscreen, {
        width: ad.size.w,
        height: ad.size.h,
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      });

      const blob = await new Promise(r => rendered.toBlob(r, 'image/png'));
      const slug = ad.headline.replace(/\n/g, '-')
        .replace(/[^a-zA-Z0-9-]/g, '').toLowerCase().slice(0, 30);
      zip.file(ad.size.name + '/photo' + (ad.photo.idx + 1) + '_' + slug + '.png', blob);

      offscreen.remove();
    }

    btn.textContent = 'Zipping...';
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    const campaign = document.getElementById('campaignSelect').value;
    a.download = 'amansala-' + campaign + '-ads.zip';
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert('Download failed: ' + err.message);
  }

  btn.disabled = false;
  btn.textContent = 'Download Everything (ZIP)';
}

// ───────────────────────── Boot ─────────────────────────
init();
