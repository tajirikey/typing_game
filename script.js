// ゲーム状態管理
let gameState = {
  mode: 'practice', // 'practice' or 'challenge'
  currentKanji: null,
  score: 0,
  totalQuestions: 0,
  correctAnswers: 0,
  streak: 0,
  bestStreak: 0,
  startTime: null,
  showReading: true,
  selectedGrade: 'all', // 'all', 'grade1', 'grade2', 'grade3'
  selectedCategory: 'all',
  timeLimit: 60, // チャレンジモードの制限時間（秒）
  timeRemaining: 60,
  timerInterval: null,
  questionCount: 0,
  maxQuestions: 10, // 練習モードの問題数
};

// 効果音（Web Audio API使用）
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

const sounds = {
  correct: () => playTone(523.25, 0.1, 'sine'), // C
  incorrect: () => playTone(220, 0.2, 'sawtooth'), // A
  complete: () => playMelody([523.25, 659.25, 783.99], 0.15), // C-E-G
  start: () => playTone(440, 0.1, 'square'), // A
  tick: () => playTone(880, 0.05, 'sine'), // A
};

function playTone(frequency, duration, type = 'sine') {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = type;

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

function playMelody(frequencies, duration) {
  frequencies.forEach((freq, index) => {
    setTimeout(() => playTone(freq, duration), index * duration * 1000);
  });
}

// DOM要素
const elements = {
  startScreen: null,
  gameArea: null,
  resultScreen: null,
  currentKanji: null,
  kanjiReading: null,
  kanjiCategory: null,
  typingInput: null,
  feedback: null,
  scoreValue: null,
  accuracyValue: null,
  streakValue: null,
  progressBar: null,
  progressText: null,
  gradeSelect: null,
  categorySelect: null,
  readingToggle: null,
  practiceBtn: null,
  challengeBtn: null,
  restartBtn: null,
  timeDisplay: null,
};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  initializeElements();
  setupEventListeners();
  showStartScreen();
});

function initializeElements() {
  elements.startScreen = document.getElementById('start-screen');
  elements.gameArea = document.getElementById('game-area');
  elements.resultScreen = document.getElementById('result-screen');
  elements.currentKanji = document.getElementById('current-kanji');
  elements.kanjiReading = document.getElementById('kanji-reading');
  elements.kanjiCategory = document.getElementById('kanji-category');
  elements.typingInput = document.getElementById('typing-input');
  elements.feedback = document.getElementById('feedback');
  elements.scoreValue = document.getElementById('score-value');
  elements.accuracyValue = document.getElementById('accuracy-value');
  elements.streakValue = document.getElementById('streak-value');
  elements.progressBar = document.getElementById('progress-bar');
  elements.progressText = document.getElementById('progress-text');
  elements.gradeSelect = document.getElementById('grade-select');
  elements.categorySelect = document.getElementById('category-select');
  elements.readingToggle = document.getElementById('reading-toggle');
  elements.timeDisplay = document.getElementById('time-display');
}

function setupEventListeners() {
  // モード選択
  document.getElementById('practice-mode-btn')?.addEventListener('click', () => {
    gameState.mode = 'practice';
    startGame();
  });

  document.getElementById('challenge-mode-btn')?.addEventListener('click', () => {
    gameState.mode = 'challenge';
    startGame();
  });

  // 設定変更
  elements.gradeSelect?.addEventListener('change', (e) => {
    gameState.selectedGrade = e.target.value;
  });

  elements.categorySelect?.addEventListener('change', (e) => {
    gameState.selectedCategory = e.target.value;
  });

  elements.readingToggle?.addEventListener('change', (e) => {
    gameState.showReading = e.target.checked;
    updateReadingDisplay();
  });

  // タイピング入力
  elements.typingInput?.addEventListener('input', handleTypingInput);

  // 再スタート
  document.getElementById('restart-btn')?.addEventListener('click', () => {
    showStartScreen();
  });

  document.getElementById('play-again-btn')?.addEventListener('click', () => {
    startGame();
  });
}

// 画面表示管理
function showStartScreen() {
  hideAllScreens();
  elements.startScreen?.classList.remove('hidden');
  resetGame();
}

function showGameScreen() {
  hideAllScreens();
  elements.gameArea?.classList.remove('hidden');
  elements.typingInput?.focus();
}

