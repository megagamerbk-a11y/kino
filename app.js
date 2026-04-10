const STORAGE_KEY = 'kino_links_v2';

const els = {
  searchInput: document.getElementById('searchInput'),
  titleInput: document.getElementById('titleInput'),
  urlInput: document.getElementById('urlInput'),
  typeInput: document.getElementById('typeInput'),
  categoryInput: document.getElementById('categoryInput'),
  descriptionInput: document.getElementById('descriptionInput'),
  addBtn: document.getElementById('addBtn'),
  clearFormBtn: document.getElementById('clearFormBtn'),
  libraryList: document.getElementById('libraryList'),
  showAllBtn: document.getElementById('showAllBtn'),
  showFavBtn: document.getElementById('showFavBtn'),
  currentTitle: document.getElementById('currentTitle'),
  currentMeta: document.getElementById('currentMeta'),
  currentDescription: document.getElementById('currentDescription'),
  playerHost: document.getElementById('playerHost'),
  overlayMessage: document.getElementById('overlayMessage'),
  sourceText: document.getElementById('sourceText'),
  proxyText: document.getElementById('proxyText'),
  statusText: document.getElementById('statusText'),
  playPauseBtn: document.getElementById('playPauseBtn'),
  muteBtn: document.getElementById('muteBtn'),
  seekBar: document.getElementById('seekBar'),
  timeCurrent: document.getElementById('timeCurrent'),
  timeRemaining: document.getElementById('timeRemaining'),
  fullscreenBtn: document.getElementById('fullscreenBtn'),
  modeNativeBtn: document.getElementById('modeNativeBtn'),
  modeOgvBtn: document.getElementById('modeOgvBtn'),
  modeDeviceBtn: document.getElementById('modeDeviceBtn'),
  playerStage: document.getElementById('playerStage')
};

let links = [];
let currentId = null;
let filterFavorites = false;
let playerMode = 'native';

let nativeVideo = null;
let hlsInstance = null;
let ogvPlayer = null;

const presets = Array.from(document.querySelectorAll('.preset-btn'));

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function setStatus(text) {
  els.statusText.textContent = text;
}

function saveLinks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

function loadLinks() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function seedDefaultsIfEmpty() {
  if (links.length > 0) return;

  links = [
    {
      id: uid(),
      title: 'Demo MP4',
      url: 'https://www.w3schools.com/html/mov_bbb.mp4',
      type: 'mp4',
      category: 'demo',
      description: 'Тестовый mp4 файл',
      favorite: false
    },
    {
      id: uid(),
      title: 'Demo WebM',
      url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm',
      type: 'webm',
      category: 'demo',
      description: 'Тестовый webm файл',
      favorite: false
    },
    {
      id: uid(),
      title: 'Demo HLS',
      url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      type: 'hls',
      category: 'stream',
      description: 'Тестовый hls поток',
      favorite: false
    }
  ];

  saveLinks();
}

function buildProxyUrl(url) {
  return `/api/proxy?url=${encodeURIComponent(url)}`;
}

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) return '00:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);

  return h > 0
    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function destroyPlayers() {
  try {
    if (hlsInstance) hlsInstance.destroy();
  } catch {}
  hlsInstance = null;

  try {
    if (nativeVideo) {
      nativeVideo.pause();
      nativeVideo.removeAttribute('src');
      if (typeof nativeVideo.load === 'function') nativeVideo.load();
    }
  } catch {}
  nativeVideo = null;

  try {
    if (ogvPlayer && typeof ogvPlayer.stop === 'function') {
      ogvPlayer.stop();
    }
  } catch {}
  ogvPlayer = null;

  els.playerHost.innerHTML = '';
}

function updateNativeControls() {
  if (playerMode !== 'native') {
    els.playPauseBtn.textContent = '▶';
    els.muteBtn.textContent = '🔊';
    return;
  }

  const video = nativeVideo;
  if (!video) return;

  els.playPauseBtn.textContent = video.paused ? '▶' : '⏸';
  els.muteBtn.textContent = video.muted ? '🔇' : '🔊';

  const dur = video.duration || 0;
  const cur = video.currentTime || 0;

  els.timeCurrent.textContent = formatTime(cur);
  els.timeRemaining.textContent = '-' + formatTime(Math.max(0, dur - cur));
  els.seekBar.value = dur ? String((cur / dur) * 100) : '0';
}

function resetNonNativeControlsLabel() {
  els.playPauseBtn.textContent = '▶';
  els.muteBtn.textContent = '🔊';
  els.timeCurrent.textContent = '00:00';
  els.timeRemaining.textContent = '-00:00';
  els.seekBar.value = '0';
}

