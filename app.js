/* Abike Music — static web/PWA app logic. Dependency-free, in-memory only. */
(function () {
  'use strict';

  var SIGN_IN_URL = 'https://accounts.google.com/ServiceLogin?service=youtube&continue=https%3A%2F%2Fmusic.youtube.com%2F';
  var YT_MUSIC = 'https://music.youtube.com/';
  var ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
  var MAX_RECENT = 6;

  var el = function (id) { return document.getElementById(id); };
  var boot = el('boot');
  var gate = el('gate');
  var app = el('app');
  var caption = el('bootCaption');
  var progress = el('bootProgress');
  var progressFill = el('bootProgressFill');
  var percentLabel = el('bootPercent');
  var trackInput = el('trackInput');
  var errorLabel = el('inputError');
  var playerFrame = el('playerFrame');
  var embed = el('youtubeEmbed');
  var downloadButton = el('downloadButton');
  var recentList = el('recentList');
  var toastNode = el('toast');
  var reduceMotionInput = el('reduceMotion');
  var swStatus = el('swStatus');

  var media = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var state = {
    section: 'search',
    currentId: null,
    recent: [],
    reduced: !!(media && media.matches),
    motionOverridden: false
  };
  var toastTimer = null;

  function openInNewTab(url) {
    var win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) {
      showToast('New tab blocked. Allow pop-ups for this site and try again.');
    }
    return !!win;
  }

  function showToast(message) {
    if (!toastNode) return;
    toastNode.textContent = message;
    toastNode.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toastNode.hidden = true; }, 3400);
  }

  /* ---------------- Cold-start boot ---------------- */
  var captions = [
    { at: 0, text: 'Warming up the sound…' },
    { at: 24, text: 'Drawing the Abike orbit…' },
    { at: 48, text: 'Tuning the equalizer…' },
    { at: 72, text: 'Checking every page…' },
    { at: 92, text: 'ALIVE ON EVERY PAGE' }
  ];

  function runBoot() {
    var duration = state.reduced ? 700 : 2800;
    var start = null;
    var lastCaption = -1;

    function frame(now) {
      if (start === null) start = now;
      var pct = Math.min(100, Math.round(((now - start) / duration) * 100));
      progressFill.style.width = pct + '%';
      percentLabel.textContent = pct + '%';
      progress.setAttribute('aria-valuenow', String(pct));

      for (var i = 0; i < captions.length; i += 1) {
        if (pct >= captions[i].at && i > lastCaption) {
          caption.textContent = captions[i].text;
          lastCaption = i;
        }
      }
      if (pct < 100) {
        window.requestAnimationFrame(frame);
      } else {
        window.setTimeout(finishBoot, state.reduced ? 80 : 420);
      }
    }
    window.requestAnimationFrame(frame);
  }

  function finishBoot() {
    boot.classList.add('is-leaving');
    window.setTimeout(function () {
      boot.hidden = true;
      gate.hidden = false;
      if (trackInput) trackInput.focus({ preventScroll: true });
    }, state.reduced ? 40 : 620);
  }

  /* ---------------- Sign-in gate ---------------- */
  el('signInButton').addEventListener('click', function () {
    // Google's own page opens in a new tab. No credentials or session are handled here.
    openInNewTab(SIGN_IN_URL);
    enterApp();
  });

  function enterApp() {
    gate.hidden = true;
    app.hidden = false;
    app.classList.add('is-entering');
    window.setTimeout(function () { app.classList.remove('is-entering'); }, state.reduced ? 40 : 700);
    showSection('search');
    showToast('Google tab opened. Continuing in the player shell.');
  }

  /* ---------------- Link parsing ---------------- */
  function extractVideoId(raw) {
    var value = String(raw || '').trim();
    if (!value) return null;
    if (ID_PATTERN.test(value)) return value;

    var url;
    try {
      url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : 'https://' + value);
    } catch (err) {
      return null;
    }

    var host = url.hostname.toLowerCase().replace(/^www\./, '');
    var parts = url.pathname.split('/').filter(Boolean);
    var candidate = null;

    if (host === 'youtu.be') {
      candidate = parts[0];
    } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (parts[0] === 'watch') candidate = url.searchParams.get('v');
      else if (['shorts', 'embed', 'live', 'v'].indexOf(parts[0]) !== -1) candidate = parts[1];
    }
    return candidate && ID_PATTERN.test(candidate) ? candidate : null;
  }

  function setError(message) {
    errorLabel.textContent = message || '';
    errorLabel.hidden = !message;
  }

  function playTrack(id) {
    state.currentId = id;
    embed.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) +
      '?autoplay=1&playsinline=1&rel=0&modestbranding=1';
    playerFrame.hidden = false;
    downloadButton.disabled = false;
    setError('');

    var at = state.recent.indexOf(id);
    if (at !== -1) state.recent.splice(at, 1);
    state.recent.unshift(id);
    state.recent = state.recent.slice(0, MAX_RECENT);
    renderRecent();
    showToast('Loaded ' + id + '. Tap the embed if iOS blocks autoplay.');
  }

  function renderRecent() {
    recentList.textContent = '';
    if (!state.recent.length) {
      var empty = document.createElement('li');
      empty.className = 'empty';
      empty.textContent = 'Nothing yet — play a track in Search.';
      recentList.appendChild(empty);
      return;
    }
    state.recent.forEach(function (id) {
      var row = document.createElement('li');
      var label = document.createElement('span');
      label.className = 'track-id';
      label.textContent = id;
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'button button--ghost track-go';
      button.dataset.id = id;
      button.textContent = 'Play again';
      row.appendChild(label);
      row.appendChild(button);
      recentList.appendChild(row);
    });
  }

  el('playButton').addEventListener('click', function () {
    var id = extractVideoId(trackInput.value);
    if (!id) {
      setError('That is not a YouTube video link or an 11-character video ID.');
      return;
    }
    playTrack(id);
  });

  trackInput.addEventListener('input', function () { setError(''); });

  el('searchButton').addEventListener('click', function () {
    var raw = trackInput.value.trim();
    var query = extractVideoId(raw) || raw;
    var url = query
      ? YT_MUSIC + 'search?q=' + encodeURIComponent(query)
      : YT_MUSIC + 'search';
    openInNewTab(url);
  });

  downloadButton.addEventListener('click', function () {
    if (!state.currentId) return;
    openInNewTab(YT_MUSIC + 'watch?v=' + encodeURIComponent(state.currentId));
  });

  recentList.addEventListener('click', function (event) {
    var button = event.target.closest ? event.target.closest('button[data-id]') : null;
    if (!button) return;
    var id = button.dataset.id;
    trackInput.value = id;
    playTrack(id);
    showSection('search');
  });

  /* ---------------- Sections ---------------- */
  function showSection(name) {
    state.section = name;
    document.body.dataset.section = name;
    document.querySelectorAll('[data-panel]').forEach(function (panel) {
      panel.hidden = panel.dataset.panel !== name;
    });
    document.querySelectorAll('[data-go]').forEach(function (item) {
      item.setAttribute('aria-selected', item.dataset.go === name ? 'true' : 'false');
    });
    window.scrollTo({ top: 0, behavior: state.reduced ? 'auto' : 'smooth' });
  }

  document.querySelectorAll('[data-go]').forEach(function (button) {
    button.addEventListener('click', function () { showSection(button.dataset.go); });
  });

  /* ---------------- Motion settings ---------------- */
  function applyMotion() {
    document.body.classList.toggle('reduce-motion', state.reduced);
    if (reduceMotionInput) reduceMotionInput.checked = state.reduced;
  }
  reduceMotionInput.checked = state.reduced;
  applyMotion();

  reduceMotionInput.addEventListener('change', function () {
    state.motionOverridden = true;
    state.reduced = reduceMotionInput.checked;
    applyMotion();
  });
  if (media && media.addEventListener) {
    media.addEventListener('change', function (event) {
      if (state.motionOverridden) return;
      state.reduced = event.matches;
      applyMotion();
    });
  }

  el('clearRecent').addEventListener('click', function () {
    state.recent = [];
    renderRecent();
    showToast('Session list cleared.');
  });

  /* ---------------- Offline app shell ---------------- */
  var secure = window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if ('serviceWorker' in navigator && secure) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').then(function () {
        swStatus.textContent = 'offline shell ready';
      }).catch(function () {
        swStatus.textContent = 'online only';
      });
    });
  } else {
    swStatus.textContent = 'needs HTTPS or localhost';
  }

  renderRecent();
  runBoot();
})();
