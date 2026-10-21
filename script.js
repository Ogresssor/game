/* =====================================================================
   НАСТРОЙКИ
   ===================================================================== */

// Telegram-бот (необязательно). Пустой token — ничего не отправляется: документы она передаёт кнопкой «Отправить Михаилу».
const TELEGRAM = { token: '', chatId: '' };

const TAPS = 14;           // сколько нажатий нужно, чтобы растопить лёд
const FINAL_TEMP = 37.2;   // итоговая «температура» медвежонка

// Пункты доверенности (галочки ставит она)
const POWERS = [
  'подтверждать от моего имени, что он не холодный',
  'держать надо мной зонтик (он всё равно его возьмёт)',
  'угощать меня кофе',
  'выбирать маршрут наших прогулок',
  'отдавать мне худи, если я замёрзну',
  'присылать мне смешные сайты',
];

/* =====================================================================
   Утилиты
   ===================================================================== */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const fmtTemp = (t) => (t >= 0 ? '+' : '−') + Math.abs(t).toFixed(1).replace('.', ',') + '°';
const TODAY = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

function burst(x, y, items, n = 10) {
  for (let k = 0; k < n; k++) {
    const b = document.createElement('span');
    b.className = 'burst';
    b.textContent = pick(items);
    const a = (Math.PI * 2 * k) / n + rand(-.3, .3), d = rand(50, 110);
    b.style.left = x + 'px'; b.style.top = y + 'px';
    b.style.setProperty('--dx', Math.cos(a) * d + 'px');
    b.style.setProperty('--dy', Math.sin(a) * d + 'px');
    b.style.setProperty('--r', rand(-90, 90) + 'deg');
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 950);
  }
}

function tgSend(text) {
  if (!TELEGRAM.token) return;
  fetch(`https://api.telegram.org/bot${TELEGRAM.token}/sendMessage`, {
    method: 'POST', body: new URLSearchParams({ chat_id: TELEGRAM.chatId, text }),
  }).catch(() => {});
}
function tgPhoto(blob, caption) {
  if (!TELEGRAM.token) return Promise.resolve(false);
  const fd = new FormData();
  fd.append('chat_id', TELEGRAM.chatId);
  fd.append('caption', caption);
  fd.append('photo', blob, 'delo.png');
  return fetch(`https://api.telegram.org/bot${TELEGRAM.token}/sendPhoto`, { method: 'POST', body: fd })
    .then((r) => r.ok).catch(() => false);
}

const BEAR_SVG = `
<svg viewBox="0 0 120 120" aria-hidden="true">
  <circle cx="28" cy="32" r="17" fill="#a7693a"/><circle cx="28" cy="32" r="9" fill="#e7b48a"/>
  <circle cx="92" cy="32" r="17" fill="#a7693a"/><circle cx="92" cy="32" r="9" fill="#e7b48a"/>
  <circle cx="60" cy="66" r="42" fill="#b9793f"/>
  <ellipse cx="60" cy="84" rx="21" ry="16" fill="#f3cfa6"/>
  <ellipse cx="44" cy="60" rx="5" ry="6" fill="#2b1a10"/><ellipse cx="76" cy="60" rx="5" ry="6" fill="#2b1a10"/>
  <circle cx="46" cy="58" r="1.6" fill="#fff"/><circle cx="78" cy="58" r="1.6" fill="#fff"/>
  <ellipse cx="60" cy="77" rx="7.5" ry="5.5" fill="#3b2414"/>
  <path d="M53 87 Q60 94 67 87" stroke="#3b2414" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <circle cx="34" cy="76" r="6" fill="#ff8fab" opacity=".55"/><circle cx="86" cy="76" r="6" fill="#ff8fab" opacity=".55"/>
</svg>`;
$$('.bear').forEach((el) => (el.innerHTML = BEAR_SVG));
$$('.today').forEach((el) => (el.textContent = TODAY));

