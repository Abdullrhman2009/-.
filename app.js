/* ====== التنقل بين الشاشات ====== */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

function goHome()          { stopAudio(); showScreen('home'); }
function goQuran()         { renderSurahList(); showScreen('quranList'); }
function goAzkar()         { showScreen('azkarMenu'); }
function goDua()           { showScreen('duaMenu'); }
function backToSurahList() { stopAudio(); showScreen('quranList'); }

/* ====== قائمة السور ====== */
function renderSurahList() {
  const container = document.getElementById('surahList');
  container.innerHTML = '';
  SURAHS.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'surah-item';
    btn.innerHTML = `
      <span class="surah-num">${s.n}</span>
      <span class="surah-name">سورة ${s.name}</span>
      <span class="surah-type">${s.type} • ${s.ayahs} آية</span>
    `;
    btn.onclick = () => openSurah(s.n);
    container.appendChild(btn);
  });
}

/* ====== حالة القارئ ====== */
let currentSurah = 1;
let currentPage = 1;
let surahData = null;
let audioEl = new Audio();
let isPlaying = false;
let currentReciter = localStorage.getItem('reciter') || 'yasser';

audioEl.addEventListener('ended', () => {
  stopAudio();
});

audioEl.addEventListener('error', (e) => {
  console.error('خطأ في تشغيل الصوت:', e);
  isPlaying = false;
  updatePlayButton();
});

/* روابط القراء - mp3quran.net */
const RECITERS = {
  yasser: {
    name: "ياسر الدوسري",
    base: "https://server11.mp3quran.net/yasser/"
  },
  lohaidan: {
    name: "محمد اللحيدان",
    base: "https://server6.mp3quran.net/lhdan/"
  }
};

/* ====== فتح سورة ====== */
async function openSurah(num) {
  currentSurah = num;
  const surah = SURAHS.find(s => s.n === num);
  document.getElementById('surahTitle').textContent = 'سورة ' + surah.name;

  const saved = JSON.parse(localStorage.getItem('bookmark') || 'null');
  currentPage = (saved && saved.surah === num) ? saved.page : 1;

  document.getElementById('reciterSelect').value = currentReciter;

  try {
    const res = await fetch(
      `https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${num}`
    );
    const data = await res.json();

    surahData = data.verses.map((v, i) => ({
      number: i + 1,
      text: v.text_uthmani,
      audioIdx: i + 1
    }));

    renderPage();
    showScreen('quranRead');
  } catch (err) {
    console.error(err);
    alert('تعذر تحميل السورة. تأكد من الاتصال بالإنترنت.');
  }
}

/* ====== عرض الصفحة ====== */
function renderPage() {
  if (!surahData) return;

  const PER_PAGE = 10;
  const totalPages = Math.ceil(surahData.length / PER_PAGE);
  if (currentPage < 1) currentPage = 1;
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * PER_PAGE;
  const pageAyahs = surahData.slice(start, start + PER_PAGE);

  const container = document.getElementById('ayahContainer');

  let basmalaHTML = '';
  const isFirstPage = currentPage === 1;
  const hasBasmala = currentSurah !== 1 && currentSurah !== 9;

  if (isFirstPage && hasBasmala) {
    basmalaHTML = `<div class="basmala">بِسْمِ اللهِ الرَّحْمَنِ الرَّحِيمِ</div>`;
  }

  let ayahHTML = '';
  pageAyahs.forEach((a) => {
    ayahHTML += `${a.text} <span class="ayah-num-inline">${a.number}</span> `;
  });

  container.innerHTML = `
    <div class="mushaf-page">
      ${basmalaHTML}
      <div class="mushaf-text">${ayahHTML}</div>
    </div>
  `;

  document.getElementById('pageNum').textContent = currentPage;
  document.getElementById('prevBtn').disabled = currentPage === 1;
  document.getElementById('nextBtn').disabled = currentPage === totalPages;

  updateSaveButton();
}

function prevPage() {
  if (currentPage > 1) { stopAudio(); currentPage--; renderPage(); }
}
function nextPage() {
  stopAudio(); currentPage++; renderPage();
}

/* ====== الحفظ ====== */
function toggleBookmark() {
  const saved = JSON.parse(localStorage.getItem('bookmark') || 'null');
  if (saved && saved.surah === currentSurah && saved.page === currentPage) {
    localStorage.removeItem('bookmark');
  } else {
    localStorage.setItem('bookmark', JSON.stringify({
      surah: currentSurah,
      page: currentPage
    }));
  }
  updateSaveButton();
}

function updateSaveButton() {
  const saved = JSON.parse(localStorage.getItem('bookmark') || 'null');
  const isSaved = saved && saved.surah === currentSurah && saved.page === currentPage;
  const btn = document.getElementById('saveBtn');
  const icon = document.getElementById('saveIcon');
  const txt = document.getElementById('saveText');
  if (isSaved) {
    btn.classList.add('active');
    icon.textContent = '✓';
    txt.textContent = 'محفوظة';
  } else {
    btn.classList.remove('active');
    icon.textContent = '🔖';
    txt.textContent = 'حفظ';
  }
}

