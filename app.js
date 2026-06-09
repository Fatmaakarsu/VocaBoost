/* ===========================
   WordFlip — app.js
   =========================== */

'use strict';

// ── State ──────────────────────────────────────────────
const state = {
  words:       [],   // aktif (filtrelenmiş) kelimeler
  allWords:    [],   // tüm kelimeler (orijinal)
  index:       0,
  flipped:     false,
  filter:      'all', // 'all' | 'learned' | 'difficult' | 'favorites'
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

// Progress butonları (kart üstü)
const btnLearned   = document.getElementById('btnLearned');
const btnDifficult = document.getElementById('btnDifficult');
const btnFavorite  = document.getElementById('btnFavorite');

// Stats bar
const statLearned  = document.getElementById('statLearned');
const statLearnedBar = document.getElementById('statLearnedBar');

// Filter butonları
const filterBtns   = document.querySelectorAll('.filter-btn');

// Empty state
const emptyState   = document.getElementById('emptyState');

// ── localStorage Progress ───────────────────────────────
const STORAGE_KEY = 'wf-progress';

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return { learned: [], difficult: [], favorites: [] };
}

function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

// Tek kayıt noktası — her zaman taze oku & yaz
function getProgress() { return loadProgress(); }

function markLearned(word) {
  const p = getProgress();
  const key = word.english;
  if (p.learned.includes(key)) {
    p.learned = p.learned.filter(w => w !== key);   // toggle off
  } else {
    p.learned.push(key);
    p.difficult = p.difficult.filter(w => w !== key); // learned ise difficult'tan çıkar
  }
  saveProgress(p);
  refreshCardButtons();
  refreshStats();
  refreshWordGrid();
}

function markDifficult(word) {
  const p = getProgress();
  const key = word.english;
  if (p.difficult.includes(key)) {
    p.difficult = p.difficult.filter(w => w !== key); // toggle off
  } else {
    p.difficult.push(key);
    p.learned = p.learned.filter(w => w !== key);     // difficult ise learned'dan çıkar
  }
  saveProgress(p);
  refreshCardButtons();
  refreshStats();
  refreshWordGrid();
}

function addFavorite(word) {
  const p = getProgress();
  const key = word.english;
  if (p.favorites.includes(key)) {
    p.favorites = p.favorites.filter(w => w !== key); // toggle off
  } else {
    p.favorites.push(key);
  }
  saveProgress(p);
  refreshCardButtons();
  refreshWordGrid();
}

// ── Stats Bar ───────────────────────────────────────────
function refreshStats() {
  const p = getProgress();
  const total = state.allWords.length;
  const count = p.learned.length;
  const pct   = total ? Math.round((count / total) * 100) : 0;
  statLearned.textContent  = `${count} / ${total} öğrenildi · %${pct}`;
  statLearnedBar.style.width = pct + '%';
}

// ── Card Action Buttons ─────────────────────────────────
function refreshCardButtons() {
  const w = state.words[state.index];
  if (!w) return;
  const p = getProgress();
  btnLearned.classList.toggle('active-learned',    p.learned.includes(w.english));
  btnDifficult.classList.toggle('active-difficult', p.difficult.includes(w.english));
  btnFavorite.classList.toggle('active-favorite',   p.favorites.includes(w.english));
}

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

// ── Filter ──────────────────────────────────────────────
function applyFilter(filter) {
  state.filter = filter;
  const p = getProgress();

  const map = {
    all:       () => [...state.allWords],
    learned:   () => state.allWords.filter(w => p.learned.includes(w.english)),
    difficult: () => state.allWords.filter(w => p.difficult.includes(w.english)),
    favorites: () => state.allWords.filter(w => p.favorites.includes(w.english)),
  };

  state.words = (map[filter] || map.all)();
  state.index = 0;

  // Filtre butonlarını güncelle
  filterBtns.forEach(btn => {
    btn.classList.toggle('filter-active', btn.dataset.filter === filter);
  });

  const isEmpty = state.words.length === 0;
  emptyState.style.display  = isEmpty ? 'flex' : 'none';
  scene.style.visibility    = isEmpty ? 'hidden' : 'visible';

  if (!isEmpty) {
    renderCard(false);
  }
  renderWordGrid();
}

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
});

// ── Fetch Words ─────────────────────────────────────────
async function loadWords() {
  try {
    const res = await fetch('words.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.allWords = await res.json();
    state.words    = [...state.allWords];
    refreshStats();
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

  state.flipped = false;
  card.classList.remove('flipped');

  wordEl.textContent    = w.english;
  turkishEl.textContent = w.turkish;
  exampleEl.textContent = `"${w.example}"`;

  // Kart indeks progress (filtrelenmiş listeye göre)
  const pct = Math.round(((state.index + 1) / state.words.length) * 100);
  progressFill.style.width = pct + '%';
  progressText.textContent = `${state.index + 1} / ${state.words.length}`;

  if (animate) {
    scene.classList.remove('animate');
    void scene.offsetWidth;
    scene.classList.add('animate');
  }

  refreshCardButtons();

  document.querySelectorAll('.word-pill').forEach((pill, i) => {
    pill.classList.toggle('active', i === state.index);
  });

  const activePill = document.querySelector('.word-pill.active');
  if (activePill) activePill.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// ── Flip ────────────────────────────────────────────────
function flipCard() {
  state.flipped = !state.flipped;
  card.classList.toggle('flipped', state.flipped);
}

scene.addEventListener('click', (e) => {
  if (e.target.closest('.speak-btn') || e.target.closest('.card-actions')) return;
  flipCard();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'l') nextCard();
  if (e.key === 'ArrowLeft'  || e.key === 'h') prevCard();
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flipCard(); }
  if (e.key === 's') speak();
});

// ── Navigation ──────────────────────────────────────────
function nextCard() {
  if (!state.words.length) return;
  state.index = (state.index + 1) % state.words.length;
  renderCard(true);
}

function prevCard() {
  if (!state.words.length) return;
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

// ── Card Action Buttons Events ──────────────────────────
btnLearned.addEventListener('click', (e) => {
  e.stopPropagation();
  const w = state.words[state.index];
  if (w) markLearned(w);
});

btnDifficult.addEventListener('click', (e) => {
  e.stopPropagation();
  const w = state.words[state.index];
  if (w) markDifficult(w);
});

btnFavorite.addEventListener('click', (e) => {
  e.stopPropagation();
  const w = state.words[state.index];
  if (w) addFavorite(w);
});

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
  utter.onend  = () => speakBtn.classList.remove('speaking');
  utter.onerror = () => speakBtn.classList.remove('speaking');

  window.speechSynthesis.speak(utter);
}

speakBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  speak();
});

// ── Word Grid ────────────────────────────────────────────
function refreshWordGrid() {
  renderWordGrid();
}

function renderWordGrid() {
  const p = getProgress();
  wordGrid.innerHTML = '';
  state.words.forEach((w, i) => {
    const tags = [];
    if (p.learned.includes(w.english))   tags.push('<span class="pill-tag tag-learned">✅</span>');
    if (p.difficult.includes(w.english)) tags.push('<span class="pill-tag tag-difficult">⚠️</span>');
    if (p.favorites.includes(w.english)) tags.push('<span class="pill-tag tag-favorite">⭐</span>');

    const pill = document.createElement('button');
    pill.className = 'word-pill' + (i === state.index ? ' active' : '');
    pill.innerHTML = `
      <span class="pill-en">${w.english}</span>
      <span class="pill-tr">${w.turkish}</span>
      ${tags.length ? `<span class="pill-tags">${tags.join('')}</span>` : ''}
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
