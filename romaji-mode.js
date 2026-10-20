// ===== ローマ字モード =====
const ROMAJI_STORAGE_KEY = 'kanjiTyping.romajiProgress';
const KEYBOARD_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const ALL_KEYS = KEYBOARD_ROWS.join('');

const FINGER_COLORS = {
  '左小指': '#f48fb1', '右小指': '#f48fb1',
  '左薬指': '#ffcc80', '右薬指': '#ffcc80',
  '左中指': '#fff176', '右中指': '#fff176',
  '左人差指': '#a5d6a7', '右人差指': '#81d4fa',
};

const ROMAJI_SYLLABLES = ('か き く け こ さ し す せ そ た ち つ て と な に ぬ ね の '
  + 'は ひ ふ へ ほ ま み む め も や ゆ よ ら り る れ ろ わ '
  + 'が ぎ ぐ げ ご ざ じ ず ぜ ぞ だ で ど ば び ぶ べ ぼ ぱ ぴ ぷ ぺ ぽ '
  + 'きゃ しゃ ちゃ きょ しょ ちょ りょ').split(' ');

const ROMAJI_WORDS = ('いぬ ねこ うみ やま そら はな あめ くも ほし つき さかな とり うし うま '
  + 'りんご みかん いちご すいか ともだち がっこう せんせい えんぴつ きょうしつ でんしゃ '
  + 'かぞく おにぎり しゅくだい ひこうき じてんしゃ たまご くるま つくえ さくら にじ '
  + 'ゆき かみなり どうぶつ おまつり ぼうし').split(' ');

// 1行 → 2行 → 3行 と段階的にむずかしくなる
const ROMAJI_LEVELS = [
  { name: 'ホームポジション', desc: 'F J D K S L A', type: 'keys', keys: 'fjdksla', lines: 1, rounds: 5 },
  { name: 'まんなかの段', desc: 'G と H もつかうよ', type: 'keys', keys: 'asdfghjkl', lines: 1, rounds: 5 },
  { name: 'うえの段', desc: 'Q W E R T Y U I O P', type: 'keys', keys: 'qwertyuiop', lines: 1, rounds: 5 },
  { name: 'したの段', desc: 'Z X C V B N M', type: 'keys', keys: 'zxcvbnm', lines: 1, rounds: 5 },
  { name: 'ぜんぶの段', desc: '2行にチャレンジ！', type: 'keys', keys: ALL_KEYS, lines: 2, rounds: 4 },
  { name: 'ローマ字のおと', desc: 'KA SHI TSU …', type: 'syllables', lines: 2, rounds: 4 },
  { name: 'ことば', desc: 'たんごを打とう', type: 'words', lines: 2, rounds: 4 },
  { name: 'ことばマスター', desc: '3行でフィニッシュ！', type: 'words', lines: 3, rounds: 3 },
];

const COMBO_MESSAGES = { 10: 'いいね！', 20: 'すごい！', 30: 'フィーバー！', 50: 'てんさい！', 75: 'ちょうてんさい！', 100: 'でんせつ！' };

const romaji = {
  levelIndex: 0,
  round: 0,
  chars: [],
  pos: 0,
  combo: 0,
  maxCombo: 0,
  correctKeys: 0,
  totalKeys: 0,
  score: 0,
  playing: false,
  startTime: 0,
  timer: null,
  keyEls: {},
  dom: {},
};

function loadRomajiProgress() {
  try {
    return JSON.parse(localStorage.getItem(ROMAJI_STORAGE_KEY)) || { unlocked: 1, stars: {} };
  } catch {
    return { unlocked: 1, stars: {} };
  }
}

