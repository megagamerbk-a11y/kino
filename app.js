class VideoPlayer {
  constructor(host) {
    this.host = host;
    this.video = null;
    this.plyr = null;
    this.hls = null;
  }

  destroy() {
    try { this.hls?.destroy(); } catch {}
    try { this.plyr?.destroy(); } catch {}
    this.hls = null;
    this.plyr = null;
    this.video = null;
    this.host.innerHTML = '';
  }

  async load(source) {
    this.destroy();

    const video = document.createElement('video');
    video.controls = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.preload = 'metadata';
    this.host.appendChild(video);
    this.video = video;

    this.plyr = new Plyr(video, {
      controls: ['play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen']
    });

    if (source.type === 'hls' || String(source.url).includes('.m3u8')) {
      if (window.Hls && Hls.isSupported()) {
        this.hls = new Hls();
        this.hls.loadSource(source.url);
        this.hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = source.url;
      } else {
        throw new Error('Этот браузер не поддерживает HLS');
      }
    } else {
      video.src = source.url;
    }
  }

  on(event, handler) { this.video?.addEventListener(event, handler); }
  play() { return this.video?.play(); }
  pause() { return this.video?.pause(); }
  get paused() { return this.video?.paused ?? true; }
  get muted() { return this.video?.muted ?? false; }
  set muted(v) { if (this.video) this.video.muted = v; }
  get currentTime() { return this.video?.currentTime ?? 0; }
  set currentTime(v) { if (this.video) this.video.currentTime = v; }
  get duration() { return this.video?.duration ?? 0; }
}

const elements = {
  list: document.getElementById('videoList'),
  search: document.getElementById('searchInput'),
  title: document.getElementById('videoTitle'),
  description: document.getElementById('videoDescription'),
  type: document.getElementById('videoType'),
  directLink: document.getElementById('directLink'),
  playBtn: document.getElementById('playBtn'),
  muteBtn: document.getElementById('muteBtn'),
  seekBar: document.getElementById('seekBar'),
  timeNow: document.getElementById('timeNow'),
  timeLeft: document.getElementById('timeLeft'),
  fullBtn: document.getElementById('fullBtn')
};

const player = new VideoPlayer(document.getElementById('playerHost'));
let videos = [];
let currentId = null;

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) return '00:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0
    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateControls() {
  elements.playBtn.textContent = player.paused ? '▶' : '⏸';
  elements.muteBtn.textContent = player.muted ? '🔇' : '🔊';
  const dur = player.duration;
  const cur = player.currentTime;
  elements.timeNow.textContent = formatTime(cur);
  elements.timeLeft.textContent = '-' + formatTime(Math.max(0, dur - cur));
  elements.seekBar.value = dur ? String((cur / dur) * 100) : '0';
}

function bindPlayerEvents() {
  ['loadedmetadata', 'timeupdate', 'play', 'pause', 'volumechange', 'ended'].forEach((eventName) => {
    player.on(eventName, updateControls);
  });
}

function renderList(items) {
  elements.list.innerHTML = '';
  for (const item of items) {
    const div = document.createElement('div');
    div.className = 'video-item' + (item.id === currentId ? ' active' : '');
    div.innerHTML = `
      <div class="video-item-title">${item.title}</div>
      <div class="video-item-sub">${item.type.toUpperCase()}${item.category ? ' · ' + item.category : ''}</div>
    `;
    div.addEventListener('click', () => openVideo(item.id));
    elements.list.appendChild(div);
  }
}

async function fetchVideos() {
  const response = await fetch('/api/videos');
  if (!response.ok) throw new Error('Не удалось получить список видео');
  const data = await response.json();
  return data.items || [];
}

async function openVideo(id) {
  const item = videos.find(v => String(v.id) === String(id));
  if (!item) return;
  currentId = item.id;
  await player.load(item);
  bindPlayerEvents();
  updateControls();

  elements.title.textContent = item.title;
  elements.description.textContent = item.description || 'Без описания';
  elements.type.textContent = item.type;
  elements.directLink.href = item.url;
  renderList(filterVideos(elements.search.value));
}

function filterVideos(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return videos;
  return videos.filter(item => {
    return [item.title, item.description, item.category, item.type]
      .filter(Boolean)
      .some(v => String(v).toLowerCase().includes(q));
  });
}

async function init() {
  try {
    videos = await fetchVideos();
    renderList(videos);
    if (videos[0]) await openVideo(videos[0].id);
  } catch (error) {
    elements.title.textContent = 'Ошибка загрузки';
    elements.description.textContent = error.message;
  }
}

elements.search.addEventListener('input', () => {
  renderList(filterVideos(elements.search.value));
});

elements.playBtn.addEventListener('click', async () => {
  if (player.paused) {
    try { await player.play(); } catch {}
  } else {
    player.pause();
  }
  updateControls();
});

elements.muteBtn.addEventListener('click', () => {
  player.muted = !player.muted;
  updateControls();
});

elements.seekBar.addEventListener('input', () => {
  const dur = player.duration;
  if (!dur) return;
  player.currentTime = (Number(elements.seekBar.value) / 100) * dur;
  updateControls();
});

elements.fullBtn.addEventListener('click', async () => {
  const stage = document.querySelector('.player-stage');
  if (!document.fullscreenElement) {
    try { await stage.requestFullscreen(); } catch {}
  } else {
    try { await document.exitFullscreen(); } catch {}
  }
});

init();
