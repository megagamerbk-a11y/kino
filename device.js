const sourceUrlInput = document.getElementById('sourceUrl');
const applyBtn = document.getElementById('applyBtn');
const currentUrlEl = document.getElementById('currentUrl');

const presetButtons = Array.from(document.querySelectorAll('.preset-btn'));
const runButtons = Array.from(document.querySelectorAll('.run-btn'));

const videos = {
  direct: document.getElementById('video-direct'),
  proxy: document.getElementById('video-proxy'),
  mp4: document.getElementById('video-mp4'),
  webm: document.getElementById('video-webm')
};

const statuses = {
  direct: document.getElementById('status-direct'),
  proxy: document.getElementById('status-proxy'),
  mp4: document.getElementById('status-mp4'),
  webm: document.getElementById('status-webm')
};

let currentSource = '';

function setStatus(mode, text) {
  statuses[mode].textContent = text;
}

function resetStatus() {
  setStatus('direct', 'Ожидание');
  setStatus('proxy', 'Ожидание');
  setStatus('mp4', 'Ожидание');
  setStatus('webm', 'Ожидание');
}

function stopAll() {
  Object.values(videos).forEach((video) => {
    try {
      video.pause();
      video.removeAttribute('src');
      video.load();
    } catch {}
  });
}

function buildUrl(mode, source) {
  if (mode === 'direct') return source;
  if (mode === 'proxy') return `/api/proxy?url=${encodeURIComponent(source)}`;
  if (mode === 'mp4') return `/api/proxy?force=mp4&url=${encodeURIComponent(source)}`;
  if (mode === 'webm') return `/api/proxy?force=webm&url=${encodeURIComponent(source)}`;
  return source;
}

function attachDiagnostics(video, mode) {
  video.onloadedmetadata = () => {
    setStatus(mode, `loadedmetadata: duration=${isFinite(video.duration) ? video.duration.toFixed(2) : 'unknown'}`);
  };

  video.onplay = () => {
    setStatus(mode, 'play: воспроизведение началось');
  };

  video.onplaying = () => {
    setStatus(mode, 'playing: поток реально играет');
  };

  video.onwaiting = () => {
    setStatus(mode, 'waiting: ожидание данных');
  };

  video.onstalled = () => {
    setStatus(mode, 'stalled: поток остановился');
  };

  video.onpause = () => {
    setStatus(mode, 'pause');
  };

  video.onerror = () => {
    const err = video.error;
    const msg = err ? `error code=${err.code}` : 'неизвестная ошибка';
    setStatus(mode, msg);
  };
}

async function runMode(mode) {
  if (!currentSource) {
    setStatus(mode, 'Сначала вставьте ссылку или выберите пресет.');
    return;
  }

  const video = videos[mode];
  const url = buildUrl(mode, currentSource);

  stopAll();
  resetStatus();
  attachDiagnostics(video, mode);

  try {
    video.src = url;
    await video.play();
    setStatus(mode, 'Команда play() отправлена');
  } catch (error) {
    setStatus(mode, `play() error: ${error.message}`);
  }
}

function applySource(url) {
  currentSource = String(url || '').trim();
  sourceUrlInput.value = currentSource;
  currentUrlEl.textContent = currentSource || '—';
  stopAll();
  resetStatus();
}

applyBtn.addEventListener('click', () => {
  applySource(sourceUrlInput.value);
});

sourceUrlInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    applySource(sourceUrlInput.value);
  }
});

presetButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    applySource(btn.dataset.url || '');
  });
});

runButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    runMode(btn.dataset.mode);
  });
});

applySource('https://www.w3schools.com/html/mov_bbb.mp4');
