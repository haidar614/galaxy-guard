// الجزء 3: الرسم والتحكم والبدء
  function drawBackground(dt) {
    ctx.fillStyle = '#0a0b24'; ctx.fillRect(0, 0, W, H);
    var g = ctx.createRadialGradient(W * 0.7, H * 0.25, 10, W * 0.7, H * 0.25, H * 0.7);
    g.addColorStop(0, 'rgba(94,70,200,.28)'); g.addColorStop(1, 'rgba(94,70,200,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e8ecff';
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.y += s.z * 0.06 * dt * (running ? 1.6 : 0.6);
      if (s.y > 1.02) { s.y = -0.02; s.x = Math.random(); }
      ctx.globalAlpha = 0.25 + s.z * 0.5;
      ctx.fillRect(s.x * W, s.y * H, s.z * 2 * S, s.z * 2 * S);
    }
    ctx.globalAlpha = 1;
  }

  // رسم الصورة على شرائح أفقية: الجسم ثابت والأطراف السفلية تتمايل كموجة
  function drawWavy(img, sz, t, amp, speed, start) {
    var strips = 32, sh = img.naturalHeight / strips, dh = sz / strips;
    for (var i = 0; i < strips; i++) {
      var f = (i / strips - start) / (1 - start);    // 0 عند الجسم، 1 عند أطراف الأرجل
      f = f < 0 ? 0 : f;
      var off = Math.sin(t * speed - i * 0.45) * amp * f * f;
      ctx.drawImage(img, 0, i * sh, img.naturalWidth, sh + 0.5,
                    -sz / 2 + off, -sz / 2 + i * dh, sz, dh + 0.6);
    }
  }

  function drawAlien(al) {
    var img = alienImgs[al.type];
    if (!imgReady(img)) { drawAlienVector(al); return; }   // احتياط: الرسم القديم
    var r = al.r, sz = r * 3.2;
    var t = clock + al.ph;
    if (al.born === undefined) al.born = clock;
    var age = clock - al.born;
    var dk = 0;                                             // شدة التفادي (للبرتقالي)

    // ---- حركة حيّة لكل نوع ----
    var sx, sy, rot, bob;
    if (al.type === 'zig') {            // البرتقالي: يلتفت نحو مركبتك ويتفادى الطلقات
      dk = al.dodgeT > 0 ? al.dodgeT / 0.35 : 0;
      var look = Math.max(-1, Math.min(1, (ship.x - al.x) / (W * 0.45)));
      sx = 1 + 0.12 * Math.sin(t * 14) + 0.15 * dk;
      sy = 1 - 0.06 * Math.sin(t * 14) - 0.08 * dk;
      rot = 0.28 * Math.cos(clock * 3 + al.ph) + 0.3 * look + (al.dodgeDir || 0) * 0.55 * dk;
      bob = 2 * S * Math.sin(t * 9);
    } else if (al.type === 'boss') {    // الزعيم: تنفّس بطيء وثقيل
      sx = 1 + 0.045 * Math.sin(t * 2.6);
      sy = 1 - 0.045 * Math.sin(t * 2.6);
      rot = 0.05 * Math.sin(t * 1.4);
      bob = 4 * S * Math.sin(t * 2);
    } else if (al.type === 'big') {     // الأزرق المتوسط: ثقيل وهادئ (الأطراف تتحرك بالشرائح)
      sx = 1 + 0.04 * Math.sin(t * 4);
      sy = 1 - 0.04 * Math.sin(t * 4);
      rot = 0.06 * Math.sin(t * 2.2);
      bob = 3 * S * Math.sin(t * 3.5);
    } else {                            // الأخضر: نبض خفيف وطفو (الأطراف تتحرك بالشرائح)
      sx = 1 + 0.05 * Math.sin(t * 6);
      sy = 1 - 0.05 * Math.sin(t * 6);
      rot = 0.08 * Math.sin(t * 3);
      bob = 3 * S * Math.sin(t * 5);
    }
    // ظهور مفاجئ (بوب) في أول 0.35 ثانية
    if (age < 0.35) {
      var k = age / 0.35;
      var pop = 0.5 + 0.5 * (1 - Math.pow(1 - k, 3));
      sx *= pop; sy *= pop;
    }
    // ارتداد واهتزاز عند الإصابة
    var shakeX = 0;
    if (al.flash > 0) { sx *= 1.12; sy *= 0.9; shakeX = (Math.random() - 0.5) * 4 * S; }

    // ظلال متأخرة خلف البرتقالي أثناء التفادي
    if (dk > 0) {
      for (var gI = 1; gI <= 2; gI++) {
        ctx.save();
        ctx.globalAlpha = 0.3 * dk / gI;
        ctx.translate(al.x - (al.dodgeDir || 0) * gI * 16 * S * dk, al.y + bob);
        ctx.rotate(rot); ctx.scale(sx, sy);
        ctx.drawImage(img, -sz / 2, -sz / 2, sz, sz);
        ctx.restore();
      }
    }

    function paint() {
      if (al.type === 'small') drawWavy(img, sz, t, sz * 0.1, 5.5, 0.46);       // الأخضر: أطراف تتمايل
      else if (al.type === 'big') drawWavy(img, sz, t, sz * 0.055, 4, 0.5);     // الأزرق: مخالب تتحرك بهدوء
      else ctx.drawImage(img, -sz / 2, -sz / 2, sz, sz);
    }

    ctx.save();
    ctx.translate(al.x + shakeX, al.y + bob);
    ctx.rotate(rot);
    ctx.scale(sx, sy);
    if (al.type === 'boss') {           // هالة بنفسجية نابضة حول الزعيم
      ctx.shadowColor = 'rgba(189,117,255,.9)';
      ctx.shadowBlur = 16 + 8 * Math.sin(t * 3);
    }
    paint();
    if (al.flash > 0) {                 // وميض ساطع على شكل الوحش فقط
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.6;
      paint();
    }
    ctx.restore();

    if ((al.type === 'big' || al.type === 'boss') && al.hp < al.max) {
      var barW = al.type === 'boss' ? r * 2.4 : r * 2;
      var barX = al.x - barW / 2;
      var barY = al.y - sz / 2 - 6 * S;
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(barX, barY, barW, 4 * S);
      ctx.fillStyle = al.type === 'boss' ? '#bd75ff' : '#ffb347';
      ctx.fillRect(barX, barY, barW * (al.hp / al.max), 4 * S);
    }
  }

  function drawAlienVector(al) {
    ctx.save(); ctx.translate(al.x, al.y);
    var r = al.r, wob = Math.sin(clock * 8 + al.ph) * 0.12;
    ctx.fillStyle = al.flash > 0 ? '#ffffff' : al.c;
    // الأرجل
    ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 3 * S; ctx.lineCap = 'round';
    for (var i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(i * r * 0.38, r * 0.3);
      ctx.quadraticCurveTo(i * r * 0.5 + wob * r * 3, r * 0.9, i * r * 0.45 - wob * r * 2, r * 1.25); ctx.stroke();
    }
    // الجسم
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * (0.85 + wob * 0.3), 0, 0, 6.283); ctx.fill();
    if (al.type === 'big') {
      ctx.fillStyle = 'rgba(0,0,0,.2)';
      ctx.beginPath(); ctx.arc(-r * 0.5, -r * 0.1, r * 0.18, 0, 6.283); ctx.arc(r * 0.45, r * 0.3, r * 0.22, 0, 6.283); ctx.fill();
    }
    if (al.type === 'boss') {
      // هالة وحواف مميزة لزعيم المجرّة.
      ctx.strokeStyle = al.flash > 0 ? '#ffffff' : '#f2c7ff';
      ctx.lineWidth = 3 * S;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.22, r * 1.08, clock * 0.35, 0, 6.283); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.55, -r * 0.62);
      ctx.lineTo(-r * 0.42, -r * 1.18);
      ctx.lineTo(-r * 0.12, -r * 0.72);
      ctx.lineTo(0, -r * 1.3);
      ctx.lineTo(r * 0.18, -r * 0.72);
      ctx.lineTo(r * 0.48, -r * 1.15);
      ctx.lineTo(r * 0.58, -r * 0.58);
      ctx.stroke();
    }
    if (al.type === 'zig') {
      ctx.strokeStyle = al.flash > 0 ? '#fff' : al.c; ctx.lineWidth = 2.5 * S;
      ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.7); ctx.lineTo(-r * 0.7, -r * 1.3);
      ctx.moveTo(r * 0.4, -r * 0.7); ctx.lineTo(r * 0.7, -r * 1.3); ctx.stroke();
    }
    // العيون
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-r * 0.34, -r * 0.1, r * 0.26, 0, 6.283); ctx.arc(r * 0.34, -r * 0.1, r * 0.26, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#1a0f2e';
    var look = (ship.x - al.x) / W * r * 0.12;
    ctx.beginPath(); ctx.arc(-r * 0.34 + look, -r * 0.04, r * 0.12, 0, 6.283); ctx.arc(r * 0.34 + look, -r * 0.04, r * 0.12, 0, 6.283); ctx.fill();
    ctx.restore();
    // شريط صحة العدو الكبير
    if ((al.type === 'big' || al.type === 'boss') && al.hp < al.max) {
      var barW = al.type === 'boss' ? r * 2.4 : r * 2;
      var barX = al.x - barW / 2;
      var barY = al.y - r - (al.type === 'boss' ? 16 : 10) * S;
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(barX, barY, barW, 4 * S);
      ctx.fillStyle = al.type === 'boss' ? '#bd75ff' : '#ffb347';
      ctx.fillRect(barX, barY, barW * (al.hp / al.max), 4 * S);
    }
  }

  function drawShip() {
    if (!imgReady(shipImg)) { drawShipVector(); return; }  // احتياط: الرسم القديم
    if (ship.inv > 0 && Math.floor(ship.inv * 12) % 2 === 0) return;
    var sz = 60 * S;
    ctx.drawImage(shipImg, ship.x - sz / 2, H - 50 * S - sz * 0.55, sz, sz);
  }

  function drawShipVector() {
    if (ship.inv > 0 && Math.floor(ship.inv * 12) % 2 === 0) return;
    var x = ship.x, y = H - 50 * S, k = S;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    // اللهب
    var fl = 10 + Math.random() * 8;
    ctx.fillStyle = '#ff9d3c';
    ctx.beginPath(); ctx.moveTo(-6, 14); ctx.lineTo(0, 14 + fl); ctx.lineTo(6, 14); ctx.closePath(); ctx.fill();
    // الأجنحة
    ctx.fillStyle = '#3aa8c4';
    ctx.beginPath(); ctx.moveTo(-8, -2); ctx.lineTo(-24, 18); ctx.lineTo(-8, 14); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, -2); ctx.lineTo(24, 18); ctx.lineTo(8, 14); ctx.closePath(); ctx.fill();
    // جسم المركبة
    ctx.fillStyle = '#5ee7ff';
    ctx.beginPath(); ctx.moveTo(0, -24); ctx.quadraticCurveTo(12, -4, 9, 16); ctx.lineTo(-9, 16); ctx.quadraticCurveTo(-12, -4, 0, -24); ctx.fill();
    // قمرة القيادة
    ctx.fillStyle = '#12254d';
    ctx.beginPath(); ctx.ellipse(0, -4, 4, 7, 0, 0, 6.283); ctx.fill();
    ctx.restore();
  }

  function render(dt) {
    drawBackground(dt);
    ctx.fillStyle = '#fff27a';
    ctx.shadowColor = '#fff27a'; ctx.shadowBlur = 8;
    for (var i = 0; i < bullets.length; i++) ctx.fillRect(bullets[i].x - 2 * S, bullets[i].y - 8 * S, 4 * S, 14 * S);
    ctx.shadowBlur = 0;
    for (var a = 0; a < aliens.length; a++) drawAlien(aliens[a]);
    ctx.fillStyle = '#ff5c7a';
    ctx.shadowColor = '#ff5c7a'; ctx.shadowBlur = 10;
    for (var ei = 0; ei < ebullets.length; ei++) {
      ctx.beginPath(); ctx.arc(ebullets[ei].x, ebullets[ei].y, 6 * S, 0, 6.283); ctx.fill();
    }
    ctx.shadowBlur = 0;
    if (running || lives > 0) drawShip();
    for (var p = 0; p < parts.length; p++) {
      var q = parts[p]; ctx.globalAlpha = 1 - q.t / q.life; ctx.fillStyle = q.c;
      ctx.fillRect(q.x, q.y, 3 * S, 3 * S);
    }
    ctx.globalAlpha = 1;
  }

  function loop(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (running && !paused) update(dt);
    render(paused ? 0 : dt);
    if (running) requestAnimationFrame(loop);
  }

  function pointerX(e) {
    var r = cv.getBoundingClientRect();
    ship.target = Math.max(18 * S, Math.min(W - 18 * S, e.clientX - r.left));
  }
  cv.addEventListener('pointerdown', pointerX);
  cv.addEventListener('pointermove', pointerX);
  window.addEventListener('keydown', function (e) { keys[e.key] = true; });
  window.addEventListener('keyup', function (e) { keys[e.key] = false; });
  var pauseBtn = document.getElementById('pauseBtn');
  var pauseModal = document.getElementById('pauseModal');
  var resumeBtn = document.getElementById('resumeBtn');
  var quitBtn = document.getElementById('quitBtn');
  var guestMode = false;

  function resetQuit() {
    quitArmed = false;
    quitBtn.textContent = 'انسحاب';
  }

  function setPaused(p) {
    if (!running || paused === p) return;
    paused = p;
    pauseModal.classList.toggle('hidden', !p);
    pauseBtn.classList.toggle('is-paused', p);
    resetQuit();
    if (p) {
      stopMusic();
    } else {
      last = performance.now();
      if (!musicMuted && !muted) startMusic();
    }
  }

  // الاسم يُطلب قبل أول جولة، ثم يُحفظ في الجهاز
  function beginGame() {
    if (getPlayerName() || guestMode) { start(); return; }
    choosePlayerName('حفظ والبدء', 'العب كضيف').then(function (name) {
      if (!name) guestMode = true;
      start();
    });
  }

  startBtn.addEventListener('click', beginGame);
  changeNameBtn.addEventListener('click', function () {
    choosePlayerName('حفظ', 'إلغاء').then(function (name) {
      if (name) guestMode = false;
    });
  });
  pauseBtn.addEventListener('click', function () { setPaused(!paused); });
  resumeBtn.addEventListener('click', function () { setPaused(false); });
  quitBtn.addEventListener('click', function () {
    if (!quitArmed) {
      quitArmed = true;
      quitBtn.textContent = 'تأكيد الانسحاب؟';
      return;
    }
    end(true);
  });
  window.addEventListener('keydown', function (e) {
    if (!running) return;
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') setPaused(!paused);
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && running && !paused) setPaused(true);
  });
  muteBtn.addEventListener('click', function () {
    muted = !muted;
    muteBtn.textContent = muted ? '🔇' : '🔊';
    try { localStorage.setItem('galaxy_muted', muted ? '1' : '0'); } catch (e) {}
    ensureAudio();
    if (sfxBus && audioCtx) sfxBus.gain.setTargetAtTime(muted ? 0 : 0.78, audioCtx.currentTime, 0.025);
    if (muted) {
      stopMusic();
      if (musicBus && audioCtx) musicBus.gain.setTargetAtTime(0, audioCtx.currentTime, 0.025);
    } else {
      if (musicBus && audioCtx && !musicMuted && running && !paused) startMusic();
      if (musicBus && audioCtx && !musicMuted) musicBus.gain.setTargetAtTime(musicVolume, audioCtx.currentTime, 0.08);
      sfx.hit();
    }
  });
  musicBtn.addEventListener('click', function () {
    musicMuted = !musicMuted;
    musicBtn.textContent = musicMuted ? '🎵̸' : '🎵';
    try { localStorage.setItem('galaxy_music_off', musicMuted ? '1' : '0'); } catch (e) {}
    ensureAudio();
    if (musicMuted) {
      stopMusic();
    } else if (!muted && running && !paused) {
      startMusic();
    }
  });

  resize(); hearts();
  last = performance.now(); render(0.016);
        
