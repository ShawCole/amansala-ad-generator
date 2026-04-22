// Amansala Ad Generator — Canva-exact template engine.
// Each of the 6 sizes has a hand-tuned layout matched to Paulina's Mother's Day reference ads.
// All DOM content rendered from app-defined data, not user HTML.

// ───────────────────────── Sizes (only those with Canva references) ─────────────────────────

const AD_SIZES = [
  { w: 300, h: 250, name: '300x250', layout: 'rect-250'    },
  { w: 300, h: 600, name: '300x600', layout: 'tall-300'    },
  { w: 728, h: 90,  name: '728x90',  layout: 'leader-728'  },
  { w: 160, h: 600, name: '160x600', layout: 'tall-160'    },
  { w: 320, h: 100, name: '320x100', layout: 'mbanner-100' },
  { w: 320, h: 50,  name: '320x50',  layout: 'mbanner-50'  },
];

const PHOTO_COUNT = 13;
const PHOTOS = Array.from({length: PHOTO_COUNT}, (_, i) => ({
  idx: i,
  src: 'assets/photos/' + (i + 1) + '.png',
  focal: { x: 50, y: 40 },  // default: upper-middle
  w: 0,
  h: 0,
}));

// ───────────────────────── State ─────────────────────────

let CAMPAIGNS = {};
let selectedPhotos = new Set();
let selectedLogo = 'white';
let generatedAds = [];
let activeFilter = 'all';
let taggerPhotoIdx = null;

// ───────────────────────── Init ─────────────────────────

async function init() {
  renderSizeRoster();
  await loadCampaigns();
  await loadPhotoMetadata();
  renderPhotoGrid();
  populateCampaignSelect();
  loadCampaign(Object.keys(CAMPAIGNS)[0]);
  // Pre-load the first 3 photos as a default selection to reduce setup friction
  [0,1,2].forEach(i => selectedPhotos.add(i));
  renderPhotoGrid();
}

function renderSizeRoster() {
  const roster = document.getElementById('sizeRoster');
  roster.textContent = '';
  AD_SIZES.forEach(s => {
    const pill = document.createElement('div');
    pill.className = 'size-pill';
    const dim = document.createElement('span');
    dim.className = 'dim';
    dim.textContent = s.name;
    const lbl = document.createElement('span');
    lbl.className = 'label';
    lbl.textContent = LAYOUT_LABELS[s.layout];
    pill.appendChild(dim);
    pill.appendChild(lbl);
    roster.appendChild(pill);
  });
}

const LAYOUT_LABELS = {
  'rect-250':    'medium rect',
  'tall-300':    'half page',
  'leader-728':  'leaderboard',
  'tall-160':    'skyscraper',
  'mbanner-100': 'mobile large',
  'mbanner-50':  'mobile banner',
};

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
  await Promise.all(PHOTOS.map(p => new Promise(resolve => {
    const img = new Image();
    img.onload = () => { p.w = img.naturalWidth; p.h = img.naturalHeight; resolve(); };
    img.onerror = resolve;
    img.src = p.src;
  })));
  try {
    const saved = JSON.parse(localStorage.getItem('amansala-photo-focal') || '{}');
    PHOTOS.forEach(p => { if (saved[p.idx]) p.focal = saved[p.idx]; });
  } catch (e) {}
}

function savePhotoFocal() {
  const out = {};
  PHOTOS.forEach(p => { out[p.idx] = p.focal; });
  localStorage.setItem('amansala-photo-focal', JSON.stringify(out));
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

    const check = document.createElement('div');
    check.className = 'tile-check';
    check.textContent = '✓';
    tile.appendChild(check);

    const focalTag = document.createElement('div');
    focalTag.className = 'focal-tag';
    focalTag.textContent = '◉';
    focalTag.title = 'Right-click to set focal point';
    tile.appendChild(focalTag);

    tile.onclick = () => togglePhoto(p.idx);
    tile.oncontextmenu = (e) => { e.preventDefault(); openTagger(p.idx); };
    tile.title = 'Click: select • Right-click: set focal point';
    grid.appendChild(tile);
  });
  document.getElementById('photoCount').textContent = selectedPhotos.size + ' selected';
}

function togglePhoto(idx) {
  if (selectedPhotos.has(idx)) selectedPhotos.delete(idx); else selectedPhotos.add(idx);
  renderPhotoGrid();
}
function selectAllPhotos() { PHOTOS.forEach(p => selectedPhotos.add(p.idx)); renderPhotoGrid(); }
function clearPhotos() { selectedPhotos.clear(); renderPhotoGrid(); }

// ───────────────────────── Focal tagger ─────────────────────────

