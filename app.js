const SHEET_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTX3kypj-_DGDGG_sf6ZlPYy2kjT4UEZyC7rii_QviH_cxNhIEKuSseM48e-OW8iAe3rEQK3Ifz2Oe0/pub?gid=1335940397&single=true&output=csv';

const SKIP_COLS = new Set(['Timestamp', 'Scholar Id', 'Student Name', 'Grade & Section', 'Section']);

const EVENT_ICONS = {
  'dance': '💃', 'cut': '🎬', 'reel': '🎥', 'meme': '😂',
  'design': '🎨', 'frame': '🖼️', 'music': '🎵', 'remix': '🎧',
  'jam': '🎼', 'gram': '📸', 'matata': '🦁', 'minute': '⏱️',
  'chalna': '🚶', 'genre': '🎤', 'synopsis': '📝', 'drop': '✨',
};

const GRADIENTS = [
  'linear-gradient(135deg,#e74c3c,#c0392b)',
  'linear-gradient(135deg,#8e44ad,#6c3483)',
  'linear-gradient(135deg,#2980b9,#1a5276)',
  'linear-gradient(135deg,#16a085,#0e6655)',
  'linear-gradient(135deg,#e67e22,#ca6f1e)',
  'linear-gradient(135deg,#5b2d8e,#3d1a6b)',
  'linear-gradient(135deg,#e91e8c,#c2185b)',
  'linear-gradient(135deg,#27ae60,#1e8449)',
  'linear-gradient(135deg,#d4a017,#a87800)',
  'linear-gradient(135deg,#f39c12,#d68910)',
];

function eventIcon(name) {
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(EVENT_ICONS)) {
    if (lower.includes(k)) return v;
  }
  return '🎉';
}

/* ── CSV parsing ───────────────────────────────────────── */
function parseCSVRow(line) {
  const fields = [];
  let field = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuotes = !inQuotes; }
    else if (c === ',' && !inQuotes) { fields.push(field); field = ''; }
    else { field += c; }
  }
  fields.push(field);
  return fields;
}

function extractDriveId(url) {
  if (!url) return null;
  const m = url.match(/[?&]id=([^&\s]+)/) || url.match(/\/file\/d\/([^/?#\s]+)/);
  return m ? m[1] : null;
}

async function loadSheet() {
  const res = await fetch(SHEET_CSV);
  if (!res.ok) throw new Error('Could not fetch sheet');
  const text = await res.text();

  const lines = text.split('\n').filter(l => l.trim());
  const headers = parseCSVRow(lines[0]).map(h => h.trim().replace(/^"|"$/g, ''));

  const nameIdx  = headers.indexOf('Student Name');
  const gradeIdx = headers.indexOf('Grade & Section');

  const eventCols = headers
    .map((h, i) => ({ name: h, idx: i }))
    .filter(col => col.name && !SKIP_COLS.has(col.name));

  const events = {};
  eventCols.forEach(col => { events[col.name] = []; });

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVRow(lines[i]);
    const student = (row[nameIdx] || '').trim().replace(/^"|"$/g, '');
    const grade   = (row[gradeIdx] || '').trim().replace(/^"|"$/g, '');

    eventCols.forEach(col => {
      const url = (row[col.idx] || '').trim().replace(/^"|"$/g, '');
      if (!url) return;
      const id = extractDriveId(url);
      if (id) events[col.name].push({ id, student, grade });
    });
  }

  return events;
}

/* ── Build event grid from sheet data ──────────────────── */
function buildEventCards(events) {
  const grid = document.getElementById('eventsGrid');
  const countEl = document.getElementById('eventCount');
  const entries = Object.entries(events).filter(([, files]) => files.length > 0);

  countEl.textContent = `${entries.length} event${entries.length !== 1 ? 's' : ''}`;

  grid.innerHTML = entries.map(([name, files], i) => `
    <div class="event-card" data-name="${name}">
      <div class="card-thumb" style="background:${GRADIENTS[i % GRADIENTS.length]}">
        <span class="card-icon">${eventIcon(name)}</span>
      </div>
      <div class="card-body">
        <h3>${name}</h3>
        <p class="card-tag">${files.length} entr${files.length !== 1 ? 'ies' : 'y'}</p>
      </div>
      <div class="card-actions">
        <button class="btn-watch" onclick='openEvent(${JSON.stringify(name)}, ${JSON.stringify(files)})'>▶ Browse</button>
      </div>
    </div>`).join('');
}

/* ── Event viewer ──────────────────────────────────────── */
function openEvent(eventName, files) {
  showModal(eventName);
  renderFileGrid(files);
}

function renderFileGrid(files) {
  if (!files.length) {
    setModalBody('<div class="fb-empty"><span>📭</span><p>No entries yet.</p></div>');
    return;
  }

  const cards = files.map(f => `
    <div class="fb-card fb-file" onclick='openFile(${JSON.stringify(f)})'>
      <div class="fb-card-thumb file-thumb">
        <img src="https://drive.google.com/thumbnail?id=${f.id}&sz=w300" alt="${f.student}"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
        <div class="fb-icon-fallback" style="display:none">🎬</div>
        <div class="play-overlay">▶</div>
      </div>
      <div class="fb-card-info">
        <span class="fb-card-name" title="${f.student}">${f.student}</span>
        <span class="fb-card-meta">${f.grade}</span>
      </div>
    </div>`).join('');

  setModalBody(`
    <div class="fb-scroll">
      <div class="fb-section-label">Entries <span>${files.length}</span></div>
      <div class="fb-grid">${cards}</div>
    </div>`);
}

function openFile(f) {
  const url = `https://drive.google.com/file/d/${f.id}/preview`;
  setModalBody(`
    <div class="media-viewer">
      <iframe src="${url}" allowfullscreen allow="autoplay"></iframe>
    </div>
    <div style="padding:12px 16px;background:var(--surface);border-top:1px solid var(--border)">
      <strong>${f.student}</strong> · <span style="color:var(--text-muted)">${f.grade}</span>
    </div>`);
}

/* ── Modal helpers ─────────────────────────────────────── */
function setModalBody(html) {
  document.getElementById('modalBody').innerHTML = html;
}

function showModal(title) {
  document.getElementById('modalBreadcrumb').innerHTML =
    `<span class="crumb active">${title}</span>`;
  document.getElementById('modalBack').style.display = 'none';
  document.getElementById('modalOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

function overlayClick(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ── Search ────────────────────────────────────────────── */
function filterEvents(query) {
  const q = query.trim().toLowerCase();
  const cards = document.querySelectorAll('.event-card');
  let visible = 0;
  cards.forEach(card => {
    const match = !q || card.dataset.name.toLowerCase().includes(q);
    card.style.display = match ? '' : 'none';
    if (match) visible++;
  });
  document.getElementById('eventCount').textContent = `${visible} event${visible !== 1 ? 's' : ''}`;
  document.getElementById('noResults').style.display = visible === 0 ? 'block' : 'none';
}

/* ── Init ──────────────────────────────────────────────── */
(async () => {
  const grid = document.getElementById('eventsGrid');
  grid.innerHTML = '<div class="fb-loading" style="padding:60px 0;grid-column:1/-1"><div class="spinner"></div><p>Loading events…</p></div>';
  try {
    const events = await loadSheet();
    buildEventCards(events);
  } catch (err) {
    grid.innerHTML = `<div class="fb-error" style="grid-column:1/-1"><span>⚠️</span><p>Could not load events.</p><small>${err.message}</small></div>`;
  }
})();
