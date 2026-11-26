(function () {
  'use strict';

  const STORAGE_KEY = 'knut_rip_trading_terminal_v5';
  const STARTING_CASH = 25000.00;
  const CANDLE_DURATION_MS = 1800;
  const HYPE_WAVE_COST = 2500.00;

  // =========================================================================
  // 1. TOPOGRAPHIC CONTOUR BACKGROUND ENGINE (#000 + faint elevation lines)
  // =========================================================================
  const topoCanvas = document.getElementById('topoBgCanvas');
  const topoCtx = topoCanvas.getContext('2d');
  let topoW = 0;
  let topoH = 0;
  let topoPhase = 0;

  function resizeTopo() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    topoW = window.innerWidth;
    topoH = window.innerHeight;
    topoCanvas.width = Math.floor(topoW * dpr);
    topoCanvas.height = Math.floor(topoH * dpr);
    topoCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resizeTopo);
  resizeTopo();

  function topoField(x, y, t) {
    return (
      Math.sin(x * 0.0032 + t * 0.18) * Math.cos(y * 0.0036 - t * 0.14) * 0.5 +
      Math.sin((x + y) * 0.0021 - t * 0.11) * 0.35 +
      Math.cos(Math.hypot(x - topoW * 0.65, y - topoH * 0.35) * 0.0045 + t * 0.15) * 0.25
    );
  }

  function renderTopoBackground() {
    topoCtx.clearRect(0, 0, topoW, topoH);
    const step = 28;
    const cols = Math.ceil(topoW / step) + 1;
    const rows = Math.ceil(topoH / step) + 1;
    const grid = new Float32Array(cols * rows);

    for (let r = 0; r < rows; r++) {
      const py = r * step;
      for (let c = 0; c < cols; c++) {
        grid[r * cols + c] = topoField(c * step, py, topoPhase);
      }
    }

    const levels = 11;
    topoCtx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    topoCtx.lineWidth = 1;
    topoCtx.beginPath();

    for (let l = 0; l < levels; l++) {
      const iso = -0.85 + (l / (levels - 1)) * 1.7;
      for (let r = 0; r < rows - 1; r++) {
        const y0 = r * step;
        const y1 = y0 + step;
        const r0 = r * cols;
        const r1 = (r + 1) * cols;

        for (let c = 0; c < cols - 1; c++) {
          const v0 = grid[r0 + c];
          const v1 = grid[r0 + c + 1];
          const v2 = grid[r1 + c + 1];
          const v3 = grid[r1 + c];

          let code = 0;
          if (v0 >= iso) code |= 1;
          if (v1 >= iso) code |= 2;
          if (v2 >= iso) code |= 4;
          if (v3 >= iso) code |= 8;
          if (code === 0 || code === 15) continue;

          const x0 = c * step;
          const x1 = x0 + step;
          const tx = x0 + ((iso - v0) / (v1 - v0 || 1e-6)) * step;
          const ry = y0 + ((iso - v1) / (v2 - v1 || 1e-6)) * step;
          const bx = x0 + ((iso - v3) / (v2 - v3 || 1e-6)) * step;
          const ly = y0 + ((iso - v0) / (v3 - v0 || 1e-6)) * step;

          if (code === 1 || code === 14) { topoCtx.moveTo(x0, ly); topoCtx.lineTo(tx, y0); }
          else if (code === 2 || code === 13) { topoCtx.moveTo(tx, y0); topoCtx.lineTo(x1, ry); }
          else if (code === 3 || code === 12) { topoCtx.moveTo(x0, ly); topoCtx.lineTo(x1, ry); }
          else if (code === 4 || code === 11) { topoCtx.moveTo(x1, ry); topoCtx.lineTo(bx, y1); }
          else if (code === 5) {
            topoCtx.moveTo(x0, ly); topoCtx.lineTo(tx, y0);
            topoCtx.moveTo(x1, ry); topoCtx.lineTo(bx, y1);
          }
          else if (code === 6 || code === 9) { topoCtx.moveTo(tx, y0); topoCtx.lineTo(bx, y1); }
          else if (code === 7 || code === 8) { topoCtx.moveTo(x0, ly); topoCtx.lineTo(bx, y1); }
          else if (code === 10) {
            topoCtx.moveTo(tx, y0); topoCtx.lineTo(x1, ry);
            topoCtx.moveTo(x0, ly); topoCtx.lineTo(bx, y1);
          }
        }
      }
    }
    topoCtx.stroke();
    topoPhase += 0.012;
    requestAnimationFrame(renderTopoBackground);
  }
  requestAnimationFrame(renderTopoBackground);

  // =========================================================================
  // 2. MARKET CATALOG (16 CRYPTO + 14 STOCKS + USER COINS)
  // =========================================================================
  const INITIAL_ASSETS = [
    // Cryptocurrencies (16)
    { ticker: 'BTC', name: 'Bitcoin', category: 'CRYPTO', price: 94250.00, vol: 0.014 },
    { ticker: 'ETH', name: 'Ethereum', category: 'CRYPTO', price: 3420.00, vol: 0.018 },
    { ticker: 'SOL', name: 'Solana', category: 'CRYPTO', price: 218.50, vol: 0.028 },
    { ticker: 'AVAX', name: 'Avalanche', category: 'CRYPTO', price: 44.80, vol: 0.026 },
    { ticker: 'DOGE', name: 'Dogecoin', category: 'CRYPTO', price: 0.4120, vol: 0.038 },
    { ticker: 'LINK', name: 'Chainlink', category: 'CRYPTO', price: 22.60, vol: 0.022 },
    { ticker: 'SUI', name: 'Sui', category: 'CRYPTO', price: 3.85, vol: 0.032 },
    { ticker: 'TON', name: 'Toncoin', category: 'CRYPTO', price: 6.45, vol: 0.024 },
    { ticker: 'ARB', name: 'Arbitrum', category: 'CRYPTO', price: 1.18, vol: 0.028 },
    { ticker: 'NEAR', name: 'NEAR Protocol', category: 'CRYPTO', price: 6.92, vol: 0.030 },
    { ticker: 'ADA', name: 'Cardano', category: 'CRYPTO', price: 0.9650, vol: 0.025 },
    { ticker: 'XRP', name: 'Ripple', category: 'CRYPTO', price: 1.48, vol: 0.027 },
    { ticker: 'PEPE', name: 'Pepe', category: 'CRYPTO', price: 0.0000214, vol: 0.045 },
    { ticker: 'TIA', name: 'Celestia', category: 'CRYPTO', price: 7.40, vol: 0.032 },
    { ticker: 'INJ', name: 'Injective', category: 'CRYPTO', price: 28.90, vol: 0.034 },
    { ticker: 'HYPE', name: 'Hyperliquid', category: 'CRYPTO', price: 31.40, vol: 0.036 },

    // Stocks (14)
    { ticker: 'AAPL', name: 'Apple Inc.', category: 'STOCK', price: 234.50, vol: 0.010 },
    { ticker: 'NVDA', name: 'NVIDIA Corp.', category: 'STOCK', price: 146.20, vol: 0.019 },
    { ticker: 'TSLA', name: 'Tesla Inc.', category: 'STOCK', price: 348.90, vol: 0.024 },
    { ticker: 'MSFT', name: 'Microsoft Corp.', category: 'STOCK', price: 428.10, vol: 0.009 },
    { ticker: 'AMZN', name: 'Amazon.com', category: 'STOCK', price: 206.40, vol: 0.012 },
    { ticker: 'GOOGL', name: 'Alphabet Inc.', category: 'STOCK', price: 178.75, vol: 0.011 },
    { ticker: 'META', name: 'Meta Platforms', category: 'STOCK', price: 584.30, vol: 0.014 },
    { ticker: 'AMD', name: 'Adv. Micro Devices', category: 'STOCK', price: 142.80, vol: 0.021 },
    { ticker: 'COIN', name: 'Coinbase Global', category: 'STOCK', price: 286.40, vol: 0.028 },
    { ticker: 'PLTR', name: 'Palantir Tech.', category: 'STOCK', price: 64.90, vol: 0.025 },
    { ticker: 'MSTR', name: 'MicroStrategy', category: 'STOCK', price: 412.00, vol: 0.032 },
    { ticker: 'NFLX', name: 'Netflix Inc.', category: 'STOCK', price: 892.50, vol: 0.013 },
    { ticker: 'SNOW', name: 'Snowflake Inc.', category: 'STOCK', price: 168.20, vol: 0.020 },
    { ticker: 'HOOD', name: 'Robinhood Markets', category: 'STOCK', price: 38.60, vol: 0.027 }
  ];

  function generateHistory(basePrice, vol, count = 115) {
    const candles = [];
    let curr = 1.0;
    let momentum = (Math.random() - 0.5) * vol * 0.4;
    let regimeLeft = 6 + Math.floor(Math.random() * 10);

    for (let i = 0; i < count; i++) {
      regimeLeft -= 1;
      if (regimeLeft <= 0) {
        regimeLeft = 6 + Math.floor(Math.random() * 12);
        const roll = Math.random();
        if (roll < 0.30) momentum = vol * (0.25 + Math.random() * 0.45);
        else if (roll < 0.60) momentum = -vol * (0.25 + Math.random() * 0.45);
        else momentum = (Math.random() - 0.5) * vol * 0.2;
      }

      const open = curr;
      const noise = (Math.random() - 0.5) * 2 * vol * 0.55;
      const step = momentum * 0.35 + noise;
      const close = Math.max(0.0001, open * (1 + step));
      const wickUp = Math.random() * vol * 0.45;
      const wickDown = Math.random() * vol * 0.45;
      const high = Math.max(open, close) * (1 + wickUp);
      const low = Math.max(0.0001, Math.min(open, close) * (1 - wickDown));
      candles.push({ open, high, low, close });
      curr = close;
      momentum *= 0.92;
    }

    // Uniformly rescale the whole series so the last candle naturally ends at basePrice (no jump)
    const scale = basePrice / Math.max(1e-9, curr);
    for (let i = 0; i < candles.length; i++) {
      candles[i].open = Math.max(0.0000001, candles[i].open * scale);
      candles[i].high = Math.max(0.0000001, candles[i].high * scale);
      candles[i].low = Math.max(0.0000001, candles[i].low * scale);
      candles[i].close = Math.max(0.0000001, candles[i].close * scale);
    }
    candles[candles.length - 1].close = basePrice;
    return candles;
  }

  const state = {
    cash: STARTING_CASH,
    startingEquity: STARTING_CASH,
    assets: {},
    selectedTicker: 'BTC',
    filter: 'ALL',
    search: '',
    side: 'LONG', // 'LONG' | 'SHORT'
    leverage: 1,
    timeSpeed: 1,
    visibleCandles: 60,
    positions: {},
    logs: [],
    hoverCandleIndex: null,
    stats: {
      coinsCreated: 0,
      rugpulls: 0,
      adsBought: 0
    },
    scaleMin: null,
    scaleMax: null,
    candleElapsedMs: 0,
    gameOver: false,
    gameOverDismissed: false
  };

  function computeLiqPrice(entryPrice, leverage, side = 'LONG') {
    if (!isFinite(entryPrice) || entryPrice <= 0 || leverage <= 1) return 0;
    if (side === 'SHORT') {
      return entryPrice * (1 + 1 / leverage);
    }
    return Math.max(0.00000001, entryPrice * (1 - 1 / leverage));
  }

  function normalizePosition(pos) {
    if (!pos || !isFinite(pos.qty) || pos.qty <= 1e-8) return null;
    const side = pos.side === 'SHORT' ? 'SHORT' : 'LONG';
    const avgPrice = isFinite(pos.avgPrice) && pos.avgPrice >= 0 ? pos.avgPrice : 0;
    const margin = isFinite(pos.margin) && pos.margin >= 0 ? pos.margin : pos.qty * avgPrice;
    const liqPrice = isFinite(pos.liqPrice) && pos.liqPrice > 0 ? pos.liqPrice : 0;
    const leverage = isFinite(pos.leverage) && pos.leverage >= 1
      ? pos.leverage
      : (margin > 0 && avgPrice > 0 ? Math.max(1, Math.round((pos.qty * avgPrice) / margin)) : 1);
    return { side, qty: pos.qty, avgPrice, margin, liqPrice, leverage };
  }

  function buildFreshState() {
    state.cash = STARTING_CASH;
    state.startingEquity = STARTING_CASH;
    state.assets = {};
    state.selectedTicker = 'BTC';
    state.filter = 'ALL';
    state.search = '';
    state.side = 'LONG';
    state.leverage = 1;
    state.timeSpeed = 1;
    state.visibleCandles = 60;
    state.positions = {};
    state.logs = [{ timeStr: nowTimeStr(), msg: 'FRESH TERMINAL // $25,000.00 READY', tone: 'neutral' }];
    state.hoverCandleIndex = null;
    state.stats = { coinsCreated: 0, rugpulls: 0, adsBought: 0 };
    state.scaleMin = null;
    state.scaleMax = null;
    state.candleElapsedMs = 0;
    state.gameOver = false;
    state.gameOverDismissed = false;

    INITIAL_ASSETS.forEach((item) => {
      const candles = generateHistory(item.price, item.vol, 115);
      const start24h = candles[Math.max(0, candles.length - 48)].open;
      state.assets[item.ticker] = {
        ...item,
        open24h: start24h,
        targetPrice: item.price,
        momentum: (Math.random() - 0.5) * 0.006,
        regimeTimer: 7 + Math.floor(Math.random() * 14),
        regimeLabel: 'STEADY LIQUIDITY',
        isUserCreated: false,
        autoHype: false,
        adRemainingSec: 0,
        adCampaignName: '',
        lpPool: 0,
        devSupply: 0,
        rugged: false,
        tradeBias: null,
        candles
      };
    });
  }

  function nowTimeStr() {
    return new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function saveProgress() {
    try {
      const compactAssets = {};
      for (const [ticker, a] of Object.entries(state.assets)) {
        compactAssets[ticker] = {
          ticker: a.ticker,
          name: a.name,
          category: a.category,
          price: a.price,
          targetPrice: a.targetPrice,
          open24h: a.open24h,
          vol: a.vol,
          momentum: a.momentum,
          regimeTimer: a.regimeTimer,
          regimeLabel: a.regimeLabel,
          isUserCreated: a.isUserCreated,
          autoHype: a.autoHype,
          adRemainingSec: a.adRemainingSec,
          adCampaignName: a.adCampaignName,
          lpPool: a.lpPool,
          devSupply: a.devSupply,
          rugged: a.rugged,
          candles: a.candles.slice(-120)
        };
      }

      const payload = {
        cash: state.cash,
        startingEquity: state.startingEquity,
        selectedTicker: state.selectedTicker,
        visibleCandles: state.visibleCandles,
        leverage: state.leverage,
        timeSpeed: state.timeSpeed,
        positions: state.positions,
        logs: state.logs.slice(0, 40),
        stats: state.stats,
        assets: compactAssets
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      const badge = document.getElementById('saveBadge');
      if (badge) {
        badge.textContent = 'SAVED';
        badge.classList.remove('text-white/40');
        badge.classList.add('text-[#22c55e]');
        setTimeout(() => {
          badge.textContent = 'AUTOSAVED';
          badge.classList.remove('text-[#22c55e]');
          badge.classList.add('text-white/40');
        }, 900);
      }
    } catch (err) {
      // Ignore storage quota errors safely
    }
  }

  function loadProgress() {
    buildFreshState();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || typeof saved.cash !== 'number' || !saved.assets) return;

      state.cash = Math.max(0, saved.cash);
      state.startingEquity = typeof saved.startingEquity === 'number' && saved.startingEquity > 0 ? saved.startingEquity : STARTING_CASH;
      state.visibleCandles = [35, 60, 95].includes(saved.visibleCandles) ? saved.visibleCandles : 60;
      state.leverage = typeof saved.leverage === 'number' ? Math.min(100, Math.max(1, Math.round(saved.leverage))) : 1;
      state.timeSpeed = [1, 2, 5, 10].includes(saved.timeSpeed) ? saved.timeSpeed : 1;

      const restoredPos = {};
      if (saved.positions && typeof saved.positions === 'object') {
        for (const [k, v] of Object.entries(saved.positions)) {
          const norm = normalizePosition(v);
          if (norm) restoredPos[k] = norm;
        }
      }
      state.positions = restoredPos;

      state.logs = Array.isArray(saved.logs) && saved.logs.length > 0 ? saved.logs : state.logs;
      state.stats = {
        coinsCreated: saved.stats?.coinsCreated || 0,
        rugpulls: saved.stats?.rugpulls || 0,
        adsBought: saved.stats?.adsBought || 0
      };

      for (const [ticker, sAsset] of Object.entries(saved.assets)) {
        if (!sAsset || !Array.isArray(sAsset.candles) || sAsset.candles.length === 0) continue;
        const base = state.assets[ticker] || {};
        const lastClose = sAsset.candles[sAsset.candles.length - 1]?.close;
        const stablePrice = typeof lastClose === 'number' && lastClose > 0 ? lastClose : sAsset.price;
        state.assets[ticker] = {
          ...base,
          ...sAsset,
          price: stablePrice,
          targetPrice: stablePrice,
          adRemainingSec: typeof sAsset.adRemainingSec === 'number' ? sAsset.adRemainingSec : 0,
          adCampaignName: sAsset.adCampaignName || '',
          tradeBias: null
        };
      }

      if (saved.selectedTicker && state.assets[saved.selectedTicker]) {
        state.selectedTicker = saved.selectedTicker;
      }
    } catch (err) {
      buildFreshState();
    }
  }

  // =========================================================================
  // 3. FORMATTING & STATUS HELPERS
  // =========================================================================
  function formatPrice(p) {
    if (!isFinite(p) || p <= 0) return '$0.00';
    if (p < 0.0001) return '$' + p.toFixed(8);
    if (p < 0.01) return '$' + p.toFixed(6);
    if (p < 1) return '$' + p.toFixed(4);
    if (p < 100) return '$' + p.toFixed(2);
    return '$' + p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatQty(q) {
    if (!isFinite(q) || Math.abs(q) < 1e-8) return '0.0000';
    if (Math.abs(q) >= 1000) return q.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (Math.abs(q) >= 1) return q.toFixed(4);
    return q.toFixed(6);
  }

  const statusBar = document.getElementById('statusBar');
  const statusText = document.getElementById('statusText');
  let statusTimer = null;

  function notifyStatus(msg, isError = false) {
    statusText.textContent = msg;
    statusText.className = isError ? 'text-[#ef4444] font-semibold' : 'text-white';
    statusBar.classList.remove('hidden');
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      statusBar.classList.add('hidden');
    }, 4200);
  }

  document.getElementById('dismissStatusBtn').addEventListener('click', () => {
    statusBar.classList.add('hidden');
  });

  function addLog(msg, tone = 'neutral') {
    state.logs.unshift({ timeStr: nowTimeStr(), msg, tone });
    if (state.logs.length > 45) state.logs.pop();
    renderActivityLog();
  }

  function renderActivityLog() {
    const container = document.getElementById('activityLog');
    if (state.logs.length === 0) {
      container.innerHTML = '<div class="text-white/35">NO EVENTS YET</div>';
      return;
    }
    container.innerHTML = state.logs
      .map((item) => {
        const cls =
          item.tone === 'buy'
            ? 'text-[#22c55e]'
            : item.tone === 'sell'
            ? 'text-white/80'
            : item.tone === 'rug'
            ? 'text-[#ef4444] font-bold'
            : 'text-white/60';
        return `<div class="leading-snug"><span class="text-white/30 mr-1.5">${item.timeStr}</span><span class="${cls}">${item.msg}</span></div>`;
      })
      .join('');
  }

  // =========================================================================
  // 4. PORTFOLIO, LIQUIDATION, GAME OVER & EQUITY CALCULATIONS
  // =========================================================================
  const gameOverModal = document.getElementById('gameOverModal');
  const dismissGameOverBtn = document.getElementById('dismissGameOverBtn');

  function hideGameOverModal() {
    gameOverModal.classList.add('hidden');
    gameOverModal.classList.remove('flex');
  }

  function showGameOverModal() {
    document.getElementById('statCoinsCreated').textContent = String(state.stats.coinsCreated);
    document.getElementById('statRugpulls').textContent = String(state.stats.rugpulls);
    document.getElementById('statAdsBought').textContent = String(state.stats.adsBought);
    gameOverModal.classList.remove('hidden');
    gameOverModal.classList.add('flex');
  }

  dismissGameOverBtn.addEventListener('click', () => {
    state.gameOverDismissed = true;
    hideGameOverModal();
  });

  gameOverModal.addEventListener('click', (e) => {
    if (e.target === gameOverModal) {
      state.gameOverDismissed = true;
      hideGameOverModal();
    }
  });

  function getUnrealizedPnl(pos, currentPrice) {
    if (!pos || pos.qty <= 1e-8) return 0;
    if (pos.side === 'SHORT') {
      return (pos.avgPrice - currentPrice) * pos.qty;
    }
    return (currentPrice - pos.avgPrice) * pos.qty;
  }

  function getPositionEquity(pos, currentPrice) {
    if (!pos || pos.qty <= 1e-8) return 0;
    return Math.max(0, pos.margin + getUnrealizedPnl(pos, currentPrice));
  }

  function getHoldingsValue() {
    let total = 0;
    for (const [ticker, pos] of Object.entries(state.positions)) {
      const asset = state.assets[ticker];
      if (asset && pos.qty > 1e-8) {
        total += getPositionEquity(pos, asset.price);
      }
    }
    return total;
  }

  function checkLiquidations() {
    let anyLiquidated = false;
    for (const [ticker, pos] of Object.entries(state.positions)) {
      const asset = state.assets[ticker];
      if (!asset || !pos || pos.qty <= 1e-8 || pos.liqPrice <= 0) continue;

      const hitLiq =
        pos.side === 'SHORT'
          ? asset.price >= pos.liqPrice
          : asset.price <= pos.liqPrice;

      if (hitLiq) {
        const lostMargin = pos.margin;
        delete state.positions[ticker];
        anyLiquidated = true;
        addLog(`LIQUIDATED ${pos.side} ${ticker} @ ${formatPrice(asset.price)} (-${formatPrice(lostMargin)})`, 'rug');
        notifyStatus(`LIQUIDATED ${pos.side} ${ticker} AT ${formatPrice(asset.price)}`, true);
      }
    }
    if (anyLiquidated) {
      saveProgress();
    }
  }

  function checkGameOver(totalEquity) {
    const hasAnyPos = Object.values(state.positions).some((p) => p && p.qty > 1e-8);
    const isZeroed = (!hasAnyPos && state.cash <= 0.009) || totalEquity <= 0.005;

    if (isZeroed) {
      if (!state.gameOver) {
        state.gameOver = true;
        state.gameOverDismissed = false;
        showGameOverModal();
        saveProgress();
      }
    } else if (state.gameOver) {
      state.gameOver = false;
      state.gameOverDismissed = false;
      hideGameOverModal();
    }
  }

  document.getElementById('restartGameBtn').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    buildFreshState();
    hideGameOverModal();
    syncSpeedButtons();
    syncLeverageControls();
    setSide('LONG');
    saveProgress();
    renderMarketList();
    renderActiveAssetHeader();
    renderPositions();
    renderOrderTicket();
    updateHeaderStats();
    drawCandleChart(0.016);
    notifyStatus('RESTARTED WITH $25,000.00');
  });

  function updateHeaderStats() {
    const holdingsVal = getHoldingsValue();
    const totalEquity = state.cash + holdingsVal;
    const pnl = totalEquity - state.startingEquity;
    const pnlPct = state.startingEquity > 0 ? (pnl / state.startingEquity) * 100 : 0;

    document.getElementById('cashDisplay').textContent = formatPrice(state.cash);
    document.getElementById('portfolioDisplay').textContent = formatPrice(totalEquity);

    const pnlEl = document.getElementById('totalPnlDisplay');
    const sign = pnl >= 0 ? '+' : '';
    pnlEl.textContent = `${sign}${formatPrice(pnl)} (${sign}${pnlPct.toFixed(2)}%)`;
    pnlEl.className =
      'font-semibold tabular-nums ' +
      (pnl > 0.01 ? 'text-[#22c55e]' : pnl < -0.01 ? 'text-[#ef4444]' : 'text-white/75');

    checkGameOver(totalEquity);
  }

  // =========================================================================
  // 5. TIME SPEED MULTIPLIER & INCONSPICUOUS 20S POST-TRADE BIAS ENGINE
  // =========================================================================
  function syncSpeedButtons() {
    document.querySelectorAll('.speed-btn').forEach((btn) => {
      const sp = Number(btn.getAttribute('data-speed'));
      const active = sp === state.timeSpeed;
      btn.className = active
        ? 'speed-btn px-2 py-0.5 rounded-lg bg-white text-black font-bold cursor-pointer'
        : 'speed-btn px-2 py-0.5 rounded-lg text-white/65 hover:text-white cursor-pointer';
    });
  }

  document.querySelectorAll('.speed-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sp = Number(btn.getAttribute('data-speed'));
      if ([1, 2, 5, 10].includes(sp)) {
        state.timeSpeed = sp;
        syncSpeedButtons();
      }
    });
  });

  // Builds a realistic multi-candle post-entry price trajectory:
  // 50/50 up/down, 1%-10% net move over 25-40 seconds (at 1x speed),
  // using varied market patterns + per-candle zigzag so candles naturally mix red & green.
  function buildTradePatternKeyframes(pattern) {
    const r = (min, max) => min + Math.random() * (max - min);
    switch (pattern) {
      case 'fakeout_reversal':
        // Moves against final direction first (~0.45-0.65x), then reverses double that to target
        return [
          { t: 0.0, v: 0.0 },
          { t: r(0.14, 0.22), v: -r(0.28, 0.45) },
          { t: r(0.26, 0.34), v: -r(0.45, 0.65) },
          { t: r(0.42, 0.50), v: -r(0.05, 0.18) },
          { t: r(0.56, 0.64), v: r(0.32, 0.48) },
          { t: r(0.70, 0.78), v: r(0.16, 0.30) },
          { t: r(0.86, 0.92), v: r(0.82, 0.96) },
          { t: 1.0, v: 1.0 }
        ];
      case 'jagged_grind': {
        // Subtle slow stair-step with realistic alternating pullbacks
        const legs = 4 + Math.floor(Math.random() * 2); // 4-5 waves
        const pts = [{ t: 0.0, v: 0.0 }];
        for (let i = 1; i <= legs; i++) {
          const baseT = i / legs;
          const peakT = Math.max(pts[pts.length - 1].t + 0.05, baseT - r(0.06, 0.10));
          const peakV = Math.min(1.08, (i / legs) + r(0.06, 0.16));
          pts.push({ t: peakT, v: peakV });
          if (i < legs) {
            const dipV = peakV - r(0.16, 0.28);
            pts.push({ t: baseT, v: dipV });
          }
        }
        pts.push({ t: 1.0, v: 1.0 });
        return pts;
      }
      case 'shakeout_dip':
        // Initial dip (stop-hunt) against the move, brief base, then steady climb to target
        return [
          { t: 0.0, v: 0.0 },
          { t: r(0.14, 0.22), v: -r(0.30, 0.52) },
          { t: r(0.28, 0.36), v: -r(0.14, 0.28) },
          { t: r(0.44, 0.52), v: r(0.18, 0.34) },
          { t: r(0.58, 0.66), v: r(0.05, 0.18) },
          { t: r(0.76, 0.84), v: r(0.74, 0.88) },
          { t: r(0.88, 0.93), v: r(0.62, 0.76) },
          { t: 1.0, v: 1.0 }
        ];
      case 'consolidation_breakout':
        // Sideways chop around entry, breakout, retest, then continuation
        return [
          { t: 0.0, v: 0.0 },
          { t: r(0.10, 0.15), v: r(0.10, 0.20) },
          { t: r(0.20, 0.26), v: -r(0.12, 0.22) },
          { t: r(0.32, 0.38), v: r(0.06, 0.16) },
          { t: r(0.42, 0.48), v: -r(0.08, 0.16) },
          { t: r(0.64, 0.72), v: r(0.78, 0.94) },
          { t: r(0.78, 0.84), v: r(0.52, 0.68) },
          { t: 1.0, v: 1.0 }
        ];
      case 'staircase_flag':
        // Impulse leg -> tight counter-trend flag -> second leg breakout
        return [
          { t: 0.0, v: 0.0 },
          { t: r(0.18, 0.26), v: r(0.52, 0.68) },
          { t: r(0.32, 0.38), v: r(0.34, 0.46) },
          { t: r(0.44, 0.50), v: r(0.46, 0.58) },
          { t: r(0.56, 0.62), v: r(0.30, 0.42) },
          { t: r(0.80, 0.88), v: r(0.96, 1.10) },
          { t: r(0.91, 0.95), v: r(0.86, 0.94) },
          { t: 1.0, v: 1.0 }
        ];
      case 'overshoot_retrace':
        // Fast surge past target, sharp cool-off pullback, settle near target
        return [
          { t: 0.0, v: 0.0 },
          { t: r(0.12, 0.18), v: -r(0.08, 0.18) },
          { t: r(0.34, 0.44), v: r(1.18, 1.42) },
          { t: r(0.52, 0.60), v: r(0.74, 0.90) },
          { t: r(0.68, 0.76), v: r(1.06, 1.20) },
          { t: r(0.82, 0.89), v: r(0.82, 0.92) },
          { t: 1.0, v: 1.0 }
        ];
      case 'double_test':
      default:
        // W-bottom / M-top double test before breaking out to target
        return [
          { t: 0.0, v: 0.0 },
          { t: r(0.16, 0.22), v: -r(0.28, 0.42) },
          { t: r(0.32, 0.38), v: r(0.16, 0.30) },
          { t: r(0.48, 0.56), v: -r(0.20, 0.34) },
          { t: r(0.72, 0.80), v: r(0.76, 0.90) },
          { t: r(0.85, 0.90), v: r(0.60, 0.74) },
          { t: 1.0, v: 1.0 }
        ];
    }
  }

  function sampleKeyframes(keyframes, u) {
    if (u <= 0) return keyframes[0].v;
    if (u >= 1) return keyframes[keyframes.length - 1].v;
    for (let i = 0; i < keyframes.length - 1; i++) {
      const a = keyframes[i];
      const b = keyframes[i + 1];
      if (u >= a.t && u <= b.t) {
        const span = Math.max(1e-6, b.t - a.t);
        const local = (u - a.t) / span;
        const smooth = local * local * (3 - 2 * local);
        return a.v + (b.v - a.v) * smooth;
      }
    }
    return keyframes[keyframes.length - 1].v;
  }

  function startPostTradeWave(asset, tradeSide) {
    const patterns = [
      'fakeout_reversal',
      'jagged_grind',
      'shakeout_dip',
      'consolidation_breakout',
      'staircase_flag',
      'overshoot_retrace',
      'double_test'
    ];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    const dir = Math.random() < 0.5 ? 1 : -1; // 50/50 up or down
    const magnitude = 0.01 + Math.random() * 0.09; // 1% to 10%
    const duration = 25 + Math.random() * 15; // 25 to 40 seconds at 1x speed

    asset.tradeBias = {
      pattern,
      dir,
      magnitude,
      elapsed: 0,
      duration,
      startPrice: asset.price,
      keyframes: buildTradePatternKeyframes(pattern),
      jitterTimer: 0,
      jitterCurr: 0,
      jitterNext: 0
    };
  }

  let lastFrameTime = performance.now();
  let secondAccum = 0;
  let listRenderAccum = 0;

  function stepMarketWave() {
    for (const asset of Object.values(state.assets)) {
      if (asset.adRemainingSec > 0) {
        asset.adRemainingSec = Math.max(0, asset.adRemainingSec - 1);
        if (asset.adRemainingSec === 0) {
          asset.adCampaignName = '';
          if (!asset.rugged) {
            asset.regimeLabel = asset.autoHype ? 'BOT HYPE SURGE' : 'STEADY LIQUIDITY';
          }
        }
      }

      if (asset.rugged) {
        const floor = Math.max(0.0000001, asset.price);
        asset.targetPrice = Math.max(0.0000001, floor * (0.94 + Math.random() * 0.09));
        continue;
      }

      asset.regimeTimer -= 1;
      if (asset.regimeTimer <= 0) {
        asset.regimeTimer = 6 + Math.floor(Math.random() * 14);
        const roll = Math.random();
        if (asset.adRemainingSec > 0) {
          asset.momentum = asset.vol * 1.45;
          asset.regimeLabel = `AD BOOST: ${asset.adCampaignName}`;
        } else if (asset.autoHype && roll < 0.65) {
          asset.momentum = asset.vol * 1.1;
          asset.regimeLabel = 'BOT HYPE SURGE';
        } else if (roll < 0.28) {
          asset.momentum = asset.vol * (0.5 + Math.random() * 0.8);
          asset.regimeLabel = 'BULLISH DRIFT';
        } else if (roll < 0.56) {
          asset.momentum = -asset.vol * (0.5 + Math.random() * 0.8);
          asset.regimeLabel = 'SELL PRESSURE';
        } else {
          asset.momentum = (Math.random() - 0.5) * asset.vol * 0.35;
          asset.regimeLabel = 'RANGE / CONSOLIDATION';
        }
      }

      let adPush = 0;
      if (asset.adRemainingSec > 0) {
        adPush = asset.vol * 0.55;
        asset.lpPool += Math.max(15, asset.lpPool * 0.015);
      } else if (asset.isUserCreated && asset.autoHype && asset.momentum > 0) {
        asset.lpPool += asset.lpPool * 0.008;
      }

      const noise = (Math.random() - 0.5) * 2 * asset.vol * 0.65;
      const stepPct = asset.momentum * 0.35 + adPush + noise;
      asset.targetPrice = Math.max(0.0000001, asset.targetPrice * (1 + stepPct));
      asset.momentum *= 0.92;
    }
  }

  function advanceNewCandle() {
    for (const asset of Object.values(state.assets)) {
      const prevClose = asset.price;
      const c = {
        open: prevClose,
        high: Math.max(prevClose, asset.targetPrice),
        low: Math.min(prevClose, asset.targetPrice),
        close: asset.price
      };
      asset.candles.push(c);
      if (asset.candles.length > 220) {
        asset.candles.shift();
      }
    }
  }

  function animationLoop(now) {
    const rawDt = Math.min(0.05, Math.max(0.001, (now - lastFrameTime) / 1000));
    lastFrameTime = now;
    const simDt = rawDt * state.timeSpeed;

    // Scaled market wave ticks
    secondAccum += simDt;
    while (secondAccum >= 1) {
      secondAccum -= 1;
      stepMarketWave();
    }

    // Smooth price interpolation with patterned 25-40s post-trade wave blended organically
    const lerpFactor = 1 - Math.exp(-simDt * 4.5);
    const biasBlend = 1 - Math.exp(-simDt * 2.2);
    for (const asset of Object.values(state.assets)) {
      if (asset.tradeBias && !asset.rugged) {
        const b = asset.tradeBias;
        b.elapsed = Math.min(b.duration, b.elapsed + simDt);
        const u = b.elapsed / b.duration;

        // Per-candle micro-zigzag so individual candles alternate red & green naturally
        b.jitterTimer -= simDt;
        if (b.jitterTimer <= 0) {
          b.jitterTimer = 1.1 + Math.random() * 1.3;
          // Alternate sign frequently around the pattern curve, tapering near endpoints
          const envelope = Math.sin(Math.PI * Math.min(1, Math.max(0, u)));
          const jitterAmp = Math.max(0.0025, b.magnitude * 0.22) * envelope;
          const flip = b.jitterNext === 0 ? (Math.random() < 0.5 ? 1 : -1) : -Math.sign(b.jitterNext);
          b.jitterNext = flip * jitterAmp * (0.45 + Math.random() * 0.75);
        }
        b.jitterCurr += (b.jitterNext - b.jitterCurr) * (1 - Math.exp(-simDt * 3.0));

        const patternVal = sampleKeyframes(b.keyframes, u);
        const pctOffset = b.dir * b.magnitude * patternVal + b.jitterCurr;
        const driftTarget = Math.max(0.0000001, b.startPrice * (1 + pctOffset));
        asset.targetPrice = asset.targetPrice + (driftTarget - asset.targetPrice) * biasBlend;
        if (b.elapsed >= b.duration) {
          asset.tradeBias = null;
        }
      }

      const nextPrice = asset.price + (asset.targetPrice - asset.price) * lerpFactor;
      asset.price = Math.max(0.0000001, nextPrice);

      const activeCandle = asset.candles[asset.candles.length - 1];
      if (activeCandle) {
        activeCandle.close = asset.price;
        if (asset.price > activeCandle.high) activeCandle.high = asset.price;
        if (asset.price < activeCandle.low) activeCandle.low = asset.price;
      }
    }

    checkLiquidations();

    // Advance candle formation smoothly
    state.candleElapsedMs += simDt * 1000;
    while (state.candleElapsedMs >= CANDLE_DURATION_MS) {
      state.candleElapsedMs -= CANDLE_DURATION_MS;
      advanceNewCandle();
    }

    listRenderAccum += rawDt;
    if (listRenderAccum >= 0.25) {
      listRenderAccum = 0;
      renderMarketList();
    }

    renderActiveAssetHeader();
    renderPositions();
    renderOrderTicket();
    updateHeaderStats();
    drawCandleChart(rawDt);

    requestAnimationFrame(animationLoop);
  }

  setInterval(saveProgress, 6000);

  function selectAsset(ticker) {
    if (!ticker || !state.assets[ticker]) return;
    state.selectedTicker = ticker;
    state.hoverCandleIndex = null;
    state.scaleMin = null;
    state.scaleMax = null;
    renderMarketList();
    renderActiveAssetHeader();
    renderPositions();
    renderOrderTicket();
    drawCandleChart(0.016);
  }

  // =========================================================================
  // 6. MARKET LIST RENDERING, EVENT DELEGATION & FILTERING
  // =========================================================================
  const marketListEl = document.getElementById('marketList');
  const searchInput = document.getElementById('marketSearch');

  marketListEl.addEventListener('pointerdown', (e) => {
    const row = e.target.closest('[data-ticker]');
    if (!row) return;
    const ticker = row.getAttribute('data-ticker');
    if (ticker && ticker !== state.selectedTicker) {
      selectAsset(ticker);
    }
  });

  marketListEl.addEventListener('click', (e) => {
    const row = e.target.closest('[data-ticker]');
    if (!row) return;
    const ticker = row.getAttribute('data-ticker');
    if (ticker) {
      selectAsset(ticker);
    }
  });

  searchInput.addEventListener('input', (e) => {
    state.search = e.target.value.trim().toUpperCase();
    renderMarketList();
  });

  document.querySelectorAll('.filter-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.filter = btn.getAttribute('data-filter');
      document.querySelectorAll('.filter-tab').forEach((b) => {
        const active = b.getAttribute('data-filter') === state.filter;
        b.className = active
          ? 'filter-tab py-1 rounded-lg bg-white text-black font-semibold cursor-pointer'
          : 'filter-tab py-1 rounded-lg text-white/65 hover:text-white cursor-pointer';
      });
      renderMarketList();
    });
  });

  function renderMarketList() {
    const list = Object.values(state.assets).filter((a) => {
      if (state.filter === 'CRYPTO' && a.category !== 'CRYPTO') return false;
      if (state.filter === 'STOCK' && a.category !== 'STOCK') return false;
      if (state.filter === 'MINE' && !a.isUserCreated) return false;
      if (state.search) {
        return (
          a.ticker.toUpperCase().includes(state.search) ||
          a.name.toUpperCase().includes(state.search)
        );
      }
      return true;
    });

    if (list.length === 0) {
      marketListEl.innerHTML = '<div class="py-8 text-center text-xs text-white/35">NO MATCHING ASSETS</div>';
      return;
    }

    marketListEl.innerHTML = list
      .map((a) => {
        const isSelected = a.ticker === state.selectedTicker;
        const chgPct = a.open24h > 0 ? ((a.price - a.open24h) / a.open24h) * 100 : 0;
        const isUp = chgPct >= 0;
        const pos = state.positions[a.ticker];
        const hasPos = pos && pos.qty > 1e-8;
        const posBadgeCls = pos?.side === 'SHORT'
          ? 'bg-[#ef4444]/20 text-[#ef4444]'
          : 'bg-[#22c55e]/20 text-[#22c55e]';

        return `
          <button
            type="button"
            data-ticker="${a.ticker}"
            class="market-row w-full text-left px-2.5 py-2 flex items-center justify-between gap-2 transition cursor-pointer ${
              isSelected ? 'bg-white/[0.14]' : 'hover:bg-white/[0.06]'
            }"
          >
            <div class="min-w-0 pointer-events-none">
              <div class="flex items-center gap-1.5">
                <span class="text-xs sm:text-sm font-bold text-white">${a.ticker}</span>
                <span class="text-[10px] text-white/40">${a.category}</span>
                ${hasPos ? `<span class="text-[10px] px-1 rounded ${posBadgeCls} font-bold">${pos.side} ${pos.leverage > 1 ? pos.leverage + 'x' : ''}</span>` : ''}
                ${a.rugged ? '<span class="text-[10px] text-[#ef4444] font-bold">RUG</span>' : ''}
              </div>
              <div class="text-[11px] text-white/45 truncate">${a.name}</div>
            </div>

            <div class="text-right shrink-0 tabular-nums pointer-events-none">
              <div class="text-xs sm:text-sm text-white">${formatPrice(a.price)}</div>
              <div class="text-[11px] ${isUp ? 'text-[#22c55e]' : 'text-[#ef4444]'}">
                ${isUp ? '+' : ''}${chgPct.toFixed(2)}%
              </div>
            </div>
          </button>
        `;
      })
      .join('');
  }

  // =========================================================================
  // 7. ACTIVE ASSET HEADER & CANDLESTICK CANVAS (ENTRY + LIQUIDATION LINES)
  // =========================================================================
  const candleCanvas = document.getElementById('candleCanvas');
  const candleCtx = candleCanvas.getContext('2d');

  function renderActiveAssetHeader() {
    const a = state.assets[state.selectedTicker];
    if (!a) return;

    document.getElementById('activeTicker').textContent = a.ticker;
    document.getElementById('activeName').textContent = a.name;
    document.getElementById('activeCategoryBadge').textContent = a.category;
    document.getElementById('activeNews').textContent = `REGIME: ${a.regimeLabel}`;
    document.getElementById('activePrice').textContent = formatPrice(a.price);

    const ruggedBadge = document.getElementById('activeRuggedBadge');
    ruggedBadge.classList.toggle('hidden', !a.rugged);

    const adLabel = document.getElementById('adStatusLabel');
    if (a.adRemainingSec > 0) {
      adLabel.textContent = `${a.adCampaignName} (${Math.ceil(a.adRemainingSec)}S)`;
      adLabel.className = 'text-[#22c55e] font-bold tabular-nums';
    } else {
      adLabel.textContent = 'NO ACTIVE AD';
      adLabel.className = 'text-white/40 tabular-nums';
    }

    const chgPct = a.open24h > 0 ? ((a.price - a.open24h) / a.open24h) * 100 : 0;
    const chgEl = document.getElementById('activeChange');
    chgEl.textContent = `${chgPct >= 0 ? '+' : ''}${chgPct.toFixed(2)}%`;
    chgEl.className = `text-xs sm:text-sm tabular-nums ${chgPct >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`;

    // Creator / Ads / Rugpull panel visibility
    const creatorPanel = document.getElementById('creatorPanel');
    if (a.isUserCreated) {
      creatorPanel.classList.remove('hidden');
      document.getElementById('lpPoolDisplay').textContent = `LP: ${formatPrice(a.lpPool)}`;
      const rugBtn = document.getElementById('rugpullBtn');
      if (a.rugged) {
        rugBtn.disabled = true;
        rugBtn.textContent = 'ALREADY RUGGED';
        rugBtn.className =
          'w-full py-2.5 rounded-xl bg-white/10 text-white/40 font-bold text-xs sm:text-sm uppercase cursor-not-allowed';
      } else {
        rugBtn.disabled = false;
        rugBtn.textContent = `⚠ RUGPULL ${a.ticker}`;
        rugBtn.className =
          'w-full py-2.5 rounded-xl bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold text-xs sm:text-sm tracking-wider uppercase transition cursor-pointer';
      }
    } else {
      creatorPanel.classList.add('hidden');
    }
  }

  document.querySelectorAll('.candle-count-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.visibleCandles = Number(btn.getAttribute('data-candles'));
      document.querySelectorAll('.candle-count-btn').forEach((b) => {
        const active = Number(b.getAttribute('data-candles')) === state.visibleCandles;
        b.className = active
          ? 'candle-count-btn px-2 py-0.5 rounded bg-white text-black font-semibold text-[11px] cursor-pointer'
          : 'candle-count-btn px-2 py-0.5 rounded bg-white/10 text-white text-[11px] cursor-pointer';
      });
      drawCandleChart();
    });
  });

  function getVisibleSlice(asset) {
    const len = asset.candles.length;
    const count = Math.min(len, state.visibleCandles);
    return asset.candles.slice(len - count);
  }

  function updateOhlcDisplay(c) {
    if (!c) return;
    document.getElementById('ohlcO').textContent = formatPrice(c.open);
    document.getElementById('ohlcH').textContent = formatPrice(c.high);
    document.getElementById('ohlcL').textContent = formatPrice(c.low);
    document.getElementById('ohlcC').textContent = formatPrice(c.close);
  }

  function getChartLiquidationInfo(asset) {
    const pos = state.positions[asset.ticker];
    if (pos && pos.qty > 1e-8 && pos.liqPrice > 0) {
      return { price: pos.liqPrice, isPreview: false, leverage: pos.leverage, side: pos.side };
    }
    if (state.leverage > 1) {
      return {
        price: computeLiqPrice(asset.price, state.leverage, state.side),
        isPreview: true,
        leverage: state.leverage,
        side: state.side
      };
    }
    return null;
  }

  function drawCandleChart(dt = 0.016) {
    const asset = state.assets[state.selectedTicker];
    if (!asset) return;

    const rect = candleCanvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(200, rect.width);
    const h = Math.max(180, rect.height);

    if (candleCanvas.width !== Math.floor(w * dpr) || candleCanvas.height !== Math.floor(h * dpr)) {
      candleCanvas.width = Math.floor(w * dpr);
      candleCanvas.height = Math.floor(h * dpr);
    }

    candleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    candleCtx.clearRect(0, 0, w, h);

    const slice = getVisibleSlice(asset);
    if (slice.length === 0) return;

    const inspected =
      state.hoverCandleIndex !== null && slice[state.hoverCandleIndex]
        ? slice[state.hoverCandleIndex]
        : slice[slice.length - 1];
    updateOhlcDisplay(inspected);

    const pos = state.positions[asset.ticker];
    const hasActivePos = pos && pos.qty > 1e-8 && pos.avgPrice > 0;
    const liqInfo = getChartLiquidationInfo(asset);

    let rawMin = Infinity;
    let rawMax = -Infinity;
    for (const c of slice) {
      if (c.low < rawMin) rawMin = c.low;
      if (c.high > rawMax) rawMax = c.high;
    }
    if (hasActivePos) {
      if (pos.avgPrice < rawMin) rawMin = pos.avgPrice;
      if (pos.avgPrice > rawMax) rawMax = pos.avgPrice;
    }
    if (liqInfo && liqInfo.price > 0) {
      if (liqInfo.price < rawMin) rawMin = liqInfo.price;
      if (liqInfo.price > rawMax) rawMax = liqInfo.price;
    }
    if (rawMin === rawMax) {
      rawMin *= 0.99;
      rawMax *= 1.01;
    }
    const pad = (rawMax - rawMin) * 0.1;
    const targetMin = rawMin - pad;
    const targetMax = rawMax + pad;

    const scaleLerp = 1 - Math.exp(-dt * 8);
    if (state.scaleMin === null || state.scaleMax === null) {
      state.scaleMin = targetMin;
      state.scaleMax = targetMax;
    } else {
      state.scaleMin += (targetMin - state.scaleMin) * scaleLerp;
      state.scaleMax += (targetMax - state.scaleMax) * scaleLerp;
    }

    const minP = state.scaleMin;
    const maxP = Math.max(minP + 1e-9, state.scaleMax);

    const rightMargin = 82;
    const topMargin = 14;
    const bottomMargin = 20;
    const plotW = Math.max(40, w - rightMargin);
    const plotH = Math.max(40, h - topMargin - bottomMargin);

    const priceToY = (p) => topMargin + (1 - (p - minP) / (maxP - minP)) * plotH;

    // Horizontal grid lines & price labels
    candleCtx.font = '11px "Bitcount Single", system-ui';
    candleCtx.textAlign = 'left';
    candleCtx.textBaseline = 'middle';

    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const frac = i / gridSteps;
      const p = minP + frac * (maxP - minP);
      const y = priceToY(p);

      candleCtx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
      candleCtx.lineWidth = 1;
      candleCtx.beginPath();
      candleCtx.moveTo(0, y);
      candleCtx.lineTo(plotW, y);
      candleCtx.stroke();

      candleCtx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      candleCtx.fillText(formatPrice(p), plotW + 6, y);
    }

    // Candlesticks
    const stepX = plotW / slice.length;
    const bodyW = Math.max(2, Math.min(14, stepX * 0.64));

    slice.forEach((c, idx) => {
      const cx = idx * stepX + stepX * 0.5;
      const isBull = c.close >= c.open;
      const color = isBull ? '#22c55e' : '#ef4444';

      const yHigh = priceToY(c.high);
      const yLow = priceToY(c.low);
      const yOpen = priceToY(c.open);
      const yClose = priceToY(c.close);

      candleCtx.strokeStyle = color;
      candleCtx.lineWidth = 1.25;
      candleCtx.beginPath();
      candleCtx.moveTo(cx, yHigh);
      candleCtx.lineTo(cx, yLow);
      candleCtx.stroke();

      const topY = Math.min(yOpen, yClose);
      const bodyH = Math.max(1.5, Math.abs(yClose - yOpen));
      candleCtx.fillStyle = color;
      candleCtx.fillRect(cx - bodyW * 0.5, topY, bodyW, bodyH);
    });

    // Current / Last price dashed line
    const lastPrice = slice[slice.length - 1].close;
    const lastY = priceToY(lastPrice);
    const lastIsBull = slice[slice.length - 1].close >= slice[slice.length - 1].open;

    candleCtx.save();
    candleCtx.setLineDash([4, 4]);
    candleCtx.strokeStyle = lastIsBull ? 'rgba(34, 197, 94, 0.55)' : 'rgba(239, 68, 68, 0.55)';
    candleCtx.lineWidth = 1;
    candleCtx.beginPath();
    candleCtx.moveTo(0, lastY);
    candleCtx.lineTo(plotW, lastY);
    candleCtx.stroke();
    candleCtx.restore();

    // White Horizontal Entry Price Line (when holding a position)
    if (hasActivePos) {
      const entryY = Math.min(topMargin + plotH, Math.max(topMargin, priceToY(pos.avgPrice)));
      candleCtx.save();
      candleCtx.strokeStyle = '#ffffff';
      candleCtx.lineWidth = 1.75;
      candleCtx.beginPath();
      candleCtx.moveTo(0, entryY);
      candleCtx.lineTo(plotW, entryY);
      candleCtx.stroke();

      const entryTag = `${pos.side} ENTRY: ${formatPrice(pos.avgPrice)}`;
      candleCtx.font = 'bold 10px "Bitcount Single", system-ui';
      const textW = candleCtx.measureText(entryTag).width;
      const badgeH = 16;
      const badgeY = Math.max(topMargin + 2, entryY - badgeH - 3);
      candleCtx.fillStyle = 'rgba(255, 255, 255, 0.94)';
      candleCtx.fillRect(6, badgeY, textW + 10, badgeH);
      candleCtx.fillStyle = '#000000';
      candleCtx.textAlign = 'left';
      candleCtx.textBaseline = 'middle';
      candleCtx.fillText(entryTag, 11, badgeY + badgeH * 0.5);

      candleCtx.fillStyle = '#ffffff';
      candleCtx.fillRect(plotW + 2, entryY - 8, rightMargin - 4, 16);
      candleCtx.fillStyle = '#000000';
      candleCtx.fillText(formatPrice(pos.avgPrice), plotW + 6, entryY);
      candleCtx.restore();
    }

    // Red Horizontal Liquidation Line (Active Position or Leveraged Order Preview)
    if (liqInfo && liqInfo.price > 0) {
      const liqY = Math.min(topMargin + plotH, Math.max(topMargin, priceToY(liqInfo.price)));
      candleCtx.save();
      candleCtx.setLineDash(liqInfo.isPreview ? [5, 4] : []);
      candleCtx.strokeStyle = '#ef4444';
      candleCtx.lineWidth = liqInfo.isPreview ? 1.5 : 2;
      candleCtx.beginPath();
      candleCtx.moveTo(0, liqY);
      candleCtx.lineTo(plotW, liqY);
      candleCtx.stroke();

      const tagText = liqInfo.isPreview
        ? `EST. LIQ (${liqInfo.leverage}x): ${formatPrice(liqInfo.price)}`
        : `LIQ (${liqInfo.leverage}x): ${formatPrice(liqInfo.price)}`;
      candleCtx.font = 'bold 10px "Bitcount Single", system-ui';
      const textW = candleCtx.measureText(tagText).width;
      const badgeH = 16;
      const badgeY = liqInfo.side === 'SHORT'
        ? Math.min(topMargin + plotH - badgeH - 2, liqY + 3)
        : Math.max(topMargin + 2, liqY - badgeH - 3);
      candleCtx.fillStyle = 'rgba(239, 68, 68, 0.92)';
      candleCtx.fillRect(6, badgeY, textW + 10, badgeH);
      candleCtx.fillStyle = '#ffffff';
      candleCtx.textAlign = 'left';
      candleCtx.textBaseline = 'middle';
      candleCtx.fillText(tagText, 11, badgeY + badgeH * 0.5);

      candleCtx.fillStyle = '#ef4444';
      candleCtx.fillRect(plotW + 2, liqY - 8, rightMargin - 4, 16);
      candleCtx.fillStyle = '#ffffff';
      candleCtx.fillText(formatPrice(liqInfo.price), plotW + 6, liqY);
      candleCtx.restore();
    }

    // Hover Crosshair
    if (state.hoverCandleIndex !== null && slice[state.hoverCandleIndex]) {
      const hx = state.hoverCandleIndex * stepX + stepX * 0.5;
      const hy = priceToY(slice[state.hoverCandleIndex].close);

      candleCtx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      candleCtx.lineWidth = 1;
      candleCtx.beginPath();
      candleCtx.moveTo(hx, topMargin);
      candleCtx.lineTo(hx, topMargin + plotH);
      candleCtx.moveTo(0, hy);
      candleCtx.lineTo(plotW, hy);
      candleCtx.stroke();
    }
  }

  candleCanvas.addEventListener('mousemove', (e) => {
    const asset = state.assets[state.selectedTicker];
    if (!asset) return;
    const rect = candleCanvas.getBoundingClientRect();
    const rightMargin = 82;
    const plotW = Math.max(40, rect.width - rightMargin);
    const x = e.clientX - rect.left;
    const slice = getVisibleSlice(asset);
    if (x >= 0 && x <= plotW && slice.length > 0) {
      const idx = Math.min(slice.length - 1, Math.max(0, Math.floor((x / plotW) * slice.length)));
      state.hoverCandleIndex = idx;
      drawCandleChart();
    }
  });

  candleCanvas.addEventListener('mouseleave', () => {
    state.hoverCandleIndex = null;
    drawCandleChart();
  });

  window.addEventListener('resize', () => drawCandleChart(0.016));

  // =========================================================================
  // 8. LONG / SHORT EXECUTION, CLOSE & CLOSE ALL POSITIONS
  // =========================================================================
  const sideLongBtn = document.getElementById('sideLongBtn');
  const sideShortBtn = document.getElementById('sideShortBtn');
  const sideSliderThumb = document.getElementById('sideSliderThumb');
  const amountInput = document.getElementById('orderAmountInput');
  const executeBtn = document.getElementById('executeOrderBtn');
  const closePositionBtn = document.getElementById('closePositionBtn');
  const closeAllPositionsBtn = document.getElementById('closeAllPositionsBtn');
  const leverageSlider = document.getElementById('leverageSlider');
  const leverageValueLabel = document.getElementById('leverageValueLabel');

  function syncLeverageControls() {
    leverageSlider.value = String(state.leverage);
    leverageValueLabel.textContent = `${state.leverage}x`;
    document.querySelectorAll('.lev-preset-btn').forEach((btn) => {
      const preset = Number(btn.getAttribute('data-lev'));
      const active = preset === state.leverage;
      btn.className = active
        ? 'lev-preset-btn py-1 rounded bg-white text-black font-bold cursor-pointer'
        : 'lev-preset-btn py-1 rounded bg-white/[0.07] hover:bg-white/[0.15] text-white/80 cursor-pointer';
    });
  }

  leverageSlider.addEventListener('input', () => {
    state.leverage = Math.min(100, Math.max(1, parseInt(leverageSlider.value, 10) || 1));
    syncLeverageControls();
    renderOrderTicket();
    drawCandleChart();
  });

  document.querySelectorAll('.lev-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.leverage = Math.min(100, Math.max(1, parseInt(btn.getAttribute('data-lev'), 10) || 1));
      syncLeverageControls();
      renderOrderTicket();
      drawCandleChart();
    });
  });

  function setSide(newSide) {
    state.side = newSide === 'SHORT' ? 'SHORT' : 'LONG';
    if (state.side === 'LONG') {
      sideSliderThumb.style.transform = 'translateX(0%)';
      sideSliderThumb.className =
        'absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg bg-[#22c55e] transition-all duration-200 pointer-events-none';
      sideLongBtn.className = 'relative z-10 py-1.5 rounded-lg text-black font-bold cursor-pointer transition-colors';
      sideShortBtn.className = 'relative z-10 py-1.5 rounded-lg text-white/70 hover:text-white font-bold cursor-pointer transition-colors';
      executeBtn.className =
        'w-full py-3 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold text-sm tracking-wide transition cursor-pointer';
    } else {
      sideSliderThumb.style.transform = 'translateX(100%)';
      sideSliderThumb.className =
        'absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg bg-[#ef4444] transition-all duration-200 pointer-events-none';
      sideShortBtn.className = 'relative z-10 py-1.5 rounded-lg text-white font-bold cursor-pointer transition-colors';
      sideLongBtn.className = 'relative z-10 py-1.5 rounded-lg text-white/70 hover:text-white font-bold cursor-pointer transition-colors';
      executeBtn.className =
        'w-full py-3 rounded-xl bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold text-sm tracking-wide transition cursor-pointer';
    }
    renderOrderTicket();
    drawCandleChart();
  }

  sideLongBtn.addEventListener('click', () => setSide('LONG'));
  sideShortBtn.addEventListener('click', () => setSide('SHORT'));

  function closeSinglePosition(ticker, silent = false) {
    const pos = state.positions[ticker];
    const asset = state.assets[ticker];
    if (!pos || !asset || pos.qty <= 1e-8) return 0;

    const realizedPnl = getUnrealizedPnl(pos, asset.price);
    const cashReturned = Math.max(0, pos.margin + realizedPnl);
    state.cash += cashReturned;
    delete state.positions[ticker];

    if (!silent) {
      const pnlSign = realizedPnl >= 0 ? '+' : '';
      addLog(`CLOSED ${pos.side} ${ticker} (${pnlSign}${formatPrice(realizedPnl)}) -> ${formatPrice(cashReturned)}`, 'sell');
      notifyStatus(`CLOSED ${pos.side} ${ticker} (${pnlSign}${formatPrice(realizedPnl)})`);
    }
    return cashReturned;
  }

  closePositionBtn.addEventListener('click', () => {
    const ticker = state.selectedTicker;
    const pos = state.positions[ticker];
    if (!pos || pos.qty <= 1e-8) return;

    closeSinglePosition(ticker, false);
    saveProgress();
    renderMarketList();
    renderActiveAssetHeader();
    renderPositions();
    renderOrderTicket();
    updateHeaderStats();
    drawCandleChart(0.016);
  });

  closeAllPositionsBtn.addEventListener('click', () => {
    const tickers = Object.keys(state.positions).filter((t) => state.positions[t]?.qty > 1e-8);
    if (tickers.length === 0) return;

    let totalReturned = 0;
    let totalPnl = 0;
    for (const t of tickers) {
      const pos = state.positions[t];
      const asset = state.assets[t];
      if (pos && asset) {
        totalPnl += getUnrealizedPnl(pos, asset.price);
      }
      totalReturned += closeSinglePosition(t, true);
    }

    const sign = totalPnl >= 0 ? '+' : '';
    addLog(`CLOSED ALL (${tickers.length}) POSITIONS (${sign}${formatPrice(totalPnl)})`, 'sell');
    notifyStatus(`CLOSED ALL ${tickers.length} POSITIONS (${sign}${formatPrice(totalPnl)})`);

    saveProgress();
    renderMarketList();
    renderActiveAssetHeader();
    renderPositions();
    renderOrderTicket();
    updateHeaderStats();
    drawCandleChart(0.016);
  });

  function renderOrderTicket() {
    const asset = state.assets[state.selectedTicker];
    if (!asset) return;

    const pos = state.positions[asset.ticker];
    const hasPos = pos && pos.qty > 1e-8;
    const unrealized = hasPos ? getUnrealizedPnl(pos, asset.price) : 0;

    document.getElementById('ticketCash').textContent = formatPrice(state.cash);
    document.getElementById('ticketHeldTicker').textContent = asset.ticker;

    const heldEl = document.getElementById('ticketHeldQty');
    if (hasPos) {
      heldEl.textContent = `${pos.side} ${formatQty(pos.qty)}${pos.leverage > 1 ? ` (${pos.leverage}x)` : ''}`;
      heldEl.className = pos.side === 'SHORT' ? 'text-[#ef4444] font-semibold' : 'text-[#22c55e] font-semibold';
    } else {
      heldEl.textContent = 'NONE';
      heldEl.className = 'text-white/60';
    }

    document.getElementById('ticketAvgEntry').textContent = hasPos ? formatPrice(pos.avgPrice) : '$0.00';

    const liqEl = document.getElementById('ticketLiqPrice');
    if (hasPos && pos.liqPrice > 0) {
      liqEl.textContent = formatPrice(pos.liqPrice);
    } else if (state.leverage > 1) {
      liqEl.textContent = `EST. ${formatPrice(computeLiqPrice(asset.price, state.leverage, state.side))}`;
    } else {
      liqEl.textContent = 'NONE';
    }

    const unrlEl = document.getElementById('ticketUnrealized');
    unrlEl.textContent = `${unrealized >= 0 ? '+' : ''}${formatPrice(unrealized)}`;
    unrlEl.className = unrealized > 0.005 ? 'text-[#22c55e]' : unrealized < -0.005 ? 'text-[#ef4444]' : 'text-white/80';

    const val = parseFloat(amountInput.value) || 0;
    const estEl = document.getElementById('estimatedUnitsOrUsd');
    const levSuffix = state.leverage > 1 ? ` (${state.leverage}x)` : '';
    executeBtn.textContent = `${state.side} ${asset.ticker}${levSuffix}`;

    const notional = val * state.leverage;
    const units = asset.price > 0 ? notional / asset.price : 0;
    estEl.textContent =
      state.leverage > 1
        ? `POS ${formatPrice(notional)} (≈ ${formatQty(units)})`
        : `≈ ${formatQty(units)} ${asset.ticker}`;

    if (hasPos) {
      const pnlSign = unrealized >= 0 ? '+' : '';
      closePositionBtn.classList.remove('hidden');
      closePositionBtn.textContent = `CLOSE ${pos.side} ${asset.ticker} (${pnlSign}${formatPrice(unrealized)})`;
    } else {
      closePositionBtn.classList.add('hidden');
    }
  }

  amountInput.addEventListener('input', renderOrderTicket);

  document.querySelectorAll('.pct-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pct = parseFloat(btn.getAttribute('data-pct'));
      amountInput.value = (state.cash * pct).toFixed(2);
      renderOrderTicket();
    });
  });

  executeBtn.addEventListener('click', () => {
    const asset = state.assets[state.selectedTicker];
    if (!asset || asset.price <= 0) return;

    const rawVal = parseFloat(amountInput.value);
    if (!isFinite(rawVal) || rawVal <= 0) {
      notifyStatus('ENTER A VALID POSITIVE MARGIN AMOUNT', true);
      return;
    }

    const marginAmount = Math.min(rawVal, state.cash);
    if (marginAmount < 0.01) {
      notifyStatus('INSUFFICIENT CASH BALANCE', true);
      return;
    }

    const existing = state.positions[asset.ticker];
    if (existing && existing.qty > 1e-8 && existing.side !== state.side) {
      notifyStatus(`CLOSE YOUR ${existing.side} ${asset.ticker} POSITION FIRST`, true);
      return;
    }

    const lev = state.leverage;
    const notionalUsd = marginAmount * lev;
    const orderQty = notionalUsd / asset.price;
    state.cash -= marginAmount;

    const basePos = existing && existing.qty > 1e-8
      ? existing
      : { side: state.side, qty: 0, avgPrice: 0, margin: 0, liqPrice: 0, leverage: lev };

    const totalNotional = basePos.qty * basePos.avgPrice + notionalUsd;
    const newQty = basePos.qty + orderQty;
    const newMargin = basePos.margin + marginAmount;
    const newAvgPrice = newQty > 0 ? totalNotional / newQty : asset.price;
    const effectiveLev = newMargin > 0 ? Math.max(1, Math.round(totalNotional / newMargin)) : lev;
    const newLiqPrice =
      newMargin < totalNotional * 0.999
        ? (state.side === 'SHORT'
            ? (totalNotional + newMargin) / newQty
            : Math.max(0.00000001, (totalNotional - newMargin) / newQty))
        : 0;

    state.positions[asset.ticker] = {
      side: state.side,
      qty: newQty,
      avgPrice: newAvgPrice,
      margin: newMargin,
      liqPrice: newLiqPrice,
      leverage: effectiveLev
    };

    startPostTradeWave(asset, state.side);

    amountInput.value = '';
    const levTag = lev > 1 ? ` (${lev}x)` : '';
    addLog(`OPENED ${state.side} ${formatQty(orderQty)} ${asset.ticker}${levTag} @ ${formatPrice(asset.price)}`, 'buy');
    notifyStatus(`OPENED ${state.side} ${formatQty(orderQty)} ${asset.ticker}${levTag}`);
    saveProgress();

    renderMarketList();
    renderActiveAssetHeader();
    renderPositions();
    renderOrderTicket();
    updateHeaderStats();
    drawCandleChart(0.016);
  });

  function renderPositions() {
    const container = document.getElementById('positionsContainer');
    const entries = Object.entries(state.positions).filter(([, p]) => p && p.qty > 1e-8);
    document.getElementById('positionsCount').textContent = `${entries.length} ASSET${entries.length === 1 ? '' : 'S'}`;

    if (entries.length === 0) {
      closeAllPositionsBtn.classList.add('hidden');
      container.innerHTML = '<div class="text-xs text-white/35 py-3 text-center">NO ACTIVE POSITIONS — OPEN A LONG OR SHORT</div>';
      return;
    }

    closeAllPositionsBtn.classList.remove('hidden');

    container.innerHTML = `
      <table class="w-full text-left border-collapse text-xs tabular-nums">
        <thead>
          <tr class="text-white/40 border-b border-white/10">
            <th class="py-1.5 pr-2 font-normal">TICKER</th>
            <th class="py-1.5 px-2 font-normal">SIDE</th>
            <th class="py-1.5 px-2 font-normal">SIZE</th>
            <th class="py-1.5 px-2 font-normal">ENTRY</th>
            <th class="py-1.5 px-2 font-normal">LIQ.</th>
            <th class="py-1.5 px-2 font-normal">MARK</th>
            <th class="py-1.5 pl-2 text-right font-normal">PNL</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/[0.06]">
          ${entries
            .map(([ticker, pos]) => {
              const asset = state.assets[ticker];
              if (!asset) return '';
              const pnl = getUnrealizedPnl(pos, asset.price);
              const pnlCls = pnl >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]';
              const sideCls = pos.side === 'SHORT'
                ? 'bg-[#ef4444]/20 text-[#ef4444]'
                : 'bg-[#22c55e]/20 text-[#22c55e]';
              return `
                <tr data-select="${ticker}" class="pos-row hover:bg-white/[0.05] cursor-pointer">
                  <td class="py-2 pr-2 font-bold text-white">
                    ${ticker}
                    ${pos.leverage > 1 ? `<span class="ml-1 text-[10px] px-1 py-0.5 rounded bg-white/10 text-white/85">${pos.leverage}x</span>` : ''}
                  </td>
                  <td class="py-2 px-2">
                    <span class="text-[10px] px-1.5 py-0.5 rounded font-bold ${sideCls}">${pos.side}</span>
                  </td>
                  <td class="py-2 px-2 text-white/85">${formatQty(pos.qty)}</td>
                  <td class="py-2 px-2 text-white/60">${formatPrice(pos.avgPrice)}</td>
                  <td class="py-2 px-2 text-[#ef4444]">${pos.liqPrice > 0 ? formatPrice(pos.liqPrice) : '-'}</td>
                  <td class="py-2 px-2 text-white">${formatPrice(asset.price)}</td>
                  <td class="py-2 pl-2 text-right font-semibold ${pnlCls}">${pnl >= 0 ? '+' : ''}${formatPrice(pnl)}</td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    `;

    container.querySelectorAll('.pos-row').forEach((tr) => {
      tr.addEventListener('click', () => {
        selectAsset(tr.getAttribute('data-select'));
      });
    });
  }

  // =========================================================================
  // 9. CREATE CUSTOM COIN, PAID ADS & RUGPULL MECHANIC
  // =========================================================================
  const makeCoinModal = document.getElementById('makeCoinModal');
  const openMakeCoinBtn = document.getElementById('openMakeCoinBtn');
  const closeMakeCoinBtn = document.getElementById('closeMakeCoinBtn');
  const cancelMakeCoinBtn = document.getElementById('cancelMakeCoinBtn');
  const makeCoinForm = document.getElementById('makeCoinForm');
  const newCoinLpInput = document.getElementById('newCoinLp');
  const newCoinLpMaxLabel = document.getElementById('newCoinLpMaxLabel');
  const newCoinAutoHypeCheckbox = document.getElementById('newCoinAutoHype');
  const createCoinSubmitBtn = document.getElementById('createCoinSubmitBtn');

  function syncMakeCoinLimitsAndCost() {
    const hypeEnabled = newCoinAutoHypeCheckbox.checked;
    const hypeFee = hypeEnabled ? HYPE_WAVE_COST : 0;
    const maxLp = Math.max(0, state.cash - hypeFee);

    newCoinLp.max = String(maxLp);
    newCoinLpMaxLabel.textContent = `MAX ${formatPrice(maxLp)}`;

    const currentLp = parseFloat(newCoinLp.value) || 0;
    const totalCost = currentLp + hypeFee;
    createCoinSubmitBtn.textContent = `CREATE (${formatPrice(totalCost)})`;
  }

  newCoinLpInput.addEventListener('input', syncMakeCoinLimitsAndCost);
  newCoinAutoHypeCheckbox.addEventListener('change', syncMakeCoinLimitsAndCost);

  function openModal() {
    makeCoinModal.classList.remove('hidden');
    makeCoinModal.classList.add('flex');
    syncMakeCoinLimitsAndCost();
    document.getElementById('newCoinTicker').focus();
  }

  function closeModal() {
    makeCoinModal.classList.add('hidden');
    makeCoinModal.classList.remove('flex');
  }

  openMakeCoinBtn.addEventListener('click', openModal);
  closeMakeCoinBtn.addEventListener('click', closeModal);
  cancelMakeCoinBtn.addEventListener('click', closeModal);
  makeCoinModal.addEventListener('click', (e) => {
    if (e.target === makeCoinModal) closeModal();
  });

  makeCoinForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const tickerRaw = document.getElementById('newCoinTicker').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const nameRaw = document.getElementById('newCoinName').value.trim();
    const priceVal = parseFloat(document.getElementById('newCoinPrice').value);
    const lpVal = parseFloat(newCoinLp.value);
    const volVal = parseFloat(document.getElementById('newCoinVol').value);
    const devShare = parseFloat(document.getElementById('newCoinDevAlloc').value);
    const autoHype = newCoinAutoHypeCheckbox.checked;
    const hypeFee = autoHype ? HYPE_WAVE_COST : 0;
    const totalCost = lpVal + hypeFee;

    if (!tickerRaw || tickerRaw.length < 2) {
      notifyStatus('TICKER MUST BE AT LEAST 2 LETTERS/NUMBERS', true);
      return;
    }
    if (state.assets[tickerRaw]) {
      notifyStatus(`TICKER ${tickerRaw} ALREADY EXISTS`, true);
      return;
    }
    if (!isFinite(priceVal) || priceVal <= 0 || !isFinite(lpVal) || lpVal < 1) {
      notifyStatus('ENTER VALID POSITIVE PRICE & LIQUIDITY', true);
      return;
    }
    if (totalCost > state.cash + 1e-6) {
      notifyStatus(`INSUFFICIENT CASH — NEED ${formatPrice(totalCost)}`, true);
      return;
    }

    state.cash = Math.max(0, state.cash - totalCost);

    const totalSupply = Math.min(1e12, lpVal / priceVal);
    const devTokens = totalSupply * devShare;

    state.positions[tickerRaw] = {
      side: 'LONG',
      qty: devTokens,
      avgPrice: 0,
      margin: 0,
      liqPrice: 0,
      leverage: 1
    };

    const initCandle = {
      open: priceVal * 0.96,
      high: priceVal * 1.04,
      low: priceVal * 0.95,
      close: priceVal
    };

    state.assets[tickerRaw] = {
      ticker: tickerRaw,
      name: nameRaw || `${tickerRaw} Token`,
      category: 'CRYPTO',
      price: priceVal,
      targetPrice: priceVal * (autoHype ? 1.04 : 1.01),
      open24h: priceVal,
      vol: volVal,
      momentum: autoHype ? volVal * 0.9 : volVal * 0.3,
      regimeTimer: 8,
      regimeLabel: autoHype ? 'BOT HYPE SURGE' : 'FRESH LAUNCH',
      isUserCreated: true,
      autoHype,
      adRemainingSec: 0,
      adCampaignName: '',
      lpPool: lpVal,
      devSupply: devTokens,
      rugged: false,
      tradeBias: null,
      candles: [initCandle]
    };

    state.stats.coinsCreated += 1;
    state.selectedTicker = tickerRaw;
    state.scaleMin = null;
    state.scaleMax = null;

    closeModal();
    makeCoinForm.reset();
    document.getElementById('newCoinPrice').value = '1.25';
    newCoinLp.value = String(Math.min(5000, Math.max(1, Math.floor(state.cash))));
    newCoinAutoHypeCheckbox.checked = true;

    addLog(
      `LAUNCHED ${tickerRaw} (LP ${formatPrice(lpVal)}${autoHype ? ' + $2,500 HYPE' : ''})`,
      'buy'
    );
    notifyStatus(`LAUNCHED ${tickerRaw} — TOTAL COST ${formatPrice(totalCost)}`);

    saveProgress();
    renderMarketList();
    renderActiveAssetHeader();
    renderPositions();
    renderOrderTicket();
    updateHeaderStats();
    drawCandleChart(0.016);
  });

  // Paid Ads Purchase for Custom Coin
  document.querySelectorAll('.ad-buy-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const asset = state.assets[state.selectedTicker];
      if (!asset || !asset.isUserCreated) return;
      if (asset.rugged) {
        notifyStatus('CANNOT RUN ADS ON A RUGGED COIN', true);
        return;
      }

      const cost = parseFloat(btn.getAttribute('data-ad-cost'));
      const secs = parseInt(btn.getAttribute('data-ad-secs'), 10);
      const adName = btn.getAttribute('data-ad-name');

      if (state.cash < cost) {
        notifyStatus(`NEED ${formatPrice(cost)} CASH FOR ${adName}`, true);
        return;
      }

      state.cash -= cost;
      asset.adRemainingSec += secs;
      asset.adCampaignName = adName;
      asset.momentum = asset.vol * 1.5;
      asset.regimeLabel = `AD BOOST: ${adName}`;
      asset.targetPrice *= 1.06 + Math.min(0.18, cost / 150000);
      asset.lpPool += cost * 0.4;

      state.stats.adsBought += 1;
      addLog(`BOUGHT ${adName} (${secs}S) ON ${asset.ticker} FOR ${formatPrice(cost)}`, 'buy');
      notifyStatus(`AD LIVE: ${adName} BOOSTING ${asset.ticker}`);

      saveProgress();
      renderActiveAssetHeader();
      renderOrderTicket();
      updateHeaderStats();
    });
  });

  // Rugpull Action
  document.getElementById('rugpullBtn').addEventListener('click', () => {
    const asset = state.assets[state.selectedTicker];
    if (!asset || !asset.isUserCreated || asset.rugged) return;

    const pos = state.positions[asset.ticker];
    const heldQty = pos && pos.side === 'LONG' ? pos.qty : 0;

    const preRugTokenValue = heldQty * asset.price;
    const rugProceeds = asset.lpPool + preRugTokenValue;

    state.cash += rugProceeds;
    asset.lpPool = 0;
    asset.rugged = true;
    asset.tradeBias = null;
    asset.adRemainingSec = 0;
    asset.adCampaignName = '';
    asset.momentum = 0;
    asset.regimeLabel = 'LIQUIDITY DRAINED [RUGGED]';

    if (pos) {
      delete state.positions[asset.ticker];
    }

    const prevClose = asset.price;
    const crashedPrice = Math.max(0.0000001, prevClose * 0.008);
    asset.price = crashedPrice;
    asset.targetPrice = crashedPrice;
    asset.candles.push({
      open: prevClose,
      high: prevClose * 1.01,
      low: crashedPrice * 0.85,
      close: crashedPrice
    });
    if (asset.candles.length > 220) asset.candles.shift();

    state.stats.rugpulls += 1;
    state.scaleMin = null;
    state.scaleMax = null;

    addLog(`RUGPULLED ${asset.ticker}! DRAINED ${formatPrice(rugProceeds)}`, 'rug');
    notifyStatus(`RUGPULLED ${asset.ticker} — EXTRACTED ${formatPrice(rugProceeds)}`);

    saveProgress();
    renderMarketList();
    renderActiveAssetHeader();
    renderPositions();
    renderOrderTicket();
    updateHeaderStats();
    drawCandleChart(0.016);
  });

  // =========================================================================
  // 10. INITIAL BOOT
  // =========================================================================
  loadProgress();
  syncSpeedButtons();
  syncLeverageControls();
  setSide('LONG');
  renderMarketList();
  renderActiveAssetHeader();
  renderPositions();
  renderOrderTicket();
  updateHeaderStats();
  drawCandleChart(0.016);
  requestAnimationFrame(animationLoop);
})();
