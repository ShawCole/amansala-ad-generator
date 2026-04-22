// Amansala Ad Generator — app.js
// All DOM content is rendered from application-defined data, not user HTML input.

const AD_SIZES = [
  { w: 300, h: 250, name: '300x250', cat: 'DSP' },
  { w: 728, h: 90, name: '728x90', cat: 'DSP' },
  { w: 160, h: 600, name: '160x600', cat: 'DSP' },
  { w: 320, h: 50, name: '320x50', cat: 'DSP' },
  { w: 300, h: 600, name: '300x600', cat: 'DSP' },
  { w: 320, h: 100, name: '320x100', cat: 'DSP' },
  { w: 336, h: 280, name: '336x280', cat: 'DSP' },
  { w: 970, h: 90, name: '970x90', cat: 'DSP' },
  { w: 1080, h: 1080, name: '1080x1080', cat: 'Meta' },
  { w: 1080, h: 1920, name: '1080x1920', cat: 'Meta' },
  { w: 1200, h: 628, name: '1200x628', cat: 'Meta' },
];

const CAMPAIGNS = {
  'bikini-bootcamp': {
    headlines: ['Bikini\\nBootcamp', 'Transform\\nYour Body', 'Beach Body\\nRetreat'],
    subtitle: 'A VACATION WITH A PURPOSE',
    body: 'THE ULTIMATE\nMIND BODY SPIRIT\nTUNE UP.\n\nWORK OUT, EAT FRESH\nN HEALTHY AND GET\nPAMPERED\nON THE BEACH.'
  },
  'mothers-day': {
    headlines: ["Mother's Day\\nRetreat", 'Give Mom\\nThe Beach', 'She Deserves\\nThis'],
    subtitle: 'MAY 7-11 TULUM',
    body: 'THE ULTIMATE GIFT\nFOR THE WOMAN\nWHO DOES IT ALL.\n\nBEACHFRONT YOGA,\nSPA & WELLNESS.'
  },
  'soulful-singles': {
    headlines: ['Soulful\\nSingles', 'Find Your\\nTribe', 'Solo Travel\\nDone Right'],
    subtitle: 'CONNECT \u2022 EXPLORE \u2022 TRANSFORM',
    body: 'MEET LIKE-MINDED\nWOMEN ON THE\nBEACH IN TULUM.\n\nYOGA, ADVENTURES\n& NEW FRIENDSHIPS.'
  },
  'restore-renew': {
    headlines: ['Restore\\n& Renew', 'Reset Your\\nEnergy', 'Deep\\nWellness'],
    subtitle: 'ECO-CHIC WELLNESS RETREAT',
    body: 'DISCONNECT TO\nRECONNECT.\n\nYOGA, MEDITATION,\nSPA & OCEAN VIEWS.'
  },
  'summer-family': {
    headlines: ['Family\\nGetaway', 'Summer In\\nTulum', 'Beach\\nAdventures'],
    subtitle: 'FAMILY FRIENDLY ECO-RESORT',
    body: 'BEACHFRONT FUN\nFOR THE WHOLE\nFAMILY.\n\nYOGA, SNORKELING,\nCENOTES & MORE.'
  },
  'custom': {
    headlines: ['Your\\nHeadline', 'Second\\nOption', 'Third\\nVariation'],
    subtitle: 'YOUR SUBTITLE HERE',
    body: 'YOUR BODY\nCOPY HERE.'
  }
};

const PHOTOS = Array.from({length: 13}, (_, i) => 'assets/photos/' + (i + 1) + '.png');
let selectedPhotos = new Set();
let selectedLogo = 'white';
let generatedAds = [];

function init() {
  renderPhotoGrid();
  loadCampaign('bikini-bootcamp');
}

function renderPhotoGrid() {
  const grid = document.getElementById('photoGrid');
  grid.textContent = '';
  PHOTOS.forEach(function(p, i) {
    const thumb = document.createElement('div');
    thumb.className = 'photo-thumb';
    thumb.dataset.idx = i;
    thumb.onclick = function() { togglePhoto(i); };
    const img = document.createElement('img');
    img.src = p;
    img.alt = 'Photo ' + (i + 1);
    img.loading = 'lazy';
    thumb.appendChild(img);
    grid.appendChild(thumb);
  });
}

