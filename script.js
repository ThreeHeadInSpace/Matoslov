/* ═══════════════════════════════════════════
   Матослов v3 — логика
   ═══════════════════════════════════════════ */

const LOGO_EMOJIS = [
  '🦄', '🐰', '🐱', '🐶', '🐹', '🐨', '🐼', '🦊', '🐥', '🐣',
  '🦋', '🐞', '🐢', '🐳', '🐬', '🦕', '🐙', '🦩', '🐿️', '🦔',
  '🍓', '🍰', '🧁', '🍭', '🍬', '🍩', '🍪', '🍒', '🍑', '🥐',
  '🍦', '🍉', '🥞', '🍯', '🫐', '🌈', '⭐', '💖', '🌸', '🌷',
  '🎀', '🫧', '☁️', '🌙', '✨'
];

let DICT = [];
let currentHeroIndex = -1;

/* ── загрузка dictionary.json ──────────────── */
async function loadDictionary() {
  try {
    const res = await fetch('dictionary.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    DICT = data.words;
  } catch (err) {
    console.warn('Не удалось загрузить dictionary.json: ' + err.message);
    // прячем всё, кроме шапки, и показываем подсказку
    document.querySelector('.daily').hidden = true;
    document.querySelector('.search-wrap').hidden = true;
    document.getElementById('loadError').hidden = false;
    return;
  }
  DICT.sort((a, b) => a.word.localeCompare(b.word, 'ru'));
  // «более N слов»: округляем вниз до кратного 5 (18 → «более 15»)
  const rounded = Math.max(Math.floor(DICT.length / 5) * 5, 1);
  document.getElementById('wordCount').textContent =
    rounded < DICT.length ? rounded : DICT.length;
  showHeroWord(dayIndex());
  renderList(DICT);
}

/* ── эмодзи рядом с названием ──────────────── */
function swapLogoEmoji() {
  const el = document.getElementById('logoEmoji');
  const current = el.textContent;
  let next;
  do { next = LOGO_EMOJIS[Math.floor(Math.random() * LOGO_EMOJIS.length)]; }
  while (next === current);

  el.textContent = next;
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');

  setTimeout(swapLogoEmoji, 2200);
}
swapLogoEmoji();

/* ── дата в бейдже «слово дня» ─────────────── */
document.getElementById('todayDate').textContent =
  new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    .replace(' г.', '');   // «2 июля 2026» без хвостика «г.»

/* ── слово дня ─────────────────────────────── */
function dayIndex() {
  // детерминированный выбор по дате: у всех сегодня одно слово дня
  const d = new Date();
  const seed = d.getFullYear() * 372 + (d.getMonth() + 1) * 31 + d.getDate();
  return seed % DICT.length;
}

function fillEntry(prefix, entry) {
  document.getElementById(prefix + 'Word').textContent = entry.accent || entry.word;
  document.getElementById(prefix + 'Pos').textContent = entry.pos || '';
  document.getElementById(prefix + 'Tag').textContent = entry.tag || '';
  document.getElementById(prefix + 'Meaning').textContent = entry.meaning;

  const ul = document.getElementById(prefix + 'Examples');
  ul.innerHTML = '';
  entry.examples.forEach(ex => {
    const li = document.createElement('li');
    li.textContent = '«' + ex + '»';
    ul.appendChild(li);
  });
}

function showHeroWord(index) {
  currentHeroIndex = index;
  fillEntry('hero', DICT[index]);
  renderVotes(document.getElementById('heroVotes'), DICT[index].word);
}

/* ── кнопка «другое слово»: кубик крутится ─── */
document.getElementById('diceBtn').addEventListener('click', () => {
  if (DICT.length < 2) return;

  const dice = document.getElementById('dice');
  dice.classList.remove('spin');
  void dice.offsetWidth;
  dice.classList.add('spin');

  setTimeout(() => {
    let next;
    do { next = Math.floor(Math.random() * DICT.length); }
    while (next === currentHeroIndex);
    showHeroWord(next);
  }, 300);
});

/* ── список: статьи, сгруппированные по буквам ── */
function renderList(words) {
  const list = document.getElementById('dictList');
  const empty = document.getElementById('emptyState');
  list.innerHTML = '';

  if (words.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  // группировка по первой букве (Е и Ё — под одной буквой)
  const groups = new Map();
  words.forEach(entry => {
    let letter = entry.word[0].toUpperCase();
    if (letter === 'Ё') letter = 'Е';
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push(entry);
  });

  groups.forEach((entries, letter) => {
    const group = document.createElement('div');
    group.className = 'letter-group';

    const h = document.createElement('div');
    h.className = 'letter';
    h.textContent = letter;
    group.appendChild(h);

    entries.forEach(entry => {
      const row = document.createElement('button');
      row.className = 'dict-row';
      row.type = 'button';
      row.innerHTML = '<span class="w"></span><span class="pos"></span><span class="m"></span>';
      row.querySelector('.w').textContent = entry.accent || entry.word;
      row.querySelector('.pos').textContent = entry.pos || '';
      row.querySelector('.m').textContent = entry.meaning;
      row.addEventListener('click', () => openModal(entry));
      group.appendChild(row);
    });

    list.appendChild(group);
  });
}

/* ── живой поиск (работает с одной буквы) ──── */
document.getElementById('searchInput').addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  if (!q) { renderList(DICT); return; }
  const filtered = DICT.filter(entry =>
    entry.word.toLowerCase().includes(q) ||
    entry.meaning.toLowerCase().includes(q)
  );
  renderList(filtered);
});