/* ====== الصوت ====== */
function onReciterChange() {
  currentReciter = document.getElementById('reciterSelect').value;
  localStorage.setItem('reciter', currentReciter);
  stopAudio();
}

function togglePlay() {
  if (isPlaying) {
    stopAudio();
  } else {
    playCurrentSurah();
  }
}

function playCurrentSurah() {
  const url = buildAudioURL(currentSurah);
  audioEl.src = url;
  audioEl.play().then(() => {
    isPlaying = true;
    updatePlayButton();
  }).catch(err => {
    console.error('تعذر التشغيل:', err);
    isPlaying = false;
    updatePlayButton();
  });
}

function buildAudioURL(surahNum) {
  const s = String(surahNum).padStart(3, '0');
  return `${RECITERS[currentReciter].base}${s}.mp3`;
}

function stopAudio() {
  audioEl.pause();
  audioEl.currentTime = 0;
  isPlaying = false;
  updatePlayButton();
}

function updatePlayButton() {
  const btn = document.getElementById('playBtn');
  const icon = document.getElementById('playIcon');
  const txt = document.getElementById('playText');
  if (isPlaying) {
    btn.classList.add('playing');
    icon.textContent = '⏸';
    txt.textContent = 'إيقاف';
  } else {
    btn.classList.remove('playing');
    icon.textContent = '▶';
    txt.textContent = 'تشغيل';
  }
}

/* ====== الأذكار ====== */
function openAzkar(key) {
  const data = AZKAR[key];
  document.getElementById('azkarTitle').textContent = data.title;
  const body = document.getElementById('azkarBody');
  body.innerHTML = '';
  data.items.forEach((it, i) => {
    const card = document.createElement('div');
    card.className = 'dhikr-card';
    card.innerHTML = `
      <div class="dhikr-title">${i+1}. ${it.t}</div>
      <div class="dhikr-text">${it.x}</div>
      ${it.n ? `<div class="dhikr-note">${it.n}</div>` : ''}
    `;
    body.appendChild(card);
  });
  showScreen('azkarContent');
}

/* ====== الأدعية ====== */
function openDua(key) {
  const data = DUAS[key];
  document.getElementById('duaTitle').textContent = data.title;
  const body = document.getElementById('duaBody');
  body.innerHTML = '';
  data.items.forEach((it, i) => {
    const card = document.createElement('div');
    card.className = 'dhikr-card';
    card.innerHTML = `
      <div class="dhikr-title">${i+1}. ${it.t}</div>
      <div class="dhikr-text">${it.x}</div>
    `;
    body.appendChild(card);
  });
  showScreen('duaContent');
}

/* ====== عداد الختمات ====== */
function getKhatmaCount() {
  return parseInt(localStorage.getItem('khatmaCount') || '0', 10);
}

function setKhatmaCount(value) {
  if (value < 0) value = 0;
  localStorage.setItem('khatmaCount', value);
  updateKhatmaUI();
}

function changeKhatma(delta) {
  setKhatmaCount(getKhatmaCount() + delta);
}

function resetKhatma() {
  if (confirm('هل تريد تصفير عداد الختمات؟')) {
    setKhatmaCount(0);
  }
}

function openKhatmaPanel() {
  document.getElementById('khatmaPanel').classList.add('active');
}

function closeKhatmaPanel() {
  document.getElementById('khatmaPanel').classList.remove('active');
}

function updateKhatmaUI() {
  const count = getKhatmaCount();
  const chipEl = document.getElementById('khatmaChipCount');
  const panelEl = document.getElementById('khatmaCount');
  if (chipEl) chipEl.textContent = count;
  if (panelEl) panelEl.textContent = count;
}

/* ====== عداد التسبيح (غير محدود) ====== */
function openTasbih() {
  showScreen('tasbihScreen');
}

function getTasbihCount() {
  return parseInt(localStorage.getItem('tasbihCount') || '0', 10);
}

function setTasbihCount(value) {
  if (value < 0) value = 0;
  localStorage.setItem('tasbihCount', value);
  updateTasbihUI();
}

function incrementTasbih() {
  const newCount = getTasbihCount() + 1;
  setTasbihCount(newCount);

  if (navigator.vibrate) navigator.vibrate(30);

  const display = document.getElementById('tasbihDisplay');
  if (display) {
    display.classList.add('pulse');
    setTimeout(() => display.classList.remove('pulse'), 150);
  }
}

function resetTasbih() {
  if (confirm('هل تريد تصفير عداد التسبيح؟')) {
    setTasbihCount(0);
  }
}

function updateTasbihUI() {
  const count = getTasbihCount();
  const el = document.getElementById('tasbihCount');
  if (el) el.textContent = count.toLocaleString('ar-EG');
}

/* ====== عند التحميل ====== */
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('reciterSelect').value = currentReciter;
  updateKhatmaUI();
  updateTasbihUI();
});