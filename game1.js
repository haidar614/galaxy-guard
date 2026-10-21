// الجزء 2: متغيرات اللعبة والمنطق
  /* ---------- اللعبة ---------- */
  var W = 0, H = 0, S = 1;
  var best = 0;
  // المستوى المقابل لعدد من النقاط (نفس معادلة المستويات في اللعبة) — لعرضه بالشاشة الرئيسية
  function levelForScore(sc) { var lv = 1, acc = 0, need = 25; while (sc >= acc + need) { acc += need; lv++; need = 25 + 2 * (lv - 1); } return lv; }
  function syncHome() {
    var b = document.getElementById('homeBest'), l = document.getElementById('homeLevel');
    if (b) b.textContent = best;
    if (l) l.textContent = levelForScore(best);
  }
  try {
    if (localStorage.getItem('galaxy_score_v') !== '2') {   // تغيّر نظام النقاط: تصفير الأفضل عند كل المستخدمين مرة واحدة (غيّر الرقم لتصفير جديد)
      localStorage.removeItem('galaxy_best');
      localStorage.setItem('galaxy_score_v', '2');
    }
    best = parseInt(localStorage.getItem('galaxy_best') || '0', 10) || 0;
  } catch (e) {}
  bestEl.textContent = 'الأفضل: ' + best; syncHome();

  var running = false, paused = false, quitArmed = false, score = 0, lives = 3, spawnT = 0, fireT = 0, last = 0, clock = 0;
  var level = 1;
  var aliens = [], bullets = [], parts = [], stars = [], ebullets = [], drops = [];
  var SHIELD_TIME = 8, MULTI_TIME = 10, POWER_TIME = 12;   // مدة الدرع والطلقات الإضافية والمركبة القوية بالثواني
  var ship = { x: 0, target: 0, y: 0, ty: 0, inv: 0, power: 0, flash: 0 };   // power: وقت المركبة القوية المتبقي
  var keys = {};
  var swarmT = 6;   // مؤقّت ظهور الأسراب

  // ---------- صور المركبة والوحوش (ضعها في نفس مجلد index.html) ----------
  function loadImg(src) { var im = new Image(); im.src = src; return im; }
  function imgReady(im) { return !!im && im.complete && im.naturalWidth > 0; }
  var monsterBulletImg = loadImg('monster-bullet.png');    // رصاص الوحوش
  var bossBulletImg = loadImg('boss-bullet.png');          // طلقة الزعيم
  var shipImg = loadImg('1000555847.png');                 // المركبة الأساسية
  // الصور الخاصة بالمركبات الجديدة (ملفات PNG في جذر المستودع)
  var shipImages = {
    hunter: loadImg('1000556917.png'),      // المطارد
    spread: loadImg('1000556918.png'),      // المشتّت
    destroyer: loadImg('1000556916.png')    // المدمّر
  };
  // صور أسلحة المركبات الجديدة
  var weaponImages = {
    laser: loadImg('1000556913.png'),       // سلاح المطارد
    fan: loadImg('1000556915.png'),         // سلاح المشتّت
    pierce: loadImg('1000556914.png')       // سلاح المدمّر
  };

  // ---------- المركبات: لكل مركبة تقييم من 1 إلى 5 لقوة النيران والسرعة والدرع ----------
  var SHIPS = [      // لكل مركبة سلاح مميّز؛ القلوب والسرعة والدرع واحدة لكل المركبات
    { id: 'guard',     weapon_id: 'balanced', name: 'حارس المجرّة', hue: 0,   fire: 0.20, weapon: 'رصاص متوازن',
      desc: 'عدد الرصاصات يزيد من 1 إلى 3 كلما زادت نقاطك.', plus: 'سلاح متوازن ومناسب لكل الحالات.', minus: 'ما فيه ميزة خاصة.' },
    { id: 'hunter',    weapon_id: 'laser',    name: 'المطارد',      image: '1000556917.png', hue: 160, fire: 0.10, weapon: 'ليزر سريع',
      desc: 'شعاع رفيع بخط واحد، أسرع إطلاق وأسرع رصاصة.', plus: 'سرعة إطلاق عالية وتصويب دقيق.', minus: 'خط واحد فقط، فبيصعب مع الأسراب العريضة.' },
    { id: 'spread',    weapon_id: 'fan',      name: 'المشتّت',      image: '1000556918.png', hue: 80,  fire: 0.34, weapon: 'مروحة رصاصات',
      desc: 'خمس رصاصات بتنتشر بشكل مروحة.', plus: 'بتغطي مساحة واسعة وبتضرب أكتر من وحش.', minus: 'الرصاص موزّع، وإطلاقها أبطأ.' },
    { id: 'destroyer', weapon_id: 'pierce',   name: 'المدمّر',      image: '1000556916.png', hue: 270, fire: 0.50, weapon: 'رصاصة خارقة',
      desc: 'رصاصة قوية بتخترق الوحوش وبتضرب اللي وراها (لحد ثلاثة).', plus: 'ممتازة ضد الأسراب والوحوش المصطفة.', minus: 'رصاصة وحدة وإطلاقها بطيء، والزعيم بيوقفها.' },
    { id: 'falcon',    weapon_id: 'homing',   name: 'الصقر',        hue: 200, fire: 0.38, weapon: 'صواريخ موجّهة',
      desc: 'صاروخان بيلاحقوا أقرب وحش أمامهم.', plus: 'ما بتخطئ الهدف حتى لو تحرّك.', minus: 'بطيئة نسبيًا وضررها عادي.' },
    { id: 'tank',      weapon_id: 'heavy',    name: 'الدرع الثقيل', hue: 120, fire: 0.50, weapon: 'رصاصتان ثقيلتان',
      desc: 'رصاصتان بضرر مضاعف، وكل وحدة بتصدّ رصاصتين من رصاص الأعداء.', plus: 'بتقتل الوحوش الكبيرة بسرعة وبتحميك من الرصاص.', minus: 'إطلاقها بطيء.' }
  ];
  var maxLives = 3;
  var FIRE_STEPS = [0, 100, 250, 500, 800];   // نقاط الوصول لرصاصة، 2، 3، 4، 5 رصاصات للمركبة العادية (كبّر الأرقام لتصعّب)
  var PRICES = { guard: 0, hunter: 500, spread: 1000, destroyer: 3500, falcon: 2500, tank: 1600 };   // بالعملات — لازم تطابق جدول galaxy_ships بالخادم
  SHIPS.forEach(function (s) { s.price = PRICES[s.id]; });
  var shipId = 'guard', skins = {};
  // الرصيد والمركبات المملوكة محفوظان على الخادم (Supabase) فقط؛ محليًا نحفظ اسم المركبة المختارة
  var savedShip = 'guard', owned = ['guard'], wallet = 0, runCoins = 0, cfloats = [], runToken = null, runSeq = 0, pendingClaims = [];
  try { var svd = localStorage.getItem('galaxy_ship'); if (svd) savedShip = svd; } catch (e) {}
  function saveShop() { savedShip = shipId; try { localStorage.setItem('galaxy_ship', shipId); } catch (e) {} }
  function galaxyRpc(name, body) { return supabaseRequest('rpc/' + name, { method: 'POST', body: JSON.stringify(body) }); }
    function setWallet(r) {
    wallet = r.coins; owned = r.ships || ['guard'];
    var cb = document.getElementById('coinBarVal'); if (cb) cb.textContent = wallet;   // ← الجديد
    shipId = owned.indexOf(savedShip) >= 0 ? savedShip : 'guard';
    applyShip();
    }
  function refreshWallet() {
    if (!leaderboardReady) return Promise.resolve();
    return galaxyRpc('galaxy_get_wallet', { p_player_id: getPlayerId() }).then(setWallet).catch(function (e) { console.warn('wallet load failed', e); });
  }
  function startRunToken() {                                   // رمز الجولة: يسجّل الخادم وقت بدايتها
    var seq = ++runSeq; runToken = null;
    if (!leaderboardReady) return;
    galaxyRpc('galaxy_start_run', { p_player_id: getPlayerId() })
      .then(function (t) { if (seq === runSeq && typeof t === 'string') runToken = t; })
      .catch(function (e) { console.warn('start run failed', e); });
  }
  function flushClaims() {                                     // إرسال عملات الجولات المنتهية (وإعادة المحاولة عند فشل الاتصال)
    if (!pendingClaims.length || !leaderboardReady) return Promise.resolve();
    var pc = pendingClaims[0];
    return galaxyRpc('galaxy_claim_coins', { p_player_id: getPlayerId(), p_token: pc.token, p_score: pc.score, p_coins: pc.coins })
      .then(function (r) { pendingClaims.shift(); setWallet(r); return flushClaims(); })
      .catch(function (e) { console.warn('claim failed', e); });
  }
  function claimRun() {
    if (runCoins && runToken) pendingClaims.push({ token: runToken, score: Math.floor(score), coins: runCoins });
    runCoins = 0; runToken = null;
    flushClaims();
  }
  function awardCoins(al) {                                    // تُضاف العملات تلقائيًا عند إسقاط الوحش
    var n = al.type === 'boss' ? 14 : al.type === 'big' ? 3 : (Math.random() < (al.type === 'zig' ? 0.45 : 0.3) ? 1 : 0);
    if (!n) return;
    runCoins += n;
    cfloats.push({ x: al.x, y: al.y, n: n, t: 0 });
    tone(988, 1480, 0.07, 'sine', 0.04);
  }
  function curShip() { for (var i = 0; i < SHIPS.length; i++) if (SHIPS[i].id === shipId) return SHIPS[i]; return SHIPS[0]; }
  function applyShip() {
    var st = curShip();
    ship.st = st; ship.fireInt = st.fire; ship.stepMul = 1; ship.invT = 1.4; ship.shieldMul = 1;
    var hs = document.getElementById('heroShip');                 // صورة الشاشة الرئيسية تتبع المركبة المختارة
    if (hs) {
      hs.src = st.image || '1000555847.png';
      hs.style.filter = (st.image ? '' : 'hue-rotate(' + st.hue + 'deg) ') +
        'drop-shadow(0 6px 14px rgba(40, 140, 255, .6))';
    }
  }
  // تلوين مؤقت لصورة المركبة حتى تجهّز صورًا خاصة بكل مركبة
  function hueCanvas(src, deg) {
    var w = src.naturalWidth, h = src.naturalHeight, c = document.createElement('canvas');
    c.width = w; c.height = h; c.naturalWidth = w; c.naturalHeight = h; c.complete = true;
    var x = c.getContext('2d'); x.drawImage(src, 0, 0);
    try {
      var d = x.getImageData(0, 0, w, h), p = d.data, a = deg * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a);
      var m = [0.213 + cs * 0.787 - sn * 0.213, 0.715 - cs * 0.715 - sn * 0.715, 0.072 - cs * 0.072 + sn * 0.928,
               0.213 - cs * 0.213 + sn * 0.143, 0.715 + cs * 0.285 + sn * 0.140, 0.072 - cs * 0.072 - sn * 0.283,
               0.213 - cs * 0.213 - sn * 0.787, 0.715 - cs * 0.715 + sn * 0.715, 0.072 + cs * 0.928 + sn * 0.072];
      for (var i = 0; i < p.length; i += 4) {
        var r = p[i], g = p[i + 1], b = p[i + 2];
        p[i] = m[0] * r + m[1] * g + m[2] * b; p[i + 1] = m[3] * r + m[4] * g + m[5] * b; p[i + 2] = m[6] * r + m[7] * g + m[8] * b;
      }
      x.putImageData(d, 0, 0);
    } catch (e) {}
    return c;
  }
  function skinImg() {
    // استخدم الرسم الأصلي للمركبات الجديدة، دون تغيير ألوانه.
    var custom = shipImages[shipId];
    if (custom && imgReady(custom)) return custom;
    var hu = ship.st ? ship.st.hue : 0;
    if (!hu || !imgReady(shipImg)) return shipImg;
    return skins[hu] || (skins[hu] = hueCanvas(shipImg, hu));
  }
  applyShip();
  refreshWallet();     // تحميل الرصيد والمركبات من الخادم
  // المركبة القوية: الصورة تأتي من ملف ship-img.js، وإن لم يوجد يعود للهالة الذهبية
  var powerShipImg = loadImg(typeof POWER_SHIP_SRC === 'string' ? POWER_SHIP_SRC : 'ship2.png');
  var powerBulletImg = loadImg('data:image/webp;base64,UklGRgQLAABXRUJQVlA4WAoAAAAQAAAANwAAWAAAQUxQSJAFAAAN8K1t25vWtm097/dLAuNcagkt53T+x1O3cnIGDEj6v7cFA6LW1tp2REwA/y/Ke+SfkowpF4vcvQ7JT9lweXnbQuZ2uV4h/0R0/u79WTcq+tqI1fq7F36K8sWfbxezcdyttrOz0lbVzZdfyydTvv8Hc17WqyErarvrK3v75Xec3O0fZ936cZ0hqdq4+9jW+Ob5VPL7d9o+7ooB5ATl+3lfvh5PRLw/H+5TljFSolS51TA8yqdQXn8c7nthMJai2iUv59tY7jil9et4fQHLcqIwYMoNkd+fQryfxeNOCcqMwihZ4MvPxk29O4Hnv+i2905MpRWUHATh7n0SqwdP1vy6dHcbZypbA6htahVFZx/ou+fvporfnXerH7JmFLO3abNGNH73MVex+jankD/dNP23rtlwsGYxKIJ3t3UsP95NoLx5X8v9mpxxpJoYQlFvr4e+v5/A7adonp4jzfGdM6T62ey1Wa2O492sHR6qXSaQBCKu0e5ZPmbxfhzXm6DGBAQSyvlFHZ/MsZ91zfaJtD1FNwhBc136p3pMe92w3uJUThEgC841W73Kh8gX13V8Rnb1FEgI3C2Yf2sONR+69m4Ap3KKKKMQ0u3Mjyv5ALpfxWoJFZspFUagPL9M/5Dsl2/Pyn2SOHMSJCCsOCuz9csBcHu+WsvY9jRtRQJ83bl/PMDlqqxGkWYqtQNI0Cz62Ix75OZMG+MEyjSEZQWUyKYf5DegXIxbsNKuzTQOyYRLKYxb9l+WbR+2wcG0sgREzrw7e/VbZhbuhSHVTNS0GwVAya4f2X8eGzA2ZuomdiHMWenZ7WsX+QaWcyq6shVyK2sc96iUxJadjSdT4wTUIW/kN2iiAsbRMb3mWwSKth95u0FViZE5qbBcStW+VEkZWZxUUTGgdsy3qooRKU7r2hjGjCL2Dp4Zy6BTgOXMQkV+Y6h1gYU4sWU8WsH+bTQWIGpzgqG1tUNDwftqq0BSEtNlNkabQeLAXT9zSCJqaDI7bO36w/ocuyySI8t02ILKOO6Tt5tmbomQmN7ISsY632c223lnRJiYbmht1XXbaB+ML805IEtZpqqUlIZdm5L3qC5j3qYtCU2mAGqtIA5cDdeWw1Y2U1m2YBgTH/K67RaORBITZ+2qrN4ODjTbgfOULIiJbIDcjXEQ1FWZhSlJYdrczY2d6zNxuB/78zNkyaFJ+qLEWo3zI5Sr6kuQMGWKHJskla/ZdMgHwDJZSMgKpuxb28pxXWKOOXiznpUZEKAJ0sLKWI2qHG5263G+QA6JKRPL5GtmcwQMq6a/aCwJTeAaNhpepUA+SH4Zs7lAEFOk0rKeX9sAc7B53IauWlOGVsf1xVjDS1OD48cHe7EwocLxdho9D3O3E/B9hdvWUrZHjchW/9yoYcrxe43lQzjGTsdUk/C6boom4WlduTxX4OaIrO1o8onaxDT54LG5ITTMjiBVM+52i2Zg4lWvmBeF+5kO2nXpWD80XTKx6n0ZFhdJjM1hOOFplJqpzHITumxAtTmkOnBd95FMXx/RVRH06g7YdlHZLDu3J+BlxeJSoKHVnr6EzR0lOaHG74fugwO0m+uNOsxIbR5LcErz8mN7O7Mkdm0rGMazTOlxiBZ5OvDXzzfvU/851jP1JQweH+ik5JTafJG/nAkUwbY0WVLmdUXLyX9YXtxaoAgqJcE8DMGpzfKl3swIhITSJbV5YIZ8GjR+M3YfTRAgE5nxvGnBnPz7V13ckEEoRVJ2D63QyczyZcz3c6wQWYv8Q7rlpzh+7cG/nqVCGiCelw6UPwE93Edfft0a2UWru5ILzE/Q/mZbhuby0qoxPi/n5ieb31Yvu+vbXk/fjxFt85Nhe1+b1/KB8UtZdPyEX5aVb3/76fPldbjlp+y7vtnufvf5LxIxNVZQOCBOBQAA0BkAnQEqOABZAD5tKpFFpCKhmfmeOEAGxLYAX18JnY/2nzO6y/cfwxxJxTezScv5gvPB8aD1Xf9d+uXuH/Yv2AP1c9Un1Kv67/yPYI/YX05fY4/ar9ofgP/kP96//+cMfwDbt8wYeSuY5Bkjs8Xe99rznYRwKii1Kv3H9uwuDfpj3+ReP8xWTZQ7zM3DNNjLhoavwqVFpCFBkN4hU4KAtMOhk5gI4QiFeW5JggpooGr/6xUxxdFZZlL06MjBM8WhTch69cuc6dXTyfbvcidVueSuHynFKwAA/vxLP/sNk0z9lMv6pPmzvULA/U+veHiyWtpCNQPfi1h7w/gWckYTkGAsIqfTw3hSirB5h5igpgEoREpuW26W3EGoK1w6k0MLreG8m2BWOlx0A7Qae1qUKlUIfYMumvpoNwk7mGDM4q80SQH/8zlgJ/l1PBf1c36Fb3/3JdK7SaiXUgi42tWflypyHATTtrmf5/xZGYG5YJ6ycWL6Bc9W1C1ddB/n/p3n/3Pzv2iTf9Qy4LFQan3US/vF9avJPBJPY+9iE8WiAs4ounPIEGM5PelnGJdXqbGuPSUlMX5gSvFdKs2XTtB71EYnHjhY2m7HAAn3APZSNOYoMyTpMr/dq/dz5v+zCd42GUuAcmrNyBhk7jQapHi5X2i2a470rXU3TD/ZiLcO3uMFzQDUltIEuV+XHiVWucoLNK4Q0/oelmzX+/C3c02MhTlD3Z2OVX+8KPDLj6eg+WNpO7s3ne4mP2A83vZZ/oFg1vde5GUjjPZT7PTjqFVdpkAZNVh4uJvYNP1R17riWip89TflurBp9VdfWUXhy7qAphsiTzuIzptygUkUsbFnx3QC5TA3NU6YZ6+Rr4+wx8gI4pYLXMqXr4sZEvJkHLOp9OJNWJFymt/2tljOTHKLugAVq9GDM0cAxJwjcF0Y05NZLpO1PuWzdBGUboai9I4nZ4TIFtdwqvbqQ4COb+dseGeyesbHRuQfBCWpqN/SR6s/NsL97Y3g1DI70B7Ly+LJQ6V3aYkzIsR9JaUPZnliI9oa5+CgoWzgLZuJgkGbVEBQc5Vg3KVDY6XPTYeRs4r8Db27CQqjsWxNHVAb9hU9GdiJ4FJRTipqJixpUz0k4XGPpGrM1Wpi/wE8D5bkqnonKsS/s3HJnzpu7X5++zBdQ5sE5L2e8nwFzyGrnYK2TmrM312mXvwhW2S0iV78nvLLU215XVW5CEDNDQOeorSEfSSzWQTLJcrLUfYYgWv36vwC+RX3wSTTD98W9rdvKoDIIA8hY57e6RnRDl8OJ+Nhd1ro+/BFWp8WTZ001mXDr//z/ZJZ1zud4tmLC6EFtgedc0+HwSM6euQpgRsO8EoVGbwfUaRPo6OZCF3cHhrf09jAWc0aAyuHukOUTgb8HCroAFR6lnE8ah0BooDy7bGGffeWPmLlsKFZ+Tv7mnH6n5nP0l6W2vFbx3HinbDSry1nGQS37zcBCB9UlRt2ZsCrR/mDyc/UfH7NSGirZr0Lud+Q1cYOPfzEuxgQ11o7Mi74aqKRniNUtnDFj48IhuDyomRv+5apbEb4abcRxGDzXC3s+baDMHvZlHWFtKjKGgkwkmPgTih9+vf/6gY46pkUP1H///MP//5cd//8vFKL5OW0uBu8dTRHRUlih+9PcdKcP7QsI8+i13mDzfjJG3b0uk8hgkbxZdLhCA//JRYwD/ZTwzRzCoVWq5kmHKTo9A50xlXvuIH9YNyWoWNyerjxD/uCGkyv25W8+7Dw9f4//86oySY1jkwTZBJ4i2KR8CnRCaNrvcG5O0+1WAAAAAA=');   // شكل الطلقة القوية
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
    if (!ship.y) { ship.y = ship.ty = H - 50 * S; }
    ship.y = Math.max(H * 0.25, Math.min(ship.y, H - 50 * S));
    ship.ty = Math.max(H * 0.25, Math.min(ship.ty, H - 50 * S));
    ship.x = Math.max(18 * S, Math.min(ship.x, W - 18 * S));
    ship.target = Math.max(18 * S, Math.min(ship.target, W - 18 * S));
  }
  window.addEventListener('resize', resize);

  for (var i = 0; i < 60; i++) stars.push({ x: Math.random(), y: Math.random(), z: 0.3 + Math.random() * 0.9 });

  function hearts() {
    var s = '';
    for (var i = 0; i < maxLives; i++) s += i < lives ? '♥' : '♡';
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
    var newLevel = 1, acc = 0, need = 25;   // كل مستوى يحتاج نقاطًا أكثر من السابق
    while (score >= acc + need) { acc += need; newLevel++; need = 25 + 2 * (newLevel - 1); }
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
    var hp = Math.min(400, 30 + level * 4);
    aliens.push({
      type: 'boss', r: rad, hp: hp, max: hp, c: '#bd75ff', pts: 25,
      x: W / 2, x0: W / 2, y: -rad - 8 * S,
      v: (38 + tier * 4) * S,
      ph: Math.random() * 6, flash: 0
    });
    // تنبيه بصري وصوتي عند ظهور الزعيم.
    levelToast.textContent = 'زعيم المجرّة!';
    levelToast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      levelToast.classList.remove('show');
    }, 1800);
    tone(220, 660, 0.45, 'sawtooth', 0.07);
  }

  function reset() {
    applyShip(); score = 0; lives = maxLives; level = 1; cfloats = []; runCoins = 0; startRunToken();
    aliens = []; bullets = []; parts = []; ebullets = []; drops = [];
    spawnT = 0.5; fireT = 0; clock = 0;
    scoreEl.textContent = '0';
    levelEl.textContent = 'LEVEL 1';
    levelToast.classList.remove('show');
    hearts();
    ship.x = ship.target = W / 2; ship.y = ship.ty = H - 50 * S; swarmT = 6; ship.inv = 0; ship.shield = 0; ship.multi = 0; ship.power = 0; ship.flash = 0;
  }

  function start() {
    reset();
    overlay.classList.add('hidden'); overlay.classList.remove('over');
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
      bestEl.textContent = 'الأفضل: ' + best; syncHome();
      ovText.textContent = 'رقم قياسي جديد! حققت ' + score + ' نقطة ووصلت إلى المستوى ' + level + '.';
    } else {
      ovText.textContent = 'حققت ' + score + ' نقطة ووصلت إلى المستوى ' + level + '. أفضل نتيجة لك ' + best + '.';
    }
    ovTitle.textContent = withdrew === true ? 'انسحبت من المعركة' : 'سقطت المركبة';
    sfx.over();
    startBtn.textContent = 'قاتل من جديد';
    var rl = document.getElementById('rewardLine');
    if (rl) { rl.hidden = !(runCoins && runToken); document.getElementById('rewardVal').textContent = '+' + (runCoins || 0); }
    claimRun();
    overlay.classList.remove('hidden'); overlay.classList.add('over');
    startBtn.focus();
    submitLeaderboardScore(score, level);
  }

  function burst(x, y, color, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.283, v = (40 + Math.random() * 160) * S;
      parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 0.4 + Math.random() * 0.4, c: color });
    }
  }

  // ---------- المكافآت: تسقط أحيانًا عند قتل الوحوش ----------
  function powerToast(text) {
    levelToast.textContent = text;
    levelToast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { levelToast.classList.remove('show'); }, 900);
  }

  function maybeDrop(al) {
    var chance = { small: 0.04, zig: 0.06, big: 0.15, boss: 1 }[al.type] || 0.04;
    var n = al.type === 'boss' ? 2 : 1;
    for (var i = 0; i < n; i++) {
      if (Math.random() < chance && drops.length < 3) {
        var rnd = Math.random();
        var kind = rnd < 0.40 ? 'shield' : (rnd < 0.80 ? 'multi' : 'heart');   // المركبة القوية صارت مكافأة الزعيم فقط
        if (al.type === 'boss' && i === 0) kind = 'power';   // الزعيم يترك المركبة القوية دائمًا
        if (kind === 'heart' && lives >= maxLives) kind = 'shield';   // القلب يظهر فقط إذا خسرت قلبًا
        drops.push({ kind: kind, x: al.x + (i - 0.5 * (n - 1)) * 44 * S, y: al.y, ph: Math.random() * 6, vx: (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 55) * S });
      }
    }
  }

  function collectDrop(dp) {
    var colors = { shield: '#5ee7ff', multi: '#fff27a', heart: '#ff5c7a', power: '#ffd166' };
    burst(dp.x, dp.y, colors[dp.kind], 14);
    if (dp.kind === 'shield') {
      ship.shield = SHIELD_TIME * ship.shieldMul;
      powerToast('درع!');
      tone(520, 880, 0.18, 'sine', 0.06); tone(880, 1320, 0.18, 'sine', 0.05, 0.1);
    } else if (dp.kind === 'power') {      // مركبة أقوى بطلقات أقوى لفترة قصيرة
      ship.power = POWER_TIME; ship.flash = 0.6;
      burst(ship.x, ship.y - 2 * S, '#ffd166', 26);
      powerToast('مركبة قوية!');
      tone(392, 392, 0.09, 'square', 0.05); tone(523, 523, 0.09, 'square', 0.05, 0.09);
      tone(659, 659, 0.09, 'square', 0.05, 0.18); tone(784, 1047, 0.22, 'square', 0.05, 0.27);
    } else if (dp.kind === 'multi') {
      ship.multi = MULTI_TIME;
      powerToast('طلقات إضافية!');
      tone(440, 880, 0.12, 'square', 0.04); tone(660, 1320, 0.16, 'square', 0.04, 0.1);
    } else {
      if (lives < maxLives) { lives++; hearts(); powerToast('قلب إضافي!'); }
      else { score += 5; scoreEl.textContent = score; checkLevel(); powerToast('+5'); }
      tone(660, 990, 0.2, 'triangle', 0.06); tone(990, 1320, 0.2, 'triangle', 0.05, 0.12);
    }
  }

  function hurt(passed) {                  // passed = true: وحش تجاوزك، والدرع لا يحميك منه
    if (ship.shield > 0 && !passed) {      // الدرع يمتص الاصطدام والكرات النارية فقط
      tone(700, 300, 0.12, 'triangle', 0.06);
      burst(ship.x, ship.y, '#5ee7ff', 10);
      return;
    }
    lives--; hearts();
    ship.inv = ship.invT;
    sfx.hurt();
    burst(ship.x, ship.y, '#ff5c7a', 22);
    if (lives <= 0) end();
  }

  function alienDef(type) {
    var tr = difficultyTier();
    return {
      small: { r: 20, hp: 1, v: 85, c: '#7cfc9a', pts: 1 },
      zig:   { r: 19, hp: 1, v: 105, c: '#ff7ad9', pts: 2 },
      big:   { r: 28, hp: 4 + Math.floor(level / 2), v: 55, c: '#ffb347', pts: 5 }
    }[type];
  }

  function speedMul() { return Math.min(2.8, Math.pow(1.045, level - 1)); }   // تزيد السرعة مع كل مستوى

  function makeAlien(type, x, y, extra) {
    var d = alienDef(type);
    var al = { type: type, r: d.r * S, hp: d.hp, max: d.hp, c: d.c, pts: d.pts,
               x: x, x0: x, y: y, v: d.v * S * speedMul(), ph: Math.random() * 6, flash: 0 };
    for (var key in extra) al[key] = extra[key];
    aliens.push(al);
    return al;
  }

  function spawn() {
    var r = Math.random();
    var type = r < 0.18 + Math.min(score, 150) * 0.001 ? 'big' : (r < 0.55 ? 'zig' : 'small');
    var rad = alienDef(type).r * S;
    if (type !== 'zig' && Math.random() < 0.45) {          // يدخل من أحد الجانبين بشكل قطري
      var dir = Math.random() < 0.5 ? 1 : -1;
      var side = makeAlien(type, dir > 0 ? -rad : W + rad, H * (0.05 + Math.random() * 0.3),
                           { vx: dir * (70 + Math.random() * 60) * S * speedMul() });
      side.v *= 0.7;
      return;
    }
    makeAlien(type, rad + Math.random() * Math.max(0, W - rad * 2), -rad);
  }

  // ---------- الأسراب: V ، ثعبان ، حلقة حول وحش كبير ، شبكة ----------
  function spawnSwarm() {
    var kind = ['v', 'snake', 'ring', 'grid'][Math.floor(Math.random() * 4)];
    var dir = Math.random() < 0.5 ? 1 : -1;
    var n = Math.min(14, 5 + Math.floor(level / 3));
    if (kind === 'ring') n = Math.min(13, 7 + Math.floor(level / 8));
    if (kind === 'grid') n = 8 + 4 * Math.min(2, Math.floor(level / 8));
    var sw = { kind: kind, t0: clock, dir: dir, sp: speedMul(), n: n,
               x0: dir > 0 ? -50 * S : W + 50 * S, y0: H * (0.08 + Math.random() * 0.2) };
    if (kind === 'grid') sw.y0 = -50 * S;                  // الشبكة تنزل من الأعلى، والباقي من الجوانب
    for (var k = 0; k < n; k++) {
      var type = kind === 'snake' ? 'zig' : (kind === 'ring' && k === 0 ? 'big' : (kind === 'grid' && k < 4 ? 'zig' : 'small'));
      makeAlien(type, -999, -999, { sw: sw, k: k });
    }
    tone(180, 90, 0.25, 'sawtooth', 0.05);
  }

  function swarmPos(al) {                                   // موضع كل وحش = دالة بزمن السرب ورقمه
    var s = al.sw, t = clock - s.t0, k = al.k, X, Y;
    if (s.kind === 'snake') {
      var u = t - k * 0.32;
      X = s.x0 + s.dir * 150 * S * s.sp * u;
      Y = s.y0 + Math.sin(u * 2.4) * 60 * S + u * 24 * S * s.sp;
    } else if (s.kind === 'ring') {
      var cx = s.x0 + s.dir * 72 * S * s.sp * t, cy = s.y0 + 44 * S * s.sp * t;
      if (k === 0) { X = cx; Y = cy; }
      else {
        var a = s.dir * t * 2.2 + (k - 1) * 6.283 / (s.n - 1);
        var rr = Math.max(62, (s.n - 1) * 6.7) * S; X = cx + Math.cos(a) * rr; Y = cy + Math.sin(a) * rr * 0.87;
      }
    } else if (s.kind === 'grid') {
      var half = Math.max(0, W / 2 - 1.5 * 42 * S - 24 * S);
      X = W / 2 + Math.sin(t * 0.8) * half + (k % 4 - 1.5) * 42 * S;
      Y = s.y0 + t * 38 * S * s.sp - Math.floor(k / 4) * 40 * S;
    } else {
      var row = Math.ceil(k / 2), side = k % 2 ? 1 : -1;
      X = s.x0 + s.dir * 95 * S * s.sp * t + side * row * 34 * S;
      Y = s.y0 + 60 * S * s.sp * t - row * 30 * S;
    }
    al.x = X; al.y = Y;
  }

  function fire() {
    sfx.shoot();
    var w = ship.st.weapon_id, strong = ship.power > 0;      // strong = المركبة القوية: ضرر إضافي
    var offs, vxs = null, dmg = 1, v = 560 * S, kind = '', homing = false, pierce = 0, block = 0;
    // strong = المركبة القوية (مكافأة الزعيم): ضرر إضافي + تقوية خاصة لكل سلاح
    if (w === 'laser') { offs = strong ? [-6, 6] : [0]; v = 950 * S; kind = 'laser'; }
    else if (w === 'fan') {
      kind = 'fan';
      if (strong) { offs = [-24, -16, -8, 0, 8, 16, 24]; vxs = [-120, -80, -40, 0, 40, 80, 120]; }
      else { offs = [-16, -8, 0, 8, 16]; vxs = [-90, -45, 0, 45, 90]; }
    }
    else if (w === 'pierce') { offs = [0]; dmg = 2; v = 620 * S; kind = 'pierce'; pierce = strong ? 5 : 3; }
    else if (w === 'homing') { offs = strong ? [-18, -6, 6, 18] : [-10, 10]; v = 430 * S; kind = 'missile'; homing = true; }
    else if (w === 'heavy') { offs = [-10, 10]; dmg = 2; v = 480 * S; kind = 'heavy'; block = strong ? 4 : 2; }
    else {                                                   // السلاح المتوازن: يزداد عدد الرصاصات مع النقاط
      var fireLevel = 0;
      for (var fl = 1; fl < FIRE_STEPS.length; fl++) if (score >= FIRE_STEPS[fl]) fireLevel = fl;
      if (strong) fireLevel = Math.min(4, Math.max(2, fireLevel + 1));   // المركبة القوية: مستوى إضافي (3 رصاصات على الأقل)
      offs = [[0], [-9, 9], [-14, 0, 14], [-20, -7, 7, 20], [-24, -12, 0, 12, 24]][fireLevel];
      if (fireLevel === 4) vxs = [-25, -12, 0, 12, 25];              // المستوى الأعلى: خمس رصاصات بانتشار خفيف
    }
    if (ship.multi > 0) { offs = [-18, -9, 0, 9, 18]; vxs = [-70, -35, 0, 35, 70]; }   // مكافأة الطلقات الإضافية
    for (var i = 0; i < offs.length; i++) {
      bullets.push({ x: ship.x + offs[i] * S, y: ship.y - 16 * S, v: v, vx: vxs ? vxs[i] * S : 0, dmg: strong ? dmg + 1 : dmg,
                     homing: homing, kind: kind, pierce: pierce, hitL: pierce ? [] : null, block: block });
    }
  }

  function update(dt) {
    clock += dt;
    var sp = 560 * S * dt;
    if (keys.ArrowLeft) ship.target -= sp;
    if (keys.ArrowRight) ship.target += sp;
    ship.target = Math.max(18 * S, Math.min(W - 18 * S, ship.target));
    if (keys.ArrowUp) ship.ty -= sp;
    if (keys.ArrowDown) ship.ty += sp;
    ship.ty = Math.max(H * 0.25, Math.min(H - 50 * S, ship.ty));
    var maxStep = 900 * S * ship.stepMul * dt;   // أقصى مسافة تقطعها المركبة بالإطار (السرعة)
    ship.x += Math.max(-maxStep, Math.min(maxStep, (ship.target - ship.x) * Math.min(1, dt * 18)));
    ship.y += Math.max(-maxStep, Math.min(maxStep, (ship.ty - ship.y) * Math.min(1, dt * 18)));
    if (ship.inv > 0) ship.inv -= dt;

    fireT -= dt;
    if (fireT <= 0) { fire(); fireT = ship.power > 0 ? ship.fireInt * 0.7 : ship.fireInt; }

    spawnT -= dt;
    if (spawnT <= 0) {
      spawn();
      // كل خمسة مستويات تصبح موجات الأعداء أسرع وأكثر كثافة.
      var tier = difficultyTier();
      spawnT = Math.max(0.22, Math.pow(0.95, level - 1)) * (aliens.some(function (q) { return q.type === 'boss'; }) ? 2 : 1);   // أثناء الزعيم يظهر نصف العدد   // يظهرون أسرع مع كل مستوى
    }

    swarmT -= dt;
    if (swarmT <= 0) {
      swarmT = Math.max(2.5, 12 - level * 0.35) + Math.random() * 2;
      if (!aliens.some(function (q) { return q.type === 'boss'; })) spawnSwarm();
    }

    for (var i = bullets.length - 1; i >= 0; i--) {
      if (bullets[i].homing) {                       // الصاروخ الموجّه يلاحق أقرب وحش أمامه
        var hb = bullets[i], hT = null, hBest = 1e12;
        for (var hk = 0; hk < aliens.length; hk++) {
          var hx = aliens[hk].x - hb.x, hy = hb.y - aliens[hk].y;
          if (hy > 0 && aliens[hk].y > 0) { var hd = hx * hx + hy * hy * 0.5; if (hd < hBest) { hBest = hd; hT = aliens[hk]; } }
        }
        if (hT) { var hWant = Math.max(-300 * S, Math.min(300 * S, (hT.x - hb.x) * 4)); hb.vx += (hWant - hb.vx) * Math.min(1, 7 * dt); }
      }
      bullets[i].y -= bullets[i].v * dt;
      bullets[i].x += (bullets[i].vx || 0) * dt;
      if (bullets[i].y < -10 || bullets[i].x < -10 || bullets[i].x > W + 10) bullets.splice(i, 1);
    }

    var shipY = ship.y;
    for (var a = aliens.length - 1; a >= 0; a--) {
      var al = aliens[a];
      if (al.sw) swarmPos(al);
      else if (al.type === 'boss') {         // الزعيم يتوقف أعلى الشاشة ويتحرك يمينًا ويسارًا
        if (al.y < H * 0.17) al.y += 70 * S * dt;
        al.bt = (al.bt || 0) + dt;
        al.x = W / 2 + Math.sin(al.bt * (0.6 + level * 0.008)) * (W / 2 - al.r - 6 * S);
      } else { al.y += al.v * dt; if (al.vx) al.x += al.vx * dt; }
      if (al.sw || al.vx) {              // الأسراب والداخلون من الجوانب يختفون بصمت إذا خرجوا من الشاشة
        al.age = (al.age || 0) + dt;
        if (al.x > 0 && al.x < W && al.y > 0 && al.y < H) al.in = true;
        else if ((al.in && (al.x < -al.r * 2 || al.x > W + al.r * 2 || al.y < -al.r * 2)) || al.age > 40) { aliens.splice(a, 1); continue; }
      }
      if (al.type === 'zig' && !al.sw) {
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
          al.shootT = Math.max(0.5, 1.5 - level * 0.015) * (al.hp < al.max * 0.5 ? 0.7 : 1);   // يغضب تحت نصف صحته
          var ang = Math.atan2(shipY - al.y, ship.x - al.x);
          var bspd = (190 + Math.min(150, level * 2)) * S, kf = Math.min(2, Math.floor(level / 15));
          al.vol = (al.vol || 0) + 1;
          if (al.vol % 6 === 0) {                        // كل 6 دفعات: حلقة نار بفتحة تعدّي منها
            var ph0 = Math.random() * 6.283;
            var gc = ang + (Math.random() - 0.5) * 1.2;
            for (var q = 0; q < 14; q++) { var qa = ph0 + q * 6.283 / 14; if (Math.abs(Math.atan2(Math.sin(qa - gc), Math.cos(qa - gc))) < 0.5) continue; ebullets.push({ b: 1, x: al.x, y: al.y, vx: Math.cos(qa) * bspd * 0.75, vy: Math.sin(qa) * bspd * 0.75 }); }
          } else {                                       // مروحة نحو المركبة تتّسع مع المستوى
            for (var q2 = -1 - kf; q2 <= 1 + kf; q2++) { var fa = ang + q2 * 0.28; ebullets.push({ b: 1, x: al.x, y: al.y + al.r, vx: Math.cos(fa) * bspd, vy: Math.sin(fa) * bspd }); }
          }
          tone(300, 120, 0.1, 'sawtooth', 0.04);
        }
      }

      // الوحوش الكبيرة (ثم المتعرّجة لاحقًا) تطلق النار على المركبة
      if (al.type !== 'boss' && al.y > 0 && al.y < H * 0.7 && ((al.type === 'big' && level >= 6) || (al.type === 'zig' && !al.sw && level >= 12))) {
        al.shootT = (al.shootT === undefined ? 1 + Math.random() * 2 : al.shootT) - dt;
        if (al.shootT <= 0) {
          al.shootT = Math.max(1.3, 4 - level * 0.05) + Math.random();
          var sa = Math.atan2(shipY - al.y, ship.x - al.x);
          ebullets.push({ x: al.x, y: al.y + al.r, vx: Math.cos(sa) * 170 * S, vy: Math.sin(sa) * 170 * S });
        }
      }

      // اصطدام الطلقات بالأعداء
      for (var b = bullets.length - 1; b >= 0; b--) {
        var dx = bullets[b].x - al.x, dy = bullets[b].y - al.y;
        if (dx * dx + dy * dy < (al.r + 4 * S) * (al.r + 4 * S)) {
          var bb = bullets[b], dmg = bb.dmg || 1;
          if (bb.pierce && al.type !== 'boss') {                 // الرصاصة الخارقة تكمل طريقها بعد إصابة الوحش
            if (bb.hitL.indexOf(al) >= 0) continue;
            bb.hitL.push(al); if (--bb.pierce <= 0) bullets.splice(b, 1);
          } else bullets.splice(b, 1);
          al.hp -= dmg; al.flash = 0.08; sfx.hit();
          burst(al.x, al.y, al.c, 3);
        }
      }
      if (al.hp <= 0) {
        score += al.pts;
        scoreEl.textContent = score;
        checkLevel();
        sfx.boom(al.type === 'big' || al.type === 'boss', al.type === 'boss');
        burst(al.x, al.y, al.c, 16);
        maybeDrop(al);
        awardCoins(al);
        aliens.splice(a, 1); continue;
      }
      // اصطدام العدو بالمركبة
      var sx = al.x - ship.x, sy = al.y - shipY;
      if (ship.inv <= 0 && sx * sx + sy * sy < (al.r + 16 * S) * (al.r + 16 * S)) {
        burst(al.x, al.y, al.c, 14); if (al.type !== 'boss') aliens.splice(a, 1); hurt();
        if (!running) return; continue;
      }
      // إذا تجاوز العدو المركبة
      if (al.y - al.r > H) {
        aliens.splice(a, 1); continue;   // تجاوز الوحش المركبة: بدون خسارة قلب
      }
    }

    for (var ei = ebullets.length - 1; ei >= 0; ei--) {
      var eb = ebullets[ei];
      eb.x += eb.vx * dt; eb.y += eb.vy * dt;
      var blocked = false;                                       // رصاص الدرع الثقيل يصدّ رصاص الأعداء
      for (var hq = bullets.length - 1; hq >= 0; hq--) {
        var hbu = bullets[hq];
        if (hbu.block > 0) {
          var hbx = hbu.x - eb.x, hby = hbu.y - eb.y;
          if (hbx * hbx + hby * hby < (14 * S) * (14 * S)) {
            burst(eb.x, eb.y, '#ffb347', 4);
            if (--hbu.block <= 0) bullets.splice(hq, 1);
            blocked = true; break;
          }
        }
      }
      if (blocked) { ebullets.splice(ei, 1); continue; }
      var ex = eb.x - ship.x, ey = eb.y - shipY;
      if (ship.inv <= 0 && ex * ex + ey * ey < (22 * S) * (22 * S)) {
        ebullets.splice(ei, 1); hurt();
        if (!running) return;
        continue;
      }
      if (eb.y > H + 20 || eb.y < -30 || eb.x < -20 || eb.x > W + 20) ebullets.splice(ei, 1);
    }

    // سقوط المكافآت وجمعها
    if (ship.shield > 0) ship.shield -= dt;
    if (ship.multi > 0) ship.multi -= dt;
    if (ship.power > 0) ship.power -= dt;
    if (ship.flash > 0) ship.flash -= dt;
    for (var fi = cfloats.length - 1; fi >= 0; fi--) {        // أرقام العملات الطافية
      cfloats[fi].t += dt; cfloats[fi].y -= 42 * S * dt;
      if (cfloats[fi].t > 0.9) cfloats.splice(fi, 1);
    }
    for (var di = drops.length - 1; di >= 0; di--) {
      var dp = drops[di];
      dp.y += 95 * S * dt;
      dp.x += (dp.vx || 0) * dt;                       // تنجرف جانبيًا وترتد عن الحواف
      if (dp.x < 16 * S || dp.x > W - 16 * S) { dp.vx = -(dp.vx || 0); dp.x = Math.max(16 * S, Math.min(W - 16 * S, dp.x)); }
      var mx = ship.x - dp.x, my = shipY - dp.y;       // مغناطيس خفيف نحو المركبة
      if (mx * mx + my * my < (100 * S) * (100 * S)) { dp.x += mx * Math.min(1, 2.5 * dt); dp.y += my * Math.min(1, 2.5 * dt); }
      var ddx = dp.x - ship.x, ddy = dp.y - shipY;
      if (ddx * ddx + ddy * ddy < (34 * S) * (34 * S)) {
        collectDrop(dp); drops.splice(di, 1); continue;
      }
      if (dp.y > H + 30) drops.splice(di, 1);
    }

    for (var p = parts.length - 1; p >= 0; p--) {
      var q = parts[p]; q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.t > q.life) parts.splice(p, 1);
    }
           }
