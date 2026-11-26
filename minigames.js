(function () {
  'use strict';

  const FONT = '"Bitcount Single", system-ui';

  function createRetroAudio(muteKey, muteBtn) {
    let audioCtx = null;
    let muted = localStorage.getItem(muteKey) === '1';

    function syncMuteUi() {
      if (!muteBtn) return;
      muteBtn.textContent = muted ? 'SFX OFF' : 'SFX ON';
      muteBtn.className = muted
        ? 'px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/10 text-[11px] text-white/45 cursor-pointer'
        : 'px-2.5 py-1 rounded-lg bg-white/10 border border-white/20 text-[11px] text-white cursor-pointer';
    }
    syncMuteUi();

    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        muted = !muted;
        try { localStorage.setItem(muteKey, muted ? '1' : '0'); } catch {}
        syncMuteUi();
        if (!muted) playTone(520, 740, 0.07, 'sine', 0.08);
      });
    }

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

    function playTone(fStart, fEnd, dur, type = 'square', vol = 0.08, delay = 0) {
      const ac = ensureAudio();
      if (!ac) return;
      const now = ac.currentTime + delay;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(fStart, now);
      if (fEnd !== fStart) osc.frequency.exponentialRampToValueAtTime(Math.max(20, fEnd), now + dur);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(gain).connect(ac.destination);
      osc.start(now);
      osc.stop(now + dur + 0.015);
    }

    return {
      score() {
        playTone(880, 880, 0.06, 'square', 0.07, 0);
        playTone(1318.5, 1318.5, 0.16, 'square', 0.075, 0.06);
      },
      bonus() {
        playTone(784, 784, 0.05, 'square', 0.07, 0);
        playTone(1046.5, 1046.5, 0.06, 'square', 0.075, 0.05);
        playTone(1568, 1568, 0.18, 'square', 0.08, 0.11);
      },
      move() {
        playTone(260, 320, 0.035, 'triangle', 0.04, 0);
      },
      hit() {
        playTone(180, 46, 0.18, 'sawtooth', 0.15, 0);
        playTone(120, 38, 0.24, 'triangle', 0.1, 0.05);
      },
      swoosh() {
        playTone(300, 620, 0.09, 'sine', 0.07, 0);
      }
    };
  }

  function drawPixelText(ctx, text, x, y, size, fill = '#ffffff', outline = '#000000', align = 'center') {
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

  function drawTerminalGrid(ctx, w, playH, cell = 32, yOffset = 0) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let y = yOffset; y <= yOffset + playH; y += cell) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
      ctx.stroke();
    }
    for (let x = 0; x <= w; x += cell) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, yOffset);
      ctx.lineTo(x + 0.5, yOffset + playH);
      ctx.stroke();
    }
  }

  function drawGameOverCard(ctx, W, score, bestScore, roundEarned, isNewBest, panelY, gameOverTimer, playBtn) {
    drawPixelText(ctx, 'LIQUIDATED', W / 2, Math.min(134, panelY - 38), 28, '#ef4444', '#000000');

    const px = 26;
    const py = Math.round(panelY);
    const pw = 236;
    const ph = 118;

    ctx.fillStyle = 'rgba(10, 10, 10, 0.96)';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, pw, ph);

    drawPixelText(ctx, 'PAYOUT', px + 60, py + 30, 11, 'rgba(255,255,255,0.55)', '#000000');
    drawPixelText(ctx, `+$${roundEarned.toLocaleString('en-US')}`, px + 60, py + 62, 18, '#22c55e', '#000000');

    drawPixelText(ctx, 'SCORE', px + pw - 18, py + 24, 11, 'rgba(255,255,255,0.55)', '#000000', 'right');
    drawPixelText(ctx, String(score), px + pw - 18, py + 48, 22, '#ffffff', '#000000', 'right');

    drawPixelText(ctx, 'BEST', px + pw - 18, py + 76, 11, 'rgba(255,255,255,0.55)', '#000000', 'right');
    drawPixelText(ctx, String(bestScore), px + pw - 18, py + 98, 20, '#ffffff', '#000000', 'right');

    if (isNewBest) {
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(px + pw - 96, py + 69, 32, 14);
      ctx.fillStyle = '#000000';
      ctx.font = `700 10px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('NEW', px + pw - 80, py + 77);
    }

    if (gameOverTimer >= 14) {
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(playBtn.x, playBtn.y, playBtn.w, playBtn.h);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(playBtn.x, playBtn.y, playBtn.w, playBtn.h);
      drawPixelText(ctx, 'PLAY AGAIN', playBtn.x + playBtn.w / 2, playBtn.y + playBtn.h / 2 + 1, 15, '#000000', '#22c55e');
    }
  }

  // =========================================================================
  // 1. SNAKE KNUT (+$200 PER COIN, +$400 GOLDEN PUMP)
  // =========================================================================
  window.KnutSnake = {
    init(hooks = {}) {
      const modal = document.getElementById('snakeModal');
      const canvas = document.getElementById('snakeCanvas');
      const closeBtn = document.getElementById('closeSnakeBtn');
      const muteBtn = document.getElementById('snakeMuteBtn');
      const sessionBadge = document.getElementById('snakeSessionEarned');
      if (!modal || !canvas) return null;

      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      const W = 288;
      const H = 512;
      const CELL = 16;
      const COLS = 18; // 288 / 16
      const ROWS = 24; // 384px playfield
      const PLAY_TOP = 16;
      const PLAY_H = ROWS * CELL; // 384
      const GROUND_Y = PLAY_TOP + PLAY_H; // 400
      const REWARD_PER_COIN = 200;
      const BEST_KEY = 'knut_rip_snake_best_v1';
      const MUTE_KEY = 'knut_rip_snake_muted_v1';
      const PLAY_BTN = { x: 84, y: 318, w: 120, h: 40 };

      const sfx = createRetroAudio(MUTE_KEY, muteBtn);

      let isOpen = false;
      let rafId = null;
      let mode = 'ready'; // ready | playing | gameover
      let score = 0;
      let sessionEarned = 0;
      let roundEarned = 0;
      let bestScore = Math.max(0, parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0);
      let isNewBest = false;

      let snake = [];
      let dir = { x: 1, y: 0 };
      let dirQueue = [];
      let food = { x: 12, y: 12, golden: false };
      let popups = [];
      let flashAlpha = 0;
      let shakeFrames = 0;
      let gameOverTimer = 0;
      let panelY = H + 20;
      let tickPulse = 0;

      function updateSessionBadge() {
        if (sessionBadge) sessionBadge.textContent = `+$${sessionEarned.toLocaleString('en-US')}`;
      }

      function spawnFood() {
        const occupied = new Set(snake.map(s => `${s.x},${s.y}`));
        const free = [];
        for (let y = 0; y < ROWS; y++) {
          for (let x = 0; x < COLS; x++) {
            if (!occupied.has(`${x},${y}`)) free.push({ x, y });
          }
        }
        if (!free.length) return;
        const pick = free[Math.floor(Math.random() * free.length)];
        food = { x: pick.x, y: pick.y, golden: Math.random() < 0.18 };
      }

      function resetRound() {
        mode = 'ready';
        score = 0;
        roundEarned = 0;
        isNewBest = false;
        snake = [
          { x: 9, y: 12 },
          { x: 8, y: 12 },
          { x: 7, y: 12 },
          { x: 6, y: 12 }
        ];
        dir = { x: 1, y: 0 };
        dirQueue = [];
        popups = [];
        flashAlpha = 0;
        shakeFrames = 0;
        gameOverTimer = 0;
        panelY = H + 20;
        spawnFood();
      }

      function queueDir(nx, ny) {
        if (!isOpen) return;
        if (mode === 'ready') {
          mode = 'playing';
          sfx.swoosh();
        }
        if (mode !== 'playing') return;
        const last = dirQueue.length ? dirQueue[dirQueue.length - 1] : dir;
        if (last.x === -nx && last.y === -ny) return;
        if (last.x === nx && last.y === ny) return;
        if (dirQueue.length < 2) {
          dirQueue.push({ x: nx, y: ny });
          sfx.move();
        }
      }

      function triggerGameOver() {
        if (mode === 'gameover') return;
        mode = 'gameover';
        flashAlpha = 0.7;
        shakeFrames = 10;
        gameOverTimer = 0;
        panelY = H + 20;
        sfx.hit();
        if (score > bestScore) {
          bestScore = score;
          isNewBest = true;
          try { localStorage.setItem(BEST_KEY, String(bestScore)); } catch {}
        }
        if (roundEarned > 0 && typeof hooks.onRoundEnd === 'function') {
          hooks.onRoundEnd(score, roundEarned);
        }
      }

      function stepSnake() {
        if (dirQueue.length) dir = dirQueue.shift();
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

        if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
          triggerGameOver();
          return;
        }
        const willEat = head.x === food.x && head.y === food.y;
        const bodyCheck = willEat ? snake : snake.slice(0, -1);
        if (bodyCheck.some(seg => seg.x === head.x && seg.y === head.y)) {
          triggerGameOver();
          return;
        }

        snake.unshift(head);
        if (willEat) {
          const pts = food.golden ? 2 : 1;
          const reward = pts * REWARD_PER_COIN;
          score += pts;
          roundEarned += reward;
          sessionEarned += reward;
          updateSessionBadge();
          if (food.golden) sfx.bonus();
          else sfx.score();
          popups.push({
            x: head.x * CELL + CELL / 2,
            y: PLAY_TOP + head.y * CELL,
            text: `+$${reward}`,
            color: food.golden ? '#f7d51d' : '#22c55e',
            life: 40
          });
          if (typeof hooks.onPoint === 'function') hooks.onPoint(reward, score);
          spawnFood();
        } else {
          snake.pop();
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

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, W, H);
        drawTerminalGrid(ctx, W, PLAY_H, CELL * 2, PLAY_TOP);

        // Playfield border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, PLAY_TOP + 0.5, W - 1, PLAY_H - 1);

        // Food coin
        const fx = food.x * CELL;
        const fy = PLAY_TOP + food.y * CELL;
        const pulse = 1 + Math.sin(tickPulse * 0.16) * 1.4;
        ctx.fillStyle = food.golden ? 'rgba(247, 213, 29, 0.25)' : 'rgba(34, 197, 94, 0.22)';
        ctx.fillRect(fx - pulse, fy - pulse, CELL + pulse * 2, CELL + pulse * 2);
        ctx.fillStyle = food.golden ? '#f7d51d' : '#22c55e';
        ctx.fillRect(fx + 2, fy + 2, CELL - 4, CELL - 4);
        drawPixelText(ctx, '$', fx + CELL / 2, fy + CELL / 2 + 1, 11, '#000000', food.golden ? '#f7d51d' : '#22c55e');

        // Snake segments
        for (let i = snake.length - 1; i >= 0; i--) {
          const seg = snake[i];
          const sx = seg.x * CELL;
          const sy = PLAY_TOP + seg.y * CELL;
          const isHead = i === 0;
          ctx.fillStyle = isHead ? '#86efac' : (i % 2 === 0 ? '#22c55e' : '#16a34a');
          ctx.fillRect(sx + 1, sy + 1, CELL - 2, CELL - 2);
          if (isHead) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(sx + 4, sy + 4, 2, 2);
            ctx.fillRect(sx + CELL - 6, sy + 4, 2, 2);
          } else {
            ctx.fillStyle = 'rgba(255,255,255,0.18)';
            ctx.fillRect(sx + 3, sy + 2, 3, CELL - 4);
          }
        }

        // Bottom Terminal Strip
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.fillRect(0, GROUND_Y, W, 2);

        // On-canvas touch D-pad hints
        drawPixelText(ctx, `SCORE ${score}  •  BEST ${bestScore}`, W / 2, GROUND_Y + 26, 13, 'rgba(255,255,255,0.75)', '#000000');
        drawPixelText(ctx, 'ARROWS / WASD / SWIPE', W / 2, GROUND_Y + 56, 11, 'rgba(255,255,255,0.32)', '#000000');
        drawPixelText(ctx, '+$200 GREEN  •  +$400 GOLD', W / 2, GROUND_Y + 80, 11, 'rgba(34,197,94,0.65)', '#000000');

        // Popups
        for (const pop of popups) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, pop.life / 14);
          drawPixelText(ctx, pop.text, Math.round(pop.x), Math.round(pop.y), 13, pop.color, '#000000');
          ctx.restore();
        }

        if (mode === 'ready') {
          drawPixelText(ctx, 'SNAKE KNUT', W / 2, 108, 28, '#ffffff', '#000000');
          drawPixelText(ctx, 'EAT COINS • DONT CRASH', W / 2, 146, 13, '#22c55e', '#000000');
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.strokeStyle = 'rgba(255,255,255,0.25)';
          ctx.lineWidth = 2;
          ctx.fillRect(62, 260, 164, 34);
          ctx.strokeRect(62, 260, 164, 34);
          drawPixelText(ctx, 'TAP / PRESS KEY', W / 2, 278, 13, '#ffffff', '#000000');
        } else if (mode === 'gameover') {
          drawGameOverCard(ctx, W, score, bestScore, roundEarned, isNewBest, panelY, gameOverTimer, PLAY_BTN);
        }

        if (flashAlpha > 0) {
          ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha.toFixed(2)})`;
          ctx.fillRect(0, 0, W, H);
        }
        ctx.restore();
      }

      let lastTime = 0;
      let moveAccum = 0;
      let fxAccum = 0;

      function loop(now) {
        if (!isOpen) return;
        const dt = Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
        lastTime = now;

        fxAccum += dt;
        while (fxAccum >= 1 / 60) {
          fxAccum -= 1 / 60;
          tickPulse++;
          if (flashAlpha > 0) flashAlpha = Math.max(0, flashAlpha - 0.08);
          if (shakeFrames > 0) shakeFrames--;
          for (let i = popups.length - 1; i >= 0; i--) {
            popups[i].y -= 0.7;
            popups[i].life--;
            if (popups[i].life <= 0) popups.splice(i, 1);
          }
          if (mode === 'gameover') {
            gameOverTimer++;
            panelY += (178 - panelY) * 0.22;
          }
        }

        if (mode === 'playing') {
          const stepSec = Math.max(0.068, 0.135 - score * 0.0022);
          moveAccum += dt;
          while (moveAccum >= stepSec && mode === 'playing') {
            moveAccum -= stepSec;
            stepSnake();
          }
        } else {
          moveAccum = 0;
        }

        render();
        rafId = requestAnimationFrame(loop);
      }

      function open() {
        if (isOpen) return;
        isOpen = true;
        sessionEarned = 0;
        updateSessionBadge();
        resetRound();
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        lastTime = performance.now();
        moveAccum = 0;
        fxAccum = 0;
        rafId = requestAnimationFrame(loop);
      }

      function close() {
        if (!isOpen) return;
        if (mode === 'playing' && roundEarned > 0 && typeof hooks.onRoundEnd === 'function') {
          hooks.onRoundEnd(score, roundEarned);
          roundEarned = 0;
        }
        isOpen = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }

      // Swipe + click controls
      let touchStart = null;
      canvas.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (mode === 'gameover' && gameOverTimer >= 14) {
          sfx.swoosh();
          resetRound();
          return;
        }
        if (mode === 'ready') {
          mode = 'playing';
          sfx.swoosh();
          return;
        }
        touchStart = { x: e.clientX, y: e.clientY };
      });
      canvas.addEventListener('pointermove', (e) => {
        if (!touchStart || mode !== 'playing') return;
        const dx = e.clientX - touchStart.x;
        const dy = e.clientY - touchStart.y;
        if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
        if (Math.abs(dx) > Math.abs(dy)) queueDir(dx > 0 ? 1 : -1, 0);
        else queueDir(0, dy > 0 ? 1 : -1);
        touchStart = { x: e.clientX, y: e.clientY };
      });
      canvas.addEventListener('pointerup', () => { touchStart = null; });

      window.addEventListener('keydown', (e) => {
        if (!isOpen) return;
        if (e.key === 'Escape') { e.preventDefault(); close(); return; }
        if (mode === 'gameover' && gameOverTimer >= 14 && (e.code === 'Space' || e.key === 'Enter')) {
          e.preventDefault();
          sfx.swoosh();
          resetRound();
          return;
        }
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); queueDir(0, -1); }
        else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { e.preventDefault(); queueDir(0, 1); }
        else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { e.preventDefault(); queueDir(-1, 0); }
        else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); queueDir(1, 0); }
        else if (e.code === 'Space' && mode === 'ready') { e.preventDefault(); mode = 'playing'; sfx.swoosh(); }
      });

      if (closeBtn) closeBtn.addEventListener('click', close);
      modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

      return { open, close, isOpen: () => isOpen };
    }
  };

  // =========================================================================
  // 2. CANDLE DODGER (+$150 PER GREEN COIN, DODGE RED RUG CANDLES)
  // =========================================================================
  window.KnutDodger = {
    init(hooks = {}) {
      const modal = document.getElementById('dodgerModal');
      const canvas = document.getElementById('dodgerCanvas');
      const closeBtn = document.getElementById('closeDodgerBtn');
      const muteBtn = document.getElementById('dodgerMuteBtn');
      const sessionBadge = document.getElementById('dodgerSessionEarned');
      if (!modal || !canvas) return null;

      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      const W = 288;
      const H = 512;
      const GROUND_H = 96;
      const PLAY_H = H - GROUND_H; // 416
      const PLAYER_Y = PLAY_H - 28;
      const PLAYER_W = 24;
      const PLAYER_H = 18;
      const REWARD_PER_COIN = 150;
      const BEST_KEY = 'knut_rip_dodger_best_v1';
      const MUTE_KEY = 'knut_rip_dodger_muted_v1';
      const PLAY_BTN = { x: 84, y: 318, w: 120, h: 40 };

      const sfx = createRetroAudio(MUTE_KEY, muteBtn);

      let isOpen = false;
      let rafId = null;
      let mode = 'ready'; // ready | playing | gameover
      let score = 0;
      let sessionEarned = 0;
      let roundEarned = 0;
      let bestScore = Math.max(0, parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0);
      let isNewBest = false;

      let playerX = W / 2;
      let targetPointerX = null;
      let keys = { left: false, right: false };
      let items = []; // { x, y, vy, kind: 'rug' | 'coin' | 'gold', w, h }
      let popups = [];
      let spawnTimer = 0;
      let coinTimer = 0;
      let elapsedTicks = 0;
      let flashAlpha = 0;
      let shakeFrames = 0;
      let gameOverTimer = 0;
      let panelY = H + 20;

      function updateSessionBadge() {
        if (sessionBadge) sessionBadge.textContent = `+$${sessionEarned.toLocaleString('en-US')}`;
      }

      function resetRound() {
        mode = 'ready';
        score = 0;
        roundEarned = 0;
        isNewBest = false;
        playerX = W / 2;
        targetPointerX = null;
        items = [];
        popups = [];
        spawnTimer = 25;
        coinTimer = 45;
        elapsedTicks = 0;
        flashAlpha = 0;
        shakeFrames = 0;
        gameOverTimer = 0;
        panelY = H + 20;
      }

      function startGame() {
        if (mode === 'ready') {
          mode = 'playing';
          sfx.swoosh();
        }
      }

      function triggerGameOver() {
        if (mode === 'gameover') return;
        mode = 'gameover';
        flashAlpha = 0.78;
        shakeFrames = 12;
        gameOverTimer = 0;
        panelY = H + 20;
        sfx.hit();
        if (score > bestScore) {
          bestScore = score;
          isNewBest = true;
          try { localStorage.setItem(BEST_KEY, String(bestScore)); } catch {}
        }
        if (roundEarned > 0 && typeof hooks.onRoundEnd === 'function') {
          hooks.onRoundEnd(score, roundEarned);
        }
      }

      function updateFixed() {
        if (flashAlpha > 0) flashAlpha = Math.max(0, flashAlpha - 0.08);
        if (shakeFrames > 0) shakeFrames--;
        for (let i = popups.length - 1; i >= 0; i--) {
          popups[i].y -= 0.75;
          popups[i].life--;
          if (popups[i].life <= 0) popups.splice(i, 1);
        }

        if (mode === 'gameover') {
          gameOverTimer++;
          panelY += (178 - panelY) * 0.22;
          return;
        }
        if (mode !== 'playing') return;

        elapsedTicks++;
        const speed = 4.2;
        if (keys.left) playerX -= speed;
        if (keys.right) playerX += speed;
        if (targetPointerX !== null) {
          playerX += (targetPointerX - playerX) * 0.34;
        }
        playerX = Math.max(PLAYER_W / 2 + 4, Math.min(W - PLAYER_W / 2 - 4, playerX));

        const difficulty = Math.min(2.6, 1 + elapsedTicks / 1800);

        spawnTimer--;
        if (spawnTimer <= 0) {
          const w = 16 + Math.floor(Math.random() * 14);
          const h = 28 + Math.floor(Math.random() * 24);
          items.push({
            kind: 'rug',
            x: 16 + Math.random() * (W - 32),
            y: -h,
            w,
            h,
            vy: (2.3 + Math.random() * 1.4) * difficulty
          });
          spawnTimer = Math.max(14, Math.round((34 - Math.random() * 10) / Math.sqrt(difficulty)));
        }

        coinTimer--;
        if (coinTimer <= 0) {
          const isGold = Math.random() < 0.16;
          items.push({
            kind: isGold ? 'gold' : 'coin',
            x: 20 + Math.random() * (W - 40),
            y: -18,
            w: 18,
            h: 18,
            vy: (2.1 + Math.random() * 0.9) * Math.min(1.8, difficulty)
          });
          coinTimer = Math.max(28, Math.round(52 - score * 0.35));
        }

        const pLeft = playerX - PLAYER_W / 2 + 3;
        const pRight = playerX + PLAYER_W / 2 - 3;
        const pTop = PLAYER_Y - PLAYER_H / 2 + 2;
        const pBottom = PLAYER_Y + PLAYER_H / 2 - 2;

        for (let i = items.length - 1; i >= 0; i--) {
          const it = items[i];
          it.y += it.vy;

          const iLeft = it.x - it.w / 2;
          const iRight = it.x + it.w / 2;
          const iTop = it.y - it.h / 2;
          const iBottom = it.y + it.h / 2;

          if (pRight > iLeft && pLeft < iRight && pBottom > iTop && pTop < iBottom) {
            if (it.kind === 'rug') {
              triggerGameOver();
              return;
            }
            const pts = it.kind === 'gold' ? 2 : 1;
            const reward = pts * REWARD_PER_COIN;
            score += pts;
            roundEarned += reward;
            sessionEarned += reward;
            updateSessionBadge();
            if (it.kind === 'gold') sfx.bonus();
            else sfx.score();
            popups.push({
              x: it.x,
              y: it.y - 10,
              text: `+$${reward}`,
              color: it.kind === 'gold' ? '#f7d51d' : '#22c55e',
              life: 40
            });
            if (typeof hooks.onPoint === 'function') hooks.onPoint(reward, score);
            items.splice(i, 1);
            continue;
          }

          if (it.y - it.h > PLAY_H + 10) {
            items.splice(i, 1);
          }
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

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, W, H);
        drawTerminalGrid(ctx, W, PLAY_H, 36, 0);

        // Falling items
        for (const it of items) {
          const ix = Math.round(it.x);
          const iy = Math.round(it.y);
          if (it.kind === 'rug') {
            // Bearish red candlestick with wicks
            ctx.fillStyle = '#f87171';
            ctx.fillRect(ix - 1, Math.round(iy - it.h / 2 - 8), 2, it.h + 16);
            ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
            ctx.fillRect(Math.round(ix - it.w / 2 - 2), Math.round(iy - it.h / 2), it.w + 4, it.h);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(Math.round(ix - it.w / 2), Math.round(iy - it.h / 2), it.w, it.h);
            ctx.fillStyle = '#b91c1c';
            ctx.fillRect(Math.round(ix + it.w / 2 - 4), Math.round(iy - it.h / 2), 4, it.h);
          } else {
            const col = it.kind === 'gold' ? '#f7d51d' : '#22c55e';
            ctx.fillStyle = it.kind === 'gold' ? 'rgba(247,213,29,0.24)' : 'rgba(34,197,94,0.24)';
            ctx.fillRect(ix - 11, iy - 11, 22, 22);
            ctx.fillStyle = col;
            ctx.fillRect(ix - 8, iy - 8, 16, 16);
            drawPixelText(ctx, '$', ix, iy + 1, 11, '#000000', col);
          }
        }

        // Player pixel ship
        const px = Math.round(playerX);
        const py = Math.round(PLAYER_Y);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px - 10, py, 20, 8);
        ctx.fillRect(px - 6, py - 5, 12, 6);
        ctx.fillRect(px - 2, py - 10, 4, 6);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(px - 4, py - 3, 8, 4);
        if (mode === 'playing' && elapsedTicks % 6 < 3) {
          ctx.fillStyle = '#f7d51d';
          ctx.fillRect(px - 4, py + 8, 8, 4);
        }

        // Bottom strip
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, PLAY_H, W, GROUND_H);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.fillRect(0, PLAY_H, W, 2);
        drawPixelText(ctx, '+$150 GREEN  •  +$300 GOLD', W / 2, PLAY_H + 34, 12, 'rgba(34,197,94,0.75)', '#000000');
        drawPixelText(ctx, 'DRAG / ARROWS TO DODGE RED', W / 2, PLAY_H + 62, 11, 'rgba(255,255,255,0.32)', '#000000');

        // Popups
        for (const pop of popups) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, pop.life / 14);
          drawPixelText(ctx, pop.text, Math.round(pop.x), Math.round(pop.y), 13, pop.color, '#000000');
          ctx.restore();
        }

        if (mode === 'ready') {
          drawPixelText(ctx, 'CANDLE DODGER', W / 2, 98, 25, '#ffffff', '#000000');
          drawPixelText(ctx, 'CATCH $ • DODGE RED RUGS', W / 2, 138, 12, '#22c55e', '#000000');
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.strokeStyle = 'rgba(255,255,255,0.25)';
          ctx.lineWidth = 2;
          ctx.fillRect(62, 250, 164, 34);
          ctx.strokeRect(62, 250, 164, 34);
          drawPixelText(ctx, 'TAP / PRESS KEY', W / 2, 268, 13, '#ffffff', '#000000');
          if (bestScore > 0) drawPixelText(ctx, `BEST ${bestScore}`, W / 2, 312, 13, 'rgba(255,255,255,0.65)', '#000000');
        } else if (mode === 'playing') {
          drawPixelText(ctx, String(score), W / 2, 46, 36, '#ffffff', '#000000');
        } else if (mode === 'gameover') {
          drawGameOverCard(ctx, W, score, bestScore, roundEarned, isNewBest, panelY, gameOverTimer, PLAY_BTN);
        }

        if (flashAlpha > 0) {
          ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha.toFixed(2)})`;
          ctx.fillRect(0, 0, W, H);
        }
        ctx.restore();
      }

      let lastTime = 0;
      let accum = 0;

      function loop(now) {
        if (!isOpen) return;
        const dt = Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
        lastTime = now;
        accum += dt;
        while (accum >= 1 / 60) {
          updateFixed();
          accum -= 1 / 60;
        }
        render();
        rafId = requestAnimationFrame(loop);
      }

      function open() {
        if (isOpen) return;
        isOpen = true;
        sessionEarned = 0;
        updateSessionBadge();
        resetRound();
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
        keys.left = false;
        keys.right = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }

      function canvasXFromEvent(e) {
        const rect = canvas.getBoundingClientRect();
        return ((e.clientX - rect.left) / rect.width) * W;
      }

      let dragging = false;
      canvas.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (mode === 'gameover' && gameOverTimer >= 14) {
          sfx.swoosh();
          resetRound();
          return;
        }
        if (mode === 'ready') startGame();
        dragging = true;
        targetPointerX = canvasXFromEvent(e);
      });
      canvas.addEventListener('pointermove', (e) => {
        if (!dragging || mode !== 'playing') return;
        targetPointerX = canvasXFromEvent(e);
      });
      window.addEventListener('pointerup', () => {
        dragging = false;
        targetPointerX = null;
      });

      window.addEventListener('keydown', (e) => {
        if (!isOpen) return;
        if (e.key === 'Escape') { e.preventDefault(); close(); return; }
        if (mode === 'gameover' && gameOverTimer >= 14 && (e.code === 'Space' || e.key === 'Enter')) {
          e.preventDefault();
          sfx.swoosh();
          resetRound();
          return;
        }
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          startGame();
          keys.left = true;
          targetPointerX = null;
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          startGame();
          keys.right = true;
          targetPointerX = null;
        } else if (e.code === 'Space' && mode === 'ready') {
          e.preventDefault();
          startGame();
        }
      });
      window.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
      });

      if (closeBtn) closeBtn.addEventListener('click', close);
      modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

      return { open, close, isOpen: () => isOpen };
    }
  };
})();
