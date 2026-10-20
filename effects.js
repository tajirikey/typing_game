// ===== 効果音（Web Audio API） =====
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// iOS Safari はユーザー操作があるまで音が鳴らないため、最初の操作で再開する
function unlockAudio() {
  if (audioContext.state === 'suspended') audioContext.resume();
}
['pointerdown', 'touchstart', 'keydown'].forEach((type) => {
  document.addEventListener(type, unlockAudio, { passive: true });
});

function playTone(frequency, duration, type = 'sine', volume = 0.3, delay = 0) {
  const t = audioContext.currentTime + delay;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.frequency.value = frequency;
  oscillator.type = type;
  gainNode.gain.setValueAtTime(volume, t);
  gainNode.gain.exponentialRampToValueAtTime(0.001, t + duration);
  oscillator.start(t);
  oscillator.stop(t + duration);
}

function playMelody(frequencies, step, type = 'sine', volume = 0.3) {
  frequencies.forEach((freq, i) => playTone(freq, step * 1.6, type, volume, i * step));
}

// コンボが続くほど音階が上がっていく（ペンタトニック）
const COMBO_SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];

const sounds = {
  correct: () => playMelody([659.25, 987.77, 1318.51], 0.07, 'triangle', 0.25),
  incorrect: () => playTone(196, 0.18, 'triangle', 0.22),
  complete: () => playMelody([523.25, 659.25, 783.99, 1046.5], 0.12, 'square', 0.12),
  start: () => playMelody([392, 523.25, 783.99], 0.08, 'square', 0.12),
  tick: () => playTone(880, 0.05, 'sine', 0.2),
  key: (combo) => playTone(COMBO_SCALE[combo % COMBO_SCALE.length], 0.12, 'sine', 0.16),
  line: () => playMelody([1046.5, 1318.51, 1567.98, 2093], 0.05, 'triangle', 0.18),
  fanfare: () => playMelody([783.99, 783.99, 1046.5, 1318.51, 1567.98], 0.09, 'square', 0.1),
  levelUp: () => playMelody([523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.51, 1567.98], 0.1, 'square', 0.11),
  star: (i) => playTone(880 * Math.pow(1.26, i), 0.35, 'triangle', 0.22),
  pop: () => playTone(500 + Math.random() * 700, 0.15, 'triangle', 0.06),
};