function togglePhoto(idx) {
  if (selectedPhotos.has(idx)) {
    selectedPhotos.delete(idx);
  } else {
    selectedPhotos.add(idx);
  }
  document.querySelectorAll('.photo-thumb').forEach(function(el, i) {
    el.classList.toggle('selected', selectedPhotos.has(i));
  });
}

function loadCampaign(name) {
  const c = CAMPAIGNS[name];
  if (!c) return;
  const list = document.getElementById('headlineList');
  list.textContent = '';
  c.headlines.forEach(function(h) { addHeadline(h); });
  document.getElementById('subtitleInput').value = c.subtitle;
  document.getElementById('bodyInput').value = c.body;
}

function addHeadline(text) {
  const list = document.getElementById('headlineList');
  const row = document.createElement('div');
  row.className = 'headline-row';
  const input = document.createElement('input');
  input.type = 'text';
  input.value = text || '';
  input.placeholder = 'Headline (use \\n for line breaks)';
  const btn = document.createElement('button');
  btn.textContent = '\u00D7';
  btn.onclick = function() { row.remove(); };
  row.appendChild(input);
  row.appendChild(btn);
  list.appendChild(row);
}

function selectLogo(el) {
  document.querySelectorAll('.logo-opt').forEach(function(o) { o.classList.remove('selected'); });
  el.classList.add('selected');
  selectedLogo = el.dataset.logo;
}

function generateAds() {
  const photos = Array.from(selectedPhotos);
  if (photos.length === 0) { alert('Select at least one photo'); return; }

  const headlines = Array.from(document.querySelectorAll('.headline-row input'))
    .map(function(el) { return el.value.replace(/\\n/g, '\n'); })
    .filter(function(h) { return h.trim(); });

  if (headlines.length === 0) { alert('Add at least one headline'); return; }

  const subtitle = document.getElementById('subtitleInput').value;
  const body = document.getElementById('bodyInput').value;
  const fadeType = document.getElementById('fadeSelect').value;

  generatedAds = [];
  photos.forEach(function(photoIdx) {
    headlines.forEach(function(headline) {
      AD_SIZES.forEach(function(size) {
        generatedAds.push({
          photoIdx: photoIdx,
          photoSrc: PHOTOS[photoIdx],
          headline: headline,
          subtitle: subtitle,
          body: body,
          size: size,
          fadeType: fadeType,
          logo: selectedLogo
        });
      });
    });
  });

  renderPreviews();
}

function renderPreviews() {
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('previewArea').style.display = 'block';
  document.getElementById('downloadBar').style.display = 'flex';

  var photos = new Set(generatedAds.map(function(a) { return a.photoIdx; })).size;
  var headlineCount = new Set(generatedAds.map(function(a) { return a.headline; })).size;

  var statsBar = document.getElementById('statsBar');
  statsBar.textContent = '';
  [
    [generatedAds.length, 'total ads'],
    [photos, 'photos'],
    [headlineCount, 'headlines'],
    [AD_SIZES.length, 'sizes']
  ].forEach(function(s) {
    var chip = document.createElement('div');
    chip.className = 'stat-chip';
    var strong = document.createElement('strong');
    strong.textContent = s[0];
    chip.appendChild(strong);
    chip.appendChild(document.createTextNode(' ' + s[1]));
    statsBar.appendChild(chip);
  });

  var filters = document.getElementById('sizeFilters');
  filters.textContent = '';
  var allBtn = document.createElement('button');
  allBtn.className = 'size-filter active';
  allBtn.textContent = 'All';
  allBtn.onclick = function() { filterSize('all', allBtn); };
  filters.appendChild(allBtn);

  AD_SIZES.forEach(function(s) {
    var btn = document.createElement('button');
    btn.className = 'size-filter';
    btn.textContent = s.name;
    btn.onclick = function() { filterSize(s.name, btn); };
    filters.appendChild(btn);
  });

  renderGrid('all');
}

function filterSize(size, btn) {
  document.querySelectorAll('.size-filter').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  renderGrid(size);
}