function createNativeVideo(item) {
  destroyPlayers();
  els.overlayMessage.style.display = 'none';

  const video = document.createElement('video');
  video.controls = true;
  video.preload = 'metadata';
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  els.playerHost.appendChild(video);
  nativeVideo = video;

  new Plyr(video, {
    controls: ['play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen']
  });

  const proxied = buildProxyUrl(item.url);
  els.proxyText.textContent = proxied;

  if (item.type === 'hls' || item.url.includes('.m3u8')) {
    if (window.Hls && Hls.isSupported()) {
      hlsInstance = new Hls();
      hlsInstance.loadSource(item.url);
      hlsInstance.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = item.url;
    } else {
      setStatus('Этот браузер не поддерживает HLS в native-режиме.');
    }
  } else {
    video.src = item.url;
  }

  ['loadedmetadata', 'timeupdate', 'play', 'pause', 'volumechange', 'ended'].forEach((ev) => {
    video.addEventListener(ev, updateNativeControls);
  });

  updateNativeControls();
}

function createOgvPlayer(item, isDeviceMode = false) {
  destroyPlayers();
  els.overlayMessage.style.display = 'none';

  const proxied = buildProxyUrl(item.url);
  els.proxyText.textContent = proxied;

  const player = document.createElement('ogvjs');
  player.setAttribute('src', proxied);
  player.setAttribute('controls', '');
  player.style.width = '100%';
  player.style.height = '100%';

  els.playerHost.appendChild(player);
  ogvPlayer = player;

  resetNonNativeControlsLabel();

  player.addEventListener('loadedmetadata', () => {
    setStatus(
      isDeviceMode
        ? 'Device mode: поток загружен через OGV.js.'
        : 'OGV.js: поток загружен.'
    );
  });

  player.addEventListener('error', () => {
    setStatus(
      isDeviceMode
        ? 'Device mode: видео не отрисовалось. Значит, нужен ещё более специальный способ подачи.'
        : 'OGV.js не смог воспроизвести поток. Возможно, источник не webm-совместим.'
    );
  });

  try {
    if (typeof player.play === 'function') {
      player.play().catch(() => {});
    }
  } catch {}
}

function applyModeButtons() {
  els.modeNativeBtn.classList.toggle('active', playerMode === 'native');
  els.modeOgvBtn.classList.toggle('active', playerMode === 'ogv');
  els.modeDeviceBtn.classList.toggle('active', playerMode === 'device');
  els.modeDeviceBtn.classList.toggle('device-active', playerMode === 'device');
}

function setMode(mode) {
  playerMode = mode;
  applyModeButtons();

  const item = links.find((x) => x.id === currentId);
  if (item) {
    openItem(item.id);
  } else {
    if (mode === 'device') {
      setStatus('Device mode включен. Теперь откройте ссылку из библиотеки.');
    } else if (mode === 'ogv') {
      setStatus('OGV test включен. Теперь откройте ссылку из библиотеки.');
    } else {
      setStatus('Native mode включен.');
    }
  }
}

function openItem(id) {
  const item = links.find((x) => x.id === id);
  if (!item) return;

  currentId = item.id;
  els.currentTitle.textContent = item.title || 'Без названия';
  els.currentMeta.textContent = `Тип: ${item.type || '—'}${item.category ? ' · ' + item.category : ''}`;
  els.currentDescription.textContent = item.description || 'Без описания';
  els.sourceText.textContent = item.url;

  if (playerMode === 'device') {
    createOgvPlayer(item, true);
    setStatus('Device mode: открываем поток только через OGV.js.');
  } else if (playerMode === 'ogv') {
    createOgvPlayer(item, false);
    setStatus('OGV test: открываем поток через OGV.js.');
  } else {
    createNativeVideo(item);
    setStatus('Native mode: открываем обычным video-плеером.');
  }

  renderLibrary();
}

function getFilteredLinks() {
  const q = els.searchInput.value.trim().toLowerCase();

  return links.filter((item) => {
    if (filterFavorites && !item.favorite) return false;
    if (!q) return true;

    return [item.title, item.description, item.category, item.type]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });
}

function renderLibrary() {
  const items = getFilteredLinks();
  els.libraryList.innerHTML = '';

  if (items.length === 0) {
    els.libraryList.innerHTML = '<div class="library-sub">Ничего не найдено.</div>';
    return;
  }

  for (const item of items) {
    const div = document.createElement('div');
    div.className = 'library-item' + (item.id === currentId ? ' active' : '');

    div.innerHTML = `
      <div class="library-top">
        <div>
          <div class="library-title">${escapeHtml(item.title || 'Без названия')}</div>
          <div class="library-sub">${escapeHtml(item.type || '—')}${item.category ? ' · ' + escapeHtml(item.category) : ''}</div>
        </div>
        <button class="mini-btn fav-toggle">${item.favorite ? '★' : '☆'}</button>
      </div>
      <div class="library-actions">
        <button class="mini-btn open-btn">Открыть</button>
        <button class="mini-btn fill-btn">В форму</button>
        <button class="mini-btn delete-btn">Удалить</button>
      </div>
    `;

    div.querySelector('.open-btn').addEventListener('click', () => openItem(item.id));
    div.querySelector('.fill-btn').addEventListener('click', () => fillForm(item));
    div.querySelector('.delete-btn').addEventListener('click', () => deleteItem(item.id));
    div.querySelector('.fav-toggle').addEventListener('click', () => toggleFavorite(item.id));

    els.libraryList.appendChild(div);
  }
}

