/* ===========================
   WordFlip — app.js
   =========================== */

'use strict';

// ── State ──────────────────────────────────────────────
const state = {
  words:   [],
  index:   0,
  flipped: false,
};

// ── DOM Refs ────────────────────────────────────────────
const scene        = document.getElementById('scene');
const card         = document.getElementById('card');
const wordEl       = document.getElementById('word');
const turkishEl    = document.getElementById('turkish');
const exampleEl    = document.getElementById('example');
const btnPrev      = document.getElementById('btnPrev');
const btnNext      = document.getElementById('btnNext');
const btnShuffle   = document.getElementById('btnShuffle');
const speakBtn     = document.getElementById('speakBtn');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const wordGrid     = document.getElementById('wordGrid');
const themeToggle  = document.getElementById('themeToggle');

// ── Theme ───────────────────────────────────────────────
(function initTheme() {
  const saved = localStorage.getItem('wf-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  themeToggle.textContent = saved === 'dark' ? '☀️' : '🌙';
})();

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('wf-theme', next);
  themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
});

// ── Fetch Words ─────────────────────────────────────────
async function loadWords() {
  try {
    const res = await fetch('words.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.words = await res.json();
    renderCard();
    renderWordGrid();
  } catch (err) {
    wordEl.textContent = 'Kelimeler yüklenemedi 😔';
    console.error('words.json yüklenemedi:', err);
  }
}

// ── Render Card ─────────────────────────────────────────
function renderCard(animate = false) {
  const w = state.words[state.index];
  if (!w) return;

  // Reset flip
  state.flipped = false;
  card.classList.remove('flipped');

  // Update content
  wordEl.textContent    = w.english;
  turkishEl.textContent = w.turkish;
  exampleEl.textContent = `"${w.example}"`;

  // Progress
  const pct = Math.round(((state.index + 1) / state.words.length) * 100);
  progressFill.style.width = pct + '%';
  progressText.textContent = `${state.index + 1} / ${state.words.length}`;

  // Slide animation
  if (animate) {
    scene.classList.remove('animate');
    void scene.offsetWidth; // reflow
    scene.classList.add('animate');
  }

  // Highlight active pill
  document.querySelectorAll('.word-pill').forEach((pill, i) => {
    pill.classList.toggle('active', i === state.index);
  });

  // Scroll active pill into view
  const activePill = document.querySelector('.word-pill.active');
  if (activePill) activePill.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// ── Flip ────────────────────────────────────────────────
function flipCard() {
  state.flipped = !state.flipped;
  card.classList.toggle('flipped', state.flipped);
}

scene.addEventListener('click', (e) => {
  // Don't flip if speak button clicked
  if (e.target.closest('.speak-btn')) return;
  flipCard();
});

// Keyboard support
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'l') nextCard();
  if (e.key === 'ArrowLeft'  || e.key === 'h') prevCard();
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flipCard(); }
  if (e.key === 's') speak();
});

// ── Navigation ──────────────────────────────────────────
function nextCard() {
  state.index = (state.index + 1) % state.words.length;
  renderCard(true);
}

function prevCard() {
  state.index = (state.index - 1 + state.words.length) % state.words.length;
  renderCard(true);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function shuffleWords() {
  shuffle(state.words);
  state.index = 0;
  renderCard(true);
  renderWordGrid();
}

btnNext.addEventListener('click', nextCard);
btnPrev.addEventListener('click', prevCard);
btnShuffle.addEventListener('click', shuffleWords);

// ── Text to Speech ──────────────────────────────────────
function speak() {
  const w = state.words[state.index];
  if (!w || !window.speechSynthesis) return;

  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(w.english);
  utter.lang  = 'en-US';
  utter.rate  = 0.88;
  utter.pitch = 1;

  speakBtn.classList.add('speaking');
  utter.onend = () => speakBtn.classList.remove('speaking');
  utter.onerror = () => speakBtn.classList.remove('speaking');

  window.speechSynthesis.speak(utter);
}

speakBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  speak();
});

// ── Word Grid ────────────────────────────────────────────
function renderWordGrid() {
  wordGrid.innerHTML = '';
  state.words.forEach((w, i) => {
    const pill = document.createElement('button');
    pill.className = 'word-pill' + (i === state.index ? ' active' : '');
    pill.innerHTML = `
      <span class="pill-en">${w.english}</span>
      <span class="pill-tr">${w.turkish}</span>
    `;
    pill.addEventListener('click', () => {
      state.index = i;
      renderCard(true);
    });
    wordGrid.appendChild(pill);
  });
}

// ── Init ─────────────────────────────────────────────────
loadWords();