/* =====================================================================
   Навигация
   ===================================================================== */

function show(id) {
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  scrollTo({ top: 0, behavior: 'smooth' });
  if (id === 's-act' || id === 's-power') requestAnimationFrame(() => pads.forEach((p) => p.resize()));
}
$$('[data-go]').forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.go === 's-game') tgSend('📁 Она открыла «Дело о признании Михаила не холодным»');
  show(b.dataset.go);
}));

/* =====================================================================
   Экспертиза: растопи лёд
   ===================================================================== */

let taps = 0;
const ice = $('#ice'), bear = $('#game-bear');

function crackAt(px, py) {
  // px, py — в координатах viewBox 0 0 200 220
  let out = '';
  for (let b = 0; b < 3; b++) {
    let x = px, y = py, d = `M${x.toFixed(1)},${y.toFixed(1)}`;
    const ang = rand(0, Math.PI * 2);
    for (let s = 0; s < 4; s++) {
      x += Math.cos(ang + rand(-.6, .6)) * rand(8, 18);
      y += Math.sin(ang + rand(-.6, .6)) * rand(8, 18);
      d += ` L${x.toFixed(1)},${y.toFixed(1)}`;
    }
    out += `<path d="${d}"/>`;
  }
  $('#cracks').insertAdjacentHTML('beforeend', out);
}

$('#ice-zone').addEventListener('click', (e) => {
  if (taps >= TAPS) return;
  taps++;
  const p = taps / TAPS;
  const r = ice.getBoundingClientRect();
  crackAt(((e.clientX - r.left) / r.width) * 200, ((e.clientY - r.top) / r.height) * 220);
  ice.classList.remove('hit'); void ice.offsetWidth; ice.classList.add('hit');
  setTimeout(() => ice.classList.remove('hit'), 150);
  ice.style.opacity = (1 - p * .7).toFixed(2);
  bear.style.setProperty('--frost', `saturate(${(.25 + .75 * p).toFixed(2)}) hue-rotate(${(170 * (1 - p)).toFixed(0)}deg) brightness(${(1.15 - .15 * p).toFixed(2)})`);
  bear.style.setProperty('--jit', (2 * (1 - p)).toFixed(1) + 'px');

  const temp = -15 + (FINAL_TEMP + 15) * p;
  $('#thermo-fill').style.height = (4 + 92 * p) + '%';
  $('#thermo-val').textContent = fmtTemp(temp);
  burst(e.clientX, e.clientY, p < .5 ? ['❄️', '💨', '✨'] : ['💨', '✨', '💗', '🔥'], 6);

  if (taps === TAPS) shatter();
});

function shatter() {
  const r = ice.getBoundingClientRect();
  for (let k = 0; k < 18; k++) {
    const s = document.createElement('i');
    s.className = 'shard';
    const w = rand(14, 34), h = rand(10, 28);
    s.style.left = r.left + rand(0, r.width - w) + 'px';
    s.style.top = r.top + rand(0, r.height - h) + 'px';
    s.style.width = w + 'px'; s.style.height = h + 'px';
    s.style.clipPath = `polygon(${rand(0, 40)}% 0, 100% ${rand(0, 50)}%, ${rand(50, 100)}% 100%, 0 ${rand(40, 100)}%)`;
    s.style.setProperty('--dx', rand(-160, 160) + 'px');
    s.style.setProperty('--dy', rand(80, 260) + 'px');
    s.style.setProperty('--r', rand(-300, 300) + 'deg');
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 1100);
  }
  ice.style.opacity = 0;
  bear.classList.remove('frozen');
  bear.classList.add('free');
  bear.style.setProperty('--frost', 'none');
  burst(r.left + r.width / 2, r.top + r.height / 2, ['💗', '💖', '✨', '🐻'], 16);
  setTimeout(() => {
    $('#thermo-val').textContent = fmtTemp(FINAL_TEMP);
    const v = $('#verdict');
    v.innerHTML = `Температура: ${fmtTemp(FINAL_TEMP)}C<br>Холодность <b>не обнаружена</b>.<br>Эксперт допускается к подписанию.`;
    v.hidden = false;
    $('#to-act').hidden = false;
  }, 700);
}
$('#to-act').addEventListener('click', () => show('s-act'));

