const STORAGE_KEY = 'kino_links_v1';
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

els.playPauseBtn.addEventListener('click', async () => {
  if (playerMode !== 'native' || !nativeVideo) return;
  if (nativeVideo.paused) {
    try { await nativeVideo.play(); } catch {}
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
    try { await els.playerStage.requestFullscreen(); } catch {}
  } else {
    try { await document.exitFullscreen(); } catch {}
  }
});

presets.forEach((btn) => {
  btn.addEventListener('click', () => {
    els.titleInput.value = btn.dataset.title || '';
    els.urlInput.value = btn.dataset.url || '';
    els.typeInput.value = btn.dataset.type || 'mp4';
    els.categoryInput.value = btn.dataset.category || '';
    els.descriptionInput.value = 'Быстрый тестовый источник';
    setStatus('Пресет подставлен в форму. Нажмите Сохранить или откройте напрямую из библиотеки после сохранения.');
  });
});

function init() {
  links = loadLinks();
  seedDefaultsIfEmpty();
  renderLibrary();
  els.overlayMessage.style.display = 'flex';
  setStatus('Сайт готов. Можно сохранять свои ссылки и тестировать режимы плеера.');
}

init();