function openTagger(idx) {
  taggerPhotoIdx = idx;
  const p = PHOTOS[idx];
  document.getElementById('taggerImg').src = p.src;
  const dot = document.getElementById('focalDot');
  dot.style.left = p.focal.x + '%';
  dot.style.top = p.focal.y + '%';
  dot.dataset.x = p.focal.x;
  dot.dataset.y = p.focal.y;
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
  p.focal.x = parseFloat(dot.dataset.x) || 50;
  p.focal.y = parseFloat(dot.dataset.y) || 40;
  savePhotoFocal();
  renderPhotoGrid();
  closeTagger();
}

// ───────────────────────── Campaign ─────────────────────────

function loadCampaign(name) {
  const c = CAMPAIGNS[name];
  if (!c) return;
  const list = document.getElementById('headlineList');
  list.textContent = '';
  c.headlines.forEach(h => addHeadline(h));
  // The reference ads use a single subtitle block — combine subtitle + body for editing
  const combined = [c.body || c.subtitle].filter(Boolean).join('\n');
  document.getElementById('subtitleInput').value = combined;
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

// ───────────────────────── Custom font upload ─────────────────────────

function loadCustomFont(input) {
  const file = input.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const font = new FontFace('ArchitypeBayer', 'url(' + url + ')');
  font.load().then(f => {
    document.fonts.add(f);
    alert('Custom headline font loaded. Re-generate to apply.');
  }).catch(err => alert('Font load failed: ' + err.message));
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
  const photos = Array.from(selectedPhotos).map(i => PHOTOS[i]);

  generatedAds = [];
  photos.forEach(photo => {
    headlines.forEach(headline => {
      AD_SIZES.forEach(size => {
        generatedAds.push({ photo, headline, subtitle, size, logo: selectedLogo });
      });
    });
  });

  renderPreviews();
}

// ───────────────────────── Preview shell ─────────────────────────

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
    btn.onclick = () => { activeFilter = name; renderPreviews(); };
    filters.appendChild(btn);
  });

  renderGrid();
}

function renderGrid() {
  const grid = document.getElementById('previewGrid');
  grid.textContent = '';
  const ads = activeFilter === 'all' ? generatedAds : generatedAds.filter(a => a.size.name === activeFilter);
  ads.forEach(ad => grid.appendChild(renderAdCard(ad)));
}

function renderAdCard(ad) {
  const card = document.createElement('div');
  card.className = 'ad-card';
  const header = document.createElement('div');
  header.className = 'ad-card-header';
  const l = document.createElement('span');
  l.textContent = ad.size.name;
  const r = document.createElement('span');
  r.textContent = 'photo ' + (ad.photo.idx + 1);
  header.appendChild(l);
  header.appendChild(r);
  card.appendChild(header);

  const scale = Math.min(320 / ad.size.w, 420 / ad.size.h, 1);
  card.appendChild(renderAdCanvas(ad, scale));
  return card;
}

// ───────────────────────── Canvas / ad rendering ─────────────────────────

function renderAdCanvas(ad, scale) {
  const pw = Math.round(ad.size.w * scale);
  const ph = Math.round(ad.size.h * scale);

  const canvas = document.createElement('div');
  canvas.className = 'ad-canvas';
  canvas.style.cssText = 'width:' + pw + 'px;height:' + ph + 'px;position:relative;overflow:hidden;background:#574A3F;';
  canvas.dataset.realW = ad.size.w;
  canvas.dataset.realH = ad.size.h;

  // Background photo
  const bg = document.createElement('img');
  bg.src = ad.photo.src;
  bg.crossOrigin = 'anonymous';
  bg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;' +
    'object-position:' + ad.photo.focal.x + '% ' + ad.photo.focal.y + '%;';
  canvas.appendChild(bg);

  // Very subtle warm-cream tint to match the warmth of the Canva references
  // without reading as a "dark overlay"
  const tint = document.createElement('div');
  tint.style.cssText = 'position:absolute;inset:0;background:rgba(87,74,63,0.12);pointer-events:none;';
  canvas.appendChild(tint);

  const layout = LAYOUTS[ad.size.layout];
  layout(ad, canvas, pw, ph, scale);

  return canvas;
}

// ───────────────────────── Text building helpers ─────────────────────────

// Render headline text with automatic styling: display serif, cream color, lowercase, tight line-height
function headlineEl(text, sizePx, color, alignment) {
  const el = document.createElement('div');
  el.style.cssText = 'font-family: var(--font-headline); ' +
    'font-size:' + sizePx + 'px; ' +
    'line-height:0.95; ' +
    'font-weight:400; ' +
    'letter-spacing:-0.005em; ' +
    'color:' + color + '; ' +
    'text-transform:lowercase; ' +
    'text-align:' + (alignment || 'left') + ';';
  text.split('\n').forEach((line, i) => {
    if (i > 0) el.appendChild(document.createElement('br'));
    el.appendChild(document.createTextNode(line));
  });
  return el;
}