/* =====================================================================
   Подпись пальцем
   ===================================================================== */

class Pad {
  constructor(canvas, onChange) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.wrap = canvas.parentElement;
    this.strokes = [];
    this.onChange = onChange;
    this.ink = 0;
    let cur = null;
    const pos = (e) => {
      const r = this.c.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
    };
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      cur = [pos(e)];
      this.strokes.push(cur);
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!cur) return;
      const p = pos(e), q = cur[cur.length - 1];
      this.ink += Math.hypot((p[0] - q[0]) * this.c.width, (p[1] - q[1]) * this.c.height);
      cur.push(p);
      this.draw();
    });
    const end = () => { if (cur) { cur = null; this.changed(); } };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }
  get inked() { return this.ink > 60; }
  changed() { this.wrap.classList.toggle('inked', this.strokes.length > 0); this.onChange(); }
  clear() { this.strokes = []; this.ink = 0; this.draw(); this.changed(); }
  resize() {
    const r = this.c.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.c.width = Math.round(r.width * dpr);
    this.c.height = Math.round(r.height * dpr);
    this.draw();
  }
  draw() {
    const { ctx, c } = this;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.strokeStyle = '#1f3f8a';
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2.4, c.width / 220);
    for (const s of this.strokes) {
      const pts = s.map(([x, y]) => [x * c.width, y * c.height]);
      ctx.beginPath();
      ctx.moveTo(...pts[0]);
      if (pts.length === 1) ctx.lineTo(pts[0][0] + .1, pts[0][1]);
      for (let k = 1; k < pts.length - 1; k++) {
        const mx = (pts[k][0] + pts[k + 1][0]) / 2, my = (pts[k][1] + pts[k + 1][1]) / 2;
        ctx.quadraticCurveTo(pts[k][0], pts[k][1], mx, my);
      }
      if (pts.length > 1) ctx.lineTo(...pts[pts.length - 1]);
      ctx.stroke();
    }
  }
}

const padAct = new Pad($('#pad-act'), () => ($('#sign-act').disabled = !padAct.inked));
const padPower = new Pad($('#pad-power'), () => ($('#sign-power').disabled = !padPower.inked));
const pads = [padAct, padPower];
addEventListener('resize', () => pads.forEach((p) => p.resize()));
$$('[data-clear]').forEach((b) => b.addEventListener('click', () => (b.dataset.clear === 'pad-act' ? padAct : padPower).clear()));

const herName = () => $('#name').value.trim() || 'Снежный барс';

function stamp(paperId, stampId, e) {
  const paper = $(paperId);
  paper.classList.add('signed');
  $(stampId).classList.add('slam');
  setTimeout(() => {
    paper.classList.remove('shake'); void paper.offsetWidth; paper.classList.add('shake');
    navigator.vibrate && navigator.vibrate(40);
  }, 300);
  burst(e.clientX, e.clientY, ['✍️', '📄', '✨', '💗'], 10);
}

/* ---------- Акт ---------- */
$('#sign-act').addEventListener('click', (e) => {
  stamp('#act', '#stamp-act', e);
  $('#name').readOnly = true;
  $('#sign-act').hidden = true;
  $$('.her-name').forEach((el) => (el.textContent = herName()));
  setTimeout(() => {
    $('#after-act').hidden = false;
    $('#after-act').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 900);
});

/* ---------- Доверенность ---------- */
$('#powers').innerHTML = POWERS.map((p, k) => `<li><label><input type="checkbox" value="${k}"><span>${p}</span></label></li>`).join('');

$('#sign-power').addEventListener('click', (e) => {
  stamp('#power', '#stamp-power', e);
  $$('#powers input').forEach((i) => (i.disabled = true));
  $('#sign-power').hidden = true;
  setTimeout(finish, 1300);
});

/* =====================================================================
   Финал: собираем документ в картинку и отправляем
   ===================================================================== */

function wrap(ctx, text, x, y, maxW, lh) {
  let line = '';
  for (const word of text.split(' ')) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); y += lh; line = word; }
    else line = test;
  }
  if (line) { ctx.fillText(line, x, y); y += lh; }
  return y;
}