function saveRomajiProgress(progress) {
  try {
    localStorage.setItem(ROMAJI_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // プライベートブラウズなどで保存できなくても遊べるようにする
  }
}

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ===== 問題づくり =====
function buildRomajiLine(level) {
  if (level.type === 'keys') {
    return Array.from({ length: 4 }, () => {
      let group = '';
      for (let i = 0; i < 3; i++) group += pickRandom(level.keys);
      return { kana: null, segments: [group] };
    });
  }
  const source = level.type === 'syllables' ? ROMAJI_SYLLABLES : ROMAJI_WORDS;
  const count = level.type === 'syllables' ? 5 : 3;
  const used = new Set();
  const tokens = [];
  while (tokens.length < count) {
    const kana = pickRandom(source);
    if (used.has(kana)) continue;
    used.add(kana);
    tokens.push({ kana, segments: convertToRomajiSegments(kana) });
  }
  return tokens;
}

function renderRomajiPrompt(lines) {
  const container = romaji.dom.promptLines;
  container.innerHTML = '';
  romaji.chars = [];

  lines.forEach((tokens, lineIndex) => {
    const lineEl = document.createElement('div');
    lineEl.className = 'prompt-line';
    lineEl.style.animationDelay = `${lineIndex * 0.12}s`;

    tokens.forEach((token) => {
      const tokenEl = document.createElement('span');
      tokenEl.className = 'token';
      if (token.kana) {
        const kanaEl = document.createElement('span');
        kanaEl.className = 'token-kana';
        kanaEl.textContent = token.kana;
        tokenEl.appendChild(kanaEl);
      }
      const romajiEl = document.createElement('span');
      romajiEl.className = 'token-romaji';
      token.segments.forEach((segment, segIndex) => {
        if (segIndex > 0) {
          const sep = document.createElement('span');
          sep.className = 'sep';
          sep.textContent = '-';
          romajiEl.appendChild(sep);
        }
        for (const ch of segment) {
          const chEl = document.createElement('span');
          chEl.className = 'ch';
          chEl.textContent = ch.toUpperCase();
          romajiEl.appendChild(chEl);
          romaji.chars.push({ ch, el: chEl, lineEl, lastInLine: false });
        }
      });
      tokenEl.appendChild(romajiEl);
      lineEl.appendChild(tokenEl);
    });

    romaji.chars[romaji.chars.length - 1].lastInLine = true;
    container.appendChild(lineEl);
  });
}

// ===== キーボード表示 =====
function buildRomajiKeyboard() {
  const kb = romaji.dom.keyboard;
  kb.innerHTML = '';
  KEYBOARD_ROWS.forEach((row, rowIndex) => {
    const rowEl = document.createElement('div');
    rowEl.className = `kb-row kb-row-${rowIndex}`;
    for (const ch of row) {
      const key = document.createElement('div');
      key.className = 'kb-key';
      key.textContent = ch.toUpperCase();
      key.style.setProperty('--key-color', FINGER_COLORS[keyToFinger[ch]]);
      if (ch === 'f' || ch === 'j') key.classList.add('homing');
      romaji.keyEls[ch] = key;
      rowEl.appendChild(key);
    }
    kb.appendChild(rowEl);
  });
}

function setKeyboardLevel(level) {
  const active = level.type === 'keys' ? level.keys : ALL_KEYS;
  for (const [ch, el] of Object.entries(romaji.keyEls)) {
    el.classList.toggle('off', !active.includes(ch));
    el.classList.remove('next');
  }
}

function setCurrentChar() {
  romaji.chars.forEach((c) => c.el.classList.remove('current'));
  Object.values(romaji.keyEls).forEach((el) => el.classList.remove('next'));

  const current = romaji.chars[romaji.pos];
  if (!current) return;
  current.el.classList.add('current');
  romaji.keyEls[current.ch]?.classList.add('next');

  const finger = keyToFinger[current.ch];
  romaji.dom.fingerVisual.querySelectorAll('.finger').forEach((node) => {
    node.classList.toggle('active', node.dataset.finger === finger);
  });
  romaji.dom.nextFingerText.innerHTML = '';
  const keyChip = document.createElement('span');
  keyChip.className = 'next-key-chip';
  keyChip.style.background = FINGER_COLORS[finger];
  keyChip.textContent = current.ch.toUpperCase();
  romaji.dom.nextFingerText.append('つぎは ', keyChip, ` ${finger}`);
}

// ===== 画面 =====
function showRomajiSelect() {
  stopRomajiMode();
  hideAllScreens();
  document.body.classList.add('romaji-mode');
  resetGame();
  renderLevelGrid();
  romaji.dom.selectScreen.classList.remove('hidden');
}

function renderLevelGrid() {
  const progress = loadRomajiProgress();
  const grid = romaji.dom.levelGrid;
  grid.innerHTML = '';

  ROMAJI_LEVELS.forEach((level, i) => {
    const locked = i + 1 > progress.unlocked;
    const stars = progress.stars[i] || 0;
    const card = document.createElement('button');
    card.className = `level-card${locked ? ' locked' : ''}${stars ? ' cleared' : ''}`;
    card.disabled = locked;
    card.innerHTML = `
      <div class="level-num">Lv.${i + 1}</div>
      <div class="level-name">${level.name}</div>
      <div class="level-desc">${level.desc}</div>
      <div class="level-lines">${level.lines}行</div>
      <div class="level-stars">${locked ? '🔒' : '★'.repeat(stars) + '☆'.repeat(3 - stars)}</div>`;
    card.addEventListener('click', () => startRomajiLevel(i));
    grid.appendChild(card);
  });
}

function startRomajiLevel(index) {
  const level = ROMAJI_LEVELS[index];
  stopRomajiMode();
  hideAllScreens();
  document.body.classList.add('romaji-mode');
  romaji.dom.playScreen.classList.remove('hidden');

  Object.assign(romaji, {
    levelIndex: index, round: 0, pos: 0, combo: 0, maxCombo: 0,
    correctKeys: 0, totalKeys: 0, score: 0, playing: true, startTime: Date.now(),
  });

  romaji.dom.levelName.textContent = `Lv.${index + 1} ${level.name}`;
  setKeyboardLevel(level);
  romaji.timer = setInterval(updateRomajiTime, 1000);
  updateRomajiTime();
  updateRomajiHud();

  // iOS はユーザー操作の中で同期的に focus しないとキーボードが出ない
  romaji.dom.input.focus();

  sounds.start();
  fx.banner(`Lv.${index + 1}`, level.name);
  nextRomajiRound();
}

function nextRomajiRound() {
  const level = ROMAJI_LEVELS[romaji.levelIndex];
  const lines = Array.from({ length: level.lines }, () => buildRomajiLine(level));
  renderRomajiPrompt(lines);
  romaji.pos = 0;
  setCurrentChar();
  updateRomajiProgress();
}

function stopRomajiMode() {
  romaji.playing = false;
  clearInterval(romaji.timer);
  romaji.timer = null;
  romaji.dom.clearOverlay?.classList.add('hidden');
  document.body.classList.remove('romaji-mode');
}

// ===== 入力処理 =====
function keyFromEvent(e) {
  if (e.key && e.key.length === 1 && /[a-z]/i.test(e.key)) return e.key.toLowerCase();
  if (e.code && /^Key[A-Z]$/.test(e.code)) return e.code.slice(3).toLowerCase();
  return null;
}

function handleRomajiKey(key) {
  if (!romaji.playing) return;
  const current = romaji.chars[romaji.pos];
  if (!current) return;

  romaji.totalKeys++;

  if (key !== current.ch) {
    handleRomajiMiss(current, key);
    updateRomajiHud();
    return;
  }

  romaji.correctKeys++;
  romaji.combo++;
  romaji.maxCombo = Math.max(romaji.maxCombo, romaji.combo);
  romaji.score += 10 + Math.min(Math.floor(romaji.combo / 10), 5) * 5;

  current.el.classList.remove('current');
  current.el.classList.add('typed');
  fx.retrigger(romaji.keyEls[key], 'pressed');
  sounds.key(romaji.combo);

  const fever = romaji.combo >= 30;
  const { x, y } = fx.center(current.el);
  fx.burst(x, y, {
    count: fever ? 18 : 10,
    colors: fever ? fx.RAINBOW : [FINGER_COLORS[keyToFinger[key]], '#ffd54f', '#4fc3f7'],
    shapes: ['star', 'spark'], speed: fever ? 6 : 4, size: 8, gravity: 0.1, decay: 0.03,
  });

  const message = COMBO_MESSAGES[romaji.combo]
    || (romaji.combo > 100 && romaji.combo % 50 === 0 ? 'でんせつ！' : null);
  if (message) fx.celebrate(message, `${romaji.combo} コンボ！`);

  romaji.pos++;
  if (current.lastInLine) handleLineComplete(current.lineEl);

  if (romaji.pos >= romaji.chars.length) {
    handleRoundComplete();
  } else {
    setCurrentChar();
  }
  updateRomajiHud();
  updateRomajiProgress();
}

function handleRomajiMiss(current, key) {
  sounds.incorrect();
  fx.retrigger(current.el, 'miss');
  fx.retrigger(romaji.keyEls[key], 'wrong');
  if (romaji.combo >= 10) {
    const { x, y } = fx.center(romaji.dom.comboDisplay);
    fx.floatText(x, y + 40, 'コンボ ストップ…', '#90a4ae');
  }
  romaji.combo = 0;
}

function handleLineComplete(lineEl) {
  romaji.score += 50;
  lineEl.classList.add('done');
  sounds.line();
  const r = lineEl.getBoundingClientRect();
  for (let i = 0; i < 5; i++) {
    fx.burst(r.left + (r.width * (i + 0.5)) / 5, r.top + r.height / 2, {
      count: 8, shapes: ['star'], speed: 5, size: 10, gravity: 0.12,
    });
  }
  fx.floatText(r.right - 40, r.top, '+50 ライン！', '#ff9800');
}

function handleRoundComplete() {
  const level = ROMAJI_LEVELS[romaji.levelIndex];
  romaji.score += 100;
  romaji.playing = false;
  Object.values(romaji.keyEls).forEach((el) => el.classList.remove('next'));

  const { x, y } = fx.center(romaji.dom.prompt);
  fx.blockBreak(x, y);
  fx.ring(x, y, '#ffd54f', 8);
  fx.flash('rgba(255, 255, 255, 0.5)');
  fx.floatText(x, y - 40, '+100 クリア！', '#7cb342');

  if (romaji.round + 1 < level.rounds) {
    romaji.round++;
    setTimeout(() => {
      if (!romaji.timer) return;
      romaji.playing = true;
      nextRomajiRound();
    }, 700);
  } else {
    setTimeout(handleLevelClear, 600);
  }
}

function handleLevelClear() {
  if (!romaji.timer) return;
  const index = romaji.levelIndex;
  clearInterval(romaji.timer);
  romaji.timer = null;

  const accuracy = romaji.totalKeys ? Math.round((romaji.correctKeys / romaji.totalKeys) * 100) : 0;
  const stars = accuracy >= 95 ? 3 : accuracy >= 85 ? 2 : 1;
  const seconds = Math.round((Date.now() - romaji.startTime) / 1000);

  const progress = loadRomajiProgress();
  progress.stars[index] = Math.max(progress.stars[index] || 0, stars);
  const isLast = index === ROMAJI_LEVELS.length - 1;
  const newlyUnlocked = !isLast && progress.unlocked < index + 2;
  if (newlyUnlocked) progress.unlocked = index + 2;
  saveRomajiProgress(progress);

  const d = romaji.dom;
  d.clearTitle.textContent = isLast ? 'ぜんぶクリア！' : 'レベルクリア！';
  d.clearAccuracy.textContent = `${accuracy}%`;
  d.clearCombo.textContent = romaji.maxCombo;
  d.clearTime.textContent = `${seconds}秒`;
  d.clearScore.textContent = romaji.score;
  d.clearUnlock.textContent = newlyUnlocked ? `Lv.${index + 2} がひらいた！` : '';
  d.clearNextBtn.classList.toggle('hidden', isLast);
  d.clearStars.forEach((s) => s.classList.remove('earned'));
  d.clearOverlay.classList.remove('hidden');

  sounds.levelUp();
  fx.confetti(140);
  fx.fireworks(stars === 3 ? 3500 : 2000);

  d.clearStars.slice(0, stars).forEach((starEl, i) => {
    setTimeout(() => {
      starEl.classList.add('earned');
      sounds.star(i);
      const { x, y } = fx.center(starEl);
      fx.burst(x, y, { count: 24, colors: ['#ffd54f', '#ffb300', '#fff59d'], shapes: ['star'], speed: 7, size: 12 });
      fx.ring(x, y, '#ffb300', 5);
    }, 500 + i * 450);
  });
}

// ===== 表示更新 =====
function updateRomajiHud() {
  elements.scoreValue.textContent = romaji.score;
  const accuracy = romaji.totalKeys ? Math.round((romaji.correctKeys / romaji.totalKeys) * 100) : 0;
  elements.accuracyValue.textContent = `${accuracy}%`;
  elements.streakValue.textContent = romaji.combo;

  const d = romaji.dom;
  const prev = Number(d.comboNum.textContent);
  d.comboNum.textContent = romaji.combo;
  if (romaji.combo > prev) fx.retrigger(d.comboDisplay, 'bump');

  const tier = romaji.combo >= 50 ? 4 : romaji.combo >= 30 ? 3 : romaji.combo >= 20 ? 2 : romaji.combo >= 10 ? 1 : 0;
  d.comboDisplay.dataset.tier = tier;
  d.prompt.classList.toggle('fever', tier >= 3);
}

function updateRomajiProgress() {
  const level = ROMAJI_LEVELS[romaji.levelIndex];
  const within = romaji.chars.length ? romaji.pos / romaji.chars.length : 0;
  const progress = ((romaji.round + within) / level.rounds) * 100;
  elements.progressBar.style.width = `${progress}%`;
  elements.progressText.textContent = `ラウンド ${romaji.round + 1} / ${level.rounds}`;
}

function updateRomajiTime() {
  const seconds = Math.floor((Date.now() - romaji.startTime) / 1000);
  elements.timeDisplay.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

let imeHintTimer = null;
function showImeHint() {
  romaji.dom.imeHint.classList.remove('hidden');
  clearTimeout(imeHintTimer);
  imeHintTimer = setTimeout(() => romaji.dom.imeHint.classList.add('hidden'), 4000);
}

// ===== 初期化 =====
document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const d = romaji.dom;
  d.selectScreen = $('romaji-select-screen');
  d.playScreen = $('romaji-screen');
  d.levelGrid = $('level-grid');
  d.levelName = $('romaji-level-name');
  d.comboDisplay = $('combo-display');
  d.comboNum = $('combo-num');
  d.prompt = $('romaji-prompt');
  d.promptLines = $('prompt-lines');
  d.input = $('romaji-input');
  d.imeHint = $('ime-hint');
  d.fingerVisual = $('romaji-finger-visual');
  d.nextFingerText = $('next-finger-text');
  d.keyboard = $('romaji-keyboard');
  d.clearOverlay = $('romaji-clear');
  d.clearTitle = $('clear-title');
  d.clearStars = Array.from(document.querySelectorAll('#clear-stars .clear-star'));
  d.clearAccuracy = $('clear-accuracy');
  d.clearCombo = $('clear-combo');
  d.clearTime = $('clear-time');
  d.clearScore = $('clear-score');
  d.clearUnlock = $('clear-unlock');
  d.clearNextBtn = $('clear-next-btn');

  buildRomajiKeyboard();

  $('romaji-mode-btn').addEventListener('click', showRomajiSelect);
  $('romaji-back-btn').addEventListener('click', showStartScreen);
  d.clearNextBtn.addEventListener('click', () => startRomajiLevel(romaji.levelIndex + 1));
  $('clear-retry-btn').addEventListener('click', () => startRomajiLevel(romaji.levelIndex));
  $('clear-select-btn').addEventListener('click', showRomajiSelect);

  d.prompt.addEventListener('click', () => d.input.focus());
  d.input.addEventListener('focus', () => d.prompt.classList.add('focused'));
  d.input.addEventListener('blur', () => d.prompt.classList.remove('focused'));

  d.input.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const key = keyFromEvent(e);
    if (!key) return;
    e.preventDefault();
    handleRomajiKey(key);
  });

  // ソフトウェアキーボードで keydown に文字が入らない場合の受け口
  d.input.addEventListener('input', (e) => {
    if (e.isComposing) return;
    const value = d.input.value;
    d.input.value = '';
    const letters = value.toLowerCase().replace(/[^a-z]/g, '');
    if (letters) {
      for (const ch of letters) handleRomajiKey(ch);
    } else if (value.trim()) {
      showImeHint();
    }
  });
  d.input.addEventListener('compositionend', () => {
    d.input.value = '';
    showImeHint();
  });

  // 入力欄からフォーカスが外れていても物理キーボードなら打てるようにする
  document.addEventListener('keydown', (e) => {
    if (!romaji.playing || e.target === d.input) return;
    if (e.target.closest?.('input, select, textarea, button')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const key = keyFromEvent(e);
    if (!key) return;
    e.preventDefault();
    d.input.focus();
    handleRomajiKey(key);
  });
});