// Subtitle: sans-serif with bold emphasis on numbers/$ and the word "Tulum"
function subtitleEl(text, sizePx, color, alignment) {
  const el = document.createElement('div');
  el.style.cssText = 'font-family: var(--font-sans); ' +
    'font-size:' + sizePx + 'px; ' +
    'line-height:1.25; ' +
    'font-weight:400; ' +
    'color:' + color + '; ' +
    'text-align:' + (alignment || 'left') + ';';
  // Auto-bold: monetary ($500), numbers, and "Tulum"
  text.split('\n').forEach((line, i) => {
    if (i > 0) el.appendChild(document.createElement('br'));
    const parts = line.split(/(\$?\d+\$?|Tulum|tulum|TULUM)/g);
    parts.forEach(part => {
      if (!part) return;
      if (/^\$?\d+\$?$/.test(part) || /tulum/i.test(part)) {
        const b = document.createElement('strong');
        b.style.fontWeight = '800';
        b.textContent = part;
        el.appendChild(b);
      } else {
        el.appendChild(document.createTextNode(part));
      }
    });
  });
  return el;
}

function logoEl(variant, heightPx) {
  const img = document.createElement('img');
  img.src = 'assets/logos/logo-' + variant + '.png';
  img.crossOrigin = 'anonymous';
  img.style.cssText = 'height:' + heightPx + 'px;width:auto;display:block;';
  return img;
}

const CREAM = '#F5F0E8';

// ───────────────────────── 6 hand-tuned layouts ─────────────────────────
// All sized at SCALE (1=native). Preview uses proportional scale.