function drawStamp(ctx, x, y, text, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-.24);
  ctx.globalAlpha = .82;
  ctx.strokeStyle = ctx.fillStyle = color;
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(0, 0, 110, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(0, 0, 98, 0, Math.PI * 2); ctx.stroke();
  ctx.textAlign = 'center';
  ctx.font = 'bold 34px "PT Mono"';
  ctx.fillText(text, 0, 10);
  ctx.font = '14px "PT Mono"';
  ctx.fillText('БЮРО ТЁПЛЫХ', 0, 42);
  ctx.fillText('ОТНОШЕНИЙ', 0, 60);
  ctx.restore();
}

async function buildImage() {
  await Promise.all(['30px "PT Serif"', 'italic 30px "PT Serif"', '30px "PT Mono"', 'bold 30px "PT Mono"', '40px "Caveat"']
    .map((f) => document.fonts.load(f).catch(() => {})));
  const W = 1080, P = 80, TW = W - P * 2;
  const c = document.createElement('canvas');
  c.width = W; c.height = 2600;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fffdf8'; ctx.fillRect(0, 0, W, c.height);
  ctx.fillStyle = '#2c2a33';
  let y = 110;

  const header = (title, sub) => {
    ctx.textAlign = 'center';
    ctx.font = '22px "PT Mono"'; ctx.fillStyle = '#6f6874';
    ctx.fillText('БЮРО ТЁПЛЫХ ОТНОШЕНИЙ · Г. КАЗАНЬ', W / 2, y); y += 70;
    ctx.font = 'bold 56px "PT Mono"'; ctx.fillStyle = '#2c2a33';
    ctx.fillText(title, W / 2, y); y += 50;
    if (sub) { ctx.font = 'italic 30px "PT Serif"'; ctx.fillText(sub, W / 2, y); y += 44; }
    ctx.font = '22px "PT Mono"'; ctx.fillStyle = '#6f6874';
    ctx.fillText(TODAY, W / 2, y); y += 50;
    ctx.fillStyle = '#2c2a33'; ctx.textAlign = 'left';
  };
  const signature = (pad, label, name) => {
    ctx.font = '22px "PT Mono"'; ctx.fillStyle = '#6f6874';
    ctx.fillText(label, P, y); y += 10;
    const sw = 460, sh = sw * (pad.c.height / pad.c.width || .3);
    if (pad.c.width) ctx.drawImage(pad.c, P, y, sw, sh);
    ctx.font = '44px "Caveat"'; ctx.fillStyle = '#1f3f8a';
    ctx.fillText(name, P + sw + 30, y + sh * .6);
    ctx.strokeStyle = '#2c2a33'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(P, y + sh); ctx.lineTo(P + sw, y + sh); ctx.stroke();
    y += sh + 40; ctx.fillStyle = '#2c2a33';
  };

  // Акт
  header('АКТ № 1', 'о признании Михаила не холодным');
  ctx.font = '30px "PT Serif"';
  y = wrap(ctx, `Мы, нижеподписавшиеся, ${herName()} (Эксперт) и Михаил (Медвежонок), составили настоящий акт:`, P, y, TW, 42) + 10;
  [
    'Эксперт лично провёл проверку Медвежонка и холодным его не признал.',
    `Температура Медвежонка по результатам экспертизы: ${fmtTemp(FINAL_TEMP)}C.`,
    'Мнение Эксперта окончательно и обжалованию не подлежит, поскольку «со стороны виднее».',
    'Медвежонок обязуется и впредь не казаться холодным.',
    'Акт действует бессрочно.',
  ].forEach((t, k) => { y = wrap(ctx, `${k + 1}. ${t}`, P, y, TW, 42) + 4; });
  y += 20;
  ctx.font = '22px "PT Mono"'; ctx.fillStyle = '#6f6874'; ctx.fillText('Медвежонок:', P, y);
  ctx.font = '56px "Caveat"'; ctx.fillStyle = '#1f3f8a'; ctx.fillText('Михаил', P + 200, y + 8); y += 50;
  const stampY1 = y + 60;
  signature(padAct, 'Эксперт:', herName());
  drawStamp(ctx, W - P - 120, stampY1, 'ПОДПИСАНО', '#c8324b');

  // Разделитель
  ctx.setLineDash([12, 10]); ctx.strokeStyle = '#d9cdbd'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(P, y); ctx.lineTo(W - P, y); ctx.stroke(); ctx.setLineDash([]);
  y += 90;

  // Доверенность
  header('ДОВЕРЕННОСТЬ');
  ctx.font = '30px "PT Serif"';
  y = wrap(ctx, `Я, ${herName()}, настоящей доверенностью уполномочиваю Михаила (Медвежонка):`, P, y, TW, 42) + 10;
  const chosen = $$('#powers input:checked').map((i) => POWERS[+i.value]);
  (chosen.length ? chosen : ['(пункты не отмечены — видимо, доверяет во всём 😏)']).forEach((t) => {
    ctx.font = '40px "Caveat"'; ctx.fillStyle = '#1f3f8a'; ctx.fillText('✓', P, y + 2);
    ctx.font = '30px "PT Serif"'; ctx.fillStyle = '#2c2a33';
    y = wrap(ctx, t, P + 44, y, TW - 44, 42) + 4;
  });
  ctx.font = 'italic 24px "PT Serif"'; ctx.fillStyle = '#6f6874';
  y = wrap(ctx, 'Выдана без права передоверия, может быть отозвана только улыбкой.', P, y + 14, TW, 34) + 26;
  ctx.fillStyle = '#2c2a33';
  const stampY2 = y + 50;
  signature(padPower, 'Доверитель:', herName());
  drawStamp(ctx, W - P - 120, stampY2, 'ЗАВЕРЕНО', '#2f5fb3');

  // Обрезаем по содержимому
  const out = document.createElement('canvas');
  out.width = W; out.height = y + 50;
  out.getContext('2d').drawImage(c, 0, 0);
  return { canvas: out, chosen };
}

