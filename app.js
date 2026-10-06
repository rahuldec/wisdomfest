const overlay  = document.getElementById('modalOverlay');
const iframe   = document.getElementById('modalIframe');
const titleEl  = document.getElementById('modalTitle');
const openBtn  = document.getElementById('modalOpenBtn');
const loading  = document.getElementById('modalLoading');

function openFolder(folderId, name) {
  titleEl.textContent  = name;
  openBtn.href = `https://drive.google.com/drive/folders/${folderId}`;
  iframe.src   = '';
  loading.classList.remove('hidden');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';

  iframe.onload = () => loading.classList.add('hidden');
  iframe.src = `https://drive.google.com/embeddedfolderview?id=${folderId}#grid`;
}

function closeModal(e) {
  if (e && e.target !== overlay) return;
  overlay.classList.remove('active');
  iframe.src = '';
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

function filterEvents(query) {
  const q   = query.trim().toLowerCase();
  const cards = document.querySelectorAll('.event-card');
  let visible = 0;

  cards.forEach(card => {
    const name = card.dataset.name.toLowerCase();
    const show = !q || name.includes(q);
    card.style.display = show ? '' : 'none';
    if (show) visible++;
  });

  document.getElementById('eventCount').textContent = `${visible} event${visible !== 1 ? 's' : ''}`;
  document.getElementById('noResults').style.display = visible === 0 ? 'block' : 'none';
}
