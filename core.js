// الجزء 1: الواجهة والاسم ولوحة الأبطال والصوت
  var cv = document.getElementById('cv');
  var ctx = cv.getContext('2d');
  var scoreEl = document.getElementById('score');
  var levelEl = document.getElementById('level');
  var livesEl = document.getElementById('lives');
  var bestEl = document.getElementById('best');
  var overlay = document.getElementById('overlay');
  var ovTitle = document.getElementById('ovTitle');
  var ovText = document.getElementById('ovText');
  var startBtn = document.getElementById('startBtn');
  var muteBtn = document.getElementById('mute');
  var levelToast = document.getElementById('levelToast');
  var toastTimer = null;

  var leaderboardBtn = document.getElementById('leaderboardBtn');
  var leaderboardModal = document.getElementById('leaderboardModal');
  var leaderboardClose = document.getElementById('leaderboardClose');
  var leaderboardStatus = document.getElementById('leaderboardStatus');
  var leaderboardRows = document.getElementById('leaderboardRows');

  // إعدادات Supabase: ضع Project URL والمفتاح العام هنا فقط.
  // استخدم sb_publishable_... أو anon key القديم. لا تستخدم sb_secret_ أو service_role.
  var SUPABASE_URL = 'https://zomndppklfoutexorgpf.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_ionAlCUW07DW2v6vFcS8BQ__cUHyiot';

  SUPABASE_URL = String(SUPABASE_URL || '').trim().replace(/\/$/, '');
  SUPABASE_ANON_KEY = String(SUPABASE_ANON_KEY || '').trim();

  var leaderboardReady = /^https:\/\//i.test(SUPABASE_URL) &&
    SUPABASE_URL.indexOf('YOUR_PROJECT_REF') === -1 &&
    SUPABASE_URL.indexOf('PASTE_') === -1 &&
    SUPABASE_ANON_KEY.length > 20 &&
    SUPABASE_ANON_KEY.indexOf('PASTE_') === -1 &&
    !/^sb_secret_/i.test(SUPABASE_ANON_KEY);

  function getPlayerId() {
    try {
      var id = localStorage.getItem('galaxy_player_id');
      if (!id) {
        id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() :
          ('p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 14));
        localStorage.setItem('galaxy_player_id', id);
      }
      return id;
    } catch (e) {
      return 'p-' + Math.random().toString(36).slice(2, 14);
    }
  }

  function getPlayerName() {
    try { return (localStorage.getItem('galaxy_player_name') || '').trim(); }
    catch (e) { return ''; }
  }

  // نافذة اسم اللاعب داخل اللعبة (تظهر قبل أول جولة)
  var nameModal = document.getElementById('nameModal');
  var nameForm = document.getElementById('namePanel');
  var nameInput = document.getElementById('playerNameInput');
  var nameError = document.getElementById('nameError');
  var nameSave = document.getElementById('nameSave');
  var nameSkip = document.getElementById('nameSkip');
  var changeNameBtn = document.getElementById('changeNameBtn');
  var namePending = null;

  function updatePlayerTag() {
    var n = getPlayerName();
    changeNameBtn.textContent = n ? ('✏️ اللاعب: ' + n) : '✏️ سجّل اسمك';
  }

  function closeNameModal(value) {
    nameModal.classList.add('hidden');
    var done = namePending;
    namePending = null;
    if (done) done(value);
  }

  function choosePlayerName(saveLabel, skipLabel) {
    return new Promise(function (resolve) {
      namePending = resolve;
      nameSave.textContent = saveLabel || 'حفظ';
      nameSkip.textContent = skipLabel || 'إلغاء';
      nameInput.value = getPlayerName();
      nameError.textContent = '';
      nameModal.classList.remove('hidden');
      setTimeout(function () { nameInput.focus(); nameInput.select(); }, 60);
    });
  }

  nameForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var value = nameInput.value.trim().replace(/\s+/g, ' ');
    if (value.length < 2 || value.length > 16) {
      nameError.textContent = 'اللقب لازم يكون بين حرفين و16 حرفًا.';
      nameInput.focus();
      return;
    }
    try { localStorage.setItem('galaxy_player_name', value); } catch (e) {}
    updatePlayerTag();
    closeNameModal(value);
  });
  nameSkip.addEventListener('click', function () { closeNameModal(null); });
  window.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && namePending) closeNameModal(null);
  });
  updatePlayerTag();

  async function supabaseRequest(path, options) {
    var response = await fetch(SUPABASE_URL + '/rest/v1/' + path, Object.assign({
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    }, options || {}));
    if (!response.ok) {
      var detail = '';
      try { detail = await response.text(); } catch (e) {}
      throw new Error('HTTP ' + response.status + (detail ? ': ' + detail.slice(0, 180) : ''));
    }
    if (response.status === 204) return null;
    return response.json();
  }

  // تُرسل النتيجة عند انتهاء الجولة من الدالة end() أدناه.
  async function submitLeaderboardScore(finalScore, finalLevel) {
    if (!leaderboardReady || finalScore <= 0) return;
    var name = getPlayerName();
    if (!name) return; // لاعب ضيف: لا تُرسل النتيجة
    try {
      await supabaseRequest('rpc/submit_galaxy_score', {
        method: 'POST',
        body: JSON.stringify({
          p_player_id: getPlayerId(),
          p_player_name: name,
          p_score: Math.floor(finalScore),
          p_level: Math.floor(finalLevel)
        })
      });
    } catch (err) {
      console.warn('Leaderboard submission failed:', err);
      // لا نمنع اللاعب من متابعة اللعبة إذا فشل الاتصال.
    }
  }

  function showLeaderboard() {
    leaderboardModal.classList.remove('hidden');
    leaderboardStatus.textContent = leaderboardReady ?
      'جارٍ تحميل النتائج...' : 'أضف Project URL والمفتاح العام في إعدادات Supabase داخل الملف أولاً.';
    leaderboardRows.innerHTML = '';
    if (!leaderboardReady) return;
    supabaseRequest('leaderboard?select=player_name,score,level&order=score.desc,updated_at.asc&limit=10')
      .then(function (rows) {
        leaderboardRows.innerHTML = '';
        if (!rows || !rows.length) {
          leaderboardStatus.textContent = 'لسّه ما في نتائج. كن أول بطل في المجرّة!';
          return;
        }
        leaderboardStatus.textContent = '';
        rows.forEach(function (player, index) {
          var row = document.createElement('div');
          row.className = 'leader-row';
          var rank = document.createElement('div');
          rank.className = 'leader-rank';
          rank.textContent = index + 1;
          var identity = document.createElement('div');
          var name = document.createElement('div');
          name.className = 'leader-name';
          name.textContent = player.player_name;
          var meta = document.createElement('div');
          meta.className = 'leader-meta';
          meta.textContent = 'المستوى ' + player.level;
          identity.appendChild(name);
          identity.appendChild(meta);
          var score = document.createElement('div');
          score.className = 'leader-score';
          score.textContent = Number(player.score).toLocaleString('en-US');
          row.appendChild(rank);
          row.appendChild(identity);
          row.appendChild(score);
          leaderboardRows.appendChild(row);
        });
      })
      .catch(function (err) {
        console.warn('Leaderboard load failed:', err);
        leaderboardStatus.textContent = 'تعذّر تحميل النتائج. تأكد من إعداد قاعدة البيانات والاتصال بالإنترنت.';
      });
  }

  leaderboardBtn.addEventListener('click', showLeaderboard);
  leaderboardClose.addEventListener('click', function () {
    leaderboardModal.classList.add('hidden');
  });
  leaderboardModal.addEventListener('click', function (event) {
    if (event.target === leaderboardModal) leaderboardModal.classList.add('hidden');
  });
  window.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') leaderboardModal.classList.add('hidden');
  });

  /* ---------- الصوت والموسيقى (Web Audio API، بدون ملفات خارجية) ---------- */
  var audioCtx = null, muted = false, musicMuted = false;
  var sfxBus = null, musicBus = null, musicTimer = null, musicStep = 0;
  var musicDuckTimer = null, musicVolume = 0.19;
  try {
    muted = localStorage.getItem('galaxy_muted') === '1';
    musicMuted = localStorage.getItem('galaxy_music_off') === '1';
  } catch (e) {}
  muteBtn.textContent = muted ? '🔇' : '🔊';
  var musicBtn = document.getElementById('musicBtn');
  musicBtn.textContent = musicMuted ? '🎵̸' : '🎵';

  function ensureAudio() {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        sfxBus = audioCtx.createGain();
        sfxBus.gain.value = muted ? 0 : 0.78;
        sfxBus.connect(audioCtx.destination);
        musicBus = audioCtx.createGain();
        musicBus.gain.value = (musicMuted || muted) ? 0 : musicVolume;
        musicBus.connect(audioCtx.destination);
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) {}
  }

  function duckMusic() {
    if (!audioCtx || !musicBus || musicMuted || muted || !running) return;
    musicBus.gain.cancelScheduledValues(audioCtx.currentTime);
    musicBus.gain.setTargetAtTime(musicVolume * 0.42, audioCtx.currentTime, 0.018);
    if (musicDuckTimer) clearTimeout(musicDuckTimer);
    musicDuckTimer = setTimeout(function () {
      if (audioCtx && musicBus && !musicMuted && !muted && running) {
        musicBus.gain.setTargetAtTime(musicVolume, audioCtx.currentTime, 0.10);
      }
    }, 280);
  }

  function tone(f0, f1, dur, type, vol, delay) {
    if (muted || !audioCtx || !sfxBus) return;
    var t = audioCtx.currentTime + (delay || 0);
    var o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(25, f0), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(25, f1), t + dur);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.008, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, cutoff) {
    if (muted || !audioCtx || !sfxBus) return;
    var n = Math.max(1, Math.floor(audioCtx.sampleRate * dur));
    var buf = audioCtx.createBuffer(1, n, audioCtx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var s = audioCtx.createBufferSource(), g = audioCtx.createGain(), f = audioCtx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = cutoff || 1200;
    s.buffer = buf;
    g.gain.setValueAtTime(vol, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    s.connect(f); f.connect(g); g.connect(sfxBus);
    s.start(); s.stop(audioCtx.currentTime + dur + 0.02);
  }

  // E-minor-pentatonic chiptune: looping melody with a soft bass pulse.
  var melody = [330,392,440,392,330,294,247,294,
                330,392,494,440,392,330,294,247,
                220,247,294,330,392,330,294,247];
  var bass = [82.41,82.41,110,98,73.42,73.42,98,92.5];

  function musicNote(freq, dur, wave, vol, when) {
    if (!audioCtx || !musicBus || musicMuted || muted) return;
    var t = when == null ? audioCtx.currentTime : when;
    var o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.setValueAtTime(vol, t + dur * 0.68);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(musicBus);
    o.start(t); o.stop(t + dur + 0.015);
  }

  function musicTick() {
    if (!running || musicMuted || muted || !audioCtx) return;
    var step = musicStep % melody.length;
    var now = audioCtx.currentTime + 0.015;
    musicNote(melody[step], 0.135, 'square', 0.050, now);
    if (step % 2 === 0) musicNote(bass[Math.floor(step / 2) % bass.length], 0.20, 'triangle', 0.060, now);
    if (step % 4 === 0) musicNote(melody[step] * 2, 0.045, 'square', 0.012, now + 0.02);
    musicStep++;
  }

  function startMusic() {
    ensureAudio();
    if (musicMuted || muted || !audioCtx || musicTimer) return;
    musicStep = 0;
    musicTick();
    musicTimer = setInterval(musicTick, 165);
    if (musicBus) musicBus.gain.setTargetAtTime(musicVolume, audioCtx.currentTime, 0.08);
  }

  function stopMusic() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    if (musicBus && audioCtx) musicBus.gain.setTargetAtTime(0, audioCtx.currentTime, 0.035);
  }

  var sfx = {
    shoot: function () { tone(659, 247, 0.065, 'square', 0.018); },
    hit: function () { tone(392, 196, 0.055, 'triangle', 0.045); },
    boom: function (big, boss) {
      duckMusic();
      if (boss) {
        noise(0.48, 0.22, 850);
        tone(165, 36, 0.58, 'sawtooth', 0.16);
        tone(247, 55, 0.38, 'square', 0.075, 0.02);
        tone(82, 33, 0.48, 'triangle', 0.15, 0.08);
        tone(494, 123, 0.13, 'square', 0.035, 0.04);
        noise(0.18, 0.07, 430);
      } else if (big) {
        noise(0.23, 0.15, 1050);
        tone(196, 49, 0.30, 'sawtooth', 0.14);
        tone(294, 98, 0.12, 'square', 0.065, 0.015);
        tone(82, 41, 0.21, 'triangle', 0.10, 0.08);
      } else {
        noise(0.095, 0.13, 1900);
        tone(247, 82, 0.17, 'square', 0.14);
        tone(165, 55, 0.12, 'triangle', 0.075, 0.02);
      }
    },
    hurt: function () {
      duckMusic();
      noise(0.24, 0.20, 900);
      tone(220, 55, 0.28, 'square', 0.06);
    },
    start: function () {
      tone(330, 330, 0.09, 'square', 0.035, 0);
      tone(392, 392, 0.09, 'square', 0.035, 0.09);
      tone(494, 494, 0.15, 'square', 0.035, 0.18);
    },
    over: function () {
      stopMusic();
      tone(392, 196, 0.35, 'sawtooth', 0.06);
      tone(294, 82, 0.55, 'triangle', 0.06, 0.18);
    },
    level: function () {
      tone(392, 494, 0.10, 'square', 0.035);
      tone(494, 659, 0.12, 'square', 0.035, 0.10);
      tone(659, 784, 0.16, 'square', 0.035, 0.21);
    }
  };
      
