// الجزء 2: متغيرات اللعبة والمنطق
  /* ---------- اللعبة ---------- */
  var W = 0, H = 0, S = 1;
  var best = 0;
  try { best = parseInt(localStorage.getItem('galaxy_best') || '0', 10) || 0; } catch (e) {}
  bestEl.textContent = 'الأفضل: ' + best;

  var running = false, paused = false, quitArmed = false, score = 0, lives = 3, spawnT = 0, fireT = 0, last = 0, clock = 0;
  var level = 1;
  var aliens = [], bullets = [], parts = [], stars = [], ebullets = [];
  var ship = { x: 0, target: 0, inv: 0 };
  var keys = {};

  // ---------- صور المركبة والوحوش (ضعها في نفس مجلد index.html) ----------
  function loadImg(src) { var im = new Image(); im.src = src; return im; }
  function imgReady(im) { return im.complete && im.naturalWidth > 0; }
  var shipImg = loadImg('1000555847.png');                 // المركبة الزرقاء
  var alienImgs = {
    small: loadImg('1000555846.png'),                      // الأخضر
    zig:   loadImg('1000555848.png'),                      // البرتقالي
    big:   loadImg('1000555877.png'),                      // الأزرق (متوسط)
    boss:  loadImg('1000555851.png')                       // البنفسجي: زعيم المجرّة
  };

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    S = Math.max(0.6, Math.min(1.3, H / 640));
    if (!ship.x) { ship.x = ship.target = W / 2; }
    ship.x = Math.max(18 * S, Math.min(ship.x, W - 18 * S));
    ship.target = Math.max(18 * S, Math.min(ship.target, W - 18 * S));
  }
  window.addEventListener('resize', resize);

  for (var i = 0; i < 60; i++) stars.push({ x: Math.random(), y: Math.random(), z: 0.3 + Math.random() * 0.9 });

  function hearts() {
    var s = '';
    for (var i = 0; i < 3; i++) s += i < lives ? '♥' : '♡';
    livesEl.textContent = s;
  }

  function showLevelToast() {
    levelToast.textContent = 'LEVEL ' + level + '!';
    levelToast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      levelToast.classList.remove('show');
    }, 1300);
  }

  function checkLevel() {
    // كل 25 نقطة ينتقل اللاعب إلى مستوى جديد.
    var newLevel = Math.floor(score / 25) + 1;
    if (newLevel > level) {
      var previousLevel = level;
      level = newLevel;
      levelEl.textContent = 'LEVEL ' + level;
      showLevelToast();
      sfx.level();

      // زعيم خاص عند الوصول إلى المستوى 5 ثم 10 ثم 15...
      if (level % 5 === 0 && level > previousLevel) {
        spawnBoss();
      }
    }
  }

  // تزداد الصعوبة على شكل درجات كل خمسة مستويات.
  function difficultyTier() {
    return Math.floor((level - 1) / 5);
  }

  function spawnBoss() {
    var tier = difficultyTier();
    var rad = 50 * S;
    var hp = 20 + tier * 6;
    aliens.push({
      type: 'boss', r: rad, hp: hp, max: hp, c: '#bd75ff', pts: 25,
      x: W / 2, x0: W / 2, y: -rad - 8 * S,
      v: (38 + tier * 4) * S,
      ph: Math.random() * 6, flash: 0
    });
    // تنبيه بصري وصوتي عند ظهور الزعيم.
    levelToast.textContent = '⚠ زعيم المجرّة!';
    levelToast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      levelToast.classList.remove('show');
    }, 1800);
    tone(220, 660, 0.45, 'sawtooth', 0.07);
  }

  function reset() {
    score = 0; lives = 3; level = 1;
    aliens = []; bullets = []; parts = []; ebullets = [];
    spawnT = 0.5; fireT = 0; clock = 0;
    scoreEl.textContent = '0';
    levelEl.textContent = 'LEVEL 1';
    levelToast.classList.remove('show');
    hearts();
    ship.x = ship.target = W / 2; ship.inv = 0;
  }

  function start() {
    reset();
    overlay.classList.add('hidden');
    ensureAudio();
    running = true;
    paused = false;
    pauseModal.classList.add('hidden');
    pauseBtn.classList.remove('is-paused');
    pauseBtn.classList.add('on');
    sfx.start();
    if (!musicMuted && !muted) startMusic();
    last = performance.now();
    requestAnimationFrame(loop);
  }

  function end(withdrew) {
    running = false;
    paused = false;
    pauseModal.classList.add('hidden');
    pauseBtn.classList.remove('on');
    resetQuit();
    stopMusic();
    if (score > best) {
      best = score;
      try { localStorage.setItem('galaxy_best', String(best)); } catch (e) {}
      bestEl.textContent = 'الأفضل: ' + best;
      ovText.textContent = 'رقم قياسي جديد! حققت ' + score + ' نقطة ووصلت إلى المستوى ' + level + '.';
    } else {
      ovText.textContent = 'حققت ' + score + ' نقطة ووصلت إلى المستوى ' + level + '. أفضل نتيجة لك ' + best + '.';
    }
    ovTitle.textContent = withdrew === true ? 'انسحبت من المعركة' : 'سقطت المركبة';
    sfx.over();
    startBtn.textContent = 'قاتل من جديد';
    overlay.classList.remove('hidden');
    startBtn.focus();
    submitLeaderboardScore(score, level);
  }

  function burst(x, y, color, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.283, v = (40 + Math.random() * 160) * S;
      parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 0.4 + Math.random() * 0.4, c: color });
    }
  }

  function hurt() {
    lives--; hearts();
    ship.inv = 1.4;
    sfx.hurt();
    burst(ship.x, H - 50 * S, '#ff5c7a', 22);
    if (lives <= 0) end();
  }

  function spawn() {
    var r = Math.random();
    var type = r < 0.18 + Math.min(score, 150) * 0.001 ? 'big' : (r < 0.55 ? 'zig' : 'small');
    var tier = difficultyTier();
    var d = {
      small: { r: 20, hp: 1, v: 85, c: '#7cfc9a', pts: 1 },
      zig:   { r: 19, hp: 1, v: 105, c: '#ff7ad9', pts: 2 },
      big:   { r: 28, hp: 4 + tier * 2, v: 55, c: '#ffb347', pts: 5 }
    }[type];
    var rad = d.r * S;
    var difficultySpeed = Math.min(2.2, Math.pow(1.15, tier));
    aliens.push({
      type: type, r: rad, hp: d.hp, max: d.hp, c: d.c, pts: d.pts,
      x: rad + Math.random() * Math.max(0, W - rad * 2), x0: 0, y: -rad,
      v: d.v * S * difficultySpeed,
      ph: Math.random() * 6, flash: 0
    });
    aliens[aliens.length - 1].x0 = aliens[aliens.length - 1].x;
  }

  function fire() {
    sfx.shoot();
    var fireLevel = Math.min(2, Math.floor(score / 30));
    var offs = fireLevel === 0 ? [0] : fireLevel === 1 ? [-9, 9] : [-14, 0, 14];
    for (var i = 0; i < offs.length; i++) {
      bullets.push({ x: ship.x + offs[i] * S, y: H - 66 * S, v: 560 * S });
    }
  }

  function update(dt) {
    clock += dt;
    var sp = 560 * S * dt;
    if (keys.ArrowLeft) ship.target -= sp;
    if (keys.ArrowRight) ship.target += sp;
    ship.target = Math.max(18 * S, Math.min(W - 18 * S, ship.target));
    ship.x += (ship.target - ship.x) * Math.min(1, dt * 18);
    if (ship.inv > 0) ship.inv -= dt;

    fireT -= dt;
    if (fireT <= 0) { fire(); fireT = 0.2; }

    spawnT -= dt;
    if (spawnT <= 0) {
      spawn();
      // كل خمسة مستويات تصبح موجات الأعداء أسرع وأكثر كثافة.
      var tier = difficultyTier();
      spawnT = Math.max(0.32, Math.pow(0.90, tier));
    }

    for (var i = bullets.length - 1; i >= 0; i--) {
      bullets[i].y -= bullets[i].v * dt;
      if (bullets[i].y < -10) bullets.splice(i, 1);
    }

    var shipY = H - 50 * S;
    for (var a = aliens.length - 1; a >= 0; a--) {
      var al = aliens[a];
      al.y += al.v * dt;
      if (al.type === 'zig') {
        // البرتقالي الرشيق: يتفادى الطلقات القادمة نحوه
        if (al.dodgeCool > 0) al.dodgeCool -= dt;
        if (al.dodgeT > 0) al.dodgeT -= dt;
        if (al.tx === undefined) al.tx = al.x0;
        if (!(al.dodgeCool > 0)) {
          for (var db = 0; db < bullets.length; db++) {
            var bdx = bullets[db].x - al.x, bdy = bullets[db].y - al.y;
            if (bdy > 0 && bdy < 170 * S && Math.abs(bdx) < al.r * 1.05) {
              var dir = bdx > 0 ? -1 : (bdx < 0 ? 1 : (Math.random() < 0.5 ? -1 : 1));
              var lo = al.r + 34 * S, hi = W - al.r - 34 * S;
              var nt = al.tx + dir * 58 * S;
              if (nt < lo || nt > hi) { dir = -dir; nt = al.tx + dir * 58 * S; }
              al.tx = Math.max(lo, Math.min(hi, nt));
              al.dodgeDir = dir; al.dodgeT = 0.35; al.dodgeCool = 1.1;
              break;
            }
          }
        }
        al.x0 += (al.tx - al.x0) * Math.min(1, dt * 9);
        al.x = al.x0 + Math.sin(clock * 3 + al.ph) * 34 * S;
      }
      if (al.flash > 0) al.flash -= dt;

      // الزعيم يطلق كرات نارية نحو المركبة
      if (al.type === 'boss') {
        al.shootT = (al.shootT === undefined ? 1.5 : al.shootT) - dt;
        if (al.shootT <= 0 && al.y > 0) {
          al.shootT = Math.max(0.7, 1.6 - difficultyTier() * 0.15);
          var ang = Math.atan2(shipY - al.y, ship.x - al.x);
          ebullets.push({ x: al.x, y: al.y + al.r, vx: Math.cos(ang) * 190 * S, vy: Math.sin(ang) * 190 * S });
          tone(300, 120, 0.1, 'sawtooth', 0.04);
        }
      }

      // اصطدام الطلقات بالأعداء
      for (var b = bullets.length - 1; b >= 0; b--) {
        var dx = bullets[b].x - al.x, dy = bullets[b].y - al.y;
        if (dx * dx + dy * dy < (al.r + 4 * S) * (al.r + 4 * S)) {
          bullets.splice(b, 1); al.hp--; al.flash = 0.08; sfx.hit();
          burst(al.x, al.y, al.c, 3);
        }
      }
      if (al.hp <= 0) {
        score += al.pts;
        scoreEl.textContent = score;
        checkLevel();
        sfx.boom(al.type === 'big' || al.type === 'boss', al.type === 'boss');
        burst(al.x, al.y, al.c, 16);
        aliens.splice(a, 1); continue;
      }
      // اصطدام العدو بالمركبة
      var sx = al.x - ship.x, sy = al.y - shipY;
      if (ship.inv <= 0 && sx * sx + sy * sy < (al.r + 16 * S) * (al.r + 16 * S)) {
        burst(al.x, al.y, al.c, 14); aliens.splice(a, 1); hurt();
        if (!running) return; continue;
      }
      // إذا تجاوز العدو المركبة
      if (al.y - al.r > H) {
        aliens.splice(a, 1); hurt();
        if (!running) return;
      }
    }

    for (var ei = ebullets.length - 1; ei >= 0; ei--) {
      var eb = ebullets[ei];
      eb.x += eb.vx * dt; eb.y += eb.vy * dt;
      var ex = eb.x - ship.x, ey = eb.y - shipY;
      if (ship.inv <= 0 && ex * ex + ey * ey < (22 * S) * (22 * S)) {
        ebullets.splice(ei, 1); hurt();
        if (!running) return;
        continue;
      }
      if (eb.y > H + 20 || eb.x < -20 || eb.x > W + 20) ebullets.splice(ei, 1);
    }

    for (var p = parts.length - 1; p >= 0; p--) {
      var q = parts[p]; q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.t > q.life) parts.splice(p, 1);
    }
}
      