function showResultScreen() {
  hideAllScreens();
  elements.resultScreen?.classList.remove('hidden');
  displayResults();
}

function hideAllScreens() {
  elements.startScreen?.classList.add('hidden');
  elements.gameArea?.classList.add('hidden');
  elements.resultScreen?.classList.add('hidden');
}

// ゲーム開始
function startGame() {
  resetGame();
  sounds.start();
  showGameScreen();

  gameState.startTime = Date.now();

  if (gameState.mode === 'challenge') {
    gameState.timeRemaining = gameState.timeLimit;
    startTimer();
  }

  nextQuestion();
}

function resetGame() {
  gameState.score = 0;
  gameState.totalQuestions = 0;
  gameState.correctAnswers = 0;
  gameState.streak = 0;
  gameState.questionCount = 0;

  if (gameState.timerInterval) {
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = null;
  }

  updateDisplay();
}

function startTimer() {
  gameState.timerInterval = setInterval(() => {
    gameState.timeRemaining--;
    updateTimeDisplay();

    if (gameState.timeRemaining <= 10) {
      sounds.tick();
    }

    if (gameState.timeRemaining <= 0) {
      endGame();
    }
  }, 1000);
}

function updateTimeDisplay() {
  if (elements.timeDisplay) {
    const minutes = Math.floor(gameState.timeRemaining / 60);
    const seconds = gameState.timeRemaining % 60;
    elements.timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

// 問題生成
function nextQuestion() {
  // ゲーム終了条件チェック
  if (gameState.mode === 'practice' && gameState.questionCount >= gameState.maxQuestions) {
    endGame();
    return;
  }

  const kanjiList = getFilteredKanjiList();

  if (kanjiList.length === 0) {
    alert('選択された条件に合う漢字がありません');
    showStartScreen();
    return;
  }

  // ランダムに漢字を選択
  gameState.currentKanji = kanjiList[Math.floor(Math.random() * kanjiList.length)];

  // 表示更新
  elements.currentKanji.textContent = gameState.currentKanji.kanji;
  elements.kanjiCategory.textContent = `カテゴリ: ${gameState.currentKanji.category}`;
  updateReadingDisplay();

  // 入力クリア
  elements.typingInput.value = '';
  elements.feedback.textContent = '';
  elements.feedback.className = 'feedback';

  // アニメーション
  elements.currentKanji.style.animation = 'none';
  setTimeout(() => {
    elements.currentKanji.style.animation = 'bounce 1s ease-in-out';
  }, 10);

  gameState.questionCount++;
  updateProgress();
}

function getFilteredKanjiList() {
  let kanjiList = [];

  // 学年フィルター
  if (gameState.selectedGrade === 'all') {
    kanjiList = [...kanjiData.grade1, ...kanjiData.grade2, ...kanjiData.grade3];
  } else {
    kanjiList = [...kanjiData[gameState.selectedGrade]];
  }

  // カテゴリフィルター
  if (gameState.selectedCategory !== 'all') {
    kanjiList = kanjiList.filter(k => k.category === gameState.selectedCategory);
  }

  return kanjiList;
}

function updateReadingDisplay() {
  if (gameState.showReading) {
    elements.kanjiReading.textContent = gameState.currentKanji.reading;
    elements.kanjiReading.classList.remove('hidden');
  } else {
    elements.kanjiReading.classList.add('hidden');
  }
}

// タイピング処理
function handleTypingInput(e) {
  const input = e.target.value.trim();

  if (!input) return;

  const correctReading = gameState.currentKanji.reading;
  const possibleReadings = correctReading.split('・');

  // 正解判定
  const isCorrect = possibleReadings.some(reading =>
    reading === input || reading.startsWith(input)
  );

  // Enterキーまたは完全一致で判定
  if (e.inputType === 'insertLineBreak' || possibleReadings.includes(input)) {
    checkAnswer(input);
  }
}

function checkAnswer(input) {
  const correctReading = gameState.currentKanji.reading;
  const possibleReadings = correctReading.split('・');
  const isCorrect = possibleReadings.includes(input);

  gameState.totalQuestions++;

  if (isCorrect) {
    handleCorrectAnswer();
  } else {
    handleIncorrectAnswer();
  }

  updateDisplay();

  // 次の問題へ
  setTimeout(() => {
    nextQuestion();
  }, 1000);
}

function handleCorrectAnswer() {
  sounds.correct();
  gameState.correctAnswers++;
  gameState.streak++;

  if (gameState.streak > gameState.bestStreak) {
    gameState.bestStreak = gameState.streak;
  }

  // スコア計算（連続正解でボーナス）
  const baseScore = 10;
  const streakBonus = Math.min(gameState.streak, 10) * 2;
  gameState.score += baseScore + streakBonus;

  // フィードバック表示
  elements.feedback.textContent = `正解！ +${baseScore + streakBonus}点`;
  elements.feedback.className = 'feedback correct';

  // パーティクルエフェクト
  createParticles('✓', '#7cb342');
}

function handleIncorrectAnswer() {
  sounds.incorrect();
  gameState.streak = 0;

  elements.feedback.textContent = `不正解... 正解: ${gameState.currentKanji.reading}`;
  elements.feedback.className = 'feedback incorrect';

  createParticles('✗', '#e53935');
}

// パーティクルエフェクト
function createParticles(symbol, color) {
  const gameArea = elements.gameArea;
  const rect = gameArea.getBoundingClientRect();

  for (let i = 0; i < 5; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.textContent = symbol;
    particle.style.color = color;
    particle.style.left = `${rect.width / 2 + (Math.random() - 0.5) * 100}px`;
    particle.style.top = `${rect.height / 2}px`;

    gameArea.appendChild(particle);

    setTimeout(() => {
      particle.remove();
    }, 1000);
  }
}

// 表示更新
function updateDisplay() {
  elements.scoreValue.textContent = gameState.score;

  const accuracy = gameState.totalQuestions > 0
    ? Math.round((gameState.correctAnswers / gameState.totalQuestions) * 100)
    : 0;
  elements.accuracyValue.textContent = `${accuracy}%`;

  elements.streakValue.textContent = gameState.streak;
}

function updateProgress() {
  if (gameState.mode === 'practice') {
    const progress = (gameState.questionCount / gameState.maxQuestions) * 100;
    elements.progressBar.style.width = `${progress}%`;
    elements.progressText.textContent = `${gameState.questionCount} / ${gameState.maxQuestions}`;
  } else {
    const progress = ((gameState.timeLimit - gameState.timeRemaining) / gameState.timeLimit) * 100;
    elements.progressBar.style.width = `${progress}%`;
    updateTimeDisplay();
  }
}

// ゲーム終了
function endGame() {
  if (gameState.timerInterval) {
    clearInterval(gameState.timerInterval);
  }

  sounds.complete();
  showResultScreen();
}

function displayResults() {
  const endTime = Date.now();
  const totalTime = Math.round((endTime - gameState.startTime) / 1000);
  const accuracy = gameState.totalQuestions > 0
    ? Math.round((gameState.correctAnswers / gameState.totalQuestions) * 100)
    : 0;

  document.getElementById('result-score').textContent = gameState.score;
  document.getElementById('result-accuracy').textContent = `${accuracy}%`;
  document.getElementById('result-questions').textContent = gameState.totalQuestions;
  document.getElementById('result-correct').textContent = gameState.correctAnswers;
  document.getElementById('result-streak').textContent = gameState.bestStreak;
  document.getElementById('result-time').textContent = `${totalTime}秒`;

  // ランク判定
  let rank = 'ブロンズ';
  let rankColor = '#cd7f32';

  if (accuracy >= 90 && gameState.score >= 200) {
    rank = 'ダイヤモンド';
    rankColor = '#4fc3f7';
  } else if (accuracy >= 80 && gameState.score >= 150) {
    rank = 'ゴールド';
    rankColor = '#ffd54f';
  } else if (accuracy >= 70 && gameState.score >= 100) {
    rank = 'シルバー';
    rankColor = '#c0c0c0';
  }

  const rankElement = document.getElementById('result-rank');
  rankElement.textContent = rank;
  rankElement.style.color = rankColor;
}

// カテゴリリストの動的生成
function populateCategorySelect() {
  const categories = new Set();
  allKanji.forEach(k => categories.add(k.category));

  const select = elements.categorySelect;
  if (select) {
    select.innerHTML = '<option value="all">すべて</option>';
    Array.from(categories).sort().forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      select.appendChild(option);
    });
  }
}

// 初期化時にカテゴリを設定
setTimeout(populateCategorySelect, 0);