function renderGrid(filter) {
  var grid = document.getElementById('previewGrid');
  grid.textContent = '';
  var ads = filter === 'all' ? generatedAds : generatedAds.filter(function(a) { return a.size.name === filter; });
  var maxPreviewWidth = 300;

  ads.forEach(function(ad, idx) {
    var scale = Math.min(maxPreviewWidth / ad.size.w, 1);
    var pw = Math.round(ad.size.w * scale);
    var ph = Math.round(ad.size.h * scale);
    var isPortrait = ad.size.h > ad.size.w;
    var isWide = ad.size.w / ad.size.h > 4;
    var baseFontScale = Math.min(ad.size.w, ad.size.h) / 600;
    var headlineSize = Math.max(8, Math.round(32 * baseFontScale * scale));
    var subtitleSize = Math.max(5, Math.round(10 * baseFontScale * scale));
    var bodySize = Math.max(5, Math.round(12 * baseFontScale * scale));
    var logoH = Math.max(12, Math.round(40 * baseFontScale * scale));

    var preview = document.createElement('div');
    preview.className = 'ad-preview';
    preview.dataset.size = ad.size.name;

    var header = document.createElement('div');
    header.className = 'ad-preview-header';
    var sizeLabel = document.createElement('span');
    sizeLabel.textContent = ad.size.name + ' (' + ad.size.cat + ')';
    var photoLabel = document.createElement('span');
    photoLabel.textContent = 'Photo ' + (ad.photoIdx + 1);
    header.appendChild(sizeLabel);
    header.appendChild(photoLabel);

    var canvas = document.createElement('div');
    canvas.className = 'ad-canvas';
    canvas.style.cssText = 'width:' + pw + 'px;height:' + ph + 'px;position:relative;overflow:hidden;';

    // Background image
    var bgImg = document.createElement('img');
    bgImg.src = ad.photoSrc;
    bgImg.style.cssText = 'width:' + pw + 'px;height:' + ph + 'px;object-fit:cover;position:absolute;top:0;left:0;';
    canvas.appendChild(bgImg);

    // Fade overlay
    if (ad.fadeType === 'radial') {
      var fade = document.createElement('div');
      fade.style.cssText = 'position:absolute;bottom:0;left:0;right:0;height:70%;background:radial-gradient(ellipse at center bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 40%, transparent 75%);pointer-events:none;';
      canvas.appendChild(fade);
    } else if (ad.fadeType === 'gradient') {
      var fade2 = document.createElement('div');
      fade2.style.cssText = 'position:absolute;bottom:0;left:0;right:0;height:50%;background:linear-gradient(transparent, rgba(0,0,0,0.5));pointer-events:none;';
      canvas.appendChild(fade2);
    }

    // Text layer
    var headlineLines = ad.headline.split('\n');
    var textContainer = document.createElement('div');
    textContainer.style.cssText = 'position:absolute;z-index:2;';

    if (isWide) {
      textContainer.style.cssText += 'top:0;left:0;right:0;bottom:0;display:flex;align-items:center;padding:0 ' + (pw * 0.03) + 'px;';
      var textInner = document.createElement('div');
      textInner.style.marginLeft = (pw * 0.15) + 'px';

      var h = document.createElement('div');
      h.style.cssText = 'font-size:' + headlineSize + 'px;font-weight:700;color:white;text-shadow:0 1px 4px rgba(0,0,0,0.5);line-height:1.1;text-transform:uppercase;';
      headlineLines.forEach(function(line, li) {
        if (li > 0) h.appendChild(document.createElement('br'));
        h.appendChild(document.createTextNode(line));
      });
      textInner.appendChild(h);

      var sub = document.createElement('div');
      sub.style.cssText = 'font-size:' + subtitleSize + 'px;color:white;opacity:0.9;letter-spacing:0.1em;margin-top:2px;text-shadow:0 1px 2px rgba(0,0,0,0.5);';
      sub.textContent = ad.subtitle;
      textInner.appendChild(sub);

      textContainer.appendChild(textInner);
    } else {
      var padPct = isPortrait ? '5%' : '8%';
      textContainer.style.cssText += 'top:' + (isPortrait ? '5%' : '10%') + ';left:0;right:0;display:flex;flex-direction:column;align-items:center;text-align:center;padding:0 ' + padPct + ';';

      var h2 = document.createElement('div');
      h2.style.cssText = 'font-size:' + headlineSize + 'px;font-weight:700;color:white;text-shadow:0 2px 6px rgba(0,0,0,0.5);line-height:1.1;text-transform:uppercase;';
      headlineLines.forEach(function(line, li) {
        if (li > 0) h2.appendChild(document.createElement('br'));
        h2.appendChild(document.createTextNode(line));
      });
      textContainer.appendChild(h2);

      var sub2 = document.createElement('div');
      sub2.style.cssText = 'font-size:' + subtitleSize + 'px;color:white;opacity:0.9;letter-spacing:0.12em;margin-top:' + Math.max(2, headlineSize * 0.3) + 'px;text-shadow:0 1px 3px rgba(0,0,0,0.5);';
      sub2.textContent = ad.subtitle;
      textContainer.appendChild(sub2);
    }
    canvas.appendChild(textContainer);

    // Body text for non-wide formats
    if (!isWide && ad.body) {
      var bodyContainer = document.createElement('div');
      var bPad = isPortrait ? '5%' : '8%';
      bodyContainer.style.cssText = 'position:absolute;bottom:' + (isPortrait ? '15%' : '20%') + ';left:0;right:0;text-align:center;padding:0 ' + bPad + ';z-index:2;';
      var bodyDiv = document.createElement('div');
      bodyDiv.style.cssText = 'font-size:' + bodySize + 'px;color:white;text-shadow:0 1px 3px rgba(0,0,0,0.5);line-height:1.4;text-transform:uppercase;';
      ad.body.split('\n').forEach(function(line, li) {
        if (li > 0) bodyDiv.appendChild(document.createElement('br'));
        bodyDiv.appendChild(document.createTextNode(line));
      });
      bodyContainer.appendChild(bodyDiv);
      canvas.appendChild(bodyContainer);
    }

    // Logo
    var logoImg = document.createElement('img');
    logoImg.src = 'assets/logos/logo-' + ad.logo + '.png';
    logoImg.style.cssText = 'position:absolute;z-index:3;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.3));';
    if (isWide) {
      logoImg.style.cssText += 'left:' + (pw * 0.02) + 'px;bottom:' + (ph * 0.1) + 'px;height:' + logoH + 'px;width:auto;';
    } else if (isPortrait) {
      logoImg.style.cssText += 'bottom:' + (ph * 0.03) + 'px;left:50%;transform:translateX(-50%);height:' + logoH + 'px;width:auto;';
    } else {
      logoImg.style.cssText += 'bottom:' + (ph * 0.05) + 'px;right:' + (pw * 0.05) + 'px;height:' + logoH + 'px;width:auto;';
    }
    canvas.appendChild(logoImg);

    preview.appendChild(header);
    preview.appendChild(canvas);
    grid.appendChild(preview);
  });
}