function fillForm(item) {
  els.titleInput.value = item.title || '';
  els.urlInput.value = item.url || '';
  els.typeInput.value = item.type || 'mp4';
  els.categoryInput.value = item.category || '';
  els.descriptionInput.value = item.description || '';
  setStatus('Поля заполнены из записи библиотеки.');
}

function deleteItem(id) {
  const item = links.find((x) => x.id === id);
  if (!item) return;

  if (!confirm(`Удалить "${item.title}"?`)) return;

  links = links.filter((x) => x.id !== id);

  if (currentId === id) {
    currentId = null;
    destroyPlayers();
    els.overlayMessage.style.display = 'flex';
    els.currentTitle.textContent = 'Выберите ссылку';
    els.currentMeta.textContent = 'Тип: —';
    els.currentDescription.textContent = 'Описание появится здесь.';
    els.sourceText.textContent = '—';
    els.proxyText.textContent = '—';
    resetNonNativeControlsLabel();
  }

  saveLinks();
  renderLibrary();
  setStatus('Ссылка удалена.');
}

function toggleFavorite(id) {
  const item = links.find((x) => x.id === id);
  if (!item) return;

  item.favorite = !item.favorite;
  saveLinks();
  renderLibrary();
}

function clearForm() {
  els.titleInput.value = '';
  els.urlInput.value = '';
  els.typeInput.value = 'mp4';
  els.categoryInput.value = '';
  els.descriptionInput.value = '';
}

function addItemFromForm() {
  const title = els.titleInput.value.trim();
  const url = els.urlInput.value.trim();
  const type = els.typeInput.value;
  const category = els.categoryInput.value.trim();
  const description = els.descriptionInput.value.trim();

  if (!title || !url) {
    setStatus('Нужно заполнить хотя бы название и ссылку.');
    return;
  }

  links.unshift({
    id: uid(),
    title,
    url,
    type,
    category,
    description,
    favorite: false
  });

  saveLinks();
  renderLibrary();
  clearForm();
  setStatus('Новая ссылка сохранена в библиотеку.');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

els.addBtn.addEventListener('click', addItemFromForm);
els.clearFormBtn.addEventListener('click', clearForm);
els.searchInput.addEventListener('input', renderLibrary);

els.showAllBtn.addEventListener('click', () => {
  filterFavorites = false;
  els.showAllBtn.classList.add('active');
  els.showFavBtn.classList.remove('active');
  renderLibrary();
});

els.showFavBtn.addEventListener('click', () => {
  filterFavorites = true;
  els.showFavBtn.classList.add('active');
  els.showAllBtn.classList.remove('active');
  renderLibrary();
});

els.modeNativeBtn.addEventListener('click', () => setMode('native'));
els.modeOgvBtn.addEventListener('click', () => setMode('ogv'));
els.modeDeviceBtn.addEventListener('click', () => setMode('device'));

els.playPauseBtn.addEventListener('click', async () => {
  if (playerMode !== 'native' || !nativeVideo) return;

  if (nativeVideo.paused) {
    try {
      await nativeVideo.play();
    } catch {}
  } else {
    nativeVideo.pause();
  }

  updateNativeControls();
});

els.muteBtn.addEventListener('click', () => {
  if (playerMode !== 'native' || !nativeVideo) return;
  nativeVideo.muted = !nativeVideo.muted;
  updateNativeControls();
});

els.seekBar.addEventListener('input', () => {
  if (playerMode !== 'native' || !nativeVideo) return;

  const dur = nativeVideo.duration;
  if (!dur) return;

  nativeVideo.currentTime = (Number(els.seekBar.value) / 100) * dur;
  updateNativeControls();
});

els.fullscreenBtn.addEventListener('click', async () => {
  if (!document.fullscreenElement) {
    try {
      await els.playerStage.requestFullscreen();
    } catch {}
  } else {
    try {
      await document.exitFullscreen();
    } catch {}
  }
});

presets.forEach((btn) => {
  btn.addEventListener('click', () => {
    els.titleInput.value = btn.dataset.title || '';
    els.urlInput.value = btn.dataset.url || '';
    els.typeInput.value = btn.dataset.type || 'mp4';
    els.categoryInput.value = btn.dataset.category || '';
    els.descriptionInput.value = 'Быстрый тестовый источник';
    setStatus('Пресет подставлен в форму. Нажмите Сохранить.');
  });
});

function init() {
  links = loadLinks();
  seedDefaultsIfEmpty();
  renderLibrary();
  applyModeButtons();
  els.overlayMessage.style.display = 'flex';
  resetNonNativeControlsLabel();
  setStatus('Сайт готов. Для Вашего устройства попробуйте Device mode.');
}

init();
