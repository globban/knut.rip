(function () {
  'use strict';

  window.KnutFlappy = {
    init(hooks = {}) {
      const modal = document.getElementById('flappyModal');
      const canvas = document.getElementById('flappyCanvas');
      const closeBtn = document.getElementById('closeFlappyBtn');
      const muteBtn = document.getElementById('flappyMuteBtn');
      const sessionBadge = document.getElementById('flappySessionEarned');
      if (!modal || !canvas) return null;

      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      // =====================================================================
      // NATIVE 288x512 CONSTANTS (Original 60Hz Fixed Timestep)
      // =====================================================================
      const W = 288;
      const H = 512;
      const GROUND_H = 112;
      const PLAY_H = H - GROUND_H; // 400
      const REWARD_PER_POINT = 250;

      const STEP = 1 / 60;
      const GRAVITY = 0.25;
      const FLAP_VY = -4.65;
      const MAX_FALL_VY = 8.2;
      const SCROLL_SPEED = 2.0;

      const CANDLE_W = 46;
      const CANDLE_GAP = 100;
      const CANDLE_SPACING = 174;
      const CANDLE_MIN_TOP = 54;
      const CANDLE_MAX_TOP = PLAY_H - CANDLE_GAP - 54;

      const BIRD_X = 76;
      const BIRD_R_X = 12;
      const BIRD_R_Y = 9;

      const BEST_KEY = 'knut_rip_flappy_best_v1';
      const MUTE_KEY = 'knut_rip_flappy_muted_v1';
      const FONT = '"Bitcount Single", system-ui';

      // =====================================================================
      // SYNTHESIZED RETRO WEB AUDIO SFX
      // =====================================================================
      let audioCtx = null;
      let muted = localStorage.getItem(MUTE_KEY) === '1';

      function syncMuteUi() {
        if (muteBtn) {
          muteBtn.textContent = muted ? 'SFX OFF' : 'SFX ON';
          muteBtn.className = muted
            ? 'px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/10 text-[11px] text-white/45 cursor-pointer'
            : 'px-2.5 py-1 rounded-lg bg-white/10 border border-white/20 text-[11px] text-white cursor-pointer';
        }
      }
      syncMuteUi();

      function ensureAudio() {
        if (muted) return null;
        if (!audioCtx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (AC) audioCtx = new AC();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        }
        return audioCtx;
      }

      function playFlap() {
        const ac = ensureAudio();
        if (!ac) return;
        const now = ac.currentTime;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.075);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.16, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
        osc.connect(gain).connect(ac.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      }

      function playScore() {
        const ac = ensureAudio();
        if (!ac) return;
        const now = ac.currentTime;
        const notes = [
          { f: 987.77, t: 0, d: 0.07 },
          { f: 1318.51, t: 0.07, d: 0.2 }
        ];
        for (const n of notes) {
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(n.f, now + n.t);
          gain.gain.setValueAtTime(0.001, now + n.t);
          gain.gain.linearRampToValueAtTime(0.08, now + n.t + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
          osc.connect(gain).connect(ac.destination);
          osc.start(now + n.t);
          osc.stop(now + n.t + n.d + 0.01);
        }
      }

      function playHit() {
        const ac = ensureAudio();
        if (!ac) return;
        const now = ac.currentTime;
        const bufSize = Math.floor(ac.sampleRate * 0.11);
        const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
          data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
        }
        const noise = ac.createBufferSource();
        noise.buffer = buf;
        const filter = ac.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(900, now);
        const nGain = ac.createGain();
        nGain.gain.setValueAtTime(0.24, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
        noise.connect(filter).connect(nGain).connect(ac.destination);
        noise.start(now);

        const osc = ac.createOscillator();
        const oGain = ac.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(42, now + 0.13);
        oGain.gain.setValueAtTime(0.18, now);
        oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.connect(oGain).connect(ac.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      }

      function playDie() {
        const ac = ensureAudio();
        if (!ac) return;
        const now = ac.currentTime + 0.08;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(130, now + 0.26);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.27);
        osc.connect(gain).connect(ac.destination);
        osc.start(now);
        osc.stop(now + 0.28);
      }

      function playSwoosh() {
        const ac = ensureAudio();
        if (!ac) return;
        const now = ac.currentTime;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(640, now + 0.09);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain).connect(ac.destination);
        osc.start(now);
        osc.stop(now + 0.11);
      }

      // =====================================================================
      // CRISP 3-FRAME PIXEL BIRD SPRITES
      // =====================================================================
      const BIRD_PALETTES = [
        { body: '#f7d51d', light: '#fef08a', shade: '#d49412', wing: '#fff8d6', outline: '#111111' },
        { body: '#22c55e', light: '#86efac', shade: '#15803d', wing: '#dcfce7', outline: '#0a0a0a' },
        { body: '#f4f4f5', light: '#ffffff', shade: '#a1a1aa', wing: '#ffffff', outline: '#18181b' }
      ];

      const BIRD_BASE = [
        '......OOOOOO.....',
        '....OOLLLLOO.....',
        '...OLLBBBBWO.....',
        '..OLBBBBBBWWO....',
        '.OOBBBBBBBWWBO...',
        '.OBBBBBBBBWWBO...',
        '.OBBBBBBBBWWO....',
        '.OOBBBBBBBBOOOO..',
        '..OSSSSSSSSOOOOO.',
        '...OSSSSSSSOOOOO.',
        '....OOOOOO.......',
        '.................'
      ];

      function buildBirdSprites(palette) {
        const frames = [];
        for (let f = 0; f < 3; f++) {
          const c = document.createElement('canvas');
          c.width = 34;
          c.height = 24;
          const g = c.getContext('2d');
          const px = (x, y, col) => {
            g.fillStyle = col;
            g.fillRect(x * 2, y * 2, 2, 2);
          };

          for (let y = 0; y < BIRD_BASE.length; y++) {
            const row = BIRD_BASE[y];
            for (let x = 0; x < row.length; x++) {
              const ch = row[x];
              if (ch === '.') continue;
              if (ch === 'O') px(x, y, palette.outline);
              else if (ch === 'L') px(x, y, palette.light);
              else if (ch === 'B') px(x, y, palette.body);
              else if (ch === 'S') px(x, y, palette.shade);
              else if (ch === 'W') px(x, y, '#ffffff');
            }
          }

          px(12, 4, '#111111');
          px(12, 5, '#111111');

          const beak = [
            [11, 7, '#f86c2f'], [12, 7, '#f86c2f'], [13, 7, '#f86c2f'], [14, 7, '#f86c2f'], [15, 7, '#f86c2f'],
            [11, 8, '#e04f1a'], [12, 8, '#e04f1a'], [13, 8, '#e04f1a'], [14, 8, '#e04f1a'], [15, 8, '#e04f1a'],
            [11, 9, '#d94816'], [12, 9, '#d94816'], [13, 9, '#d94816'], [14, 9, '#d94816']
          ];
          for (const [bx, by, col] of beak) px(bx, by, col);
          for (const [ox, oy] of [
            [10, 7], [16, 7], [10, 8], [16, 8], [11, 8], [12, 8], [13, 8], [14, 8], [15, 8],
            [10, 9], [15, 9], [11, 10], [12, 10], [13, 10], [14, 10]
          ]) px(ox, oy, palette.outline);

          const wingY = f === 0 ? 3 : f === 1 ? 5 : 7;
          const wingCoords = [
            [2, wingY], [3, wingY], [4, wingY], [5, wingY], [6, wingY],
            [1, wingY + 1], [2, wingY + 1], [3, wingY + 1], [4, wingY + 1], [5, wingY + 1], [6, wingY + 1], [7, wingY + 1],
            [2, wingY + 2], [3, wingY + 2], [4, wingY + 2], [5, wingY + 2], [6, wingY + 2]
          ];
          for (const [wx, wy] of wingCoords) {
            px(wx - 1, wy, palette.outline);
            px(wx + 1, wy, palette.outline);
            px(wx, wy - 1, palette.outline);
            px(wx, wy + 1, palette.outline);
          }
          for (const [wx, wy] of wingCoords) {
            px(wx, wy, wy === wingY + 2 ? palette.light : palette.wing);
          }

          frames.push(c);
        }
        return frames;
      }

      const BIRD_SPRITES = BIRD_PALETTES.map(buildBirdSprites);

      // =====================================================================
      // CANDLESTICK OBSTACLE RENDERER (Replaces Pipes)
      // =====================================================================
      function drawCandlestickObstacle(x, topY, height, isTop) {
        if (height <= 0) return;
        const px = Math.round(x);
        const py = Math.round(topY);
        const ph = Math.round(height);
        const cx = px + Math.floor(CANDLE_W / 2);

        // Top = Bearish Red candle (#ef4444), Bottom = Bullish Green candle (#22c55e)
        const base = isTop ? '#ef4444' : '#22c55e';
        const bright = isTop ? '#f87171' : '#4ade80';
        const dark = isTop ? '#b91c1c' : '#15803d';
        const glow = isTop ? 'rgba(239, 68, 68, 0.22)' : 'rgba(34, 197, 94, 0.22)';

        // Decorative candlestick wick extending slightly into the gap (non-colliding visual detail)
        const wickLen = 14;
        ctx.fillStyle = bright;
        if (isTop) {
          ctx.fillRect(cx - 2, py + ph - 2, 4, wickLen);
        } else {
          ctx.fillRect(cx - 2, py - wickLen + 2, 4, wickLen);
        }

        // Subtle outer glow
        ctx.fillStyle = glow;
        ctx.fillRect(px - 2, py, CANDLE_W + 4, ph);

        // Crisp dark frame
        ctx.fillStyle = '#050505';
        ctx.fillRect(px, py, CANDLE_W, ph);

        // Candlestick body fill
        const bodyH = Math.max(0, ph - 4);
        if (bodyH > 0) {
          ctx.fillStyle = base;
          ctx.fillRect(px + 2, py + 2, CANDLE_W - 4, bodyH);

          // Left specular highlight band
          ctx.fillStyle = bright;
          ctx.fillRect(px + 5, py + 2, 7, bodyH);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
          ctx.fillRect(px + 7, py + 2, 2, bodyH);

          // Right shadow band
          ctx.fillStyle = dark;
          ctx.fillRect(px + CANDLE_W - 11, py + 2, 9, bodyH);

          // Subtle horizontal open/close tick band near the tip
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          if (isTop) {
            ctx.fillRect(px + 2, py + ph - 5, CANDLE_W - 4, 2);
          } else {
            ctx.fillRect(px + 2, py + 3, CANDLE_W - 4, 2);
          }
        }
      }

      function drawText(text, x, y, size, fill = '#ffffff', outline = '#000000', align = 'center') {
        ctx.save();
        ctx.font = `700 ${size}px ${FONT}`;
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(3, Math.round(size * 0.22));
        ctx.strokeStyle = outline;
        ctx.strokeText(text, x, y);
        ctx.fillStyle = fill;
        ctx.fillText(text, x, y);
        ctx.restore();
      }

      // =====================================================================
      // GAME STATE
      // =====================================================================
      let isOpen = false;
      let rafId = null;
      let mode = 'ready'; // 'ready' | 'playing' | 'dying' | 'gameover'
      let score = 0;
      let sessionEarned = 0;
      let roundEarned = 0;
      let bestScore = Math.max(0, parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0);
      let isNewBest = false;

      let birdPaletteIdx = 0;
      let birdY = 216;
      let birdVy = 0;
      let birdRot = 0;
      let wingTick = 0;
      let bobTick = 0;

      let groundX = 0;
      let candles = [];
      let popups = [];

      let flashAlpha = 0;
      let shakeFrames = 0;
      let gameOverTimer = 0;
      let panelY = H + 20;
      let shownScore = 0;
      let sparkleTick = 0;

      const PLAY_BTN = { x: 84, y: 320, w: 120, h: 40 };

      function updateSessionBadge() {
        if (sessionBadge) {
          sessionBadge.textContent = `+$${sessionEarned.toLocaleString('en-US')}`;
        }
      }

      function resetRound(rotateBird = true) {
        if (rotateBird) {
          birdPaletteIdx = Math.floor(Math.random() * BIRD_SPRITES.length);
        }
        mode = 'ready';
        score = 0;
        roundEarned = 0;
        isNewBest = false;
        birdY = 216;
        birdVy = 0;
        birdRot = 0;
        wingTick = 0;
        bobTick = 0;
        candles = [];
        popups = [];
        flashAlpha = 0;
        shakeFrames = 0;
        gameOverTimer = 0;
        panelY = H + 20;
        shownScore = 0;
      }

      function spawnCandles(xPos) {
        const topH = Math.floor(CANDLE_MIN_TOP + Math.random() * (CANDLE_MAX_TOP - CANDLE_MIN_TOP));
        candles.push({ x: xPos, topH, scored: false });
      }

      function flap() {
        if (!isOpen) return;

        if (mode === 'ready') {
          mode = 'playing';
          birdVy = FLAP_VY;
          birdRot = -0.44;
          spawnCandles(W + 90);
          playFlap();
          return;
        }

        if (mode === 'playing') {
          birdVy = FLAP_VY;
          birdRot = -0.44;
          wingTick = 0;
          playFlap();
          return;
        }

        if (mode === 'gameover' && gameOverTimer >= 26) {
          playSwoosh();
          resetRound(true);
        }
      }

      function triggerDeath(hitCandle) {
        if (mode === 'dying' || mode === 'gameover') return;
        mode = 'dying';
        flashAlpha = 0.8;
        shakeFrames = 10;
        playHit();
        if (hitCandle) {
          birdVy = -2.2;
          playDie();
        }
        if (score > bestScore) {
          bestScore = score;
          isNewBest = true;
          try { localStorage.setItem(BEST_KEY, String(bestScore)); } catch {}
        }
      }

      function enterGameOver() {
        mode = 'gameover';
        gameOverTimer = 0;
        panelY = H + 20;
        shownScore = 0;
        playSwoosh();
        if (roundEarned > 0 && typeof hooks.onRoundEnd === 'function') {
          hooks.onRoundEnd(score, roundEarned);
        }
      }

      // =====================================================================
      // 60HZ SIMULATION STEP
      // =====================================================================
      function updateFixed() {
        if (flashAlpha > 0) flashAlpha = Math.max(0, flashAlpha - 0.09);
        if (shakeFrames > 0) shakeFrames--;

        for (let i = popups.length - 1; i >= 0; i--) {
          const pop = popups[i];
          pop.y -= 0.7;
          pop.life--;
          if (pop.life <= 0) popups.splice(i, 1);
        }

        if (mode === 'ready') {
          groundX = (groundX - SCROLL_SPEED) % 24;
          bobTick += 0.1;
          birdY = 216 + Math.sin(bobTick) * 6;
          birdRot = 0;
          wingTick += 0.18;
          return;
        }

        if (mode === 'playing') {
          groundX = (groundX - SCROLL_SPEED) % 24;
          wingTick += 0.28;

          birdVy = Math.min(MAX_FALL_VY, birdVy + GRAVITY);
          birdY += birdVy;

          if (birdY < 12) {
            birdY = 12;
            if (birdVy < 0) birdVy = 0;
          }

          if (birdVy < 2.2) {
            birdRot += (-0.44 - birdRot) * 0.32;
          } else {
            birdRot = Math.min(Math.PI / 2, birdRot + 0.085);
          }

          for (let i = candles.length - 1; i >= 0; i--) {
            const p = candles[i];
            p.x -= SCROLL_SPEED;

            if (!p.scored && p.x + CANDLE_W * 0.5 < BIRD_X) {
              p.scored = true;
              score++;
              roundEarned += REWARD_PER_POINT;
              sessionEarned += REWARD_PER_POINT;
              updateSessionBadge();
              playScore();
              popups.push({ x: BIRD_X + 6, y: birdY - 18, text: `+$${REWARD_PER_POINT}`, life: 42 });
              if (typeof hooks.onPoint === 'function') {
                hooks.onPoint(REWARD_PER_POINT, score);
              }
            }

            if (p.x + CANDLE_W < -8) {
              candles.splice(i, 1);
            }
          }

          const lastC = candles[candles.length - 1];
          if (!lastC || lastC.x <= W - CANDLE_SPACING) {
            spawnCandles(lastC ? lastC.x + CANDLE_SPACING : W + 40);
          }

          const bLeft = BIRD_X - BIRD_R_X;
          const bRight = BIRD_X + BIRD_R_X;
          const bTop = birdY - BIRD_R_Y;
          const bBottom = birdY + BIRD_R_Y;

          for (const p of candles) {
            if (bRight > p.x + 2 && bLeft < p.x + CANDLE_W - 2) {
              if (bTop < p.topH || bBottom > p.topH + CANDLE_GAP) {
                triggerDeath(true);
                return;
              }
            }
          }

          if (birdY + 12 >= PLAY_H) {
            birdY = PLAY_H - 12;
            triggerDeath(false);
            enterGameOver();
          }
          return;
        }

        if (mode === 'dying') {
          birdVy = Math.min(MAX_FALL_VY + 2, birdVy + GRAVITY * 1.25);
          birdY += birdVy;
          birdRot = Math.min(Math.PI / 2, birdRot + 0.16);
          if (birdY + 12 >= PLAY_H) {
            birdY = PLAY_H - 12;
            birdRot = Math.PI / 2;
            enterGameOver();
          }
          return;
        }

        if (mode === 'gameover') {
          gameOverTimer++;
          sparkleTick += 0.12;
          panelY += (178 - panelY) * 0.22;
          if (gameOverTimer > 10 && shownScore < score) {
            shownScore = Math.min(score, shownScore + Math.max(1, Math.ceil((score - shownScore) * 0.2)));
          }
        }
      }

      // =====================================================================
      // RENDER (#000 BLACK TERMINAL + CANDLESTICKS + BITCOUNT FONT)
      // =====================================================================
      function drawMedal(cx, cy, s) {
        let colors = null;
        if (s >= 40) colors = { main: '#e5e4e2', light: '#ffffff', shade: '#9ca3af' };
        else if (s >= 30) colors = { main: '#f6d03b', light: '#fef08a', shade: '#b45309' };
        else if (s >= 20) colors = { main: '#cbd5e1', light: '#f8fafc', shade: '#64748b' };
        else if (s >= 10) colors = { main: '#d97706', light: '#fdba74', shade: '#92400e' };

        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.beginPath();
        ctx.arc(cx, cy, 21, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (!colors) return;

        ctx.fillStyle = colors.main;
        ctx.beginPath();
        ctx.arc(cx, cy, 19, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = colors.shade;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 15, 0, Math.PI * 2);
        ctx.stroke();

        drawText('★', cx, cy + 1, 16, colors.light, colors.shade);

        if (Math.sin(sparkleTick) > 0.2) {
          const sx = cx - 9 + Math.round(Math.cos(sparkleTick * 0.7) * 5);
          const sy = cy - 9 + Math.round(Math.sin(sparkleTick * 0.9) * 4);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(sx - 3, sy, 7, 1);
          ctx.fillRect(sx, sy - 3, 1, 7);
        }
      }

      function render() {
        ctx.save();
        if (shakeFrames > 0) {
          const mag = shakeFrames * 0.45;
          ctx.translate(
            Math.round((Math.random() - 0.5) * mag * 2),
            Math.round((Math.random() - 0.5) * mag * 2)
          );
        }

        // 1. Pure #000000 black background + subtle trading-terminal grid
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let gy = 40; gy < PLAY_H; gy += 40) {
          ctx.beginPath();
          ctx.moveTo(0, gy + 0.5);
          ctx.lineTo(W, gy + 0.5);
          ctx.stroke();
        }
        const gxOffset = ((groundX % 24) + 24) % 24;
        for (let gx = gxOffset; gx < W; gx += 48) {
          ctx.beginPath();
          ctx.moveTo(gx + 0.5, 0);
          ctx.lineTo(gx + 0.5, PLAY_H);
          ctx.stroke();
        }

        // 2. Candlestick Obstacles
        for (const p of candles) {
          drawCandlestickObstacle(p.x, 0, p.topH, true);
          const bottomY = p.topH + CANDLE_GAP;
          drawCandlestickObstacle(p.x, bottomY, PLAY_H - bottomY, false);
        }

        // 3. Scrolling Dark Terminal Ground Strip
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, PLAY_H, W, GROUND_H);

        // Top border accent bar with scrolling green/white chevron ticks
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.fillRect(0, PLAY_H, W, 2);

        for (let x = Math.round(groundX) - 24; x < W + 24; x += 24) {
          ctx.fillStyle = 'rgba(34, 197, 94, 0.35)';
          ctx.beginPath();
          ctx.moveTo(x, PLAY_H + 14);
          ctx.lineTo(x + 10, PLAY_H + 14);
          ctx.lineTo(x + 18, PLAY_H + 2);
          ctx.lineTo(x + 8, PLAY_H + 2);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(0, PLAY_H + 14, W, 1);

        // Subtle footer info on ground strip
        drawText('+$250 PER CANDLE', W / 2, PLAY_H + 46, 13, 'rgba(255,255,255,0.35)', '#000000');
        drawText('TAP / SPACE TO FLAP', W / 2, PLAY_H + 72, 11, 'rgba(255,255,255,0.22)', '#000000');

        // 4. Bird
        const sprites = BIRD_SPRITES[birdPaletteIdx];
        const frameIdx = mode === 'dying' || mode === 'gameover'
          ? 1
          : [0, 1, 2, 1][Math.floor(wingTick) % 4];
        const sprite = sprites[frameIdx];

        ctx.save();
        ctx.translate(Math.round(BIRD_X), Math.round(birdY));
        ctx.rotate(birdRot);
        ctx.drawImage(sprite, -17, -12);
        ctx.restore();

        // 5. Floating +$250 popups
        for (const pop of popups) {
          const alpha = Math.min(1, pop.life / 16);
          ctx.save();
          ctx.globalAlpha = alpha;
          drawText(pop.text, Math.round(pop.x), Math.round(pop.y), 14, '#22c55e', '#000000');
          ctx.restore();
        }

        // 6. UI Overlays
        if (mode === 'ready') {
          drawText('FLAPPY KNUT', W / 2, 92, 28, '#ffffff', '#000000');
          drawText('GET READY', W / 2, 136, 18, '#22c55e', '#000000');

          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.lineWidth = 2;
          ctx.fillRect(74, 266, 140, 34);
          ctx.strokeRect(74, 266, 140, 34);
          drawText('TAP / SPACE', W / 2, 284, 14, '#ffffff', '#000000');

          if (bestScore > 0) {
            drawText(`BEST ${bestScore}`, W / 2, 326, 13, 'rgba(255,255,255,0.65)', '#000000');
          }
        } else if (mode === 'playing' || mode === 'dying') {
          drawText(String(score), W / 2, 52, 38, '#ffffff', '#000000');
        } else if (mode === 'gameover') {
          drawText('LIQUIDATED', W / 2, Math.min(134, panelY - 40), 28, '#ef4444', '#000000');

          const px = 26;
          const py = Math.round(panelY);
          const pw = 236;
          const ph = 124;

          ctx.fillStyle = 'rgba(14, 14, 14, 0.94)';
          ctx.fillRect(px, py, pw, ph);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
          ctx.lineWidth = 2;
          ctx.strokeRect(px, py, pw, ph);

          drawText('MEDAL', px + 52, py + 24, 11, 'rgba(255,255,255,0.55)', '#000000');
          drawMedal(px + 52, py + 62, score);
          drawText(`+$${roundEarned.toLocaleString('en-US')}`, px + 52, py + 104, 13, '#22c55e', '#000000');

          drawText('SCORE', px + pw - 16, py + 24, 11, 'rgba(255,255,255,0.55)', '#000000', 'right');
          drawText(String(shownScore), px + pw - 16, py + 48, 22, '#ffffff', '#000000', 'right');

          drawText('BEST', px + pw - 16, py + 78, 11, 'rgba(255,255,255,0.55)', '#000000', 'right');
          drawText(String(bestScore), px + pw - 16, py + 102, 22, '#ffffff', '#000000', 'right');

          if (isNewBest) {
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(px + pw - 96, py + 71, 32, 14);
            ctx.fillStyle = '#000000';
            ctx.font = `700 10px ${FONT}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('NEW', px + pw - 80, py + 79);
          }

          if (gameOverTimer >= 16) {
            const b = PLAY_BTN;
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(b.x, b.y, b.w, b.h);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(b.x, b.y, b.w, b.h);
            drawText('PLAY AGAIN', b.x + b.w / 2, b.y + b.h / 2 + 1, 15, '#000000', '#22c55e');
          }
        }

        if (flashAlpha > 0) {
          ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha.toFixed(2)})`;
          ctx.fillRect(0, 0, W, H);
        }

        ctx.restore();
      }

      // =====================================================================
      // LOOP LIFECYCLE (Only runs while modal is open)
      // =====================================================================
      let lastTime = 0;
      let accum = 0;

      function loop(now) {
        if (!isOpen) return;
        const dt = Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
        lastTime = now;
        accum += dt;
        while (accum >= STEP) {
          updateFixed();
          accum -= STEP;
        }
        render();
        rafId = requestAnimationFrame(loop);
      }

      function open() {
        if (isOpen) return;
        isOpen = true;
        sessionEarned = 0;
        updateSessionBadge();
        resetRound(false);
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        lastTime = performance.now();
        accum = 0;
        rafId = requestAnimationFrame(loop);
      }

      function close() {
        if (!isOpen) return;
        if (mode === 'playing' && roundEarned > 0 && typeof hooks.onRoundEnd === 'function') {
          hooks.onRoundEnd(score, roundEarned);
          roundEarned = 0;
        }
        isOpen = false;
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }

      // =====================================================================
      // INPUTS
      // =====================================================================
      canvas.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        flap();
      });

      window.addEventListener('keydown', (e) => {
        if (!isOpen) return;
        if (e.code === 'Escape') {
          e.preventDefault();
          close();
          return;
        }
        if (e.repeat) return;
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
          e.preventDefault();
          flap();
        } else if (e.code === 'Enter' && mode === 'gameover' && gameOverTimer >= 26) {
          e.preventDefault();
          playSwoosh();
          resetRound(true);
        } else if (e.code === 'KeyM') {
          muted = !muted;
          try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch {}
          syncMuteUi();
        }
      });

      if (closeBtn) closeBtn.addEventListener('click', close);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) close();
      });
      if (muteBtn) {
        muteBtn.addEventListener('click', () => {
          muted = !muted;
          try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch {}
          syncMuteUi();
        });
      }

      return { open, close };
    }
  };
})();
