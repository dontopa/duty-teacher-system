/* SIGAP — aplikasi papan pemuka (SPA berasaskan hash) */
(function () {
  const S = SIGAP, D = S.D;
  S.load();
  let me = S.currentUser();
  if (!me) { location.replace('login.html'); return; }

  /* ---------- Utiliti ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = o => JSON.parse(JSON.stringify(o));
  const pct = (v, d = 1) => (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  const nowTime = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const getPath = (o, p) => p.split('.').reduce((a, k) => a == null ? a : a[k], o);
  const setPath = (o, p, v) => { const ks = p.split('.'); const last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };
  const view = $('#view');
  const uname = id => { const u = S.user(id); return u ? u.nama : 'Pengguna dipadam'; };
  const chip = (st, short) => '<span class="status s-' + S.STATUS[st].tone + '" title="' + S.STATUS[st].label + '">' + S.STATUS[st][short ? 'short' : 'label'] + '</span>';
  const avatar = (u, cls) => '<span class="avatar ' + (cls || '') + (u && u.role === 'admin' ? ' av-admin' : '') + '">' + esc(u ? S.initials(u.nama) : '?') + '</span>';
  const isAdmin = () => me.role === 'admin';
  const classNames = () => S.db.classes.map(c => c.nama);
  const thisMonday = () => D.toISO(D.mondayOf(new Date()));
  const daysAgo = n => D.toISO(D.addDays(new Date(), -n));

  /* Pengendali acara mengikut halaman */
  let H = {};
  ['click', 'input', 'change', 'submit'].forEach(ev => view.addEventListener(ev, e => { if (H[ev]) H[ev](e); }));

  /* ---------- Toast, modal, confirm ---------- */
  function toast(msg, type) {
    const t = document.createElement('div');
    t.className = 'toast ' + (type || 'ok');
    t.innerHTML = icon(type === 'bad' ? 'alert' : type === 'info' ? 'info' : 'done') + '<span>' + esc(msg) + '</span>';
    $('#toasts').appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 260); }, 2800);
  }
  const modalRoot = $('#modalRoot');
  function openModal(title, body, foot, onMount) {
    modalRoot.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="modal-head"><h3>' + esc(title) + '</h3><button class="btn btn-ghost btn-icon" data-close aria-label="Tutup">' + icon('x') + '</button></div><div class="modal-body">' + body + '</div>' + (foot ? '<div class="modal-foot">' + foot + '</div>' : '') + '</div>';
    modalRoot.hidden = false;
    document.body.style.overflow = 'hidden';
    const first = modalRoot.querySelector('input, select, textarea');
    if (first && matchMedia('(pointer:fine)').matches) first.focus();
    if (onMount) onMount(modalRoot.firstChild);
  }
  function closeModal() { modalRoot.hidden = true; modalRoot.innerHTML = ''; document.body.style.overflow = ''; }
  modalRoot.addEventListener('click', e => { if (e.target === modalRoot || e.target.closest('[data-close]')) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modalRoot.hidden) closeModal(); });
  function confirmBox(title, msg, okLabel, danger) {
    return new Promise(res => {
      const h = e => { if (e.target === modalRoot || e.target.closest('[data-close]')) { modalRoot.removeEventListener('click', h); res(false); } };
      openModal(title, '<p class="muted">' + msg + '</p>', '<button class="btn btn-outline" data-close>Batal</button><button class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" id="cfOk">' + esc(okLabel || 'Teruskan') + '</button>', m => {
        $('#cfOk', m).onclick = () => { modalRoot.removeEventListener('click', h); closeModal(); res(true); };
      });
      modalRoot.addEventListener('click', h);
    });
  }

  /* ---------- Rangka (shell) ---------- */
  function navItems() {
    if (isAdmin()) {
      const pending = S.db.reports.filter(r => r.status === 'dihantar').length;
      return [
        { key: 'dashboard', ic: 'home', label: 'Utama' },
        { key: 'laporan', ic: 'file', label: 'Laporan', badge: pending },
        { key: 'jadual', ic: 'calendar', label: 'Jadual' },
        { key: 'pengguna', ic: 'users', label: 'Pengguna' },
        { key: 'tetapan', ic: 'sliders', label: 'Tetapan' }
      ];
    }
    const mine = myRosterIds();
    const fix = S.db.reports.filter(r => r.status === 'dikembalikan' && mine.includes(r.rosterId)).length;
    return [
      { key: 'dashboard', ic: 'home', label: 'Utama' },
      { key: 'isi', ic: 'edit', label: 'Isi Laporan' },
      { key: 'laporan', ic: 'file', label: 'Laporan Saya', short: 'Laporan', badge: fix },
      { key: 'jadual', ic: 'calendar', label: 'Jadual' },
      { key: 'profil', ic: 'user', label: 'Profil' }
    ];
  }
  function renderShell() {
    const items = navItems();
    const link = (it, mobile) => '<a href="#/' + it.key + '" data-nav="' + it.key + '">' + icon(it.ic) + '<span>' + esc(mobile && it.short ? it.short : it.label) + '</span>' + (it.badge ? '<span class="nav-badge">' + it.badge + '</span>' : '') + '</a>';
    $('#sideNav').innerHTML = items.map(it => link(it)).join('');
    $('#bottomNav').innerHTML = items.map(it => link(it, true)).join('');
    $('#schoolName').textContent = S.db.settings.namaSekolah;
    $('#sideUser').innerHTML = avatar(me) + '<div class="who"><b>' + esc(me.nama) + '</b><small>' + (isAdmin() ? 'Pentadbir' : 'Guru') + ' · ' + esc(me.jawatan) + '</small></div><button class="btn btn-ghost btn-icon" id="sideLogout" title="Log keluar" aria-label="Log keluar">' + icon('logout') + '</button>';
    $('#avatarBtn').innerHTML = avatar(me);
    $('#todayChip').textContent = D.long(D.todayISO());
    $('#userMenu').innerHTML = '<div class="menu-head"><b>' + esc(me.nama) + '</b><small>' + esc(me.email) + '</small></div>' +
      '<a href="#/profil">' + icon('user') + ' Profil saya</a><a href="index.html">' + icon('school') + ' Laman utama SIGAP</a>' +
      '<button class="danger" data-logout>' + icon('logout') + ' Log keluar</button>';
    $('#sideLogout').onclick = logout;
    setActive(currentKey);
  }
  function setActive(key) {
    currentKey = key;
    $$('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === key));
  }
  function setTitle(t) { $('#pageTitle').textContent = t; document.title = t + ' · SIGAP'; }
  async function logout() {
    if (await confirmBox('Log keluar?', 'Anda akan dikembalikan ke halaman log masuk.', 'Log keluar')) { S.logout(); location.href = 'login.html'; }
  }
  const menu = $('#userMenu'), avBtn = $('#avatarBtn');
  avBtn.onclick = e => { e.stopPropagation(); menu.hidden = !menu.hidden; avBtn.setAttribute('aria-expanded', String(!menu.hidden)); };
  menu.addEventListener('click', e => { if (e.target.closest('[data-logout]')) logout(); menu.hidden = true; });
  document.addEventListener('click', () => { menu.hidden = true; });
  addEventListener('scroll', () => $('.topbar').classList.toggle('scrolled', scrollY > 4), { passive: true });

  /* ---------- Penghala ---------- */
  let currentKey = 'dashboard';
  function route() {
    const h = location.hash.replace(/^#\/?/, '') || 'dashboard';
    const [path, qs] = h.split('?');
    const parts = path.split('/');
    const params = new URLSearchParams(qs || '');
    me = S.user(me.id);
    if (!me) { S.logout(); location.replace('login.html'); return; }
    flush();
    H = {}; W = null;
    closeModal();
    const key = parts[0];
    setActive(key === 'laporan' && parts[1] === 'isi' && !isAdmin() ? 'isi' : key);
    scrollTo(0, 0);
    const adminOnly = ['pengguna', 'tetapan'];
    if (adminOnly.includes(key) && !isAdmin()) return go('#/dashboard');
    switch (key) {
      case 'dashboard': return isAdmin() ? adminDash() : guruDash();
      case 'isi': return goToFill();
      case 'laporan':
        if (parts[1] === 'isi') return wizard(parts[2], +params.get('s') || 0);
        if (parts[1] === 'lihat') return viewReport(parts[2]);
        return listReports();
      case 'jadual': return jadual();
      case 'pengguna': return pengguna();
      case 'tetapan': return tetapan();
      case 'profil': return profil();
      default: return go('#/dashboard');
    }
  }
  function go(h) { if (location.hash === h) route(); else location.hash = h; }
  addEventListener('hashchange', route);

  function myRosterIds() { return S.rostersForUser(me.id).map(r => r.id); }
  function myReports() { const ids = myRosterIds(); return S.reports().filter(r => ids.includes(r.rosterId) || r.filledBy === me.id); }
  function reportLink(date) {
    const rep = S.report(date);
    if (!isAdmin() && S.canEdit(me, date)) return '#/laporan/isi/' + date;
    return rep ? '#/laporan/lihat/' + date : null;
  }

  /* =========================================================
     PAPAN PEMUKA GURU
     ========================================================= */
  function dayTile(date, today) {
    const rep = S.report(date);
    const st = rep ? rep.status : 'tiada';
    const future = date > today;
    const editable = S.canEdit(me, date);
    const cls = 'day' + (date === today ? ' today' : '') + (future ? ' locked' : '');
    const inner = '<div class="day-top"><span class="day-name">' + D.dayName(date) + '</span><span class="day-date">' + D.short(date) + '</span></div>' +
      (future ? '<span class="status s-ghost">Belum tiba</span>' : chip(st, true)) +
      '<span class="day-act">' + (future ? icon('lock') + ' Dikunci' : editable ? (rep ? 'Sambung' : 'Isi laporan') + ' ' + icon('arrow') : rep ? 'Lihat ' + icon('arrow') : '—') + '</span>';
    const href = future ? null : editable ? '#/laporan/isi/' + date : rep ? '#/laporan/lihat/' + date : null;
    return href ? '<a class="' + cls + '" href="' + href + '">' + inner + '</a>' : '<div class="' + cls + '">' + inner + '</div>';
  }

  function guruDash() {
    setTitle('Utama');
    const today = D.todayISO(), mon = thisMonday();
    const roster = S.db.rosters.find(r => r.weekStart === mon);
    const onDuty = roster && roster.teacherIds.includes(me.id);
    const mine = S.rostersForUser(me.id);
    const upcoming = mine.filter(r => r.weekStart > mon).reverse();
    const reps = myReports();
    const cnt = st => reps.filter(r => r.status === st).length;
    const fixes = reps.filter(r => r.status === 'dikembalikan');
    const first = me.nama.replace(/^(Cikgu|Pn\.|En\.|Cik)\s+/, '').split(' ')[0];
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Selamat pagi' : hour < 15 ? 'Selamat tengah hari' : hour < 19 ? 'Selamat petang' : 'Selamat malam';

    let hero;
    if (onDuty) {
      const team = roster.teacherIds.map(id => S.user(id)).filter(Boolean);
      const filled = D.weekDays(mon).filter(d => { const r = S.report(d); return r && r.status !== 'draf'; }).length;
      hero = '<section class="card duty-hero"><div class="card-pad">' +
        '<span class="duty-eyebrow">' + icon('bell') + ' Anda bertugas minggu ini</span>' +
        '<h2>Minggu ' + D.weekRange(mon) + '</h2><p>' + filled + ' daripada 5 laporan harian telah dihantar. Isi laporan mengikut hari.</p>' +
        '<div class="partners">' + team.map(u => '<span class="partner">' + avatar(u, 'sm') + esc(u.nama) + (u.id === roster.ketua ? ' · Ketua' : '') + '</span>').join('') + '</div>' +
        '<div class="days">' + D.weekDays(mon).map(d => dayTile(d, today)).join('') + '</div></div></section>';
    } else {
      const nx = upcoming[0];
      hero = '<section class="card duty-hero"><div class="card-pad">' +
        '<span class="duty-eyebrow">' + icon('calendar') + ' Status bertugas</span>' +
        '<h2>Anda tidak bertugas minggu ini</h2><p>' + (nx ? 'Giliran seterusnya: <b>' + D.weekRange(nx.weekStart) + '</b>.' : 'Tiada giliran bertugas dijadualkan buat masa ini.') + '</p>' +
        (roster ? '<div class="partners">' + roster.teacherIds.map(id => S.user(id)).filter(Boolean).map(u => '<span class="partner">' + avatar(u, 'sm') + esc(u.nama) + '</span>').join('') + '</div><p style="margin-top:8px;font-size:.8rem">Guru bertugas minggu ini</p>' : '') +
        '</div></section>';
    }

    view.innerHTML = '<div class="page-head"><div><h1>' + greet + ', ' + esc(first) + ' 👋</h1><p>' + D.long(today) + ' · ' + esc(S.db.settings.namaSekolah) + '</p></div></div>' +
      '<div class="stack">' + hero +
      (fixes.length ? '<div class="callout bad">' + icon('alert') + '<div><b>' + fixes.length + ' laporan perlu pembetulan</b><p>' + fixes.map(r => '<a href="#/laporan/isi/' + r.date + '" style="text-decoration:underline;font-weight:700">' + D.long(r.date) + '</a>').join(', ') + '</p></div></div>' : '') +
      '<div class="grid g-4">' +
      kpi('Laporan saya', reps.length, 'semua minggu', 'file') +
      kpi('Disahkan', cnt('disahkan'), 'oleh pengurusan', 'shield') +
      kpi('Menunggu', cnt('dihantar'), 'pengesahan', 'clock', 'warn') +
      kpi('Perlu pembetulan', cnt('dikembalikan'), 'dikembalikan', 'undo', 'bad') +
      '</div>' +
      '<div class="grid g-main">' +
      '<section class="card"><div class="card-head"><h2>' + icon('file') + ' Laporan terkini</h2><a class="btn btn-ghost btn-sm" href="#/laporan">Semua ' + icon('right') + '</a></div><div class="list">' +
      (reps.slice(0, 6).map(listRow).join('') || emptyHTML('inbox', 'Belum ada laporan', 'Laporan anda akan dipaparkan di sini.')) + '</div></section>' +
      '<div class="stack">' +
      '<section class="card"><div class="card-head"><h2>' + icon('calendar') + ' Giliran akan datang</h2></div><div class="list">' +
      (upcoming.slice(0, 4).map(r => '<div class="list-item">' + dateBox(r.weekStart) + '<div class="grow"><b>' + D.weekRange(r.weekStart) + '</b><small>Bersama ' + esc(r.teacherIds.filter(i => i !== me.id).map(uname).join(', ') || '—') + '</small></div>' + (r.ketua === me.id ? '<span class="tag brand">Ketua</span>' : '') + '</div>').join('') || emptyHTML('calendar', 'Tiada giliran', 'Belum dijadualkan.')) + '</div></section>' +
      '<section class="card"><div class="card-head"><h2>' + icon('shield') + ' Ulasan pengurusan</h2></div><div class="list">' +
      (reps.filter(r => r.pengesahan && r.pengesahan.ulasan).slice(0, 3).map(r => '<a class="list-item" href="#/laporan/lihat/' + r.date + '">' + avatar(S.user(r.pengesahan.oleh), 'sm') + '<div class="grow"><b>' + esc(r.pengesahan.ulasan) + '</b><small>' + esc(uname(r.pengesahan.oleh)) + ' · ' + D.short(r.date) + '</small></div></a>').join('') || emptyHTML('mail', 'Tiada ulasan', 'Ulasan daripada pentadbir akan muncul di sini.')) +
      '</div></section></div></div></div>';
  }

  function kpi(label, value, sub, ic, tone) {
    return '<div class="card kpi"><div class="kpi-top"><span>' + esc(label) + '</span><span class="kpi-ic ' + (tone || '') + '">' + icon(ic) + '</span></div><strong>' + value + '</strong><small>' + sub + '</small></div>';
  }
  function dateBox(d) { const x = D.parseISO(d); return '<span class="date-box"><b>' + x.getDate() + '</b><small>' + D.BULAN[x.getMonth()] + '</small></span>'; }
  function emptyHTML(ic, t, s) { return '<div class="empty">' + icon(ic) + '<b>' + esc(t) + '</b><span>' + esc(s) + '</span></div>'; }
  function listRow(r) {
    const href = reportLink(r.date) || '#/laporan/lihat/' + r.date;
    return '<a class="list-item" href="' + href + '">' + dateBox(r.date) + '<div class="grow"><b>' + D.dayName(r.date) + ', ' + D.medium(r.date) + '</b><small>Pelajar hadir ' + pct(S.pelajarStat(r).pct) + '% · ' + r.disiplin.length + ' kes disiplin</small></div>' + chip(r.status, true) + '</a>';
  }

  function goToFill() {
    const today = D.todayISO();
    const days = D.weekDays(thisMonday()).filter(d => d <= today && S.canEdit(me, d));
    let target = days.includes(today) ? today : days[days.length - 1];
    if (!target) { const fx = myReports().find(r => r.status === 'dikembalikan'); if (fx) target = fx.date; }
    if (!target) { toast('Tiada laporan untuk diisi sekarang. Semak jadual bertugas anda.', 'info'); return go('#/dashboard'); }
    location.replace('#/laporan/isi/' + target);
  }

  /* =========================================================
     PAPAN PEMUKA PENTADBIR
     ========================================================= */
  function adminDash() {
    setTitle('Papan Pemuka');
    const today = D.todayISO(), mon = thisMonday();
    const all = S.reports();
    const active = all.filter(r => r.status !== 'draf');
    const pending = all.filter(r => r.status === 'dihantar');
    const last7 = active.filter(r => r.date >= daysAgo(7));
    const avgP = last7.length ? last7.reduce((a, r) => a + S.pelajarStat(r).pct, 0) / last7.length : 0;
    const health = last7.reduce((a, r) => a + r.kesihatan.length, 0);
    const clinic = last7.reduce((a, r) => a + r.kesihatan.filter(k => /klinik|hospital/i.test(k.tindakan)).length, 0);
    const disc = last7.reduce((a, r) => a + r.disiplin.length, 0);
    const late = last7.reduce((a, r) => a + r.disiplin.filter(k => k.kesalahan === 'Lewat hadir').length, 0);
    const series = [...active].sort((a, b) => a.date.localeCompare(b.date)).slice(-10).map(r => ({ label: D.short(r.date), full: D.long(r.date), value: S.pelajarStat(r).pct }));
    const roster = S.db.rosters.find(r => r.weekStart === mon);

    // Pecahan disiplin 30 hari
    const last30 = active.filter(r => r.date >= daysAgo(30));
    const byK = {};
    last30.forEach(r => r.disiplin.forEach(d => { byK[d.kesalahan] = (byK[d.kesalahan] || 0) + 1; }));
    const kRows = Object.entries(byK).sort((a, b) => b[1] - a[1]);
    const kMax = Math.max(1, ...kRows.map(k => k[1]));

    // Isu sekitar perlu tindakan (7 hari)
    const issues = [];
    active.filter(r => r.date >= daysAgo(7)).forEach(r => S.ASPEK.forEach(a => { const it = r.sekitar.items[a.key]; if (it && it.status === 'Perlu Tindakan') issues.push({ date: r.date, label: a.label, note: it.catatan }); }));

    view.innerHTML = '<div class="page-head"><div><h1>Papan Pemuka Pentadbir</h1><p>' + D.long(today) + ' · ' + esc(S.db.settings.namaSekolah) + '</p></div><div class="page-actions"><a class="btn btn-primary" href="#/laporan?f=dihantar">' + icon('shield') + ' Semak laporan (' + pending.length + ')</a></div></div>' +
      '<div class="stack"><div class="grid g-4">' +
      kpi('Menunggu pengesahan', pending.length, 'laporan dihantar', 'inbox', 'warn') +
      kpi('Kehadiran pelajar', pct(avgP) + '%', 'purata 7 hari lepas', 'grad') +
      kpi('Kes kesihatan', health, clinic + ' dibawa ke klinik · 7 hari', 'health', 'bad') +
      kpi('Kes disiplin', disc, late + ' lewat hadir · 7 hari', 'alert', 'info') +
      '</div>' +
      '<div class="grid g-main">' +
      '<section class="card"><div class="card-head"><h2>' + icon('trend') + ' Kehadiran pelajar (%)</h2><span class="muted tiny">' + series.length + ' hari persekolahan terakhir</span></div><div class="card-body">' + (series.length ? lineChart(series) : emptyHTML('chart', 'Tiada data', 'Belum ada laporan dihantar.')) + '</div></section>' +
      '<section class="card"><div class="card-head"><h2>' + icon('users') + ' Bertugas minggu ini</h2><a class="btn btn-ghost btn-sm" href="#/jadual">Jadual ' + icon('right') + '</a></div>' +
      (roster ? '<div class="list">' + roster.teacherIds.map(id => S.user(id)).filter(Boolean).map(u => '<div class="list-item">' + avatar(u) + '<div class="grow"><b>' + esc(u.nama) + '</b><small>' + esc(u.jawatan) + '</small></div>' + (u.id === roster.ketua ? '<span class="tag brand">Ketua</span>' : '') + '</div>').join('') + '</div>' +
        '<div class="card-body" style="border-top:1px solid var(--line-2)"><div class="tiny muted" style="font-weight:700;margin-bottom:8px">' + D.weekRange(mon) + '</div><div class="list" style="gap:6px">' +
        D.weekDays(mon).map(d => { const r = S.report(d); const st = r ? r.status : (d > today ? null : 'tiada'); const href = r ? '#/laporan/lihat/' + d : null; return '<' + (href ? 'a href="' + href + '"' : 'div') + ' style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:.85rem;font-weight:600"><span>' + D.dayName(d) + ' <span class="muted">' + D.short(d) + '</span></span>' + (st ? chip(st) : '<span class="status s-ghost">Belum tiba</span>') + '</' + (href ? 'a' : 'div') + '>'; }).join('') +
        '</div></div>'
        : emptyHTML('calendar', 'Tiada guru bertugas', 'Tetapkan jadual untuk minggu ini.')) +
      '</section></div>' +
      '<div class="grid g-3">' +
      '<section class="card"><div class="card-head"><h2>' + icon('inbox') + ' Menunggu pengesahan</h2></div><div class="list">' +
      (pending.slice(0, 5).map(r => '<a class="list-item" href="#/laporan/lihat/' + r.date + '">' + dateBox(r.date) + '<div class="grow"><b>' + D.dayName(r.date) + '</b><small>' + esc(uname(r.filledBy)) + '</small></div>' + icon('right', 'muted') + '</a>').join('') || emptyHTML('done', 'Semua beres!', 'Tiada laporan menunggu.')) + '</div></section>' +
      '<section class="card"><div class="card-head"><h2>' + icon('alert') + ' Kesalahan disiplin</h2><span class="muted tiny">30 hari</span></div><div class="card-body">' +
      (kRows.length ? '<div class="hbars">' + kRows.map(([k, v]) => '<div class="hbar" title="' + esc(k) + ': ' + v + ' kes"><span>' + esc(k) + '</span><b>' + v + '</b><div class="track"><div class="fill" data-w="' + (v / kMax * 100) + '"></div></div></div>').join('') + '</div>' : emptyHTML('done', 'Tiada kes', 'Tiada kes disiplin direkodkan.')) +
      '</div></section>' +
      '<section class="card"><div class="card-head"><h2>' + icon('leaf') + ' Isu kawasan sekolah</h2><span class="muted tiny">7 hari</span></div><div class="list">' +
      (issues.slice(0, 5).map(i => '<a class="list-item" href="#/laporan/lihat/' + i.date + '"><span class="kpi-ic bad" style="width:32px;height:32px">' + icon('alert') + '</span><div class="grow"><b>' + esc(i.label) + '</b><small>' + esc(i.note || 'Perlu tindakan') + ' · ' + D.short(i.date) + '</small></div></a>').join('') || emptyHTML('leaf', 'Kawasan terkawal', 'Tiada isu perlu tindakan.')) +
      '</div></section></div></div>';

    requestAnimationFrame(() => $$('.hbar .fill').forEach(f => { f.style.width = f.dataset.w + '%'; }));
    bindChart();
  }

  /* Carta garis satu siri dengan crosshair & tooltip */
  function lineChart(pts) {
    const Wd = 640, Ht = 230, m = { t: 14, r: 14, b: 30, l: 40 };
    const vals = pts.map(p => p.value);
    let lo = Math.floor(Math.min(...vals) - 1), hi = Math.ceil(Math.max(...vals) + .5);
    hi = Math.min(100, hi); if (hi - lo < 4) lo = hi - 4;
    const iw = Wd - m.l - m.r, ih = Ht - m.t - m.b;
    const x = i => m.l + (pts.length === 1 ? iw / 2 : i * iw / (pts.length - 1));
    const y = v => m.t + (hi - v) / (hi - lo) * ih;
    const ticks = [0, 1, 2, 3, 4].map(k => lo + (hi - lo) * k / 4);
    const path = pts.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.value).toFixed(1)).join(' ');
    const area = path + ' L' + x(pts.length - 1).toFixed(1) + ' ' + (m.t + ih) + ' L' + x(0).toFixed(1) + ' ' + (m.t + ih) + ' Z';
    const band = pts.length > 1 ? iw / (pts.length - 1) : iw;
    const step = pts.length > 7 ? 2 : 1;
    window.__chartPts = pts.map((p, i) => ({ ...p, cx: x(i), cy: y(p.value), W: Wd, H: Ht }));
    return '<div class="chart" id="lc"><svg viewBox="0 0 ' + Wd + ' ' + Ht + '" style="color:var(--brand)" role="img" aria-label="Carta kehadiran pelajar">' +
      '<defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".22"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>' +
      ticks.map(t => '<line class="grid-l" x1="' + m.l + '" x2="' + (Wd - m.r) + '" y1="' + y(t) + '" y2="' + y(t) + '"/><text class="axis-t" x="' + (m.l - 8) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + t.toFixed(t % 1 ? 1 : 0) + '</text>').join('') +
      pts.map((p, i) => i % step === (pts.length - 1) % step ? '<text class="axis-t" x="' + x(i) + '" y="' + (Ht - 8) + '" text-anchor="middle">' + esc(p.label) + '</text>' : '').join('') +
      '<path class="area" d="' + area + '"/><path class="ln draw" d="' + path + '" style="--len:2000"/>' +
      '<line class="xhair" id="lcX" x1="0" x2="0" y1="' + m.t + '" y2="' + (m.t + ih) + '" visibility="hidden"/>' +
      pts.map((p, i) => '<circle class="pt" data-i="' + i + '" cx="' + x(i) + '" cy="' + y(p.value) + '" r="4"/>').join('') +
      pts.map((p, i) => '<rect class="hit" data-i="' + i + '" x="' + (x(i) - band / 2) + '" y="' + m.t + '" width="' + band + '" height="' + ih + '"/>').join('') +
      '</svg><div class="tooltip" id="lcTip" hidden></div></div>' +
      '<details class="tiny muted" style="margin-top:10px"><summary style="cursor:pointer;font-weight:700">Lihat sebagai jadual</summary><table class="t" style="margin-top:8px"><thead><tr><th>Tarikh</th><th class="r">Hadir (%)</th></tr></thead><tbody>' +
      pts.map(p => '<tr><td>' + esc(p.full) + '</td><td class="r num">' + pct(p.value) + '</td></tr>').join('') + '</tbody></table></details>';
  }
  function bindChart() {
    const c = $('#lc'); if (!c) return;
    const pts = window.__chartPts, tip = $('#lcTip'), xl = $('#lcX');
    const show = i => {
      const p = pts[i];
      xl.setAttribute('x1', p.cx); xl.setAttribute('x2', p.cx); xl.setAttribute('visibility', 'visible');
      $$('.pt', c).forEach(el => el.classList.toggle('on', +el.dataset.i === i));
      tip.innerHTML = '<b>' + pct(p.value) + '%</b>' + esc(p.full);
      tip.style.left = Math.min(88, Math.max(12, p.cx / p.W * 100)) + '%';
      tip.style.top = (p.cy / p.H * 100) + '%';
      tip.hidden = false;
    };
    const hide = () => { tip.hidden = true; xl.setAttribute('visibility', 'hidden'); $$('.pt', c).forEach(el => el.classList.remove('on')); };
    $$('.hit', c).forEach(h => { h.addEventListener('pointerenter', () => show(+h.dataset.i)); h.addEventListener('pointerdown', () => show(+h.dataset.i)); });
    c.addEventListener('pointerleave', hide);
  }

  /* =========================================================
     SENARAI LAPORAN
     ========================================================= */
  function listReports() {
    setTitle(isAdmin() ? 'Semua Laporan' : 'Laporan Saya');
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const state = { f: params.get('f') || 'semua', q: '' };
    const base = isAdmin() ? S.reports() : myReports();
    const filters = [['semua', 'Semua'], ['dihantar', 'Menunggu'], ['disahkan', 'Disahkan'], ['dikembalikan', 'Perlu Pembetulan'], ['draf', 'Draf']];
    view.innerHTML = '<div class="page-head"><div><h1>' + (isAdmin() ? 'Semua Laporan' : 'Laporan Saya') + '</h1><p>' + (isAdmin() ? 'Semak, sahkan atau kembalikan laporan guru bertugas.' : 'Laporan harian daripada minggu bertugas anda.') + '</p></div>' +
      (isAdmin() ? '' : '<div class="page-actions"><a class="btn btn-primary" href="#/isi">' + icon('edit') + ' Isi laporan</a></div>') + '</div>' +
      '<div class="filters"><div class="chips" id="fChips">' + filters.map(([k, l]) => '<button class="chip-btn" data-f="' + k + '">' + l + '<span class="cnt">' + (k === 'semua' ? base.length : base.filter(r => r.status === k).length) + '</span></button>').join('') + '</div>' +
      '<label class="search">' + icon('search') + '<input type="search" id="q" placeholder="Cari tarikh atau nama guru…"></label></div>' +
      '<section class="card" id="repTable"></section>';
    function paint() {
      $$('#fChips .chip-btn').forEach(b => b.classList.toggle('on', b.dataset.f === state.f));
      const q = state.q.toLowerCase();
      const rows = base.filter(r => (state.f === 'semua' || r.status === state.f) && (!q || (D.long(r.date) + ' ' + uname(r.filledBy) + ' ' + r.date).toLowerCase().includes(q)));
      $('#repTable').innerHTML = rows.length ? '<div class="table-wrap"><table class="t stack-m"><thead><tr><th>Tarikh</th><th>Diisi oleh</th><th class="r">Pelajar hadir</th><th class="r">Guru T/H</th><th class="r">Kesihatan</th><th class="r">Disiplin</th><th>Status</th><th></th></tr></thead><tbody>' +
        rows.map(r => {
          const p = S.pelajarStat(r);
          return '<tr class="clickable" data-href="' + (reportLink(r.date) || '#/laporan/lihat/' + r.date) + '">' +
            '<td class="t-main"><div style="display:flex;gap:10px;align-items:center">' + dateBox(r.date) + '<div><b>' + D.dayName(r.date) + '</b><div class="tiny muted">' + D.medium(r.date) + '</div></div></div></td>' +
            '<td data-label="Diisi oleh">' + esc(uname(r.filledBy)) + '</td>' +
            '<td data-label="Pelajar hadir" class="r num">' + pct(p.pct) + '%</td>' +
            '<td data-label="Guru tidak hadir" class="r num">' + r.guru.tidakHadir.length + '</td>' +
            '<td data-label="Kesihatan" class="r num">' + r.kesihatan.length + '</td>' +
            '<td data-label="Disiplin" class="r num">' + r.disiplin.length + '</td>' +
            '<td data-label="Status">' + chip(r.status) + '</td>' +
            '<td class="r" data-label="">' + (isAdmin() && r.status === 'dihantar' ? '<span class="btn btn-primary btn-sm">Semak</span>' : icon('right', 'muted')) + '</td></tr>';
        }).join('') + '</tbody></table></div>' : emptyHTML('inbox', 'Tiada laporan', 'Tiada laporan sepadan dengan penapis.');
    }
    paint();
    H.click = e => {
      const f = e.target.closest('[data-f]'); if (f) { state.f = f.dataset.f; paint(); return; }
      const tr = e.target.closest('tr[data-href]'); if (tr) location.hash = tr.dataset.href;
    };
    H.input = e => { if (e.target.id === 'q') { state.q = e.target.value; paint(); } };
  }

  /* =========================================================
     WIZARD LAPORAN HARIAN (9 langkah)
     ========================================================= */
  let W = null;
  const ROWDEF = {
    'guru.tidakHadir': {
      title: 'Guru', add: 'Tambah guru tidak hadir', none: 'Semua guru hadir? Biarkan kosong.',
      blank: () => ({ nama: '', sebab: S.SEBAB_GURU[0] }),
      fields: [{ f: 'nama', label: 'Nama guru', list: 'staffList', req: true, ph: 'Taip atau pilih nama' }, { f: 'sebab', label: 'Sebab', opts: () => S.SEBAB_GURU }]
    },
    kesihatan: {
      title: 'Kes', add: 'Tambah pelajar tidak sihat', none: 'Tiada pelajar tidak sihat hari ini? Biarkan kosong dan teruskan.',
      blank: () => ({ nama: '', kelas: '', simptom: '', tindakan: S.TINDAKAN_SAKIT[0], masa: nowTime() }),
      fields: [{ f: 'nama', label: 'Nama pelajar', req: true }, { f: 'kelas', label: 'Kelas', opts: classNames }, { f: 'simptom', label: 'Simptom / masalah', ph: 'cth: Demam' }, { f: 'tindakan', label: 'Tindakan', opts: () => S.TINDAKAN_SAKIT }, { f: 'masa', label: 'Masa', type: 'time' }]
    },
    pelawat: {
      title: 'Pelawat', add: 'Tambah pelawat', none: 'Tiada pelawat hari ini? Biarkan kosong — bahagian ini hanya jika ada.',
      blank: () => ({ nama: '', organisasi: '', tujuan: '', masuk: nowTime(), keluar: '' }),
      fields: [{ f: 'nama', label: 'Nama pelawat', req: true }, { f: 'organisasi', label: 'Organisasi / hubungan', ph: 'cth: PPD, ibu bapa' }, { f: 'tujuan', label: 'Tujuan lawatan' }, { f: 'masuk', label: 'Masa masuk', type: 'time' }, { f: 'keluar', label: 'Masa keluar', type: 'time' }]
    },
    disiplin: {
      title: 'Kes', add: 'Tambah kes disiplin', none: 'Tiada kes disiplin? Bagus! Biarkan kosong.',
      blank: () => ({ nama: '', kelas: '', kesalahan: S.KESALAHAN[0], masa: nowTime(), tindakan: '' }),
      fields: [{ f: 'nama', label: 'Nama pelajar', req: true }, { f: 'kelas', label: 'Kelas', opts: classNames }, { f: 'kesalahan', label: 'Kesalahan', opts: () => S.KESALAHAN }, { f: 'masa', label: 'Masa', type: 'time' }, { f: 'tindakan', label: 'Tindakan', ph: 'cth: Amaran lisan' }]
    },
    aktiviti: {
      title: 'Aktiviti', add: 'Tambah aktiviti', none: 'Belum ada aktiviti direkodkan.',
      blank: () => ({ masa: nowTime(), tajuk: '', catatan: '' }),
      fields: [{ f: 'masa', label: 'Masa', type: 'time' }, { f: 'tajuk', label: 'Aktiviti / program', req: true, ph: 'cth: Perhimpunan rasmi' }, { f: 'catatan', label: 'Lokasi / catatan' }]
    }
  };

  function fieldHTML(list, i, fd, val) {
    const attrs = 'data-list="' + list + '" data-i="' + i + '" data-f="' + fd.f + '"';
    let ctl;
    if (fd.opts) {
      const opts = fd.opts();
      ctl = '<select ' + attrs + '>' + (opts.includes(val) ? '' : '<option value="">' + (val ? esc(val) : 'Pilih…') + '</option>') + opts.map(o => '<option' + (o === val ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select>';
    } else {
      ctl = '<input type="' + (fd.type || 'text') + '" ' + attrs + ' value="' + esc(val) + '"' + (fd.list ? ' list="' + fd.list + '"' : '') + (fd.ph ? ' placeholder="' + esc(fd.ph) + '"' : '') + '>';
    }
    return '<label class="field"><span>' + esc(fd.label) + (fd.req ? ' *' : '') + '</span>' + ctl + '</label>';
  }
  function rowsHTML(list) {
    const def = ROWDEF[list], arr = getPath(W.rep, list);
    return '<div class="rows">' + arr.map((row, i) => '<div class="row-card"><div class="row-head"><span>' + def.title + ' #' + (i + 1) + '</span><button type="button" class="btn btn-ghost btn-icon btn-sm" data-del="' + list + '" data-i="' + i + '" aria-label="Buang">' + icon('trash') + '</button></div><div class="row-grid">' + def.fields.map(fd => fieldHTML(list, i, fd, row[fd.f])).join('') + '</div></div>').join('') +
      (arr.length ? '' : '<div class="none-note">' + icon('info') + esc(def.none) + '</div>') + '</div>' +
      '<button type="button" class="add-row" data-add="' + list + '">' + icon('plus') + esc(def.add) + '</button>';
  }
  const textArea = (path, label, ph) => '<label class="field"><span>' + label + ' <small>(pilihan)</small></span><textarea data-path="' + path + '" placeholder="' + esc(ph || '') + '">' + esc(getPath(W.rep, path)) + '</textarea></label>';

  function stepCount(i) {
    const r = W.rep;
    switch (S.STEPS[i].key) {
      case 'guru': return r.guru.tidakHadir.length ? r.guru.tidakHadir.length + ' T/H' : '';
      case 'pelajar': return r.pelajar.kelas.every(k => k.hadir !== '') ? pct(S.pelajarStat(r).pct, 0) + '%' : '';
      case 'kesihatan': return r.kesihatan.length || '';
      case 'sekitar': { const n = Object.values(r.sekitar.items).filter(x => x.status === 'Perlu Tindakan').length; return n ? n + ' isu' : ''; }
      case 'pelawat': return r.pelawat.length || '';
      case 'disiplin': return r.disiplin.length || '';
      case 'aktiviti': return r.aktiviti.length || '';
      default: return '';
    }
  }

  function stepBody(i) {
    const r = W.rep, k = S.STEPS[i].key;
    if (k === 'guru') {
      const g = S.guruStat(r);
      return '<div class="form-row"><label class="field"><span>Jumlah guru sekolah</span><input type="number" min="1" data-path="guru.jumlah" value="' + esc(r.guru.jumlah) + '"></label></div>' +
        '<div class="mini-stats"><div class="mini"><small>Hadir</small><b class="ok" id="gH">' + g.hadir + '</b></div><div class="mini"><small>Tidak hadir</small><b class="bad" id="gT">' + g.tidakHadir + '</b></div><div class="mini"><small>Peratus hadir</small><b id="gP">' + pct(g.pct) + '%</b></div></div>' +
        '<div><div class="field" style="margin-bottom:8px"><span>Senarai guru tidak hadir</span></div>' + rowsHTML('guru.tidakHadir') + '</div>' +
        '<datalist id="staffList">' + [...S.STAFF, ...S.db.users.map(u => u.nama)].map(n => '<option value="' + esc(n) + '">').join('') + '</datalist>' +
        textArea('guru.catatan', 'Catatan', 'cth: Guru ganti telah diatur untuk kelas berkenaan.');
    }
    if (k === 'pelajar') {
      return '<div class="mini-stats"><div class="mini"><small>Enrolmen</small><b id="pE">0</b></div><div class="mini"><small>Hadir</small><b class="ok" id="pH">0</b></div><div class="mini"><small>Tidak hadir</small><b class="bad" id="pT">0</b></div><div class="mini"><small>Peratus</small><b id="pP">0%</b></div></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><span class="field"><span>Bilangan hadir mengikut kelas *</span></span><button type="button" class="btn btn-outline btn-sm" data-fillall>' + icon('check') + ' Isi semua hadir penuh</button></div>' +
        '<div class="class-grid">' + r.pelajar.kelas.map((c, ci) => '<label class="class-card" data-ci="' + ci + '"><b>' + esc(c.nama) + '</b><small>Enrolmen ' + c.enrolmen + ' · <span class="cp">-</span></small><input type="number" inputmode="numeric" min="0" max="' + c.enrolmen + '" data-path="pelajar.kelas.' + ci + '.hadir" value="' + esc(c.hadir) + '" aria-label="Hadir ' + esc(c.nama) + '" placeholder="0"><div class="pbar"><span></span></div></label>').join('') + '</div>' +
        textArea('pelajar.catatan', 'Catatan', 'cth: Pelajar Tingkatan 4 menyertai pertandingan peringkat daerah.');
    }
    if (k === 'kesihatan') return '<div class="callout info">' + icon('health') + '<div><b>Prosedur</b><p>Rekod setiap pelajar yang dirawat di bilik sakit, dijemput ibu bapa atau dibawa ke klinik.</p></div></div>' + rowsHTML('kesihatan');
    if (k === 'sekitar') {
      const tone = { 'Baik': 'v-ok', 'Sederhana': 'v-warn', 'Perlu Tindakan': 'v-bad' };
      return '<div class="aspek-list">' + S.ASPEK.map(a => {
        const it = r.sekitar.items[a.key] || (r.sekitar.items[a.key] = { status: 'Baik', catatan: '' });
        return '<div class="aspek' + (it.status === 'Perlu Tindakan' ? ' flag' : '') + '" data-asp="' + a.key + '"><b>' + esc(a.label) + '</b><div class="seg" role="radiogroup" aria-label="' + esc(a.label) + '">' +
          S.STATUS_ASPEK.map(s => '<label><input type="radio" name="asp_' + a.key + '" value="' + s + '" data-path="sekitar.items.' + a.key + '.status"' + (it.status === s ? ' checked' : '') + '><span class="' + tone[s] + '">' + (s === 'Perlu Tindakan' ? 'Tindakan' : s) + '</span></label>').join('') +
          '</div><input class="note" data-path="sekitar.items.' + a.key + '.catatan" value="' + esc(it.catatan) + '" placeholder="Catatan (jika ada)"></div>';
      }).join('') + '</div>' + textArea('sekitar.catatan', 'Catatan keseluruhan', 'cth: Kawasan sekolah bersih dan selamat.');
    }
    if (k === 'pelawat') return rowsHTML('pelawat');
    if (k === 'disiplin') return '<div class="callout warn">' + icon('clock') + '<div><b>Lewat hadir</b><p>Pelajar yang tiba selepas 7:30 pagi direkodkan sebagai lewat hadir.</p></div></div>' + rowsHTML('disiplin');
    if (k === 'aktiviti') return rowsHTML('aktiviti');
    if (k === 'pengesahan') {
      const back = r.status === 'dikembalikan' && r.pengesahan;
      return (back ? '<div class="callout bad">' + icon('undo') + '<div><b>Dikembalikan oleh ' + esc(uname(r.pengesahan.oleh)) + '</b><p>“' + esc(r.pengesahan.ulasan) + '”</p></div></div>' : '') +
        timelineHTML(r) +
        '<label class="check"><input type="checkbox" data-path="akuan"' + (r.akuan ? ' checked' : '') + '><span>Saya mengesahkan bahawa maklumat dalam laporan guru bertugas bertarikh <b>' + D.long(r.date) + '</b> adalah benar dan lengkap.</span></label>' +
        '<div class="callout info">' + icon('info') + '<div><b>Langkah seterusnya</b><p>Laporan akan dihantar kepada pihak pengurusan (Pengetua / PK HEM) untuk disemak dan disahkan.</p></div></div>' +
        '<button type="button" class="btn btn-primary" data-submit' + (r.akuan ? '' : ' disabled') + '>' + icon('send') + ' Hantar untuk Pengesahan</button>';
    }
    if (k === 'tamat') return finishHTML();
    return '';
  }

  function timelineHTML(r) {
    const p = r.pengesahan;
    const sent = r.status !== 'draf' && r.submittedAt;
    const items = [
      { cls: 'done', ic: 'edit', t: 'Laporan diisi', s: 'oleh ' + esc(uname(r.filledBy)) },
      { cls: sent ? 'done' : 'wait', ic: 'send', t: sent ? 'Dihantar untuk pengesahan' : 'Belum dihantar', s: sent ? D.stamp(r.submittedAt) : 'Tandakan akuan dan hantar' },
      p && p.status === 'disahkan' ? { cls: 'done', ic: 'shield', t: 'Disahkan', s: esc(uname(p.oleh)) + ' · ' + D.stamp(p.pada) }
        : p && p.status === 'dikembalikan' && r.status === 'dikembalikan' ? { cls: 'bad', ic: 'undo', t: 'Dikembalikan untuk pembetulan', s: esc(uname(p.oleh)) + ' · ' + D.stamp(p.pada) }
          : { cls: sent ? 'wait' : '', ic: 'shield', t: 'Pengesahan pihak pengurusan', s: sent ? 'Menunggu semakan' : 'Selepas laporan dihantar' }
    ];
    return '<ul class="timeline">' + items.map(i => '<li class="' + i.cls + '"><span class="tl-dot">' + icon(i.ic) + '</span><div><b>' + i.t + '</b><small>' + i.s + '</small></div></li>').join('') + '</ul>';
  }

  function summaryHTML(r) {
    const p = S.pelajarStat(r), g = S.guruStat(r);
    const iss = Object.values(r.sekitar.items).filter(x => x.status === 'Perlu Tindakan').length;
    const it = (ic, l, v) => '<div class="sum"><span class="si">' + icon(ic) + '</span><div><small>' + l + '</small><b>' + v + '</b></div></div>';
    return '<div class="sum-grid">' +
      it('userCheck', 'Guru hadir', g.hadir + ' / ' + g.jumlah) +
      it('grad', 'Pelajar hadir', p.hadir + ' / ' + p.enrolmen + ' (' + pct(p.pct) + '%)') +
      it('health', 'Tidak sihat', r.kesihatan.length + ' pelajar') +
      it('leaf', 'Isu kawasan', iss ? iss + ' perlu tindakan' : 'Semua baik') +
      it('badge', 'Pelawat', r.pelawat.length + ' orang') +
      it('alert', 'Disiplin', r.disiplin.length + ' kes') +
      it('flag', 'Aktiviti', r.aktiviti.length + ' aktiviti') +
      it('shield', 'Status', S.STATUS[r.status].label) + '</div>';
  }

  function finishHTML() {
    const r = W.rep;
    const sent = r.status === 'dihantar';
    return (sent
      ? '<div class="finish"><div class="finish-ic' + (W.justSent ? ' pop' : '') + '">' + icon('check') + '</div><h2>Laporan berjaya dihantar!</h2><p>Terima kasih, ' + esc(me.nama) + '. Laporan ' + D.long(r.date) + ' kini menunggu pengesahan pihak pengurusan.</p></div>'
      : '<div class="callout warn">' + icon('alert') + '<div><b>Laporan belum dihantar</b><p>Semak ringkasan di bawah, kemudian kembali ke langkah 8 untuk membuat akuan dan menghantar laporan.</p></div></div>') +
      summaryHTML(r) +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">' +
      (sent ? '<a class="btn btn-primary" href="#/laporan/lihat/' + r.date + '">' + icon('eye') + ' Lihat laporan penuh</a><a class="btn btn-outline" href="#/dashboard">' + icon('home') + ' Ke halaman utama</a>'
        : '<button type="button" class="btn btn-primary" data-step="7">' + icon('shield') + ' Ke langkah pengesahan</button>') + '</div>';
  }

  function wizard(date, step) {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return go('#/dashboard');
    if (!S.canEdit(me, date)) {
      if (S.report(date)) return location.replace('#/laporan/lihat/' + date);
      toast(isAdmin() ? 'Pentadbir tidak mengisi laporan.' : 'Anda tidak bertugas pada tarikh ini.', 'bad');
      return go('#/dashboard');
    }
    const existing = S.report(date);
    W = { rep: existing ? clone(existing) : S.newReport(date, me.id), step: Math.min(8, Math.max(0, step)), max: 0, locked: false, timer: null };
    if (!existing) W.rep.filledBy = me.id;
    W.max = W.step;
    setTitle('Laporan ' + D.dayName(date));
    const ro = S.rosterForDate(date);
    view.innerHTML = '<div><a class="back-link" href="#/dashboard">' + icon('left') + ' Kembali</a>' +
      '<div class="wiz-head"><div><h1>Laporan Guru Bertugas</h1><p class="muted">' + D.long(date) + (ro ? ' · Minggu ' + D.weekRange(ro.weekStart) : '') + '</p></div>' +
      '<div style="display:flex;gap:10px;align-items:center"><span id="wzStatus">' + chip(W.rep.status) + '</span><span class="save-state" id="saveState"><span class="dot"></span><span>' + (existing ? 'Disimpan' : 'Belum disimpan') + '</span></span></div></div>' +
      '<div class="wizard"><aside class="card"><div class="wiz-progress"><div class="tiny muted" style="padding:12px 12px 0;font-weight:700">Kemajuan</div><div class="progress"><span id="wzProg"></span></div></div><ol class="stepper" id="stepper"></ol></aside>' +
      '<section class="card step-panel" id="panel"></section></div></div>';
    paintStepper();
    paintPanel('fwd');
    H.click = wizClick; H.input = wizInput; H.change = wizInput;
  }

  function paintStepper() {
    const el = $('#stepper'); if (!el) return;
    el.innerHTML = S.STEPS.map((s, i) => {
      const c = stepCount(i);
      return '<li class="' + (i === W.step ? 'cur' : i <= W.max ? 'done' : '') + '"><button type="button" data-step="' + i + '"' + (W.locked && i !== 8 ? ' disabled' : '') + '><span class="sn">' + (i < W.step || (i <= W.max && i !== W.step) ? icon('check') : i + 1) + '</span><span><span class="lbl-long">' + esc(s.title) + '</span><span class="lbl-short" hidden>' + esc(s.short) + '</span></span>' + (c !== '' ? '<span class="cnt">' + c + '</span>' : '') + '</button></li>';
    }).join('');
    // label ringkas pada skrin kecil
    const small = matchMedia('(max-width:1100px)').matches;
    $$('.lbl-short', el).forEach(x => { x.hidden = !small; });
    $('#wzProg').style.width = ((W.step + 1) / 9 * 100) + '%';
    const cur = $('li.cur', el);
    if (cur && el.scrollWidth > el.clientWidth) el.scrollTo({ left: cur.offsetLeft - el.clientWidth / 2 + cur.clientWidth / 2, behavior: 'smooth' });
  }

  function paintPanel(dir) {
    const s = S.STEPS[W.step], i = W.step;
    const last = i === 8;
    $('#panel').innerHTML = '<div class="step-title"><span class="sic">' + icon(s.icon) + '</span><div><small>Langkah ' + (i + 1) + ' / 9</small><h2>' + esc(s.title) + '</h2><p>' + esc(s.desc) + '</p></div></div>' +
      '<div class="step-body ' + (dir === 'back' ? 'back' : dir === 'still' ? 'still' : '') + '">' + stepBody(i) + '</div>' +
      (last ? '' : '<div class="step-foot"><button type="button" class="btn btn-outline" data-prev' + (i === 0 ? ' disabled' : '') + '>' + icon('left') + ' <span class="hide-m">Kembali</span></button><div class="right"><button type="button" class="btn btn-ghost hide-m" data-save>' + icon('save') + ' Simpan draf</button>' +
        (i < 7 ? '<button type="button" class="btn btn-primary" data-next>Seterusnya ' + icon('right') + '</button>' : '<button type="button" class="btn btn-outline" data-next>Ringkasan ' + icon('right') + '</button>') + '</div></div>');
    if (S.STEPS[i].key === 'pelajar') updPelajar();
  }

  function gotoStep(n) {
    if (W.locked) return;
    n = Math.max(0, Math.min(8, n));
    const dir = n < W.step ? 'back' : 'fwd';
    flush();
    W.step = n; W.max = Math.max(W.max, n);
    paintStepper(); paintPanel(dir);
    const top = $('.wiz-head'); if (top) top.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function markDirty() {
    const ss = $('#saveState'); if (ss) { ss.classList.add('saving'); ss.lastChild.textContent = 'Menyimpan…'; }
    clearTimeout(W.timer);
    W.timer = setTimeout(flush, 600);
  }
  function flush() {
    if (!W || !W.timer) return;
    clearTimeout(W.timer); W.timer = null;
    S.saveReport(clone(W.rep));
    const ss = $('#saveState'); if (ss) { ss.classList.remove('saving'); ss.lastChild.textContent = 'Disimpan ' + nowTime(); }
  }

  function wizInput(e) {
    const t = e.target;
    if (e.type === 'change' && t.type !== 'radio' && t.type !== 'checkbox' && t.tagName !== 'SELECT') return;
    if (t.dataset.path) {
      let v = t.type === 'checkbox' ? t.checked : t.type === 'number' ? (t.value === '' ? '' : Math.max(0, Number(t.value))) : t.value;
      if (t.type === 'radio' && !t.checked) return;
      setPath(W.rep, t.dataset.path, v);
      if (t.dataset.path.startsWith('pelajar.kelas')) { t.classList.remove('invalid'); updPelajar(); }
      if (t.dataset.path === 'guru.jumlah') updGuru();
      if (t.dataset.path === 'akuan') { const b = $('[data-submit]'); if (b) b.disabled = !v; }
      if (t.type === 'radio') { const a = t.closest('.aspek'); if (a) a.classList.toggle('flag', v === 'Perlu Tindakan'); }
    } else if (t.dataset.list) {
      getPath(W.rep, t.dataset.list)[+t.dataset.i][t.dataset.f] = t.value;
      t.classList.remove('invalid');
    } else return;
    markDirty();
    if (e.type === 'change') paintStepperCounts();
  }
  function paintStepperCounts() { $$('#stepper li').forEach((li, i) => { const c = stepCount(i), b = li.querySelector('button'); let el = b.querySelector('.cnt'); if (c === '') { if (el) el.remove(); return; } if (!el) { el = document.createElement('span'); el.className = 'cnt'; b.appendChild(el); } el.textContent = c; }); }
  function updGuru() { const g = S.guruStat(W.rep); if ($('#gH')) { $('#gH').textContent = g.hadir; $('#gT').textContent = g.tidakHadir; $('#gP').textContent = pct(g.pct) + '%'; } }
  function updPelajar() {
    const st = S.pelajarStat(W.rep);
    if (!$('#pE')) return;
    $('#pE').textContent = st.enrolmen; $('#pH').textContent = st.hadir; $('#pT').textContent = st.enrolmen - st.hadir; $('#pP').textContent = pct(st.pct) + '%';
    $$('.class-card').forEach(card => {
      const c = W.rep.pelajar.kelas[+card.dataset.ci];
      const has = c.hadir !== '';
      const p = has ? Math.min(100, c.hadir / c.enrolmen * 100) : 0;
      card.querySelector('.cp').textContent = has ? pct(p) + '%' : '-';
      card.querySelector('.pbar span').style.width = p + '%';
      card.classList.toggle('warn', has && p < 90);
    });
  }

  function wizClick(e) {
    const b = e.target.closest('button, [data-step]');
    if (!b || b.disabled) return;
    if (b.dataset.step !== undefined) return gotoStep(+b.dataset.step);
    if (b.hasAttribute('data-next')) return gotoStep(W.step + 1);
    if (b.hasAttribute('data-prev')) return gotoStep(W.step - 1);
    if (b.hasAttribute('data-save')) { W.timer = W.timer || 1; flush(); toast('Draf disimpan'); return; }
    if (b.dataset.add) {
      const list = b.dataset.add;
      getPath(W.rep, list).push(ROWDEF[list].blank());
      markDirty(); paintPanel('still'); paintStepperCounts();
      const cards = $$('.row-card'); const lastCard = cards[cards.length - 1];
      if (lastCard) { lastCard.scrollIntoView({ behavior: 'smooth', block: 'center' }); const inp = lastCard.querySelector('input, select'); if (inp) inp.focus({ preventScroll: true }); }
      return;
    }
    if (b.dataset.del) { getPath(W.rep, b.dataset.del).splice(+b.dataset.i, 1); markDirty(); paintPanel('still'); paintStepperCounts(); return; }
    if (b.hasAttribute('data-fillall')) {
      W.rep.pelajar.kelas.forEach((c, ci) => { if (c.hadir === '') { c.hadir = c.enrolmen; const inp = $('[data-path="pelajar.kelas.' + ci + '.hadir"]'); if (inp) inp.value = c.enrolmen; } });
      updPelajar(); markDirty(); paintStepperCounts(); return;
    }
    if (b.hasAttribute('data-submit')) return submitReport();
  }

  function submitReport() {
    const r = W.rep;
    // buang baris kosong
    Object.keys(ROWDEF).forEach(list => { const arr = getPath(r, list); const keep = arr.filter(row => Object.entries(row).some(([k, v]) => v && !['sebab', 'tindakan', 'kesalahan', 'masa', 'masuk'].includes(k))); arr.splice(0, arr.length, ...keep); });
    const errs = [];
    if (!(Number(r.guru.jumlah) > 0)) errs.push([0, 'Jumlah guru mesti diisi.']);
    if (r.pelajar.kelas.some(k => k.hadir === '' || Number(k.hadir) > k.enrolmen)) errs.push([1, 'Lengkapkan bilangan hadir setiap kelas (tidak melebihi enrolmen).']);
    const reqMiss = Object.keys(ROWDEF).find(list => getPath(r, list).some(row => ROWDEF[list].fields.some(fd => fd.req && !String(row[fd.f] || '').trim())));
    if (reqMiss) errs.push([S.STEPS.findIndex(s => s.key === reqMiss.split('.')[0]), 'Terdapat medan wajib (*) yang belum diisi.']);
    if (!r.akuan) errs.push([7, 'Sila tandakan akuan terlebih dahulu.']);
    if (errs.length) {
      toast(errs[0][1], 'bad');
      gotoStep(errs[0][0]);
      if (errs[0][0] === 1) $$('.class-card input').forEach(inp => { const c = r.pelajar.kelas[+inp.closest('.class-card').dataset.ci]; if (c.hadir === '' || Number(c.hadir) > c.enrolmen) inp.classList.add('invalid'); });
      $$('[data-list]').forEach(inp => { const fd = ROWDEF[inp.dataset.list].fields.find(f => f.f === inp.dataset.f); if (fd && fd.req && !inp.value.trim()) inp.classList.add('invalid'); });
      return;
    }
    r.status = 'dihantar';
    r.submittedAt = new Date().toISOString();
    if (!r.filledBy) r.filledBy = me.id;
    clearTimeout(W.timer); W.timer = null;
    S.saveReport(clone(r));
    W.step = 8; W.max = 8; W.locked = true; W.justSent = true;
    $('#wzStatus').innerHTML = chip('dihantar');
    const ss = $('#saveState'); if (ss) ss.lastChild.textContent = 'Dihantar ' + nowTime();
    paintStepper(); paintPanel('fwd');
    renderShell(); setActive('isi');
    confetti();
    toast('Laporan dihantar untuk pengesahan');
  }

  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = document.createElement('div'); box.className = 'confetti';
    const cols = ['#0d9488', '#f59e0b', '#14b8a6', '#fbbf24', '#e11d48', '#5eead4'];
    for (let i = 0; i < 70; i++) {
      const c = document.createElement('i');
      c.style.left = Math.random() * 100 + '%';
      c.style.background = cols[i % cols.length];
      c.style.setProperty('--x', (Math.random() * 200 - 100) + 'px');
      c.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
      c.style.animationDelay = Math.random() * .4 + 's';
      c.style.animationDuration = 1.4 + Math.random() * 1.2 + 's';
      box.appendChild(c);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3000);
  }

  /* =========================================================
     LIHAT LAPORAN + PENGESAHAN
     ========================================================= */
  function viewReport(date) {
    const r = S.report(date);
    setTitle('Laporan ' + (date ? D.short(date) : ''));
    if (!r) {
      if (S.canEdit(me, date)) return location.replace('#/laporan/isi/' + date);
      view.innerHTML = '<div><a class="back-link" href="#/laporan">' + icon('left') + ' Kembali</a><section class="card">' + emptyHTML('file', 'Laporan tidak dijumpai', 'Tiada laporan untuk tarikh ini.') + '</section></div>';
      return;
    }
    if (!isAdmin() && !myRosterIds().includes(r.rosterId) && r.filledBy !== me.id) {
      view.innerHTML = '<div><a class="back-link" href="#/laporan">' + icon('left') + ' Kembali</a><section class="card">' + emptyHTML('lock', 'Tiada akses', 'Laporan ini milik minggu bertugas guru lain.') + '</section></div>';
      return;
    }
    const ro = S.rosterForDate(date);
    const p = S.pelajarStat(r), g = S.guruStat(r);
    const sec = (n, title, ic, body, extra) => '<section class="card sec"><div class="card-head"><h2><span class="secn">' + n + '</span>' + esc(title) + '</h2>' + (extra || '') + '</div><div class="card-body">' + body + '</div></section>';
    const table = (cols, rows, emptyMsg) => rows.length ? '<div class="table-wrap"><table class="t stack-m"><thead><tr>' + cols.map(c => '<th>' + c[0] + '</th>').join('') + '</tr></thead><tbody>' +
      rows.map(row => '<tr>' + cols.map((c, ci) => '<td ' + (ci === 0 ? 'class="t-main"' : 'data-label="' + esc(c[0]) + '"') + '>' + (ci === 0 ? '<b>' : '') + esc(row[c[1]] || '-') + (ci === 0 ? '</b>' : '') + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' : '<div class="none-note">' + icon('check') + esc(emptyMsg) + '</div>';
    const note = t => t ? '<div class="note-box">' + esc(t) + '</div>' : '';
    const canEdit = S.canEdit(me, date);
    const pg = r.pengesahan;

    view.innerHTML = '<div><a class="back-link no-print" href="#/laporan">' + icon('left') + ' Senarai laporan</a>' +
      '<div class="print-only" style="text-align:center;margin-bottom:12px"><b style="font-size:14pt">' + esc(S.db.settings.namaSekolah) + ' (' + esc(S.db.settings.kodSekolah) + ')</b><div>LAPORAN GURU BERTUGAS HARIAN</div></div>' +
      '<div class="page-head"><div><h1>' + D.long(date) + '</h1><p>Laporan Guru Bertugas · ' + (ro ? 'Minggu ' + D.weekRange(ro.weekStart) : '') + '</p></div><div class="page-actions no-print">' + chip(r.status) +
      (canEdit ? '<a class="btn btn-primary btn-sm" href="#/laporan/isi/' + date + '">' + icon('edit') + ' ' + (r.status === 'dikembalikan' ? 'Buat pembetulan' : 'Sambung isi') + '</a>' : '') +
      '<button class="btn btn-outline btn-sm" data-print>' + icon('printer') + ' Cetak</button></div></div>' +
      '<div class="stack">' +
      (isAdmin() && r.status === 'dihantar' ? '<div class="callout warn no-print">' + icon('clock') + '<div><b>Laporan ini menunggu pengesahan anda</b><p>Semak setiap bahagian, kemudian sahkan atau kembalikan di bahagian 8.</p></div><a class="btn btn-primary btn-sm" href="#verify" style="margin-left:auto" data-jump>Ke pengesahan</a></div>' : '') +
      '<section class="card card-pad"><div class="report-meta">' +
      '<div class="meta"><small>Tarikh</small><b>' + D.long(date) + '</b></div>' +
      '<div class="meta"><small>Guru bertugas</small><b>' + (ro ? ro.teacherIds.map(id => esc(uname(id)) + (id === ro.ketua ? ' (Ketua)' : '')).join('<br>') : '-') + '</b></div>' +
      '<div class="meta"><small>Diisi oleh</small><b>' + esc(uname(r.filledBy)) + '</b></div>' +
      '<div class="meta"><small>Dihantar</small><b>' + D.stamp(r.submittedAt) + '</b></div></div></section>' +
      '<div class="grid g-2">' +
      sec(1, 'Kehadiran Guru', 'userCheck', '<div class="kv"><div class="mini"><small>Jumlah</small><b>' + g.jumlah + '</b></div><div class="mini"><small>Hadir</small><b class="ok">' + g.hadir + '</b></div><div class="mini"><small>Tidak hadir</small><b class="bad">' + g.tidakHadir + '</b></div></div>' +
        table([['Nama guru', 'nama'], ['Sebab', 'sebab']], r.guru.tidakHadir, 'Semua guru hadir.') + note(r.guru.catatan)) +
      sec(2, 'Kehadiran Pelajar', 'grad', '<div class="kv"><div class="mini"><small>Enrolmen</small><b>' + p.enrolmen + '</b></div><div class="mini"><small>Hadir</small><b class="ok">' + p.hadir + '</b></div><div class="mini"><small>Peratus</small><b>' + pct(p.pct) + '%</b></div></div>' +
        '<div class="table-wrap"><table class="t stack-m"><thead><tr><th>Kelas</th><th class="r">Enrolmen</th><th class="r">Hadir</th><th class="r">T/H</th><th class="r">%</th></tr></thead><tbody>' +
        r.pelajar.kelas.map(k => '<tr><td class="t-main"><b>' + esc(k.nama) + '</b></td><td class="r num" data-label="Enrolmen">' + k.enrolmen + '</td><td class="r num" data-label="Hadir">' + (k.hadir === '' ? '-' : k.hadir) + '</td><td class="r num" data-label="Tidak hadir">' + (k.hadir === '' ? '-' : k.enrolmen - k.hadir) + '</td><td class="r num" data-label="%">' + (k.hadir === '' ? '-' : pct(k.hadir / k.enrolmen * 100)) + '</td></tr>').join('') +
        '</tbody><tfoot><tr><td>Jumlah</td><td class="r num">' + p.enrolmen + '</td><td class="r num">' + p.hadir + '</td><td class="r num">' + (p.enrolmen - p.hadir) + '</td><td class="r num">' + pct(p.pct) + '</td></tr></tfoot></table></div>' + note(r.pelajar.catatan)) +
      '</div>' +
      sec(3, 'Pelajar Tidak Sihat & Ke Klinik', 'health', table([['Nama pelajar', 'nama'], ['Kelas', 'kelas'], ['Simptom', 'simptom'], ['Tindakan', 'tindakan'], ['Masa', 'masa']], r.kesihatan, 'Tiada pelajar tidak sihat dilaporkan.')) +
      sec(4, 'Keadaan Sekeliling Sekolah', 'leaf', '<div class="table-wrap"><table class="t stack-m"><thead><tr><th>Aspek</th><th>Status</th><th>Catatan</th></tr></thead><tbody>' +
        S.ASPEK.map(a => { const it = r.sekitar.items[a.key] || { status: '-', catatan: '' }; const tone = it.status === 'Baik' ? 'ok' : it.status === 'Sederhana' ? 'warn' : 'bad'; return '<tr><td class="t-main"><b>' + esc(a.label) + '</b></td><td data-label="Status"><span class="tag ' + tone + '">' + esc(it.status) + '</span></td><td data-label="Catatan">' + esc(it.catatan || '-') + '</td></tr>'; }).join('') +
        '</tbody></table></div>' + note(r.sekitar.catatan)) +
      sec(5, 'Kehadiran Pelawat', 'badge', table([['Nama', 'nama'], ['Organisasi', 'organisasi'], ['Tujuan', 'tujuan'], ['Masuk', 'masuk'], ['Keluar', 'keluar']], r.pelawat, 'Tiada pelawat direkodkan.')) +
      sec(6, 'Laporan Disiplin', 'alert', table([['Nama pelajar', 'nama'], ['Kelas', 'kelas'], ['Kesalahan', 'kesalahan'], ['Masa', 'masa'], ['Tindakan', 'tindakan']], r.disiplin, 'Tiada kes disiplin.')) +
      sec(7, 'Aktiviti Harian', 'flag', table([['Aktiviti', 'tajuk'], ['Masa', 'masa'], ['Lokasi / catatan', 'catatan']], r.aktiviti, 'Tiada aktiviti direkodkan.')) +
      sec(8, 'Pengesahan Pihak Pengurusan', 'shield', '<div class="grid g-2" id="verify"><div>' + timelineHTML(r) +
        (pg && pg.ulasan ? '<div class="note-box" style="margin-top:14px"><b>Ulasan ' + esc(uname(pg.oleh)) + ':</b> ' + esc(pg.ulasan) + '</div>' : '') + '</div><div>' +
        (isAdmin() && r.status === 'dihantar'
          ? '<div class="verify-box"><h3>' + icon('shield') + ' Pengesahan anda</h3><label class="field"><span>Ulasan <small>(wajib jika dikembalikan)</small></span><textarea id="vNote" placeholder="cth: Laporan lengkap. Terima kasih."></textarea></label><div class="verify-actions"><button class="btn btn-ok" data-verify="disahkan">' + icon('check') + ' Sahkan laporan</button><button class="btn btn-danger" data-verify="dikembalikan">' + icon('undo') + ' Kembalikan</button></div></div>'
          : r.status === 'dikembalikan' ? '<div class="callout bad">' + icon('undo') + '<div><b>Menunggu pembetulan</b><p>Laporan telah dikembalikan kepada guru bertugas.</p></div></div>'
            : r.status === 'disahkan' ? '<div class="callout ok">' + icon('shield') + '<div><b>Laporan disahkan</b><p>' + esc(uname(pg.oleh)) + ' · ' + D.stamp(pg.pada) + '</p></div></div>'
              : r.status === 'draf' ? '<div class="callout warn">' + icon('edit') + '<div><b>Masih draf</b><p>Guru bertugas belum menghantar laporan ini.</p></div></div>'
                : '<div class="callout warn">' + icon('clock') + '<div><b>Menunggu pengesahan</b><p>Laporan sedang disemak oleh pihak pengurusan.</p></div></div>') +
        '</div></div>') +
      sec(9, 'Tamat', 'done', summaryHTML(r) +
        '<div class="grid g-2" style="margin-top:28px"><div><div class="tiny muted">Disediakan oleh</div><div style="border-bottom:1px dashed var(--line);height:44px"></div><b>' + esc(uname(r.filledBy)) + '</b><div class="tiny muted">Guru Bertugas</div></div>' +
        '<div><div class="tiny muted">Disahkan oleh</div><div style="border-bottom:1px dashed var(--line);height:44px"></div><b>' + (pg && pg.status === 'disahkan' ? esc(uname(pg.oleh)) : '……………………………') + '</b><div class="tiny muted">' + (pg && pg.status === 'disahkan' ? esc((S.user(pg.oleh) || {}).jawatan || '') + ' · ' + D.stamp(pg.pada) : 'Pihak Pengurusan') + '</div></div></div>' +
        '<p class="tiny muted" style="text-align:center;margin-top:20px">— Laporan tamat —</p>') +
      '</div></div>';

    H.click = e => {
      if (e.target.closest('[data-print]')) return window.print();
      if (e.target.closest('[data-jump]')) { e.preventDefault(); $('#verify').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      const v = e.target.closest('[data-verify]');
      if (v) {
        const st = v.dataset.verify, ul = $('#vNote').value.trim();
        if (st === 'dikembalikan' && !ul) { $('#vNote').classList.add('invalid'); $('#vNote').focus(); toast('Sila nyatakan sebab laporan dikembalikan.', 'bad'); return; }
        const rep = clone(r);
        rep.status = st;
        rep.pengesahan = { status: st, oleh: me.id, pada: new Date().toISOString(), ulasan: ul };
        if (st === 'dikembalikan') rep.akuan = false;
        S.saveReport(rep);
        toast(st === 'disahkan' ? 'Laporan disahkan' : 'Laporan dikembalikan kepada guru', st === 'disahkan' ? 'ok' : 'info');
        renderShell(); setActive('laporan');
        viewReport(date);
      }
    };
  }

  /* =========================================================
     JADUAL BERTUGAS
     ========================================================= */
  function jadual() {
    setTitle('Jadual Bertugas');
    const mon = thisMonday();
    const rows = S.rosters();
    view.innerHTML = '<div class="page-head"><div><h1>Jadual Guru Bertugas</h1><p>Guru bertugas mingguan — laporan diisi setiap hari persekolahan (Isnin–Jumaat).</p></div>' +
      (isAdmin() ? '<div class="page-actions"><button class="btn btn-primary" data-new>' + icon('plus') + ' Tambah minggu</button></div>' : '') + '</div>' +
      '<section class="card"><div class="list">' + (rows.map(r => {
        const done = D.weekDays(r.weekStart).map(d => S.report(d));
        const sent = done.filter(x => x && x.status !== 'draf').length;
        const isCur = r.weekStart === mon, mineFlag = r.teacherIds.includes(me.id);
        return '<div class="list-item" style="flex-wrap:wrap">' + dateBox(r.weekStart) +
          '<div class="grow" style="min-width:200px"><b>' + D.weekRange(r.weekStart) + ' ' + (isCur ? '<span class="tag brand">Minggu ini</span>' : r.weekStart > mon ? '<span class="tag">Akan datang</span>' : '') + (mineFlag && !isAdmin() ? ' <span class="tag warn">Giliran anda</span>' : '') + '</b>' +
          '<small>' + (r.teacherIds.map(id => esc(uname(id)) + (id === r.ketua ? ' (Ketua)' : '')).join(' · ') || 'Belum ditetapkan') + '</small></div>' +
          '<div style="display:flex;align-items:center;gap:10px"><span class="tiny muted" title="Laporan dihantar">' + sent + '/5</span><span style="display:flex;gap:3px">' + done.map(x => '<i title="' + (x ? S.STATUS[x.status].label : 'Belum diisi') + '" style="width:10px;height:10px;border-radius:3px;background:' + (!x ? 'var(--line)' : x.status === 'disahkan' ? 'var(--ok)' : x.status === 'dihantar' ? 'var(--accent)' : x.status === 'dikembalikan' ? 'var(--bad)' : 'var(--muted)') + '"></i>').join('') + '</span>' +
          (isAdmin() ? '<button class="btn btn-ghost btn-icon btn-sm" data-edit="' + r.id + '" aria-label="Edit">' + icon('edit') + '</button><button class="btn btn-ghost btn-icon btn-sm" data-delr="' + r.id + '" aria-label="Padam">' + icon('trash') + '</button>' : '') + '</div></div>';
      }).join('') || emptyHTML('calendar', 'Tiada jadual', 'Tambah minggu bertugas pertama.')) + '</div></section>' +
      '<p class="tiny muted" style="margin-top:10px;display:flex;gap:14px;flex-wrap:wrap"><span>■ <span style="color:var(--ok)">Disahkan</span></span><span>■ <span style="color:var(--accent)">Menunggu</span></span><span>■ <span style="color:var(--bad)">Pembetulan</span></span><span>■ <span class="muted">Draf / belum diisi</span></span></p>';
    H.click = async e => {
      if (e.target.closest('[data-new]')) return rosterModal(null);
      const ed = e.target.closest('[data-edit]'); if (ed) return rosterModal(S.db.rosters.find(r => r.id === ed.dataset.edit));
      const dl = e.target.closest('[data-delr]');
      if (dl) {
        const r = S.db.rosters.find(x => x.id === dl.dataset.delr);
        if (await confirmBox('Padam jadual?', 'Jadual minggu ' + D.weekRange(r.weekStart) + ' akan dipadam. Laporan sedia ada tidak terjejas.', 'Padam', true)) { S.deleteRoster(r.id); toast('Jadual dipadam'); jadual(); }
      }
    };
  }

  function rosterModal(r) {
    const t = S.teachers();
    const wk = r ? r.weekStart : D.toISO(D.addDays(D.mondayOf(new Date()), 7));
    const sel = r ? r.teacherIds : [];
    openModal(r ? 'Edit jadual bertugas' : 'Tambah jadual bertugas',
      '<form class="form" id="rForm"><label class="field"><span>Minggu bermula (Isnin)</span><input type="date" id="rWeek" value="' + wk + '" required><small class="muted" id="rRange">' + D.weekRange(wk) + '</small></label>' +
      '<div class="field"><span>Guru bertugas</span><div class="pick-list">' + t.map(u => '<label class="pick"><input type="checkbox" value="' + u.id + '"' + (sel.includes(u.id) ? ' checked' : '') + '>' + avatar(u, 'sm') + '<span>' + esc(u.nama) + '<small>' + esc(u.jawatan) + '</small></span></label>').join('') + '</div></div>' +
      '<label class="field"><span>Ketua guru bertugas</span><select id="rKetua"></select></label><p class="form-error" id="rErr" hidden></p></form>',
      '<button class="btn btn-outline" data-close>Batal</button><button class="btn btn-primary" id="rSave">' + icon('save') + ' Simpan</button>', m => {
        const upd = () => {
          const ids = $$('.pick input:checked', m).map(i => i.value);
          const cur = $('#rKetua', m).value || (r && r.ketua);
          $('#rKetua', m).innerHTML = ids.length ? ids.map(id => '<option value="' + id + '"' + (id === cur ? ' selected' : '') + '>' + esc(uname(id)) + '</option>').join('') : '<option value="">— pilih guru dahulu —</option>';
        };
        upd();
        m.addEventListener('change', e => {
          if (e.target.matches('.pick input')) upd();
          if (e.target.id === 'rWeek' && e.target.value) { const mon = D.toISO(D.mondayOf(D.parseISO(e.target.value))); e.target.value = mon; $('#rRange', m).textContent = D.weekRange(mon); }
        });
        $('#rSave', m).onclick = () => {
          const err = $('#rErr', m);
          const v = $('#rWeek', m).value;
          if (!v) { err.textContent = 'Pilih tarikh minggu.'; err.hidden = false; return; }
          const mon = D.toISO(D.mondayOf(D.parseISO(v)));
          const ids = $$('.pick input:checked', m).map(i => i.value);
          if (!ids.length) { err.textContent = 'Pilih sekurang-kurangnya seorang guru.'; err.hidden = false; return; }
          const clash = S.db.rosters.find(x => x.weekStart === mon && (!r || x.id !== r.id));
          if (clash) { err.textContent = 'Minggu ini sudah mempunyai jadual. Sila edit jadual sedia ada.'; err.hidden = false; return; }
          S.saveRoster({ id: r ? r.id : 'w_' + mon + '_' + Date.now().toString(36), weekStart: mon, teacherIds: ids, ketua: $('#rKetua', m).value || ids[0] });
          closeModal(); toast('Jadual disimpan'); jadual();
        };
      });
  }

  /* =========================================================
     PENGGUNA (admin)
     ========================================================= */
  function pengguna() {
    setTitle('Pengguna');
    const users = [...S.db.users].sort((a, b) => a.role.localeCompare(b.role) || a.nama.localeCompare(b.nama));
    view.innerHTML = '<div class="page-head"><div><h1>Pengurusan Pengguna</h1><p>' + users.filter(u => u.role === 'guru').length + ' guru · ' + users.filter(u => u.role === 'admin').length + ' pentadbir</p></div><div class="page-actions"><button class="btn btn-primary" data-new>' + icon('plus') + ' Tambah pengguna</button></div></div>' +
      '<section class="card"><div class="table-wrap"><table class="t stack-m"><thead><tr><th>Nama</th><th>Jawatan</th><th>Peranan</th><th>Telefon</th><th class="r">Giliran</th><th></th></tr></thead><tbody>' +
      users.map(u => '<tr><td class="t-main"><div style="display:flex;gap:10px;align-items:center">' + avatar(u) + '<div style="min-width:0"><b>' + esc(u.nama) + '</b><div class="tiny muted">' + esc(u.email) + '</div></div></div></td>' +
        '<td data-label="Jawatan">' + esc(u.jawatan) + '</td><td data-label="Peranan"><span class="role-tag ' + u.role + '">' + (u.role === 'admin' ? 'Pentadbir' : 'Guru') + '</span></td>' +
        '<td data-label="Telefon">' + esc(u.telefon || '-') + '</td><td data-label="Giliran" class="r num">' + S.rostersForUser(u.id).length + '</td>' +
        '<td class="r" data-label=""><button class="btn btn-ghost btn-icon btn-sm" data-edit="' + u.id + '" aria-label="Edit">' + icon('edit') + '</button>' + (u.id !== me.id ? '<button class="btn btn-ghost btn-icon btn-sm" data-delu="' + u.id + '" aria-label="Padam">' + icon('trash') + '</button>' : '') + '</td></tr>').join('') +
      '</tbody></table></div></section>';
    H.click = async e => {
      if (e.target.closest('[data-new]')) return userModal(null);
      const ed = e.target.closest('[data-edit]'); if (ed) return userModal(S.user(ed.dataset.edit));
      const dl = e.target.closest('[data-delu]');
      if (dl) {
        const u = S.user(dl.dataset.delu);
        if (await confirmBox('Padam pengguna?', esc(u.nama) + ' akan dipadam dan dikeluarkan daripada semua jadual bertugas.', 'Padam', true)) { S.deleteUser(u.id); toast('Pengguna dipadam'); pengguna(); }
      }
    };
  }

  function userModal(u) {
    const v = u || { nama: '', email: '', jawatan: '', telefon: '', role: 'guru' };
    openModal(u ? 'Edit pengguna' : 'Tambah pengguna',
      '<form class="form" id="uForm"><label class="field"><span>Nama penuh *</span><input id="uNama" value="' + esc(v.nama) + '" placeholder="cth: Cikgu Ahmad bin Ali"></label>' +
      '<div class="form-row"><label class="field"><span>E-mel *</span><input type="email" id="uEmail" value="' + esc(v.email) + '"></label><label class="field"><span>Telefon</span><input id="uTel" value="' + esc(v.telefon) + '"></label></div>' +
      '<div class="form-row"><label class="field"><span>Jawatan</span><input id="uJaw" value="' + esc(v.jawatan) + '" placeholder="cth: Guru Matematik"></label><label class="field"><span>Peranan</span><select id="uRole"><option value="guru"' + (v.role === 'guru' ? ' selected' : '') + '>Guru</option><option value="admin"' + (v.role === 'admin' ? ' selected' : '') + '>Pentadbir</option></select></label></div>' +
      '<label class="field"><span>Kata laluan ' + (u ? '<small>(biarkan kosong jika tidak ditukar)</small>' : '*') + '</span><input type="text" id="uPw" placeholder="' + (u ? '••••••' : 'cth: guru123') + '"></label><p class="form-error" id="uErr" hidden></p></form>',
      '<button class="btn btn-outline" data-close>Batal</button><button class="btn btn-primary" id="uSave">' + icon('save') + ' Simpan</button>', m => {
        $('#uSave', m).onclick = () => {
          const err = $('#uErr', m), val = id => $(id, m).value.trim();
          const email = val('#uEmail').toLowerCase();
          const fail = msg => { err.textContent = msg; err.hidden = false; };
          if (!val('#uNama')) return fail('Nama diperlukan.');
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail('E-mel tidak sah.');
          if (S.db.users.some(x => x.email.toLowerCase() === email && (!u || x.id !== u.id))) return fail('E-mel sudah digunakan.');
          if (!u && !val('#uPw')) return fail('Kata laluan diperlukan.');
          if (u && u.id === me.id && val('#uRole') !== 'admin') return fail('Anda tidak boleh menukar peranan akaun sendiri.');
          S.saveUser({ ...(u || { id: S.uid('u') }), nama: val('#uNama'), email, telefon: val('#uTel'), jawatan: val('#uJaw') || (val('#uRole') === 'admin' ? 'Pentadbir' : 'Guru'), role: val('#uRole'), password: val('#uPw') || (u && u.password) });
          closeModal(); toast('Pengguna disimpan'); renderShell(); pengguna();
        };
      });
  }

  /* =========================================================
     TETAPAN (admin)
     ========================================================= */
  function tetapan() {
    setTitle('Tetapan');
    const st = S.db.settings;
    let kelas = clone(S.db.classes);
    view.innerHTML = '<div class="page-head"><div><h1>Tetapan Sekolah</h1><p>Maklumat sekolah, senarai kelas dan data demo.</p></div></div>' +
      '<div class="grid g-2"><section class="card"><div class="card-head"><h2>' + icon('school') + ' Maklumat sekolah</h2></div><div class="card-body"><form class="form" id="sForm">' +
      '<label class="field"><span>Nama sekolah</span><input id="sNama" value="' + esc(st.namaSekolah) + '"></label>' +
      '<div class="form-row"><label class="field"><span>Kod sekolah</span><input id="sKod" value="' + esc(st.kodSekolah) + '"></label><label class="field"><span>Jumlah guru</span><input type="number" min="1" id="sGuru" value="' + st.jumlahGuru + '"></label></div>' +
      '<label class="field"><span>Daerah / negeri</span><input id="sDaerah" value="' + esc(st.daerah) + '"></label>' +
      '<div><button class="btn btn-primary" type="submit">' + icon('save') + ' Simpan maklumat</button></div></form></div></section>' +
      '<section class="card"><div class="card-head"><h2>' + icon('grad') + ' Kelas & enrolmen</h2><button class="btn btn-outline btn-sm" data-addk>' + icon('plus') + ' Kelas</button></div><div class="card-body"><div id="kList" class="rows"></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;gap:8px;flex-wrap:wrap"><span class="tiny muted" id="kTot"></span><button class="btn btn-primary btn-sm" data-savek>' + icon('save') + ' Simpan kelas</button></div><p class="tiny muted" style="margin-top:8px">Perubahan kelas digunakan untuk laporan baharu.</p></div></section></div>' +
      '<section class="card" style="margin-top:18px"><div class="card-head"><h2>' + icon('undo') + ' Data demo</h2></div><div class="card-body" style="display:flex;justify-content:space-between;gap:14px;align-items:center;flex-wrap:wrap"><p class="muted" style="max-width:560px">Set semula semua data (pengguna, jadual, laporan) kepada data contoh asal. Tindakan ini tidak boleh dibatalkan.</p><button class="btn btn-danger" data-reset>' + icon('undo') + ' Set semula data demo</button></div></section>';
    const paintK = () => {
      $('#kList').innerHTML = kelas.map((k, i) => '<div style="display:grid;grid-template-columns:1fr 100px auto;gap:8px;align-items:center"><input data-k="' + i + '" data-kf="nama" value="' + esc(k.nama) + '" aria-label="Nama kelas"><input type="number" min="0" data-k="' + i + '" data-kf="enrolmen" value="' + k.enrolmen + '" aria-label="Enrolmen"><button class="btn btn-ghost btn-icon btn-sm" data-delk="' + i + '" aria-label="Buang">' + icon('trash') + '</button></div>').join('');
      $('#kTot').textContent = kelas.length + ' kelas · ' + kelas.reduce((a, k) => a + (Number(k.enrolmen) || 0), 0) + ' pelajar';
    };
    paintK();
    H.submit = e => {
      if (e.target.id !== 'sForm') return;
      e.preventDefault();
      Object.assign(S.db.settings, { namaSekolah: $('#sNama').value.trim() || st.namaSekolah, kodSekolah: $('#sKod').value.trim(), jumlahGuru: Math.max(1, +$('#sGuru').value || 1), daerah: $('#sDaerah').value.trim() });
      S.save(); renderShell(); setActive('tetapan'); toast('Maklumat sekolah disimpan');
    };
    H.input = e => { const t = e.target; if (t.dataset.k !== undefined) { kelas[+t.dataset.k][t.dataset.kf] = t.dataset.kf === 'enrolmen' ? Math.max(0, +t.value || 0) : t.value; $('#kTot').textContent = kelas.length + ' kelas · ' + kelas.reduce((a, k) => a + (Number(k.enrolmen) || 0), 0) + ' pelajar'; } };
    H.click = async e => {
      if (e.target.closest('[data-addk]')) { kelas.push({ id: S.uid('k'), nama: '', enrolmen: 30 }); paintK(); const ins = $$('#kList input[data-kf="nama"]'); ins[ins.length - 1].focus(); return; }
      const dk = e.target.closest('[data-delk]'); if (dk) { kelas.splice(+dk.dataset.delk, 1); paintK(); return; }
      if (e.target.closest('[data-savek]')) {
        if (kelas.some(k => !k.nama.trim())) return toast('Nama kelas tidak boleh kosong.', 'bad');
        S.db.classes = kelas.map(k => ({ ...k, nama: k.nama.trim() })); S.save(); toast('Senarai kelas disimpan'); return;
      }
      if (e.target.closest('[data-reset]')) {
        if (await confirmBox('Set semula data demo?', 'Semua perubahan akan hilang dan data contoh asal dipulihkan.', 'Set semula', true)) {
          S.reset();
          if (!S.user(me.id)) { S.logout(); location.replace('login.html'); return; }
          toast('Data demo dipulihkan'); renderShell(); go('#/dashboard');
        }
      }
    };
  }

  /* =========================================================
     PROFIL
     ========================================================= */
  function profil() {
    setTitle('Profil');
    const mine = S.rostersForUser(me.id);
    view.innerHTML = '<div class="page-head"><div><h1>Profil Saya</h1><p>Maklumat akaun dan keselamatan.</p></div></div>' +
      '<div class="grid g-2"><section class="card card-pad" style="display:grid;gap:16px;align-content:start"><div style="display:flex;gap:14px;align-items:center">' + avatar(me).replace('class="avatar', 'style="width:64px;height:64px;font-size:1.2rem;border-radius:18px" class="avatar') +
      '<div><h2 style="font-size:1.15rem;font-weight:800">' + esc(me.nama) + '</h2><p class="muted">' + esc(me.jawatan) + '</p><span class="role-tag ' + me.role + '">' + (isAdmin() ? 'Pentadbir' : 'Guru') + '</span></div></div>' +
      '<div class="report-meta"><div class="meta"><small>E-mel</small><b>' + esc(me.email) + '</b></div><div class="meta"><small>Telefon</small><b>' + esc(me.telefon || '-') + '</b></div><div class="meta"><small>Sekolah</small><b>' + esc(S.db.settings.namaSekolah) + '</b></div><div class="meta"><small>Giliran bertugas</small><b>' + mine.length + ' minggu</b></div></div>' +
      '<button class="btn btn-danger" data-logout2 style="justify-self:start">' + icon('logout') + ' Log keluar</button></section>' +
      '<section class="card"><div class="card-head"><h2>' + icon('lock') + ' Tukar kata laluan</h2></div><div class="card-body"><form class="form" id="pwForm">' +
      '<label class="field"><span>Kata laluan semasa</span><input type="password" id="pw0" autocomplete="current-password"></label>' +
      '<label class="field"><span>Kata laluan baharu</span><input type="password" id="pw1" autocomplete="new-password"></label>' +
      '<label class="field"><span>Sahkan kata laluan baharu</span><input type="password" id="pw2" autocomplete="new-password"></label>' +
      '<div><button class="btn btn-primary" type="submit">' + icon('save') + ' Kemas kini</button></div></form></div></section></div>';
    H.click = e => { if (e.target.closest('[data-logout2]')) logout(); };
    H.submit = e => {
      e.preventDefault();
      if ($('#pw0').value !== me.password) return toast('Kata laluan semasa salah.', 'bad');
      if ($('#pw1').value.length < 6) return toast('Kata laluan baharu sekurang-kurangnya 6 aksara.', 'bad');
      if ($('#pw1').value !== $('#pw2').value) return toast('Pengesahan kata laluan tidak sepadan.', 'bad');
      S.saveUser({ ...me, password: $('#pw1').value }); me = S.user(me.id); e.target.reset(); toast('Kata laluan dikemas kini');
    };
  }

  /* ---------- Mula ---------- */
  addEventListener('beforeunload', () => flush());
  renderShell();
  route();
})();