async function finish() {
  show('s-done');
  const { canvas, chosen } = await buildImage();
  const url = canvas.toDataURL('image/png');
  $('#doc-preview').src = url;
  $('#download').href = url;
  canvas.toBlob(async (blob) => {
    docFile = new File([blob], 'delo-2110-MB.png', { type: 'image/png' });
    // Если «Поделиться» с файлами не поддерживается — остаётся только «Сохранить копию»
    if (!(navigator.canShare && navigator.canShare({ files: [docFile] }))) $('#share').hidden = true;
    const sent = await tgPhoto(blob,
      `📄 Дело № 2110-МБ закрыто!\nЭксперт: ${herName()}\nТемпература: ${fmtTemp(FINAL_TEMP)}C — холодность не обнаружена\nДоверенность: ${chosen.length} из ${POWERS.length} пунктов`);
    if (sent) $('#done-text').textContent = 'Документы подписаны и уже переданы Михаилу. Обжалованию не подлежит 😌';
  }, 'image/png');
}

let docFile = null;
$('#share').addEventListener('click', async () => {
  if (!docFile) return;
  try {
    await navigator.share({ files: [docFile], text: 'Подписано ✍️ Дело № 2110-МБ закрыто 😌' });
  } catch { /* отменила — ничего страшного */ }
});
