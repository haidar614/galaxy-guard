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

  function drawAlienVector(al) {          // احتياط بسيط إذا لم تُحمَّل صورة الوحش
    ctx.save(); ctx.translate(al.x, al.y);
    ctx.fillStyle = al.flash > 0 ? '#ffffff' : al.c;
    ctx.beginPath(); ctx.ellipse(0, 0, al.r, al.r * 0.85, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-al.r * 0.34, -al.r * 0.1, al.r * 0.26, 0, 6.283); ctx.arc(al.r * 0.34, -al.r * 0.1, al.r * 0.26, 0, 6.283); ctx.fill();
    ctx.restore();
  }

  // الطلقة العادية صفراء: نبدّل قناتي الأحمر والأزرق في نسخة من صورة الطلقة (مرة واحدة)
  var yellowBullet = null;
  function yellowBulletSprite() {
    if (yellowBullet) return yellowBullet;
    if (!imgReady(powerBulletImg)) return null;
    try {
      var c = document.createElement('canvas');
      c.width = powerBulletImg.naturalWidth; c.height = powerBulletImg.naturalHeight;
      var cx = c.getContext('2d');
      cx.drawImage(powerBulletImg, 0, 0);
      var im = cx.getImageData(0, 0, c.width, c.height), px = im.data;
      for (var i = 0; i < px.length; i += 4) { var t = px[i]; px[i] = px[i + 2]; px[i + 2] = t; }
      cx.putImageData(im, 0, 0);
      yellowBullet = c;
    } catch (e) { yellowBullet = null; }
    return yellowBullet;
  }

  // ألسنة اللهب (كنسب من الصورة): تُقصّ من الصورة ثم تُرسم متمددة وخافقة
  var FLAME_TOP = 0.775;
  var FLAME_BANDS = [[0.25, 0.405], [0.405, 0.595], [0.595, 0.75]];

  function drawShipSprite(img, x, y, sz) {
    var iw = img.naturalWidth, ih = img.naturalHeight, fy = FLAME_TOP, b;
    ctx.save();                                      // 1) الجسم بدون ألسنة اللهب
    ctx.beginPath();
    ctx.rect(x - sz, y - sz, sz * 3, sz * 3);
    for (b = 0; b < 3; b++) {
      ctx.rect(x + FLAME_BANDS[b][0] * sz, y + fy * sz, (FLAME_BANDS[b][1] - FLAME_BANDS[b][0]) * sz, sz * 0.5);
    }
    ctx.clip('evenodd');
    ctx.drawImage(img, x, y, sz, sz);
    ctx.restore();
    for (b = 0; b < 3; b++) {                        // 2) كل لسان يخفق بإيقاعه
      var b0 = FLAME_BANDS[b][0], b1 = FLAME_BANDS[b][1], ph = b * 2.1;
      var k = 1 + 0.16 * Math.sin(clock * 24 + ph) + 0.07 * Math.sin(clock * 41 + ph * 1.7);
      var w = 1 + 0.05 * Math.sin(clock * 31 + ph);
      var dw = (b1 - b0) * sz, dh = (1 - fy) * sz * k;
      ctx.globalAlpha = 0.9 + 0.1 * Math.sin(clock * 37 + ph);
      ctx.drawImage(img, b0 * iw, fy * ih, (b1 - b0) * iw, ih - fy * ih,
                    x + b0 * sz + (dw - dw * w) / 2, y + fy * sz, dw * w, dh);
    }
    ctx.globalAlpha = 1;
  }

  function drawShip() {
    var strong = ship.power > 0 && !(ship.power < 2 && Math.floor(clock * 10) % 2 === 0);   // يومض قبل انتهاء المفعول
    var own = strong && imgReady(powerShipImg);                 // هل توجد صورة للمركبة القوية؟
    var img = own ? powerShipImg : shipImg;
    if (!imgReady(img)) { drawShipVector(); return; }           // احتياط: الرسم القديم
    if (ship.inv > 0 && Math.floor(ship.inv * 12) % 2 === 0) return;
    var sz = (strong ? 70 : 60) * S;
    var x = ship.x - sz / 2, y = ship.y - sz * 0.55;
    ctx.save();
    if (strong && !own) {                                       // مؤقتًا: هالة ذهبية بدل صورة المركبة القوية
      ctx.shadowColor = '#ffd166';
      ctx.shadowBlur = 16 + 6 * Math.sin(clock * 8);
    }
    drawShipSprite(img, x, y, sz);
    if (ship.flash > 0) {                                       // وميض وحلقة عند الالتقاط
      var k = Math.min(1, ship.flash / 0.6);
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.8 * k;
      ctx.drawImage(img, x, y, sz, sz);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = k;
      ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3 * S;
      ctx.beginPath(); ctx.arc(ship.x, ship.y - 2 * S, (1 - k) * 70 * S + 20 * S, 0, 6.283); ctx.stroke();
    }
    ctx.restore();
  }

  function drawShipVector() {
    if (ship.inv > 0 && Math.floor(ship.inv * 12) % 2 === 0) return;
    var x = ship.x, y = ship.y, k = S;
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

  // ---------- رسم المكافآت والدرع ----------
  var POWER_COLORS = { shield: '#5ee7ff', multi: '#fff27a', heart: '#ff5c7a', power: '#ffd166' };

  function drawPowerIcon(kind, s) {        // أيقونات مرسومة بالكود حول (0,0)
    ctx.fillStyle = POWER_COLORS[kind];
    ctx.strokeStyle = POWER_COLORS[kind];
    if (kind === 'shield') {
      ctx.beginPath();
      ctx.moveTo(0, -8 * s); ctx.lineTo(7 * s, -5 * s); ctx.lineTo(6 * s, 3 * s);
      ctx.lineTo(0, 9 * s); ctx.lineTo(-6 * s, 3 * s); ctx.lineTo(-7 * s, -5 * s);
      ctx.closePath(); ctx.fill();
    } else if (kind === 'multi') {
      ctx.lineWidth = 2.4 * s; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-7 * s, 7 * s); ctx.lineTo(-9 * s, -3 * s);
      ctx.moveTo(0, 8 * s); ctx.lineTo(0, -8 * s);
      ctx.moveTo(7 * s, 7 * s); ctx.lineTo(9 * s, -3 * s);
      ctx.stroke();
    } else if (kind === 'power') {        // مركبة صغيرة = المركبة القوية
      ctx.beginPath();
      ctx.moveTo(0, -9 * s); ctx.lineTo(3 * s, -2 * s); ctx.lineTo(9 * s, 6 * s); ctx.lineTo(3.5 * s, 4 * s);
      ctx.lineTo(0, 8 * s); ctx.lineTo(-3.5 * s, 4 * s); ctx.lineTo(-9 * s, 6 * s); ctx.lineTo(-3 * s, -2 * s);
      ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, 8 * s);
      ctx.bezierCurveTo(-12 * s, -1 * s, -7 * s, -10 * s, 0, -4 * s);
      ctx.bezierCurveTo(7 * s, -10 * s, 12 * s, -1 * s, 0, 8 * s);
      ctx.fill();
    }
  }

  function drawDrops() {
    for (var i = 0; i < drops.length; i++) {
      var d = drops[i];
      var pulse = 1 + 0.1 * Math.sin(clock * 6 + d.ph);
      var c = POWER_COLORS[d.kind];
      ctx.save();
      ctx.translate(d.x + Math.sin(clock * 3 + d.ph) * 4 * S, d.y);
      ctx.shadowColor = c; ctx.shadowBlur = 14;
      ctx.fillStyle = 'rgba(10,11,36,.85)';
      ctx.strokeStyle = c; ctx.lineWidth = 2 * S;
      ctx.beginPath(); ctx.arc(0, 0, 12 * S * pulse, 0, 6.283); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
      drawPowerIcon(d.kind, S * 0.8);
      ctx.restore();
    }
  }

  function drawShield() {
    if (!(ship.shield > 0)) return;
    if (ship.shield < 2 && Math.floor(clock * 10) % 2 === 0) return;   // يومض قبل أن ينتهي
    var cx = ship.x, cy = ship.y - 2 * S, rr = 34 * S;
    ctx.save();
    ctx.shadowColor = '#5ee7ff'; ctx.shadowBlur = 12;
    ctx.fillStyle = 'rgba(94,231,255,.10)';
    ctx.strokeStyle = 'rgba(94,231,255,.75)'; ctx.lineWidth = 2 * S;
    ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 6.283); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.setLineDash([10 * S, 12 * S]); ctx.lineDashOffset = -clock * 50;
    ctx.strokeStyle = 'rgba(255,255,255,.6)';
    ctx.beginPath(); ctx.arc(cx, cy, rr - 4 * S, 0, 6.283); ctx.stroke();
    ctx.restore();
  }

  function drawPowerHUD() {              // مؤشرات الوقت المتبقي أسفل اليسار
    var items = [];
    if (ship.shield > 0) items.push(['shield', ship.shield / SHIELD_TIME]);
    if (ship.multi > 0) items.push(['multi', ship.multi / MULTI_TIME]);
    if (ship.power > 0) items.push(['power', ship.power / POWER_TIME]);
    for (var i = 0; i < items.length; i++) {
      var x = 22 * S, y = H - 20 * S - i * 28 * S;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = 'rgba(10,11,36,.7)';
      ctx.beginPath(); ctx.arc(0, 0, 12 * S, 0, 6.283); ctx.fill();
      drawPowerIcon(items[i][0], S * 0.75);
      ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(18 * S, -3 * S, 60 * S, 6 * S);
      ctx.fillStyle = POWER_COLORS[items[i][0]]; ctx.fillRect(18 * S, -3 * S, 60 * S * Math.max(0, items[i][1]), 6 * S);
      ctx.restore();
    }
  }

  function render(dt) {
    drawBackground(dt);
    ctx.fillStyle = '#fff27a';
    ctx.shadowColor = '#fff27a'; ctx.shadowBlur = 8;
    for (var i = 0; i < bullets.length; i++) {
      var bl = bullets[i];
      if (bl.dmg > 1) {                       // طلقات المركبة القوية: شكلها الأزرق المتوهج
        if (imgReady(powerBulletImg)) {
          ctx.save();
          ctx.shadowBlur = 0;
          ctx.translate(bl.x, bl.y);
          ctx.rotate(Math.atan2(bl.vx || 0, bl.v));      // تميل مع اتجاه الطلقة
          ctx.drawImage(powerBulletImg, -13 * S, -20.5 * S, 26 * S, 41 * S);
          ctx.restore();
        } else {
          ctx.fillStyle = '#ffb347'; ctx.shadowColor = '#ffb347';
          ctx.fillRect(bl.x - 3.5 * S, bl.y - 11 * S, 7 * S, 22 * S);
          ctx.fillStyle = '#fff27a'; ctx.shadowColor = '#fff27a';
        }
      } else if (imgReady(powerBulletImg)) {   // الطلقة العادية: نفس الشكل لكن أصغر وبلون أصفر
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.translate(bl.x, bl.y);
        ctx.rotate(Math.atan2(bl.vx || 0, bl.v));
        ctx.drawImage(yellowBulletSprite() || powerBulletImg, -8 * S, -12.7 * S, 16 * S, 25.4 * S);
        ctx.restore();
      } else ctx.fillRect(bl.x - 2 * S, bl.y - 8 * S, 4 * S, 14 * S);
    }
    ctx.shadowBlur = 0;
    for (var a = 0; a < aliens.length; a++) drawAlien(aliens[a]);
    for (var ei = 0; ei < ebullets.length; ei++) {
      var eb = ebullets[ei], ea = Math.atan2(eb.vy, eb.vx);
      ctx.save(); ctx.translate(eb.x, eb.y); ctx.rotate(ea);
      if (eb.b && bossBulletImg.complete && bossBulletImg.naturalWidth > 0) {   // صورة طلقة الزعيم تدور حول نفسها
        ctx.shadowBlur = 0; ctx.rotate(clock * 6);
        ctx.drawImage(bossBulletImg, -22 * S, -22 * S, 44 * S, 44 * S);
      } else if (eb.b) {                                   // «عين» صغيرة بألوان الزعيم: جسم نيلي وهالة بنفسجية وقزحية برتقالية بحدقة طولية
        ctx.shadowColor = '#d23bff'; ctx.shadowBlur = 16;
        ctx.fillStyle = 'rgba(196,59,255,0.35)';
        ctx.beginPath(); ctx.ellipse(-8 * S, 0, 16 * S, 6 * S, 0, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#2a1a9a'; ctx.strokeStyle = '#c43bff'; ctx.lineWidth = 2 * S;
        ctx.beginPath(); ctx.arc(0, 0, 8 * S, 0, 6.283); ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.arc(0, 0, 5 * S, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(0, 0, 2.7 * S, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#12002a'; ctx.beginPath(); ctx.ellipse(0, 0, 4 * S, 1.1 * S, 0, 0, 6.283); ctx.fill();
      } else if (monsterBulletImg.complete && monsterBulletImg.naturalWidth > 0) {   // كرة نار بذيل قصير لرصاص الوحوش
        ctx.shadowBlur = 0;
        ctx.drawImage(monsterBulletImg, -31 * S, -8.5 * S, 46 * S, 17 * S);
      } else {                                      // احتياطي: شهاب برتقالي مدبّب
        ctx.shadowColor = '#ff8a3d'; ctx.shadowBlur = 10;
        ctx.fillStyle = '#ff8a3d';
        ctx.beginPath(); ctx.moveTo(6 * S, 0); ctx.lineTo(-4 * S, -4.5 * S); ctx.lineTo(-14 * S, 0); ctx.lineTo(-4 * S, 4.5 * S); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(0, 0, 2.6 * S, 0, 6.283); ctx.fill();
      }
      ctx.restore();
    }
    ctx.shadowBlur = 0;
    drawDrops();
    if (running || lives > 0) drawShip();
    drawShield();
    for (var p = 0; p < parts.length; p++) {
      var q = parts[p]; ctx.globalAlpha = 1 - q.t / q.life; ctx.fillStyle = q.c;
      ctx.fillRect(q.x, q.y, 3 * S, 3 * S);
    }
    ctx.globalAlpha = 1;
    drawPowerHUD();
  }

  function loop(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (running && !paused) update(dt);
    render(paused ? 0 : dt);
    if (running) requestAnimationFrame(loop);
  }

  // تحكم حر: اللمس بسحب نسبي (الإصبع لا يغطي المركبة)، والماوس يتبع المؤشر
  var drag = null;
  function moveShipTo(x, y) {
    ship.target = Math.max(18 * S, Math.min(W - 18 * S, x));
    ship.ty = Math.max(H * 0.25, Math.min(H - 50 * S, y));
  }
  function pointerMove(e) {
    var r = cv.getBoundingClientRect();
    if (e.pointerType === 'mouse') { moveShipTo(e.clientX - r.left, e.clientY - r.top); return; }
    if (drag) moveShipTo(drag.sx + (e.clientX - drag.px) * 1.25, drag.sy + (e.clientY - drag.py) * 1.25);
  }
  cv.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse') drag = { px: e.clientX, py: e.clientY, sx: ship.target, sy: ship.ty };
    pointerMove(e);
  });
  cv.addEventListener('pointermove', pointerMove);
  cv.addEventListener('pointerup', function () { drag = null; });
  cv.addEventListener('pointercancel', function () { drag = null; });
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