const LAYOUTS = {

  // 300x250 — logo top-left, subtitle top-right, headline bottom
  'rect-250': (ad, canvas, pw, ph, s) => {
    const logoH = Math.round(70 * s);
    const padT = Math.round(12 * s);
    const padL = Math.round(12 * s);
    const padR = Math.round(12 * s);
    const padB = Math.round(10 * s);

    const logo = logoEl(ad.logo, logoH);
    logo.style.cssText += 'position:absolute;top:' + padT + 'px;left:' + padL + 'px;z-index:3;';
    canvas.appendChild(logo);

    const subH = Math.round(13 * s);
    const sub = subtitleEl(ad.subtitle, subH, CREAM, 'right');
    sub.style.cssText += 'position:absolute;top:' + padT + 'px;right:' + padR + 'px;z-index:2;width:' + Math.round(165 * s) + 'px;';
    canvas.appendChild(sub);

    const headH = Math.round(42 * s);
    const head = headlineEl(ad.headline, headH, CREAM, 'left');
    head.style.cssText += 'position:absolute;bottom:' + padB + 'px;left:' + padL + 'px;right:' + padR + 'px;z-index:2;';
    canvas.appendChild(head);
  },

  // 300x600 — headline top, subtitle mid, photo middle, logo bottom center
  'tall-300': (ad, canvas, pw, ph, s) => {
    const padX = Math.round(20 * s);
    const padT = Math.round(20 * s);
    const padB = Math.round(20 * s);

    const headH = Math.round(48 * s);
    const head = headlineEl(ad.headline, headH, CREAM, 'center');
    head.style.cssText += 'position:absolute;top:' + padT + 'px;left:' + padX + 'px;right:' + padX + 'px;z-index:2;';
    canvas.appendChild(head);

    const subH = Math.round(17 * s);
    const sub = subtitleEl(ad.subtitle, subH, CREAM, 'center');
    sub.style.cssText += 'position:absolute;top:' + Math.round(200 * s) + 'px;left:' + padX + 'px;right:' + padX + 'px;z-index:2;';
    canvas.appendChild(sub);

    const logoH = Math.round(80 * s);
    const logo = logoEl(ad.logo, logoH);
    logo.style.cssText += 'position:absolute;bottom:' + padB + 'px;left:50%;transform:translateX(-50%);z-index:3;';
    canvas.appendChild(logo);
  },

  // 728x90 — logo left, headline+subtitle stacked right
  'leader-728': (ad, canvas, pw, ph, s) => {
    const padX = Math.round(18 * s);
    const logoH = Math.round(56 * s);
    const logoAreaW = Math.round(120 * s);

    const logo = logoEl(ad.logo, logoH);
    logo.style.cssText += 'position:absolute;left:' + padX + 'px;top:50%;transform:translateY(-50%);z-index:3;';
    canvas.appendChild(logo);

    const textLeft = padX + logoAreaW + Math.round(10 * s);
    const headH = Math.round(34 * s);
    const subH = Math.round(14 * s);
    const flattenedHead = ad.headline.replace(/\n/g, ' ');
    const flattenedSub = ad.subtitle.replace(/\n/g, ' ');

    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;left:' + textLeft + 'px;right:' + padX + 'px;top:50%;transform:translateY(-50%);z-index:2;';
    const head = headlineEl(flattenedHead, headH, CREAM, 'left');
    wrap.appendChild(head);
    const sub = subtitleEl(flattenedSub, subH, CREAM, 'left');
    sub.style.marginTop = Math.round(2 * s) + 'px';
    wrap.appendChild(sub);
    canvas.appendChild(wrap);
  },

  // 160x600 — headline top, subtitle mid, logo bottom
  'tall-160': (ad, canvas, pw, ph, s) => {
    const padX = Math.round(10 * s);
    const padT = Math.round(14 * s);
    const padB = Math.round(16 * s);

    const headH = Math.round(22 * s);
    const head = headlineEl(ad.headline, headH, CREAM, 'center');
    head.style.cssText += 'position:absolute;top:' + padT + 'px;left:' + padX + 'px;right:' + padX + 'px;z-index:2;';
    canvas.appendChild(head);

    const subH = Math.round(11 * s);
    const sub = subtitleEl(ad.subtitle, subH, CREAM, 'center');
    sub.style.cssText += 'position:absolute;top:' + Math.round(135 * s) + 'px;left:' + padX + 'px;right:' + padX + 'px;z-index:2;line-height:1.3;';
    canvas.appendChild(sub);

    const logoH = Math.round(44 * s);
    const logo = logoEl(ad.logo, logoH);
    logo.style.cssText += 'position:absolute;bottom:' + padB + 'px;left:50%;transform:translateX(-50%);z-index:3;';
    canvas.appendChild(logo);
  },

  // 320x100 — logo left, subtitle top-right, headline bottom-right
  'mbanner-100': (ad, canvas, pw, ph, s) => {
    const padX = Math.round(10 * s);
    const padT = Math.round(8 * s);
    const padB = Math.round(8 * s);
    const logoAreaW = Math.round(90 * s);

    const logoH = Math.round(58 * s);
    const logo = logoEl(ad.logo, logoH);
    logo.style.cssText += 'position:absolute;left:' + padX + 'px;top:50%;transform:translateY(-50%);z-index:3;';
    canvas.appendChild(logo);

    const textLeft = padX + logoAreaW + Math.round(8 * s);

    const subH = Math.round(11 * s);
    const sub = subtitleEl(ad.subtitle, subH, CREAM, 'right');
    sub.style.cssText += 'position:absolute;top:' + padT + 'px;left:' + textLeft + 'px;right:' + padX + 'px;z-index:2;line-height:1.22;';
    canvas.appendChild(sub);

    const headH = Math.round(20 * s);
    const head = headlineEl(ad.headline, headH, CREAM, 'right');
    head.style.cssText += 'position:absolute;bottom:' + padB + 'px;left:' + textLeft + 'px;right:' + padX + 'px;z-index:2;';
    canvas.appendChild(head);
  },

  // 320x50 — logo left, headline right (no subtitle, too tight)
  'mbanner-50': (ad, canvas, pw, ph, s) => {
    const padX = Math.round(10 * s);
    const logoAreaW = Math.round(70 * s);

    const logoH = Math.round(32 * s);
    const logo = logoEl(ad.logo, logoH);
    logo.style.cssText += 'position:absolute;left:' + padX + 'px;top:50%;transform:translateY(-50%);z-index:3;';
    canvas.appendChild(logo);

    const textLeft = padX + logoAreaW + Math.round(8 * s);
    const headH = Math.round(16 * s);
    const head = headlineEl(ad.headline, headH, CREAM, 'right');
    head.style.cssText += 'position:absolute;left:' + textLeft + 'px;right:' + padX + 'px;top:50%;transform:translateY(-50%);z-index:2;';
    canvas.appendChild(head);
  },
};

// ───────────────────────── Download / export ─────────────────────────

async function downloadAll() {
  const btn = document.getElementById('dlBtn');
  btn.disabled = true;
  btn.textContent = 'Loading fonts...';

  try {
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

    for (let i = 0; i < generatedAds.length; i++) {
      const ad = generatedAds[i];
      btn.textContent = 'Rendering ' + (i + 1) + ' / ' + generatedAds.length;

      const offscreen = renderAdCanvas(ad, 1);
      offscreen.style.position = 'absolute';
      offscreen.style.left = '-99999px';
      offscreen.style.top = '0';
      document.body.appendChild(offscreen);

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
        .replace(/[^a-zA-Z0-9-]/g, '').toLowerCase().slice(0, 24);
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
  btn.textContent = 'Download All (ZIP)';
}

init();