/* ── модальное окно ────────────────────────── */
const overlay = document.getElementById('modalOverlay');
let modalWordKey = null;   // слово, открытое в модалке сейчас

function openModal(entry) {
  modalWordKey = entry.word;
  fillEntry('modal', entry);
  renderVotes(document.getElementById('modalVotes'), entry.word);
  renderComments(entry.word);
  document.getElementById('commentInput').value = '';
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  document.getElementById('modalClose').focus();
}

function closeModal() {
  modalWordKey = null;
  overlay.hidden = true;
  document.body.style.overflow = '';
}

document.getElementById('modalClose').addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !overlay.hidden) closeModal();
});

/* ═══════════════════════════════════════════
   Лайки/дизлайки и комментарии (пока без бэкенда:
   всё хранится в localStorage браузера посетителя)
   ═══════════════════════════════════════════ */

const VOTES_KEY = 'matoslov-votes';       // { слово: 'like' | 'dislike' }
const COMMENTS_KEY = 'matoslov-comments'; // { слово: [{ text, date }] }

function loadStore(key) {
  try { return JSON.parse(localStorage.getItem(key)) || {}; }
  catch { return {}; }
}
function saveStore(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* приватный режим */ }
}

/* стартовые цифры, чтобы сайт не выглядел пустым:
   детерминированно считаются из самого слова */
function wordHash(str) {
  let h = 0;
  for (const ch of str) h = (h * 31 + ch.codePointAt(0)) | 0;
  return Math.abs(h);
}
function seedCounts(word) {
  return {
    likes: 4 + wordHash(word) % 57,
    dislikes: wordHash(word + '·') % 12
  };
}

function renderVotes(container, word) {
  const seed = seedCounts(word);
  const myVote = loadStore(VOTES_KEY)[word] || null;

  const likeBtn = container.querySelector('.vote.like');
  const dislikeBtn = container.querySelector('.vote.dislike');

  likeBtn.querySelector('.cnt').textContent = seed.likes + (myVote === 'like' ? 1 : 0);
  dislikeBtn.querySelector('.cnt').textContent = seed.dislikes + (myVote === 'dislike' ? 1 : 0);
  likeBtn.classList.toggle('active', myVote === 'like');
  dislikeBtn.classList.toggle('active', myVote === 'dislike');
}

function castVote(word, type) {
  const votes = loadStore(VOTES_KEY);
  votes[word] = votes[word] === type ? null : type;   // повторный клик снимает голос
  if (!votes[word]) delete votes[word];
  saveStore(VOTES_KEY, votes);
  // обновляем оба блока: и в слове дня, и в модалке
  if (DICT[currentHeroIndex] && DICT[currentHeroIndex].word === word) {
    renderVotes(document.getElementById('heroVotes'), word);
  }
  if (modalWordKey === word) {
    renderVotes(document.getElementById('modalVotes'), word);
  }
}

function wireVotes(container, getWord) {
  container.querySelector('.vote.like')
    .addEventListener('click', () => castVote(getWord(), 'like'));
  container.querySelector('.vote.dislike')
    .addEventListener('click', () => castVote(getWord(), 'dislike'));
}

wireVotes(document.getElementById('heroVotes'),
  () => DICT[currentHeroIndex].word);
wireVotes(document.getElementById('modalVotes'),
  () => modalWordKey);

/* ── комментарии ───────────────────────────── */
const SHOW_COMMENTS = 3;   // модалка без прокрутки — показываем последние три

function renderComments(word) {
  const all = loadStore(COMMENTS_KEY)[word] || [];
  const list = document.getElementById('commentsList');
  const count = document.getElementById('commentsCount');
  list.innerHTML = '';

  count.textContent = all.length ? '· ' + all.length : '';

  if (all.length === 0) {
    const li = document.createElement('li');
    li.className = 'comments-empty';
    li.textContent = 'пока никто ничего не написал — будь первым, солнышко';
    list.appendChild(li);
    return;
  }

  all.slice(-SHOW_COMMENTS).forEach(c => {
    const li = document.createElement('li');
    const author = document.createElement('span');
    author.className = 'c-author';
    author.textContent = 'ты:';
    li.appendChild(author);
    li.appendChild(document.createTextNode(c.text));
    list.appendChild(li);
  });
}

function addComment() {
  const input = document.getElementById('commentInput');
  const text = input.value.trim();
  if (!text || !modalWordKey) return;

  const store = loadStore(COMMENTS_KEY);
  (store[modalWordKey] = store[modalWordKey] || []).push({
    text,
    date: new Date().toISOString()
  });
  saveStore(COMMENTS_KEY, store);

  input.value = '';
  renderComments(modalWordKey);
}

document.getElementById('commentSend').addEventListener('click', addComment);
document.getElementById('commentInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addComment();
});

/* ── поехали! ──────────────────────────────── */
loadDictionary();