async function downloadAll() {
  var btn = document.getElementById('dlBtn');
  btn.textContent = 'Loading libraries...';

  try {
    // Load html2canvas
    if (typeof html2canvas === 'undefined') {
      await new Promise(function(resolve, reject) {
        var script = document.createElement('script');
        script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    var JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm')).default;
    var zip = new JSZip();

    var canvases = document.querySelectorAll('.ad-canvas');
    for (var i = 0; i < canvases.length && i < generatedAds.length; i++) {
      var ad = generatedAds[i];
      btn.textContent = 'Rendering ' + (i + 1) + '/' + canvases.length + '...';

      var rendered = await html2canvas(canvases[i], {
        width: ad.size.w,
        height: ad.size.h,
        scale: ad.size.w / canvases[i].offsetWidth,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null
      });

      var blob = await new Promise(function(r) { rendered.toBlob(r, 'image/png'); });
      var headlineSlug = ad.headline.replace(/\n/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase().slice(0, 30);
      zip.file(ad.size.name + '/photo' + (ad.photoIdx + 1) + '_' + headlineSlug + '.png', blob);
    }

    var content = await zip.generateAsync({ type: 'blob' });
    var url = URL.createObjectURL(content);
    var a = document.createElement('a');
    a.href = url;
    var campaign = document.getElementById('campaignSelect').value;
    a.download = 'amansala-' + campaign + '-ads.zip';
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert('Download failed: ' + err.message);
  }

  btn.textContent = 'Download ZIP';
}

init();
