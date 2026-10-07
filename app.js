/* ── State ─────────────────────────────────────────────── */
const state = {
  breadcrumbs: [],   // [{id, name}]
  currentFile: null
};

/* ── Drive folder API (via Vercel serverless function) ─── */
async function listFolder(folderId) {
  const resp = await fetch(`/api/folder?id=${encodeURIComponent(folderId)}`);
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  const data = await resp.json();
  return data.files || [];
}

/* ── File helpers ──────────────────────────────────────── */
const FOLDER_MIME = 'application/vnd.google-apps.folder';

function isFolder(f) { return f.mimeType === FOLDER_MIME; }
function isVideo(f)  { return f.mimeType.startsWith('video/'); }
function isImage(f)  { return f.mimeType.startsWith('image/'); }
function isAudio(f)  { return f.mimeType.startsWith('audio/'); }

function fileIcon(f) {
  if (isFolder(f)) return '📁';
  if (isVideo(f))  return '🎬';
  if (isImage(f))  return '🖼️';
  if (isAudio(f))  return '🎵';
  if (f.mimeType === 'application/pdf') return '📄';
  return '📎';
}

function fileLabel(f) {
  if (isFolder(f)) return 'Folder';
  if (isVideo(f))  return 'Video';
  if (isImage(f))  return 'Photo';
  if (isAudio(f))  return 'Audio';
  if (f.mimeType === 'application/pdf') return 'PDF';
  return 'File';
}

function thumbUrl(f) {
  return `https://drive.google.com/thumbnail?id=${f.id}&sz=w300`;
}

function previewUrl(f) {
  return `https://drive.google.com/file/d/${f.id}/preview`;
}

function formatSize(bytes) {
  if (!bytes) return '';
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/* ── Folder colours (cycle through palette) ────────────── */
const FOLDER_GRADIENTS = [
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

/* ── Modal helpers ─────────────────────────────────────── */
function setModalBody(html) {
  document.getElementById('modalBody').innerHTML = html;
}

function setLoading() {
  setModalBody(`
    <div class="fb-loading">
      <div class="spinner"></div>
      <p>Loading content…</p>
    </div>`);
}

function renderBreadcrumb() {
  const el = document.getElementById('modalBreadcrumb');
  const backBtn = document.getElementById('modalBack');
  backBtn.style.display = state.breadcrumbs.length > 1 ? 'inline-flex' : 'none';
  el.innerHTML = state.breadcrumbs.map((crumb, i) => {
    const isLast = i === state.breadcrumbs.length - 1;
    return isLast
      ? `<span class="crumb active">${crumb.name}</span>`
      : `<span class="crumb link" onclick="navigateTo(${i})">${crumb.name}</span><span class="crumb-sep">›</span>`;
  }).join('');
}

/* ── Navigation ────────────────────────────────────────── */
async function openEvent(folderId, name) {
  state.breadcrumbs = [{ id: folderId, name }];
  state.currentFile = null;
  showModal();
  await loadFolder(folderId);
}

async function drillInto(folder) {
  state.breadcrumbs.push({ id: folder.id, name: folder.name });
  state.currentFile = null;
  renderBreadcrumb();
  setLoading();
  await loadFolder(folder.id);
}

async function navigateTo(index) {
  state.breadcrumbs = state.breadcrumbs.slice(0, index + 1);
  state.currentFile = null;
  renderBreadcrumb();
  setLoading();
  await loadFolder(state.breadcrumbs[index].id);
}

async function navigateBack() {
  if (state.currentFile) {
    state.currentFile = null;
    renderBreadcrumb();
    setLoading();
    const current = state.breadcrumbs[state.breadcrumbs.length - 1];
    await loadFolder(current.id);
    return;
  }
  if (state.breadcrumbs.length > 1) {
    state.breadcrumbs.pop();
    renderBreadcrumb();
    setLoading();
    const current = state.breadcrumbs[state.breadcrumbs.length - 1];
    await loadFolder(current.id);
  }
}

/* ── Load & render folder ──────────────────────────────── */
async function loadFolder(folderId) {
  renderBreadcrumb();
  try {
    setLoading();
    const files = await listFolder(folderId);
    renderFolderGrid(files);
  } catch (err) {
    setModalBody(`<div class="fb-error">
      <span>⚠️</span>
      <p>Could not load content. Ensure the folder is publicly shared.</p>
      <small>${err.message}</small>
    </div>`);
  }
}

function renderFolderGrid(files) {
  if (!files.length) {
    setModalBody('<div class="fb-empty"><span>📭</span><p>This folder is empty.</p></div>');
    return;
  }

  const folders = files.filter(isFolder);
  const media   = files.filter(f => !isFolder(f));

  const folderCards = folders.map((f, i) => `
    <div class="fb-card fb-folder" onclick="drillInto(${JSON.stringify(f).replace(/"/g,'&quot;')})">
      <div class="fb-card-thumb folder-thumb" style="background:${FOLDER_GRADIENTS[i % FOLDER_GRADIENTS.length]}">
        <span class="fb-card-icon">📁</span>
      </div>
      <div class="fb-card-info">
        <span class="fb-card-name" title="${f.name}">${f.name}</span>
        <span class="fb-card-meta">Folder</span>
      </div>
    </div>`).join('');

  const mediaCards = media.map(f => {
    const showThumb = isImage(f) || isVideo(f);
    const thumb = showThumb
      ? `<img src="${thumbUrl(f)}" alt="${f.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : '';
    const icon = `<div class="fb-icon-fallback" style="${showThumb ? 'display:none' : ''}">${fileIcon(f)}</div>`;
    return `
    <div class="fb-card fb-file" onclick="openFile(${JSON.stringify(f).replace(/"/g,'&quot;')})">
      <div class="fb-card-thumb file-thumb">
        ${thumb}
        ${icon}
        ${isVideo(f) ? '<div class="play-overlay">▶</div>' : ''}
      </div>
      <div class="fb-card-info">
        <span class="fb-card-name" title="${f.name}">${f.name}</span>
        <span class="fb-card-meta">${fileLabel(f)}${f.size ? ' · ' + formatSize(+f.size) : ''}</span>
      </div>
    </div>`;
  }).join('');

  const sectionFolders = folders.length
    ? `<div class="fb-section-label">Folders <span>${folders.length}</span></div>
       <div class="fb-grid">${folderCards}</div>` : '';
  const sectionMedia = media.length
    ? `<div class="fb-section-label">Files <span>${media.length}</span></div>
       <div class="fb-grid">${mediaCards}</div>` : '';

  setModalBody(`<div class="fb-scroll">${sectionFolders}${sectionMedia}</div>`);
}

/* ── File viewer ───────────────────────────────────────── */
function openFile(file) {
  state.currentFile = file;
  const prev = state.breadcrumbs;
  state.breadcrumbs = [...prev, { id: file.id, name: file.name }];
  renderBreadcrumb();

  const url = previewUrl(file);
  setModalBody(`
    <div class="media-viewer">
      <iframe src="${url}" allowfullscreen allow="autoplay"></iframe>
    </div>`);
}

/* ── Modal open / close ────────────────────────────────── */
function showModal() {
  document.getElementById('modalOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
  setModalBody('<div class="fb-loading"><div class="spinner"></div><p>Loading…</p></div>');
  document.getElementById('modalBack').style.display = 'none';
  document.getElementById('modalBreadcrumb').innerHTML = '';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  document.body.style.overflow = '';
  state.breadcrumbs = [];
  state.currentFile = null;
}

function overlayClick(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

/* ── Event card search ─────────────────────────────────── */
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