// ===== ビジュアルエフェクト =====
const fx = (() => {
  const RAINBOW = ['#ff5252', '#ffb300', '#ffeb3b', '#69f0ae', '#40c4ff', '#7c4dff', '#ff4081'];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const canvas = document.createElement('canvas');
  canvas.className = 'fx-canvas';
  const ctx = canvas.getContext('2d');
  let particles = [];
  let running = false;
  let lastTime = 0;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(canvas);
    resize();
  });
  window.addEventListener('resize', resize);

  const rand = (min, max) => min + Math.random() * (max - min);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function spawn(p) {
    particles.push(p);
    if (!running) {
      running = true;
      lastTime = performance.now();
      requestAnimationFrame(loop);
    }
  }

  function drawStar(r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      const rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }

  function draw(p) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6));
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;
    const s = p.size;
    switch (p.shape) {
      case 'star':
        drawStar(s);
        break;
      case 'block':
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.strokeRect(-s / 2, -s / 2, s, s);
        break;
      case 'confetti':
        ctx.scale(1, Math.cos(p.rot * 3));
        ctx.fillRect(-s / 2, -s / 4, s, s / 2);
        break;
      case 'ring':
        ctx.lineWidth = Math.max(0.5, 6 * p.life);
        ctx.beginPath();
        ctx.arc(0, 0, s, 0, Math.PI * 2);
        ctx.stroke();
        break;
      default:
        ctx.beginPath();
        ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
  }

  function loop(now) {
    const dt = Math.min(3, (now - lastTime) / 16.67);
    lastTime = now;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    particles = particles.filter((p) => p.life > 0);
    for (const p of particles) {
      p.vx *= Math.pow(p.drag, dt);
      p.vy = p.vy * Math.pow(p.drag, dt) + p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.shape === 'ring') p.size += p.grow * dt;
      p.life -= p.decay * dt;
      draw(p);
    }

    if (particles.length) {
      requestAnimationFrame(loop);
    } else {
      running = false;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  function center(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function burst(x, y, opts = {}) {
    const {
      count = 24, colors = RAINBOW, shapes = ['star', 'spark', 'block'],
      speed = 6, size = 10, gravity = 0.15, decay = 0.018,
    } = opts;
    const n = reduceMotion ? Math.ceil(count / 4) : count;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * rand(0.35, 1.15);
      spawn({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        g: gravity, drag: 0.96, size: size * rand(0.5, 1.3),
        rot: rand(0, Math.PI), vr: rand(-0.3, 0.3),
        color: pick(colors), shape: pick(shapes),
        life: 1, decay: decay * rand(0.7, 1.3),
      });
    }
  }

  function ring(x, y, color = '#ffd54f', grow = 4) {
    spawn({
      x, y, vx: 0, vy: 0, g: 0, drag: 1, size: 6, grow,
      rot: 0, vr: 0, color, shape: 'ring', life: 1, decay: 0.04,
    });
  }

  // マイクラ風：ブロックが砕け散る
  function blockBreak(x, y, colors = ['#7cb342', '#8b6f47', '#ffd54f', '#4fc3f7']) {
    burst(x, y, { count: 30, colors, shapes: ['block'], speed: 9, size: 14, gravity: 0.35, decay: 0.015 });
  }

  function confetti(count = 80) {
    const n = reduceMotion ? Math.ceil(count / 4) : count;
    for (let i = 0; i < n; i++) {
      spawn({
        x: rand(0, window.innerWidth), y: rand(-80, -10),
        vx: rand(-2, 2), vy: rand(2, 6), g: 0.06, drag: 0.995,
        size: rand(10, 18), rot: rand(0, Math.PI), vr: rand(-0.15, 0.15),
        color: pick(RAINBOW), shape: 'confetti', life: 1, decay: rand(0.004, 0.008),
      });
    }
  }

  function fireworks(duration = 2500) {
    const end = performance.now() + duration;
    const shoot = () => {
      if (performance.now() > end) return;
      const x = rand(window.innerWidth * 0.15, window.innerWidth * 0.85);
      const y = rand(window.innerHeight * 0.12, window.innerHeight * 0.45);
      const palette = [pick(RAINBOW), pick(RAINBOW), '#fff59d'];
      burst(x, y, { count: 45, colors: palette, shapes: ['spark', 'star'], speed: 8, size: 9, gravity: 0.07, decay: 0.012 });
      ring(x, y, palette[0], 6);
      sounds.pop();
      setTimeout(shoot, rand(220, 420));
    };
    shoot();
  }

  function retrigger(el, cls) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
  }

  function floatText(x, y, text, color = '#ffb300') {
    const el = document.createElement('div');
    el.className = 'fx-float-text';
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.color = color;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  let bannerEl = null;
  function banner(text, sub = '') {
    bannerEl?.remove();
    const el = document.createElement('div');
    el.className = 'fx-banner';
    const main = document.createElement('div');
    main.className = 'fx-banner-main';
    main.textContent = text;
    el.appendChild(main);
    if (sub) {
      const subEl = document.createElement('div');
      subEl.className = 'fx-banner-sub';
      subEl.textContent = sub;
      el.appendChild(subEl);
    }
    document.body.appendChild(el);
    bannerEl = el;
    setTimeout(() => el.remove(), 1500);
  }

  function flash(color = 'rgba(255, 255, 255, 0.6)') {
    if (reduceMotion) return;
    const el = document.createElement('div');
    el.className = 'fx-flash';
    el.style.background = color;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 400);
  }

  // 大きな節目のお祝い（バナー＋紙吹雪＋ファンファーレ）
  function celebrate(text, sub) {
    banner(text, sub);
    confetti(60);
    flash('rgba(255, 245, 157, 0.5)');
    sounds.fanfare();
  }

  return {
    RAINBOW, center, burst, ring, blockBreak, confetti, fireworks,
    floatText, banner, flash, celebrate,
    pop: (el) => retrigger(el, 'fx-pop'),
    shake: (el) => retrigger(el, 'fx-shake'),
    retrigger,
  };
})();
