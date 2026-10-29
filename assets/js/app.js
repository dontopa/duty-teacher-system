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
  const uname = id => { const u = S.user(id); return u ? u.nama : 'Deleted user'; };
  const chip = (st, short) => '<span class="status s-' + S.STATUS[st].tone + '" title="' + S.STATUS[st].label + '">' + S.STATUS[st][short ? 'short' : 'label'] + '</span>';
  const avatar = (u, cls) => '<span class="avatar ' + (cls || '') + (u && u.role === 'admin' ? ' av-admin' : '') + '">' + esc(u ? S.initials(u.nama) : '?') + '</span>';
  const isAdmin = () => me.role === 'admin';
  const myClasses = () => S.classesOf(me);
  const myClassNames = () => myClasses().map(c => c.nama);
  const stuNames = kelas => { const c = S.classByName(kelas); return c ? S.studentsIn(c.id).map(x => x.nama) : []; };
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
    modalRoot.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="modal-head"><h3>' + esc(title) + '</h3><button class="btn btn-ghost btn-icon" data-close aria-label="Close">' + icon('x') + '</button></div><div class="modal-body">' + body + '</div>' + (foot ? '<div class="modal-foot">' + foot + '</div>' : '') + '</div>';
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
      openModal(title, '<p class="muted">' + msg + '</p>', '<button class="btn btn-outline" data-close>Cancel</button><button class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" id="cfOk">' + esc(okLabel || 'Continue') + '</button>', m => {
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
        { key: 'dashboard', ic: 'home', label: 'Home' },
        { key: 'laporan', ic: 'file', label: 'Reports', badge: pending },
        { key: 'jadual', ic: 'calendar', label: 'Roster' },
        { key: 'kelas', ic: 'grad', label: 'Classes & Students', short: 'Classes' },
        { key: 'pengguna', ic: 'users', label: 'Users' },
        { key: 'tetapan', ic: 'sliders', label: 'Settings', desktopOnly: true }
      ];
    }
    const mine = myRosterIds();
    const fix = S.db.reports.filter(r => r.status === 'dikembalikan' && mine.includes(r.rosterId)).length;
    return [
      { key: 'dashboard', ic: 'home', label: 'Home' },
      { key: 'isi', ic: 'edit', label: 'Fill Report' },
      { key: 'laporan', ic: 'file', label: 'My Reports', short: 'Reports', badge: fix },
      { key: 'jadual', ic: 'calendar', label: 'Roster' },
      { key: 'profil', ic: 'user', label: 'Profile' }
    ];
  }
  function renderShell() {
    const items = navItems();
    const link = (it, mobile) => '<a href="#/' + it.key + '" data-nav="' + it.key + '">' + icon(it.ic) + '<span>' + esc(mobile && it.short ? it.short : it.label) + '</span>' + (it.badge ? '<span class="nav-badge">' + it.badge + '</span>' : '') + '</a>';
    $('#sideNav').innerHTML = items.map(it => link(it)).join('');
    $('#bottomNav').innerHTML = items.filter(it => !it.desktopOnly).map(it => link(it, true)).join('');
    $('#schoolName').innerHTML = esc(S.db.settings.namaSekolah) + '<br><span class="role-pill ' + me.role + '" style="margin:10px 0 0">' + icon(isAdmin() ? 'shield' : 'user') + (isAdmin() ? 'Admin Mode' : 'Teacher Mode') + '</span>';
    document.body.classList.remove('role-admin', 'role-guru');
    document.body.classList.add('role-' + me.role);
    $('#modeChip').className = 'mode-chip ' + me.role;
    $('#modeChip').textContent = isAdmin() ? 'Admin' : 'Teacher';
    $('#sideUser').innerHTML = avatar(me) + '<div class="who"><b>' + esc(me.nama) + '</b><small>' + (isAdmin() ? 'Admin' : 'Teacher') + ' · ' + esc(me.jawatan) + '</small></div><button class="btn btn-ghost btn-icon" id="sideLogout" title="Log out" aria-label="Log out">' + icon('logout') + '</button>';
    $('#avatarBtn').innerHTML = avatar(me);
    $('#todayChip').textContent = D.long(D.todayISO());
    $('#userMenu').innerHTML = '<div class="menu-head"><b>' + esc(me.nama) + '</b><small>' + esc(me.email) + '</small></div>' +
      '<a href="#/profil">' + icon('user') + ' My profile</a>' + (isAdmin() ? '<a href="#/tetapan">' + icon('sliders') + ' School settings</a>' : '') + '<a href="index.html">' + icon('school') + ' SIGAP home page</a>' +
      '<button class="danger" data-logout>' + icon('logout') + ' Log out</button>';
    $('#sideLogout').onclick = logout;
    setActive(currentKey);
  }
  function setActive(key) {
    currentKey = key;
    $$('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === key));
  }
  function setTitle(t) { $('#pageTitle').textContent = t; document.title = t + ' · SIGAP'; }
  async function logout() {
    if (await confirmBox('Log out?', 'You will be returned to the login page.', 'Log out')) { S.logout(); location.href = 'login.html'; }
  }
  const menu = $('#userMenu'), avBtn = $('#avatarBtn');
  avBtn.onclick = e => { e.stopPropagation(); menu.hidden = !menu.hidden; avBtn.setAttribute('aria-expanded', String(!menu.hidden)); };
  menu.addEventListener('click', e => { if (e.target.closest('[data-logout]')) logout(); menu.hidden = true; });
  document.addEventListener('click', () => { menu.hidden = true; });
  addEventListener('scroll', () => $('.topbar').classList.toggle('scrolled', scrollY > 4), { passive: true });

  /* ---------- Penghala ---------- */
  let currentKey = 'dashboard', firstRoute = true;
  // Auto-resume: guru yang tertutup aplikasi semasa mengisi dibawa terus ke langkah terakhir
  function resumeInfo() {
    const r = S.getResume(me.id);
    if (!r || !S.canEdit(me, r.date)) { if (r) S.clearResume(me.id); return null; }
    const rep = S.report(r.date);
    if (!rep) { S.clearResume(me.id); return null; }
    return { date: r.date, step: Math.min(7, r.step || 0) };
  }
  function tryResume() {
    const r = resumeInfo(); if (!r) return false;
    toast('Session resumed · Step ' + (r.step + 1) + ': ' + S.STEPS[r.step].title, 'info');
    location.replace('#/laporan/isi/' + r.date + '?s=' + r.step);
    return true;
  }
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
    const adminOnly = ['pengguna', 'tetapan', 'kelas'];
    if (firstRoute) { firstRoute = false; if (!isAdmin() && (key === 'dashboard' || !location.hash) && tryResume()) return; }
    if (adminOnly.includes(key) && !isAdmin()) return go('#/dashboard');
    switch (key) {
      case 'dashboard': return isAdmin() ? adminDash() : guruDash();
      case 'isi': return goToFill();
      case 'laporan':
        if (parts[1] === 'isi') return wizard(parts[2], params.has('s') ? +params.get('s') : null);
        if (parts[1] === 'lihat') return viewReport(parts[2]);
        return listReports();
      case 'jadual': return jadual();
      case 'pengguna': return pengguna();
      case 'kelas': return kelasPage();
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
      (future ? '<span class="status s-ghost">Upcoming</span>' : chip(st, true)) +
      '<span class="day-act">' + (future ? icon('lock') + ' Locked' : editable ? (rep ? 'Continue' : 'Fill report') + ' ' + icon('arrow') : rep ? 'View ' + icon('arrow') : '—') + '</span>';
    const href = future ? null : editable ? '#/laporan/isi/' + date : rep ? '#/laporan/lihat/' + date : null;
    return href ? '<a class="' + cls + '" href="' + href + '">' + inner + '</a>' : '<div class="' + cls + '">' + inner + '</div>';
  }

  function guruDash() {
    setTitle('Home');
    const today = D.todayISO(), mon = thisMonday();
    const roster = S.db.rosters.find(r => r.weekStart === mon);
    const onDuty = roster && roster.teacherIds.includes(me.id);
    const mine = S.rostersForUser(me.id);
    const upcoming = mine.filter(r => r.weekStart > mon).reverse();
    const reps = myReports();
    const cnt = st => reps.filter(r => r.status === st).length;
    const fixes = reps.filter(r => r.status === 'dikembalikan');
    const first = me.nama.replace(/^(Mrs\.|Mr\.|Ms\.|Dr\.)\s+/, '').split(' ')[0];
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 19 ? 'Good afternoon' : 'Good evening';

    let hero;
    if (onDuty) {
      const team = roster.teacherIds.map(id => S.user(id)).filter(Boolean);
      const filled = D.weekDays(mon).filter(d => { const r = S.report(d); return r && r.status !== 'draf'; }).length;
      hero = '<section class="card duty-hero"><div class="card-pad">' +
        '<span class="duty-eyebrow">' + icon('bell') + " You're on duty this week</span>" +
        '<h2>Week of ' + D.weekRange(mon) + '</h2><p>' + filled + ' of 5 daily reports submitted. Fill in one report per day.</p>' +
        '<div class="partners">' + team.map(u => '<span class="partner">' + avatar(u, 'sm') + esc(u.nama) + (u.id === roster.ketua ? ' · Lead' : '') + '</span>').join('') + '</div>' +
        '<div class="days">' + D.weekDays(mon).map(d => dayTile(d, today)).join('') + '</div></div></section>';
    } else {
      const nx = upcoming[0];
      hero = '<section class="card duty-hero"><div class="card-pad">' +
        '<span class="duty-eyebrow">' + icon('calendar') + ' Duty status</span>' +
        "<h2>You're not on duty this week</h2><p>" + (nx ? 'Your next turn: <b>' + D.weekRange(nx.weekStart) + '</b>.' : 'No duty turns scheduled at the moment.') + '</p>' +
        (roster ? '<div class="partners">' + roster.teacherIds.map(id => S.user(id)).filter(Boolean).map(u => '<span class="partner">' + avatar(u, 'sm') + esc(u.nama) + '</span>').join('') + '</div><p style="margin-top:8px;font-size:.8rem">Duty teachers this week</p>' : '') +
        '</div></section>';
    }

    view.innerHTML = '<div class="page-head"><div><h1>' + greet + ', ' + esc(first) + ' 👋</h1><p>' + D.long(today) + ' · ' + esc(S.db.settings.namaSekolah) + '</p></div></div>' +
      '<div class="stack">' + resumeBanner() + hero +
      (fixes.length ? '<div class="callout bad">' + icon('alert') + '<div><b>' + fixes.length + ' report(s) need correction</b><p>' + fixes.map(r => '<a href="#/laporan/isi/' + r.date + '" style="text-decoration:underline;font-weight:700">' + D.long(r.date) + '</a>').join(', ') + '</p></div></div>' : '') +
      '<div class="grid g-4">' +
      kpi('My reports', reps.length, 'all weeks', 'file') +
      kpi('Approved', cnt('disahkan'), 'by management', 'shield') +
      kpi('Pending', cnt('dihantar'), 'approval', 'clock', 'warn') +
      kpi('Needs correction', cnt('dikembalikan'), 'returned', 'undo', 'bad') +
      '</div>' +
      '<div class="grid g-main">' +
      '<section class="card"><div class="card-head"><h2>' + icon('file') + ' Recent reports</h2><a class="btn btn-ghost btn-sm" href="#/laporan">All ' + icon('right') + '</a></div><div class="list">' +
      (reps.slice(0, 6).map(listRow).join('') || emptyHTML('inbox', 'No reports yet', 'Your reports will appear here.')) + '</div></section>' +
      '<div class="stack">' +
      '<section class="card"><div class="card-head"><h2>' + icon('grad') + ' My classes</h2><span class="muted tiny">' + myClasses().length + ' classes</span></div><div class="list">' +
      (myClasses().map(c => '<div class="list-item"><span class="kpi-ic">' + icon('grad') + '</span><div class="grow"><b>' + esc(c.nama) + '</b><small>' + S.studentsIn(c.id).length + ' students</small></div></div>').join('') || emptyHTML('grad', 'No classes', 'Ask an administrator to assign your classes.')) + '</div></section>' +
      '<section class="card"><div class="card-head"><h2>' + icon('calendar') + ' Upcoming turns</h2></div><div class="list">' +
      (upcoming.slice(0, 4).map(r => '<div class="list-item">' + dateBox(r.weekStart) + '<div class="grow"><b>' + D.weekRange(r.weekStart) + '</b><small>With ' + esc(r.teacherIds.filter(i => i !== me.id).map(uname).join(', ') || '—') + '</small></div>' + (r.ketua === me.id ? '<span class="tag brand">Lead</span>' : '') + '</div>').join('') || emptyHTML('calendar', 'No turns', 'Not scheduled yet.')) + '</div></section>' +
      '<section class="card"><div class="card-head"><h2>' + icon('shield') + ' Management comments</h2></div><div class="list">' +
      (reps.filter(r => r.pengesahan && r.pengesahan.ulasan).slice(0, 3).map(r => '<a class="list-item" href="#/laporan/lihat/' + r.date + '">' + avatar(S.user(r.pengesahan.oleh), 'sm') + '<div class="grow"><b>' + esc(r.pengesahan.ulasan) + '</b><small>' + esc(uname(r.pengesahan.oleh)) + ' · ' + D.short(r.date) + '</small></div></a>').join('') || emptyHTML('mail', 'No comments', 'Comments from administrators will appear here.')) +
      '</div></section></div></div></div>';
  }

  function resumeBanner() {
    const r = resumeInfo(); if (!r) return '';
    return '<div class="resume"><span class="ic-big">' + icon('save') + '</span><div class="grow"><b>Continue report for ' + D.long(r.date) + '</b><small>You stopped at Step ' + (r.step + 1) + ': ' + esc(S.STEPS[r.step].title) + '. Everything has been saved.</small></div><a class="btn btn-primary" href="#/laporan/isi/' + r.date + '?s=' + r.step + '">' + icon('arrow') + ' Continue</a></div>';
  }
  function kpi(label, value, sub, ic, tone) {
    return '<div class="card kpi"><div class="kpi-top"><span>' + esc(label) + '</span><span class="kpi-ic ' + (tone || '') + '">' + icon(ic) + '</span></div><strong>' + value + '</strong><small>' + sub + '</small></div>';
  }
  function dateBox(d) { const x = D.parseISO(d); return '<span class="date-box"><b>' + x.getDate() + '</b><small>' + D.BULAN[x.getMonth()] + '</small></span>'; }
  function emptyHTML(ic, t, s) { return '<div class="empty">' + icon(ic) + '<b>' + esc(t) + '</b><span>' + esc(s) + '</span></div>'; }
  function listRow(r) {
    const href = reportLink(r.date) || '#/laporan/lihat/' + r.date;
    return '<a class="list-item" href="' + href + '">' + dateBox(r.date) + '<div class="grow"><b>' + D.dayName(r.date) + ', ' + D.medium(r.date) + '</b><small>Students present ' + pct(S.pelajarStat(r).pct) + '% · ' + r.disiplin.length + ' discipline cases</small></div>' + chip(r.status, true) + '</a>';
  }

  function goToFill() {
    const today = D.todayISO();
    const days = D.weekDays(thisMonday()).filter(d => d <= today && S.canEdit(me, d));
    let target = days.includes(today) ? today : days[days.length - 1];
    if (!target) { const fx = myReports().find(r => r.status === 'dikembalikan'); if (fx) target = fx.date; }
    if (!target) { toast('No report to fill right now. Check your duty roster.', 'info'); return go('#/dashboard'); }
    location.replace('#/laporan/isi/' + target);
  }

  /* =========================================================
     PAPAN PEMUKA PENTADBIR
     ========================================================= */
  function adminDash() {
    setTitle('Dashboard');
    const today = D.todayISO(), mon = thisMonday();
    const all = S.reports();
    const active = all.filter(r => r.status !== 'draf');
    const pending = all.filter(r => r.status === 'dihantar');
    const last7 = active.filter(r => r.date >= daysAgo(7));
    const avgP = last7.length ? last7.reduce((a, r) => a + S.pelajarStat(r).pct, 0) / last7.length : 0;
    const health = last7.reduce((a, r) => a + r.kesihatan.length, 0);
    const clinic = last7.reduce((a, r) => a + r.kesihatan.filter(k => /clinic|hospital/i.test(k.tindakan)).length, 0);
    const disc = last7.reduce((a, r) => a + r.disiplin.length, 0);
    const late = last7.reduce((a, r) => a + r.disiplin.filter(k => k.kesalahan === 'Late arrival').length, 0);
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
    active.filter(r => r.date >= daysAgo(7)).forEach(r => S.ASPEK.forEach(a => { const it = r.sekitar.items[a.key]; if (it && it.status === 'Needs Action') issues.push({ date: r.date, label: a.label, note: it.catatan }); }));

    view.innerHTML = '<div class="page-head"><div><h1>Admin Dashboard</h1><p>' + D.long(today) + ' · ' + esc(S.db.settings.namaSekolah) + '</p></div><div class="page-actions"><a class="btn btn-primary" href="#/laporan?f=dihantar">' + icon('shield') + ' Review reports (' + pending.length + ')</a></div></div>' +
      '<div class="stack"><div class="grid g-4">' +
      kpi('Pending approval', pending.length, 'reports submitted', 'inbox', 'warn') +
      kpi('Student attendance', pct(avgP) + '%', 'average, last 7 days', 'grad') +
      kpi('Health cases', health, clinic + ' taken to clinic · 7 days', 'health', 'bad') +
      kpi('Discipline cases', disc, late + ' late arrivals · 7 days', 'alert', 'info') +
      '</div>' +
      '<div class="grid g-main">' +
      '<section class="card"><div class="card-head"><h2>' + icon('trend') + ' Student attendance (%)</h2><span class="muted tiny">Last ' + series.length + ' school days</span></div><div class="card-body">' + (series.length ? lineChart(series) : emptyHTML('chart', 'No data', 'No reports submitted yet.')) + '</div></section>' +
      '<section class="card"><div class="card-head"><h2>' + icon('users') + ' On duty this week</h2><a class="btn btn-ghost btn-sm" href="#/jadual">Roster ' + icon('right') + '</a></div>' +
      (roster ? '<div class="list">' + roster.teacherIds.map(id => S.user(id)).filter(Boolean).map(u => '<div class="list-item">' + avatar(u) + '<div class="grow"><b>' + esc(u.nama) + '</b><small>' + esc(u.jawatan) + '</small></div>' + (u.id === roster.ketua ? '<span class="tag brand">Lead</span>' : '') + '</div>').join('') + '</div>' +
        '<div class="card-body" style="border-top:1px solid var(--line-2)"><div class="tiny muted" style="font-weight:700;margin-bottom:8px">' + D.weekRange(mon) + '</div><div class="list" style="gap:6px">' +
        D.weekDays(mon).map(d => { const r = S.report(d); const st = r ? r.status : (d > today ? null : 'tiada'); const href = r ? '#/laporan/lihat/' + d : null; return '<' + (href ? 'a href="' + href + '"' : 'div') + ' style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:.85rem;font-weight:600"><span>' + D.dayName(d) + ' <span class="muted">' + D.short(d) + '</span></span>' + (st ? chip(st) : '<span class="status s-ghost">Upcoming</span>') + '</' + (href ? 'a' : 'div') + '>'; }).join('') +
        '</div></div>'
        : emptyHTML('calendar', 'No duty teachers', 'Set up the roster for this week.')) +
      '</section></div>' +
      '<div class="grid g-3">' +
      '<section class="card"><div class="card-head"><h2>' + icon('inbox') + ' Pending approval</h2></div><div class="list">' +
      (pending.slice(0, 5).map(r => '<a class="list-item" href="#/laporan/lihat/' + r.date + '">' + dateBox(r.date) + '<div class="grow"><b>' + D.dayName(r.date) + '</b><small>' + esc(uname(r.filledBy)) + '</small></div>' + icon('right', 'muted') + '</a>').join('') || emptyHTML('done', 'All clear!', 'No reports pending.')) + '</div></section>' +
      '<section class="card"><div class="card-head"><h2>' + icon('alert') + ' Discipline offences</h2><span class="muted tiny">30 days</span></div><div class="card-body">' +
      (kRows.length ? '<div class="hbars">' + kRows.map(([k, v]) => '<div class="hbar" title="' + esc(k) + ': ' + v + ' cases"><span>' + esc(k) + '</span><b>' + v + '</b><div class="track"><div class="fill" data-w="' + (v / kMax * 100) + '"></div></div></div>').join('') + '</div>' : emptyHTML('done', 'No cases', 'No discipline cases recorded.')) +
      '</div></section>' +
      '<section class="card"><div class="card-head"><h2>' + icon('leaf') + ' School grounds issues</h2><span class="muted tiny">7 days</span></div><div class="list">' +
      (issues.slice(0, 5).map(i => '<a class="list-item" href="#/laporan/lihat/' + i.date + '"><span class="kpi-ic bad" style="width:32px;height:32px">' + icon('alert') + '</span><div class="grow"><b>' + esc(i.label) + '</b><small>' + esc(i.note || 'Needs action') + ' · ' + D.short(i.date) + '</small></div></a>').join('') || emptyHTML('leaf', 'All under control', 'No issues needing action.')) +
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
    return '<div class="chart" id="lc"><svg viewBox="0 0 ' + Wd + ' ' + Ht + '" style="color:var(--brand)" role="img" aria-label="Student attendance chart">' +
      '<defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".22"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>' +
      ticks.map(t => '<line class="grid-l" x1="' + m.l + '" x2="' + (Wd - m.r) + '" y1="' + y(t) + '" y2="' + y(t) + '"/><text class="axis-t" x="' + (m.l - 8) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + t.toFixed(t % 1 ? 1 : 0) + '</text>').join('') +
      pts.map((p, i) => i % step === (pts.length - 1) % step ? '<text class="axis-t" x="' + x(i) + '" y="' + (Ht - 8) + '" text-anchor="middle">' + esc(p.label) + '</text>' : '').join('') +
      '<path class="area" d="' + area + '"/><path class="ln draw" d="' + path + '" style="--len:2000"/>' +
      '<line class="xhair" id="lcX" x1="0" x2="0" y1="' + m.t + '" y2="' + (m.t + ih) + '" visibility="hidden"/>' +
      pts.map((p, i) => '<circle class="pt" data-i="' + i + '" cx="' + x(i) + '" cy="' + y(p.value) + '" r="4"/>').join('') +
      pts.map((p, i) => '<rect class="hit" data-i="' + i + '" x="' + (x(i) - band / 2) + '" y="' + m.t + '" width="' + band + '" height="' + ih + '"/>').join('') +
      '</svg><div class="tooltip" id="lcTip" hidden></div></div>' +
      '<details class="tiny muted" style="margin-top:10px"><summary style="cursor:pointer;font-weight:700">View as table</summary><table class="t" style="margin-top:8px"><thead><tr><th>Date</th><th class="r">Present (%)</th></tr></thead><tbody>' +
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
    setTitle(isAdmin() ? 'All Reports' : 'My Reports');
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const state = { f: params.get('f') || 'semua', q: '' };
    const base = isAdmin() ? S.reports() : myReports();
    const filters = [['semua', 'All'], ['dihantar', 'Pending'], ['disahkan', 'Approved'], ['dikembalikan', 'Needs Correction'], ['draf', 'Draft']];
    view.innerHTML = '<div class="page-head"><div><h1>' + (isAdmin() ? 'All Reports' : 'My Reports') + '</h1><p>' + (isAdmin() ? 'Review, approve or return duty teacher reports.' : 'Daily reports from your duty weeks.') + '</p></div>' +
      (isAdmin() ? '' : '<div class="page-actions"><a class="btn btn-primary" href="#/isi">' + icon('edit') + ' Fill report</a></div>') + '</div>' +
      '<div class="filters"><div class="chips" id="fChips">' + filters.map(([k, l]) => '<button class="chip-btn" data-f="' + k + '">' + l + '<span class="cnt">' + (k === 'semua' ? base.length : base.filter(r => r.status === k).length) + '</span></button>').join('') + '</div>' +
      '<label class="search">' + icon('search') + '<input type="search" id="q" placeholder="Search date or teacher name…"></label></div>' +
      '<section class="card" id="repTable"></section>';
    function paint() {
      $$('#fChips .chip-btn').forEach(b => b.classList.toggle('on', b.dataset.f === state.f));
      const q = state.q.toLowerCase();
      const rows = base.filter(r => (state.f === 'semua' || r.status === state.f) && (!q || (D.long(r.date) + ' ' + uname(r.filledBy) + ' ' + r.date).toLowerCase().includes(q)));
      $('#repTable').innerHTML = rows.length ? '<div class="table-wrap"><table class="t stack-m"><thead><tr><th>Date</th><th>Filled by</th><th class="r">Students present</th><th class="r">Teachers absent</th><th class="r">Health</th><th class="r">Discipline</th><th>Status</th><th></th></tr></thead><tbody>' +
        rows.map(r => {
          const p = S.pelajarStat(r);
          return '<tr class="clickable" data-href="' + (reportLink(r.date) || '#/laporan/lihat/' + r.date) + '">' +
            '<td class="t-main"><div style="display:flex;gap:10px;align-items:center">' + dateBox(r.date) + '<div><b>' + D.dayName(r.date) + '</b><div class="tiny muted">' + D.medium(r.date) + '</div></div></div></td>' +
            '<td data-label="Filled by">' + esc(uname(r.filledBy)) + '</td>' +
            '<td data-label="Students present" class="r num">' + pct(p.pct) + '%</td>' +
            '<td data-label="Teachers absent" class="r num">' + r.guru.tidakHadir.length + '</td>' +
            '<td data-label="Health" class="r num">' + r.kesihatan.length + '</td>' +
            '<td data-label="Discipline" class="r num">' + r.disiplin.length + '</td>' +
            '<td data-label="Status">' + chip(r.status) + '</td>' +
            '<td class="r" data-label="">' + (isAdmin() && r.status === 'dihantar' ? '<span class="btn btn-primary btn-sm">Review</span>' : icon('right', 'muted')) + '</td></tr>';
        }).join('') + '</tbody></table></div>' : emptyHTML('inbox', 'No reports', 'No reports match this filter.');
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
      title: 'Teacher', add: 'Add absent teacher', none: 'All teachers present? Leave this empty.',
      blank: () => ({ nama: '', sebab: S.SEBAB_GURU[0] }),
      fields: [{ f: 'nama', label: 'Teacher name', list: 'staffList', req: true, ph: 'Type or pick a name' }, { f: 'sebab', label: 'Reason', opts: () => S.SEBAB_GURU }]
    },
    kesihatan: {
      title: 'Case', add: 'Add sick student', none: 'No sick students today? Leave this empty and continue.',
      blank: () => ({ kelas: myClassNames().length === 1 ? myClassNames()[0] : '', nama: '', pelajarId: '', simptom: '', tindakan: S.TINDAKAN_SAKIT[0], masa: nowTime() }),
      fields: [{ f: 'kelas', label: '1. Choose class', req: true, opts: myClassNames }, { f: 'nama', label: '2. Choose student', req: true, opts: row => stuNames(row.kelas), dep: 'kelas' }, { f: 'simptom', label: 'Symptom / issue', ph: 'e.g. Fever' }, { f: 'tindakan', label: 'Action taken', opts: () => S.TINDAKAN_SAKIT }, { f: 'masa', label: 'Time', type: 'time' }]
    },
    pelawat: {
      title: 'Visitor', add: 'Add visitor', none: 'No visitors today? Leave this empty — only fill it in if there were any.',
      blank: () => ({ nama: '', organisasi: '', tujuan: '', masuk: nowTime(), keluar: '' }),
      fields: [{ f: 'nama', label: 'Visitor name', req: true }, { f: 'organisasi', label: 'Organisation / relation', ph: 'e.g. Parent, contractor' }, { f: 'tujuan', label: 'Purpose of visit' }, { f: 'masuk', label: 'Time in', type: 'time' }, { f: 'keluar', label: 'Time out', type: 'time' }]
    },
    disiplin: {
      title: 'Case', add: 'Add discipline case', none: 'No discipline cases? Great! Leave this empty.',
      blank: () => ({ kelas: myClassNames().length === 1 ? myClassNames()[0] : '', nama: '', pelajarId: '', kesalahan: S.KESALAHAN[0], masa: nowTime(), tindakan: '' }),
      fields: [{ f: 'kelas', label: '1. Choose class', req: true, opts: myClassNames }, { f: 'nama', label: '2. Choose student', req: true, opts: row => stuNames(row.kelas), dep: 'kelas' }, { f: 'kesalahan', label: 'Offence', opts: () => S.KESALAHAN }, { f: 'masa', label: 'Time', type: 'time' }, { f: 'tindakan', label: 'Action taken', ph: 'e.g. Verbal warning' }]
    },
    aktiviti: {
      title: 'Activity', add: 'Add activity', none: 'No activities recorded yet.',
      blank: () => ({ masa: nowTime(), tajuk: '', catatan: '' }),
      fields: [{ f: 'masa', label: 'Time', type: 'time' }, { f: 'tajuk', label: 'Activity / programme', req: true, ph: 'e.g. School assembly' }, { f: 'catatan', label: 'Location / notes' }]
    }
  };

  function fieldHTML(list, i, fd, val, row) {
    const attrs = 'data-list="' + list + '" data-i="' + i + '" data-f="' + fd.f + '"';
    let ctl;
    if (fd.opts) {
      const opts = fd.opts(row || {});
      const waiting = fd.dep && !(row || {})[fd.dep];
      const ph = waiting ? '— choose a class first —' : val ? esc(val) : '— Choose —';
      ctl = '<select ' + attrs + (waiting ? ' disabled' : '') + '>' + (opts.includes(val) ? '' : '<option value="">' + ph + '</option>') + opts.map(o => '<option' + (o === val ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select>';
    } else {
      ctl = '<input type="' + (fd.type || 'text') + '" ' + attrs + ' value="' + esc(val) + '"' + (fd.list ? ' list="' + fd.list + '"' : '') + (fd.ph ? ' placeholder="' + esc(fd.ph) + '"' : '') + '>';
    }
    return '<label class="field"><span>' + esc(fd.label) + (fd.req ? ' *' : '') + '</span>' + ctl + '</label>';
  }
  function rowsHTML(list) {
    const def = ROWDEF[list], arr = getPath(W.rep, list);
    return '<div class="rows">' + arr.map((row, i) => '<div class="row-card"><div class="row-head"><span>' + def.title + ' #' + (i + 1) + '</span><button type="button" class="btn btn-ghost btn-icon btn-sm" data-del="' + list + '" data-i="' + i + '" aria-label="Remove">' + icon('trash') + '</button></div><div class="row-grid">' + def.fields.map(fd => fieldHTML(list, i, fd, row[fd.f], row)).join('') + '</div></div>').join('') +
      (arr.length ? '' : '<div class="none-note">' + icon('info') + esc(def.none) + '</div>') + '</div>' +
      '<button type="button" class="add-row" data-add="' + list + '">' + icon('plus') + esc(def.add) + '</button>';
  }
  const textArea = (path, label, ph) => '<label class="field"><span>' + label + ' <small>(optional)</small></span><textarea data-path="' + path + '" placeholder="' + esc(ph || '') + '">' + esc(getPath(W.rep, path)) + '</textarea></label>';

  function stepCount(i) {
    const r = W.rep;
    switch (S.STEPS[i].key) {
      case 'guru': return r.guru.tidakHadir.length ? r.guru.tidakHadir.length + ' absent' : '';
      case 'pelajar': { const mine = myAtt(); return mine.length && mine.every(x => x.k.disemak) ? pct(attStat(mine).pct, 0) + '%' : ''; }
      case 'kesihatan': return r.kesihatan.length || '';
      case 'sekitar': { const n = Object.values(r.sekitar.items).filter(x => x.status === 'Needs Action').length; return n ? n + ' issues' : ''; }
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
      return '<div class="form-row"><label class="field"><span>Total teaching staff</span><input type="number" min="1" data-path="guru.jumlah" value="' + esc(r.guru.jumlah) + '"></label></div>' +
        '<div class="mini-stats"><div class="mini"><small>Present</small><b class="ok" id="gH">' + g.hadir + '</b></div><div class="mini"><small>Absent</small><b class="bad" id="gT">' + g.tidakHadir + '</b></div><div class="mini"><small>Attendance</small><b id="gP">' + pct(g.pct) + '%</b></div></div>' +
        '<div><div class="field" style="margin-bottom:8px"><span>Absent teachers</span></div>' + rowsHTML('guru.tidakHadir') + '</div>' +
        '<datalist id="staffList">' + [...S.STAFF, ...S.db.users.map(u => u.nama)].map(n => '<option value="' + esc(n) + '">').join('') + '</datalist>' +
        textArea('guru.catatan', 'Notes', 'e.g. Relief teachers have been arranged for the affected classes.');
    }
    if (k === 'pelajar') {
      const mine = myAtt(), st = attStat(mine);
      if (!mine.length) return '<div class="callout warn">' + icon('info') + '<div><b>No classes assigned</b><p>You have not been assigned any classes yet. Contact an administrator.</p></div></div>';
      return '<div class="mini-stats"><div class="mini"><small>Enrolment</small><b>' + st.enrolmen + '</b></div><div class="mini"><small>Present</small><b class="ok">' + st.hadir + '</b></div><div class="mini"><small>Absent</small><b class="bad">' + (st.enrolmen - st.hadir) + '</b></div><div class="mini"><small>Percentage</small><b>' + pct(st.pct) + '%</b></div></div>' +
        '<div class="callout info">' + icon('info') + '<div><b>How to fill</b><p>All students are marked present. Tap the students who are <span style="font-weight:800;color:var(--bad)">ABSENT</span> (they turn red), then tick “Attendance checked”.</p></div></div>' +
        '<div class="att-list">' + mine.map(({ k: c, ci }) => {
          const abs = new Set(c.tidakHadir.map(x => x.id));
          const list = S.studentsIn(c.kelasId);
          return '<div class="att' + (c.disemak ? ' ok' : '') + '"><div class="att-head"><div class="grow"><b>' + esc(c.nama) + '</b><small>' + list.length + ' students</small></div><span class="att-count">' + (list.length - abs.size) + '/' + list.length + ' <small style="display:inline;font-size:.8rem">present</small></span>' +
            '<button type="button" class="btn btn-outline btn-sm" data-allin="' + ci + '">' + icon('check') + ' All present</button></div>' +
            '<div class="stu-grid">' + list.map(x => '<button type="button" class="stu' + (abs.has(x.id) ? ' abs' : '') + '" data-stu="' + x.id + '" data-ci="' + ci + '" aria-pressed="' + abs.has(x.id) + '"><span class="mk">' + icon(abs.has(x.id) ? 'x' : 'check') + '</span>' + esc(x.nama) + '</button>').join('') + '</div>' +
            '<div class="att-foot"><label class="check"><input type="checkbox" data-path="pelajar.kelas.' + ci + '.disemak"' + (c.disemak ? ' checked' : '') + '><span>Attendance for ' + esc(c.nama) + ' checked</span></label></div></div>';
        }).join('') + '</div>' +
        textArea('pelajar.catatan', 'Notes', 'e.g. Year 10 students are away at an inter-school competition.');
    }
    if (k === 'kesihatan') return '<div class="callout info">' + icon('health') + '<div><b>Procedure</b><p>Record every student treated in the sick bay, picked up by a parent or taken to a clinic.</p></div></div>' + rowsHTML('kesihatan');
    if (k === 'sekitar') {
      const tone = { 'Good': 'v-ok', 'Fair': 'v-warn', 'Needs Action': 'v-bad' };
      return '<div class="aspek-list">' + S.ASPEK.map(a => {
        const it = r.sekitar.items[a.key] || (r.sekitar.items[a.key] = { status: 'Good', catatan: '' });
        return '<div class="aspek' + (it.status === 'Needs Action' ? ' flag' : '') + '" data-asp="' + a.key + '"><b>' + esc(a.label) + '</b><div class="seg" role="radiogroup" aria-label="' + esc(a.label) + '">' +
          S.STATUS_ASPEK.map(s => '<label><input type="radio" name="asp_' + a.key + '" value="' + s + '" data-path="sekitar.items.' + a.key + '.status"' + (it.status === s ? ' checked' : '') + '><span class="' + tone[s] + '">' + (s === 'Needs Action' ? 'Action' : s) + '</span></label>').join('') +
          '</div><input class="note" data-path="sekitar.items.' + a.key + '.catatan" value="' + esc(it.catatan) + '" placeholder="Notes (if any)"></div>';
      }).join('') + '</div>' + textArea('sekitar.catatan', 'Overall notes', 'e.g. School grounds clean and safe.');
    }
    if (k === 'pelawat') return rowsHTML('pelawat');
    if (k === 'disiplin') return '<div class="callout warn">' + icon('clock') + '<div><b>Late arrival</b><p>Students arriving after 7:30 am are recorded as late.</p></div></div>' + rowsHTML('disiplin');
    if (k === 'aktiviti') return rowsHTML('aktiviti');
    if (k === 'pengesahan') {
      const back = r.status === 'dikembalikan' && r.pengesahan;
      return (back ? '<div class="callout bad">' + icon('undo') + '<div><b>Returned by ' + esc(uname(r.pengesahan.oleh)) + '</b><p>“' + esc(r.pengesahan.ulasan) + '”</p></div></div>' : '') +
        timelineHTML(r) +
        '<label class="check"><input type="checkbox" data-path="akuan"' + (r.akuan ? ' checked' : '') + '><span>I confirm that the information in the duty teacher report for <b>' + D.long(r.date) + '</b> is true and complete.</span></label>' +
        '<div class="callout info">' + icon('info') + '<div><b>Next step</b><p>The report will be sent to management (Principal / Head of Student Affairs) for review and approval.</p></div></div>' +
        '<button type="button" class="btn btn-primary" data-submit' + (r.akuan ? '' : ' disabled') + '>' + icon('send') + ' Submit for Approval</button>';
    }
    if (k === 'tamat') return finishHTML();
    return '';
  }

  // Baris kehadiran milik kelas guru ini sahaja
  function myAtt() { const ids = myClasses().map(c => c.id); return W.rep.pelajar.kelas.map((k, ci) => ({ k, ci })).filter(x => ids.includes(x.k.kelasId)); }
  function attStat(rows) { let e = 0, h = 0; rows.forEach(({ k }) => { e += k.enrolmen; h += k.hadir; }); return { enrolmen: e, hadir: h, pct: e ? h / e * 100 : 0 }; }
  function syncAtt(c) { const n = S.studentsIn(c.kelasId).length; c.enrolmen = n; c.hadir = n - c.tidakHadir.length; }

  function timelineHTML(r) {
    const p = r.pengesahan;
    const sent = r.status !== 'draf' && r.submittedAt;
    const items = [
      { cls: 'done', ic: 'edit', t: 'Report filled', s: 'by ' + esc(uname(r.filledBy)) },
      { cls: sent ? 'done' : 'wait', ic: 'send', t: sent ? 'Submitted for approval' : 'Not submitted', s: sent ? D.stamp(r.submittedAt) : 'Tick the declaration and submit' },
      p && p.status === 'disahkan' ? { cls: 'done', ic: 'shield', t: 'Approved', s: esc(uname(p.oleh)) + ' · ' + D.stamp(p.pada) }
        : p && p.status === 'dikembalikan' && r.status === 'dikembalikan' ? { cls: 'bad', ic: 'undo', t: 'Returned for correction', s: esc(uname(p.oleh)) + ' · ' + D.stamp(p.pada) }
          : { cls: sent ? 'wait' : '', ic: 'shield', t: 'Management approval', s: sent ? 'Awaiting review' : 'After the report is submitted' }
    ];
    return '<ul class="timeline">' + items.map(i => '<li class="' + i.cls + '"><span class="tl-dot">' + icon(i.ic) + '</span><div><b>' + i.t + '</b><small>' + i.s + '</small></div></li>').join('') + '</ul>';
  }

  function summaryHTML(r) {
    const p = S.pelajarStat(r), g = S.guruStat(r);
    const iss = Object.values(r.sekitar.items).filter(x => x.status === 'Needs Action').length;
    const it = (ic, l, v) => '<div class="sum"><span class="si">' + icon(ic) + '</span><div><small>' + l + '</small><b>' + v + '</b></div></div>';
    return '<div class="sum-grid">' +
      it('userCheck', 'Teachers present', g.hadir + ' / ' + g.jumlah) +
      it('grad', 'Students present', p.hadir + ' / ' + p.enrolmen + ' (' + pct(p.pct) + '%)') +
      it('health', 'Unwell', r.kesihatan.length + ' students') +
      it('leaf', 'Grounds issues', iss ? iss + ' need action' : 'All good') +
      it('badge', 'Visitors', r.pelawat.length + ' people') +
      it('alert', 'Discipline', r.disiplin.length + ' cases') +
      it('flag', 'Activities', r.aktiviti.length + ' activities') +
      it('shield', 'Status', S.STATUS[r.status].label) + '</div>';
  }

  function finishHTML() {
    const r = W.rep;
    const sent = r.status === 'dihantar';
    return (sent
      ? '<div class="finish"><div class="finish-ic' + (W.justSent ? ' pop' : '') + '">' + icon('check') + '</div><h2>Report submitted!</h2><p>Thank you, ' + esc(me.nama) + '. The report for ' + D.long(r.date) + ' is now awaiting management approval.</p></div>'
      : '<div class="callout warn">' + icon('alert') + '<div><b>Report not submitted yet</b><p>Check the summary below, then go back to step 8 to make the declaration and submit the report.</p></div></div>') +
      summaryHTML(r) +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">' +
      (sent ? '<a class="btn btn-primary" href="#/laporan/lihat/' + r.date + '">' + icon('eye') + ' View full report</a><a class="btn btn-outline" href="#/dashboard">' + icon('home') + ' Go to home</a>'
        : '<button type="button" class="btn btn-primary" data-step="7">' + icon('shield') + ' Go to approval step</button>') + '</div>';
  }

  function wizard(date, step) {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return go('#/dashboard');
    if (!S.canEdit(me, date)) {
      if (S.report(date)) return location.replace('#/laporan/lihat/' + date);
      toast(isAdmin() ? 'Administrators do not fill reports.' : 'You are not on duty on this date.', 'bad');
      return go('#/dashboard');
    }
    const existing = S.report(date);
    const rep0 = existing ? clone(existing) : S.newReport(date, me.id);
    S.ensureClasses(rep0, me);
    rep0.pelajar.kelas.forEach(c => { if (!c.tidakHadir) c.tidakHadir = []; });
    const resumed = step === null && existing && existing.lastStep > 0;
    if (step === null) step = existing && existing.lastStep != null ? existing.lastStep : 0;
    W = { rep: rep0, step: Math.min(7, Math.max(0, step)), max: 0, locked: false, timer: null };
    if (!existing) W.rep.filledBy = me.id;
    W.max = W.step;
    W.rep.lastStep = W.step;
    if (existing) S.setResume(me.id, date, W.step);
    setTitle(D.dayName(date) + ' Report');
    const ro = S.rosterForDate(date);
    view.innerHTML = '<div><a class="back-link" href="#/dashboard">' + icon('left') + ' Back</a>' +
      '<div class="wiz-head"><div><h1>Duty Teacher Report</h1><p class="muted">' + D.long(date) + (ro ? ' · Week of ' + D.weekRange(ro.weekStart) : '') + '</p></div>' +
      '<div style="display:flex;gap:10px;align-items:center"><span id="wzStatus">' + chip(W.rep.status) + '</span><span class="save-state" id="saveState"><span class="dot"></span><span>' + (existing ? 'Saved ' + D.stamp(existing.updatedAt).split(', ')[1] : 'Not saved yet') + '</span></span></div></div>' +
      (existing && (resumed || W.step > 0) ? '<div class="callout info" style="margin-bottom:14px">' + icon('save') + '<div><b>Resumed from Step ' + (W.step + 1) + '</b><p>What you filled in earlier has been restored.</p></div></div>' : '') +
      '<div class="wizard"><aside class="card"><div class="wiz-progress"><div class="tiny muted" style="padding:12px 12px 0;font-weight:700">Progress</div><div class="progress"><span id="wzProg"></span></div></div><ol class="stepper" id="stepper"></ol></aside>' +
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
    $('#panel').innerHTML = '<div class="step-title"><span class="sic">' + icon(s.icon) + '</span><div><small>Step ' + (i + 1) + ' / 9</small><h2>' + esc(s.title) + '</h2><p>' + esc(s.desc) + '</p></div></div>' +
      '<div class="step-body ' + (dir === 'back' ? 'back' : dir === 'still' ? 'still' : '') + '">' + stepBody(i) + '</div>' +
      (last ? '' : '<div class="step-foot"><button type="button" class="btn btn-outline" data-prev' + (i === 0 ? ' disabled' : '') + '>' + icon('left') + ' <span class="hide-m">Back</span></button><div class="right"><button type="button" class="btn btn-outline" data-save title="Save progress">' + icon('save') + ' <span class="hide-m">Save progress</span><span class="show-m">Save</span></button>' +
        (i < 7 ? '<button type="button" class="btn btn-primary" data-next>Next ' + icon('right') + '</button>' : '<button type="button" class="btn btn-outline" data-next>Summary ' + icon('right') + '</button>') + '</div></div>');
  }

  function gotoStep(n) {
    if (W.locked) return;
    n = Math.max(0, Math.min(8, n));
    const dir = n < W.step ? 'back' : 'fwd';
    W.step = n; W.max = Math.max(W.max, n);
    if (n <= 7) { W.rep.lastStep = n; W.timer = W.timer || 1; }
    flush();
    paintStepper(); paintPanel(dir);
    const top = $('.wiz-head'); if (top) top.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function markDirty() {
    const ss = $('#saveState'); if (ss) { ss.classList.add('saving'); ss.lastChild.textContent = 'Saving…'; }
    clearTimeout(W.timer);
    W.timer = setTimeout(flush, 400);
  }
  function flush() {
    if (!W || !W.timer || W.locked) return;
    clearTimeout(W.timer); W.timer = null;
    S.saveReport(clone(W.rep));
    S.setResume(me.id, W.rep.date, W.rep.lastStep || 0);
    const ss = $('#saveState'); if (ss) { ss.classList.remove('saving'); ss.lastChild.textContent = 'Saved ' + nowTime(); }
  }

  function wizInput(e) {
    const t = e.target;
    if (e.type === 'change' && t.type !== 'radio' && t.type !== 'checkbox' && t.tagName !== 'SELECT') return;
    if (t.dataset.path) {
      let v = t.type === 'checkbox' ? t.checked : t.type === 'number' ? (t.value === '' ? '' : Math.max(0, Number(t.value))) : t.value;
      if (t.type === 'radio' && !t.checked) return;
      setPath(W.rep, t.dataset.path, v);
      if (t.dataset.path.startsWith('pelajar.kelas')) { const a = t.closest('.att'); if (a) a.classList.toggle('ok', !!v); }
      if (t.dataset.path === 'guru.jumlah') updGuru();
      if (t.dataset.path === 'akuan') { const b = $('[data-submit]'); if (b) b.disabled = !v; }
      if (t.type === 'radio') { const a = t.closest('.aspek'); if (a) a.classList.toggle('flag', v === 'Needs Action'); }
    } else if (t.dataset.list) {
      const row = getPath(W.rep, t.dataset.list)[+t.dataset.i], f = t.dataset.f;
      row[f] = t.value;
      t.classList.remove('invalid');
      if (f === 'kelas' && 'pelajarId' in row) {
        row.nama = ''; row.pelajarId = '';
        const c = S.classByName(t.value); row.kelasId = c ? c.id : '';
        markDirty(); paintPanel('still');
        const sel = $('[data-list="' + t.dataset.list + '"][data-i="' + t.dataset.i + '"][data-f="nama"]'); if (sel && !sel.disabled) sel.focus();
        return;
      }
      if (f === 'nama' && 'pelajarId' in row) { const c = S.classByName(row.kelas); const st = c && S.studentsIn(c.id).find(x => x.nama === t.value); row.pelajarId = st ? st.id : ''; }
    } else return;
    markDirty();
    if (e.type === 'change') paintStepperCounts();
  }
  function paintStepperCounts() { $$('#stepper li').forEach((li, i) => { const c = stepCount(i), b = li.querySelector('button'); let el = b.querySelector('.cnt'); if (c === '') { if (el) el.remove(); return; } if (!el) { el = document.createElement('span'); el.className = 'cnt'; b.appendChild(el); } el.textContent = c; }); }
  function updGuru() { const g = S.guruStat(W.rep); if ($('#gH')) { $('#gH').textContent = g.hadir; $('#gT').textContent = g.tidakHadir; $('#gP').textContent = pct(g.pct) + '%'; } }

  function wizClick(e) {
    const b = e.target.closest('button, [data-step]');
    if (!b || b.disabled) return;
    if (b.dataset.step !== undefined) return gotoStep(+b.dataset.step);
    if (b.hasAttribute('data-next')) return gotoStep(W.step + 1);
    if (b.hasAttribute('data-prev')) return gotoStep(W.step - 1);
    if (b.hasAttribute('data-save')) { W.timer = W.timer || 1; flush(); toast('Progress saved · Step ' + (W.step + 1) + '/9. You can continue any time.'); return; }
    if (b.dataset.stu) {
      const c = W.rep.pelajar.kelas[+b.dataset.ci], st = S.db.students.find(x => x.id === b.dataset.stu);
      const i = c.tidakHadir.findIndex(x => x.id === st.id);
      if (i >= 0) c.tidakHadir.splice(i, 1); else c.tidakHadir.push({ id: st.id, nama: st.nama });
      syncAtt(c); markDirty(); paintPanel('still'); paintStepperCounts(); return;
    }
    if (b.dataset.allin !== undefined) {
      const c = W.rep.pelajar.kelas[+b.dataset.allin];
      c.tidakHadir = []; c.disemak = true; syncAtt(c);
      markDirty(); paintPanel('still'); paintStepperCounts(); toast('All students in ' + c.nama + ' present'); return;
    }
    if (b.dataset.add) {
      const list = b.dataset.add;
      getPath(W.rep, list).push(ROWDEF[list].blank());
      markDirty(); paintPanel('still'); paintStepperCounts();
      const cards = $$('.row-card'); const lastCard = cards[cards.length - 1];
      if (lastCard) { lastCard.scrollIntoView({ behavior: 'smooth', block: 'center' }); const inp = lastCard.querySelector('input, select'); if (inp) inp.focus({ preventScroll: true }); }
      return;
    }
    if (b.dataset.del) { getPath(W.rep, b.dataset.del).splice(+b.dataset.i, 1); markDirty(); paintPanel('still'); paintStepperCounts(); return; }
    if (b.hasAttribute('data-submit')) return submitReport();
  }

  function submitReport() {
    const r = W.rep;
    // buang baris kosong
    Object.keys(ROWDEF).forEach(list => { const arr = getPath(r, list); const keep = arr.filter(row => Object.entries(row).some(([k, v]) => v && !['sebab', 'tindakan', 'kesalahan', 'masa', 'masuk', 'kelas', 'kelasId', 'pelajarId'].includes(k))); arr.splice(0, arr.length, ...keep); });
    const errs = [];
    if (!(Number(r.guru.jumlah) > 0)) errs.push([0, 'Total teaching staff is required.']);
    if (myAtt().some(x => !x.k.disemak)) errs.push([1, 'Tick “Attendance checked” for each of your classes.']);
    const reqMiss = Object.keys(ROWDEF).find(list => getPath(r, list).some(row => ROWDEF[list].fields.some(fd => fd.req && !String(row[fd.f] || '').trim())));
    if (reqMiss) errs.push([S.STEPS.findIndex(s => s.key === reqMiss.split('.')[0]), 'Some required fields (*) are still empty.']);
    if (!r.akuan) errs.push([7, 'Please tick the declaration first.']);
    if (errs.length) {
      toast(errs[0][1], 'bad');
      gotoStep(errs[0][0]);
      $$('[data-list]').forEach(inp => { const fd = ROWDEF[inp.dataset.list].fields.find(f => f.f === inp.dataset.f); if (fd && fd.req && !inp.value.trim()) inp.classList.add('invalid'); });
      return;
    }
    r.status = 'dihantar';
    r.submittedAt = new Date().toISOString();
    if (!r.filledBy) r.filledBy = me.id;
    clearTimeout(W.timer); W.timer = null;
    S.saveReport(clone(r));
    S.clearResume(me.id);
    W.step = 8; W.max = 8; W.locked = true; W.justSent = true;
    $('#wzStatus').innerHTML = chip('dihantar');
    const ss = $('#saveState'); if (ss) ss.lastChild.textContent = 'Submitted ' + nowTime();
    paintStepper(); paintPanel('fwd');
    renderShell(); setActive('isi');
    confetti();
    toast('Report submitted for approval');
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
    setTitle('Report ' + (date ? D.short(date) : ''));
    if (!r) {
      if (S.canEdit(me, date)) return location.replace('#/laporan/isi/' + date);
      view.innerHTML = '<div><a class="back-link" href="#/laporan">' + icon('left') + ' Back</a><section class="card">' + emptyHTML('file', 'Report not found', 'There is no report for this date.') + '</section></div>';
      return;
    }
    if (!isAdmin() && !myRosterIds().includes(r.rosterId) && r.filledBy !== me.id) {
      view.innerHTML = '<div><a class="back-link" href="#/laporan">' + icon('left') + ' Back</a><section class="card">' + emptyHTML('lock', 'No access', "This report belongs to another teacher's duty week.") + '</section></div>';
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

    view.innerHTML = '<div><a class="back-link no-print" href="#/laporan">' + icon('left') + ' Report list</a>' +
      '<div class="print-only" style="text-align:center;margin-bottom:12px"><b style="font-size:14pt">' + esc(S.db.settings.namaSekolah) + ' (' + esc(S.db.settings.kodSekolah) + ')</b><div>DAILY DUTY TEACHER REPORT</div></div>' +
      '<div class="page-head"><div><h1>' + D.long(date) + '</h1><p>Duty Teacher Report · ' + (ro ? 'Week of ' + D.weekRange(ro.weekStart) : '') + '</p></div><div class="page-actions no-print">' + chip(r.status) +
      (canEdit ? '<a class="btn btn-primary btn-sm" href="#/laporan/isi/' + date + '">' + icon('edit') + ' ' + (r.status === 'dikembalikan' ? 'Make corrections' : 'Continue filling') + '</a>' : '') +
      '<button class="btn btn-outline btn-sm" data-print>' + icon('printer') + ' Print</button></div></div>' +
      '<div class="stack">' +
      (isAdmin() && r.status === 'dihantar' ? '<div class="callout warn no-print">' + icon('clock') + '<div><b>This report is awaiting your approval</b><p>Review each section, then approve or return it in section 8.</p></div><a class="btn btn-primary btn-sm" href="#verify" style="margin-left:auto" data-jump>Go to approval</a></div>' : '') +
      '<section class="card card-pad"><div class="report-meta">' +
      '<div class="meta"><small>Date</small><b>' + D.long(date) + '</b></div>' +
      '<div class="meta"><small>Duty teachers</small><b>' + (ro ? ro.teacherIds.map(id => esc(uname(id)) + (id === ro.ketua ? ' (Lead)' : '')).join('<br>') : '-') + '</b></div>' +
      '<div class="meta"><small>Filled by</small><b>' + esc(uname(r.filledBy)) + '</b></div>' +
      '<div class="meta"><small>Submitted</small><b>' + D.stamp(r.submittedAt) + '</b></div></div></section>' +
      '<div class="grid g-2">' +
      sec(1, 'Teacher Attendance', 'userCheck', '<div class="kv"><div class="mini"><small>Total</small><b>' + g.jumlah + '</b></div><div class="mini"><small>Present</small><b class="ok">' + g.hadir + '</b></div><div class="mini"><small>Absent</small><b class="bad">' + g.tidakHadir + '</b></div></div>' +
        table([['Teacher name', 'nama'], ['Reason', 'sebab']], r.guru.tidakHadir, 'All teachers present.') + note(r.guru.catatan)) +
      sec(2, 'Student Attendance', 'grad', '<div class="kv"><div class="mini"><small>Enrolment</small><b>' + p.enrolmen + '</b></div><div class="mini"><small>Present</small><b class="ok">' + p.hadir + '</b></div><div class="mini"><small>Percentage</small><b>' + pct(p.pct) + '%</b></div></div>' +
        '<div class="table-wrap"><table class="t stack-m"><thead><tr><th>Class</th><th class="r">Enrolment</th><th class="r">Present</th><th class="r">Absent</th><th class="r">%</th><th>Absent students</th></tr></thead><tbody>' +
        r.pelajar.kelas.map(k => '<tr><td class="t-main"><b>' + esc(k.nama) + '</b></td><td class="r num" data-label="Enrolment">' + k.enrolmen + '</td><td class="r num" data-label="Present">' + (k.hadir === '' ? '-' : k.hadir) + '</td><td class="r num" data-label="Absent">' + (k.hadir === '' ? '-' : k.enrolmen - k.hadir) + '</td><td class="r num" data-label="%">' + (k.hadir === '' ? '-' : pct(k.hadir / k.enrolmen * 100)) + '</td><td data-label="Absent students">' + ((k.tidakHadir || []).map(x => esc(x.nama)).join(', ') || '-') + '</td></tr>').join('') +
        '</tbody><tfoot><tr><td>Total</td><td class="r num">' + p.enrolmen + '</td><td class="r num">' + p.hadir + '</td><td class="r num">' + (p.enrolmen - p.hadir) + '</td><td class="r num">' + pct(p.pct) + '</td><td></td></tr></tfoot></table></div>' + note(r.pelajar.catatan)) +
      '</div>' +
      sec(3, 'Sick Students & Clinic', 'health', table([['Student name', 'nama'], ['Class', 'kelas'], ['Symptom', 'simptom'], ['Action taken', 'tindakan'], ['Time', 'masa']], r.kesihatan, 'No sick students reported.')) +
      sec(4, 'School Grounds & Facilities', 'leaf', '<div class="table-wrap"><table class="t stack-m"><thead><tr><th>Area</th><th>Status</th><th>Notes</th></tr></thead><tbody>' +
        S.ASPEK.map(a => { const it = r.sekitar.items[a.key] || { status: '-', catatan: '' }; const tone = it.status === 'Good' ? 'ok' : it.status === 'Fair' ? 'warn' : 'bad'; return '<tr><td class="t-main"><b>' + esc(a.label) + '</b></td><td data-label="Status"><span class="tag ' + tone + '">' + esc(it.status) + '</span></td><td data-label="Notes">' + esc(it.catatan || '-') + '</td></tr>'; }).join('') +
        '</tbody></table></div>' + note(r.sekitar.catatan)) +
      sec(5, 'Visitors', 'badge', table([['Name', 'nama'], ['Organisation', 'organisasi'], ['Purpose', 'tujuan'], ['In', 'masuk'], ['Out', 'keluar']], r.pelawat, 'No visitors recorded.')) +
      sec(6, 'Discipline Report', 'alert', table([['Student name', 'nama'], ['Class', 'kelas'], ['Offence', 'kesalahan'], ['Time', 'masa'], ['Action taken', 'tindakan']], r.disiplin, 'No discipline cases.')) +
      sec(7, 'Daily Activities', 'flag', table([['Activity', 'tajuk'], ['Time', 'masa'], ['Location / notes', 'catatan']], r.aktiviti, 'No activities recorded.')) +
      sec(8, 'Management Approval', 'shield', '<div class="grid g-2" id="verify"><div>' + timelineHTML(r) +
        (pg && pg.ulasan ? '<div class="note-box" style="margin-top:14px"><b>Comment from ' + esc(uname(pg.oleh)) + ':</b> ' + esc(pg.ulasan) + '</div>' : '') + '</div><div>' +
        (isAdmin() && r.status === 'dihantar'
          ? '<div class="verify-box"><h3>' + icon('shield') + ' Your approval</h3><label class="field"><span>Comment <small>(required if returning)</small></span><textarea id="vNote" placeholder="e.g. Complete report. Thank you."></textarea></label><div class="verify-actions"><button class="btn btn-ok" data-verify="disahkan">' + icon('check') + ' Approve report</button><button class="btn btn-danger" data-verify="dikembalikan">' + icon('undo') + ' Return</button></div></div>'
          : r.status === 'dikembalikan' ? '<div class="callout bad">' + icon('undo') + '<div><b>Awaiting correction</b><p>The report has been returned to the duty teacher.</p></div></div>'
            : r.status === 'disahkan' ? '<div class="callout ok">' + icon('shield') + '<div><b>Report approved</b><p>' + esc(uname(pg.oleh)) + ' · ' + D.stamp(pg.pada) + '</p></div></div>'
              : r.status === 'draf' ? '<div class="callout warn">' + icon('edit') + '<div><b>Still a draft</b><p>The duty teacher has not submitted this report yet.</p></div></div>'
                : '<div class="callout warn">' + icon('clock') + '<div><b>Pending approval</b><p>The report is being reviewed by management.</p></div></div>') +
        '</div></div>') +
      sec(9, 'Done', 'done', summaryHTML(r) +
        '<div class="grid g-2" style="margin-top:28px"><div><div class="tiny muted">Prepared by</div><div style="border-bottom:1px dashed var(--line);height:44px"></div><b>' + esc(uname(r.filledBy)) + '</b><div class="tiny muted">Duty Teacher</div></div>' +
        '<div><div class="tiny muted">Approved by</div><div style="border-bottom:1px dashed var(--line);height:44px"></div><b>' + (pg && pg.status === 'disahkan' ? esc(uname(pg.oleh)) : '……………………………') + '</b><div class="tiny muted">' + (pg && pg.status === 'disahkan' ? esc((S.user(pg.oleh) || {}).jawatan || '') + ' · ' + D.stamp(pg.pada) : 'Management') + '</div></div></div>' +
        '<p class="tiny muted" style="text-align:center;margin-top:20px">— End of report —</p>') +
      '</div></div>';

    H.click = e => {
      if (e.target.closest('[data-print]')) return window.print();
      if (e.target.closest('[data-jump]')) { e.preventDefault(); $('#verify').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      const v = e.target.closest('[data-verify]');
      if (v) {
        const st = v.dataset.verify, ul = $('#vNote').value.trim();
        if (st === 'dikembalikan' && !ul) { $('#vNote').classList.add('invalid'); $('#vNote').focus(); toast('Please state why the report is being returned.', 'bad'); return; }
        const rep = clone(r);
        rep.status = st;
        rep.pengesahan = { status: st, oleh: me.id, pada: new Date().toISOString(), ulasan: ul };
        if (st === 'dikembalikan') rep.akuan = false;
        S.saveReport(rep);
        toast(st === 'disahkan' ? 'Report approved' : 'Report returned to teacher', st === 'disahkan' ? 'ok' : 'info');
        renderShell(); setActive('laporan');
        viewReport(date);
      }
    };
  }

  /* =========================================================
     JADUAL BERTUGAS
     ========================================================= */
  function jadual() {
    setTitle('Duty Roster');
    const mon = thisMonday();
    const rows = S.rosters();
    view.innerHTML = '<div class="page-head"><div><h1>Duty Teacher Roster</h1><p>Weekly duty teachers — a report is filled every school day (Monday–Friday).</p></div>' +
      (isAdmin() ? '<div class="page-actions"><button class="btn btn-primary" data-new>' + icon('plus') + ' Add week</button></div>' : '') + '</div>' +
      '<section class="card"><div class="list">' + (rows.map(r => {
        const done = D.weekDays(r.weekStart).map(d => S.report(d));
        const sent = done.filter(x => x && x.status !== 'draf').length;
        const isCur = r.weekStart === mon, mineFlag = r.teacherIds.includes(me.id);
        return '<div class="list-item" style="flex-wrap:wrap">' + dateBox(r.weekStart) +
          '<div class="grow" style="min-width:200px"><b>' + D.weekRange(r.weekStart) + ' ' + (isCur ? '<span class="tag brand">This week</span>' : r.weekStart > mon ? '<span class="tag">Upcoming</span>' : '') + (mineFlag && !isAdmin() ? ' <span class="tag warn">Your turn</span>' : '') + '</b>' +
          '<small>' + (r.teacherIds.map(id => esc(uname(id)) + (id === r.ketua ? ' (Lead)' : '')).join(' · ') || 'Not assigned') + '</small></div>' +
          '<div style="display:flex;align-items:center;gap:10px"><span class="tiny muted" title="Reports submitted">' + sent + '/5</span><span style="display:flex;gap:3px">' + done.map(x => '<i title="' + (x ? S.STATUS[x.status].label : 'Not filled') + '" style="width:10px;height:10px;border-radius:3px;background:' + (!x ? 'var(--line)' : x.status === 'disahkan' ? 'var(--ok)' : x.status === 'dihantar' ? 'var(--accent)' : x.status === 'dikembalikan' ? 'var(--bad)' : 'var(--muted)') + '"></i>').join('') + '</span>' +
          (isAdmin() ? '<button class="btn btn-ghost btn-icon btn-sm" data-edit="' + r.id + '" aria-label="Edit">' + icon('edit') + '</button><button class="btn btn-ghost btn-icon btn-sm" data-delr="' + r.id + '" aria-label="Delete">' + icon('trash') + '</button>' : '') + '</div></div>';
      }).join('') || emptyHTML('calendar', 'No roster', 'Add the first duty week.')) + '</div></section>' +
      '<p class="tiny muted" style="margin-top:10px;display:flex;gap:14px;flex-wrap:wrap"><span>■ <span style="color:var(--ok)">Approved</span></span><span>■ <span style="color:var(--accent)">Pending</span></span><span>■ <span style="color:var(--bad)">Correction</span></span><span>■ <span class="muted">Draft / not filled</span></span></p>';
    H.click = async e => {
      if (e.target.closest('[data-new]')) return rosterModal(null);
      const ed = e.target.closest('[data-edit]'); if (ed) return rosterModal(S.db.rosters.find(r => r.id === ed.dataset.edit));
      const dl = e.target.closest('[data-delr]');
      if (dl) {
        const r = S.db.rosters.find(x => x.id === dl.dataset.delr);
        if (await confirmBox('Delete roster?', 'The roster for the week of ' + D.weekRange(r.weekStart) + ' will be deleted. Existing reports are not affected.', 'Delete', true)) { S.deleteRoster(r.id); toast('Roster deleted'); jadual(); }
      }
    };
  }

  function rosterModal(r) {
    const t = S.teachers();
    const wk = r ? r.weekStart : D.toISO(D.addDays(D.mondayOf(new Date()), 7));
    const sel = r ? r.teacherIds : [];
    openModal(r ? 'Edit duty roster' : 'Add duty roster',
      '<form class="form" id="rForm"><label class="field"><span>Week starting (Monday)</span><input type="date" id="rWeek" value="' + wk + '" required><small class="muted" id="rRange">' + D.weekRange(wk) + '</small></label>' +
      '<div class="field"><span>Duty teachers</span><div class="pick-list">' + t.map(u => '<label class="pick"><input type="checkbox" value="' + u.id + '"' + (sel.includes(u.id) ? ' checked' : '') + '>' + avatar(u, 'sm') + '<span>' + esc(u.nama) + '<small>' + esc(u.jawatan) + '</small></span></label>').join('') + '</div></div>' +
      '<label class="field"><span>Lead duty teacher</span><select id="rKetua"></select></label><p class="form-error" id="rErr" hidden></p></form>',
      '<button class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" id="rSave">' + icon('save') + ' Save</button>', m => {
        const upd = () => {
          const ids = $$('.pick input:checked', m).map(i => i.value);
          const cur = $('#rKetua', m).value || (r && r.ketua);
          $('#rKetua', m).innerHTML = ids.length ? ids.map(id => '<option value="' + id + '"' + (id === cur ? ' selected' : '') + '>' + esc(uname(id)) + '</option>').join('') : '<option value="">— choose teachers first —</option>';
        };
        upd();
        m.addEventListener('change', e => {
          if (e.target.matches('.pick input')) upd();
          if (e.target.id === 'rWeek' && e.target.value) { const mon = D.toISO(D.mondayOf(D.parseISO(e.target.value))); e.target.value = mon; $('#rRange', m).textContent = D.weekRange(mon); }
        });
        $('#rSave', m).onclick = () => {
          const err = $('#rErr', m);
          const v = $('#rWeek', m).value;
          if (!v) { err.textContent = 'Choose a week date.'; err.hidden = false; return; }
          const mon = D.toISO(D.mondayOf(D.parseISO(v)));
          const ids = $$('.pick input:checked', m).map(i => i.value);
          if (!ids.length) { err.textContent = 'Choose at least one teacher.'; err.hidden = false; return; }
          const clash = S.db.rosters.find(x => x.weekStart === mon && (!r || x.id !== r.id));
          if (clash) { err.textContent = 'This week already has a roster. Please edit the existing one.'; err.hidden = false; return; }
          S.saveRoster({ id: r ? r.id : 'w_' + mon + '_' + Date.now().toString(36), weekStart: mon, teacherIds: ids, ketua: $('#rKetua', m).value || ids[0] });
          closeModal(); toast('Roster saved'); jadual();
        };
      });
  }

  /* =========================================================
     PENGGUNA (admin)
     ========================================================= */
  function pengguna() {
    setTitle('Users');
    const users = [...S.db.users].sort((a, b) => a.role.localeCompare(b.role) || a.nama.localeCompare(b.nama));
    view.innerHTML = '<div class="page-head"><div><h1>User Management</h1><p>' + users.filter(u => u.role === 'guru').length + ' teachers · ' + users.filter(u => u.role === 'admin').length + ' administrators</p></div><div class="page-actions"><button class="btn btn-primary" data-new>' + icon('plus') + ' Add user</button></div></div>' +
      '<section class="card"><div class="table-wrap"><table class="t stack-m"><thead><tr><th>Name</th><th>Position</th><th>Role</th><th>Classes</th><th class="r">Duty turns</th><th></th></tr></thead><tbody>' +
      users.map(u => '<tr><td class="t-main"><div style="display:flex;gap:10px;align-items:center">' + avatar(u) + '<div style="min-width:0"><b>' + esc(u.nama) + '</b><div class="tiny muted">' + esc(u.email) + '</div></div></div></td>' +
        '<td data-label="Position">' + esc(u.jawatan) + '</td><td data-label="Role"><span class="role-tag ' + u.role + '">' + (u.role === 'admin' ? 'Admin' : 'Teacher') + '</span></td>' +
        '<td data-label="Classes">' + (u.role === 'guru' ? '<span class="chip-list">' + (S.classesOf(u).map(c => '<span class="tag brand">' + esc(c.nama) + '</span>').join('') || '<span class="tag bad">Not assigned</span>') + '</span>' : '<span class="muted">All</span>') + '</td><td data-label="Duty turns" class="r num">' + S.rostersForUser(u.id).length + '</td>' +
        '<td class="r" data-label=""><button class="btn btn-ghost btn-icon btn-sm" data-edit="' + u.id + '" aria-label="Edit">' + icon('edit') + '</button>' + (u.id !== me.id ? '<button class="btn btn-ghost btn-icon btn-sm" data-delu="' + u.id + '" aria-label="Delete">' + icon('trash') + '</button>' : '') + '</td></tr>').join('') +
      '</tbody></table></div></section>';
    H.click = async e => {
      if (e.target.closest('[data-new]')) return userModal(null);
      const ed = e.target.closest('[data-edit]'); if (ed) return userModal(S.user(ed.dataset.edit));
      const dl = e.target.closest('[data-delu]');
      if (dl) {
        const u = S.user(dl.dataset.delu);
        if (await confirmBox('Delete user?', esc(u.nama) + ' will be deleted and removed from all duty rosters.', 'Delete', true)) { S.deleteUser(u.id); toast('User deleted'); pengguna(); }
      }
    };
  }

  function userModal(u) {
    const v = u || { nama: '', email: '', jawatan: '', telefon: '', role: 'guru', kelasIds: [] };
    openModal(u ? 'Edit user' : 'Add user',
      '<form class="form" id="uForm"><label class="field"><span>Full name *</span><input id="uNama" value="' + esc(v.nama) + '" placeholder="e.g. Mr. Ahmad bin Ali"></label>' +
      '<div class="form-row"><label class="field"><span>Email *</span><input type="email" id="uEmail" value="' + esc(v.email) + '"></label><label class="field"><span>Phone</span><input id="uTel" value="' + esc(v.telefon) + '"></label></div>' +
      '<div class="form-row"><label class="field"><span>Position</span><input id="uJaw" value="' + esc(v.jawatan) + '" placeholder="e.g. Mathematics Teacher"></label><label class="field"><span>Role</span><select id="uRole"><option value="guru"' + (v.role === 'guru' ? ' selected' : '') + '>Teacher</option><option value="admin"' + (v.role === 'admin' ? ' selected' : '') + '>Admin</option></select></label></div>' +
      '<div class="field" id="uKelasBox"' + (v.role === 'admin' ? ' hidden' : '') + '><span>Classes * <small>(choose 2–3 classes)</small></span><div class="pick-list" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">' +
      S.db.classes.map(c => '<label class="pick"><input type="checkbox" value="' + c.id + '"' + ((v.kelasIds || []).includes(c.id) ? ' checked' : '') + '><span>' + esc(c.nama) + '<small>' + S.studentsIn(c.id).length + ' students</small></span></label>').join('') + '</div></div>' +
      '<label class="field"><span>Password ' + (u ? '<small>(leave empty to keep unchanged)</small>' : '*') + '</span><input type="text" id="uPw" placeholder="' + (u ? '••••••' : 'e.g. guru123') + '"></label><p class="form-error" id="uErr" hidden></p></form>',
      '<button class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" id="uSave">' + icon('save') + ' Save</button>', m => {
        $('#uRole', m).onchange = e => { $('#uKelasBox', m).hidden = e.target.value === 'admin'; };
        const lim = () => { const on = $$('#uKelasBox input:checked', m).length; $$('#uKelasBox input', m).forEach(i => { i.disabled = !i.checked && on >= 3; }); };
        m.addEventListener('change', e => { if (e.target.closest('#uKelasBox')) lim(); });
        lim();
        $('#uSave', m).onclick = () => {
          const err = $('#uErr', m), val = id => $(id, m).value.trim();
          const email = val('#uEmail').toLowerCase();
          const fail = msg => { err.textContent = msg; err.hidden = false; };
          if (!val('#uNama')) return fail('Name is required.');
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail('Invalid email.');
          if (S.db.users.some(x => x.email.toLowerCase() === email && (!u || x.id !== u.id))) return fail('Email is already in use.');
          if (!u && !val('#uPw')) return fail('Password is required.');
          if (u && u.id === me.id && val('#uRole') !== 'admin') return fail('You cannot change the role of your own account.');
          const kelasIds = val('#uRole') === 'guru' ? $$('#uKelasBox input:checked', m).map(i => i.value) : [];
          const minK = Math.min(2, S.db.classes.length);
          if (val('#uRole') === 'guru' && (kelasIds.length < minK || kelasIds.length > 3)) return fail('Each teacher must have 2–3 classes.');
          S.saveUser({ ...(u || { id: S.uid('u') }), kelasIds, nama: val('#uNama'), email, telefon: val('#uTel'), jawatan: val('#uJaw') || (val('#uRole') === 'admin' ? 'Administrator' : 'Teacher'), role: val('#uRole'), password: val('#uPw') || (u && u.password) });
          closeModal(); toast('User saved'); renderShell(); pengguna();
        };
      });
  }

  /* =========================================================
     KELAS & PELAJAR (admin sahaja boleh tambah / buang pelajar)
     ========================================================= */
  function kelasPage() {
    setTitle('Classes & Students');
    const cls = S.db.classes;
    view.innerHTML = '<div class="page-head"><div><h1>Classes & Students</h1><p>' + cls.length + ' classes · ' + S.db.students.length + ' students. Only administrators can add or remove students.</p></div><div class="page-actions"><button class="btn btn-primary" data-newk>' + icon('plus') + ' Add class</button></div></div>' +
      '<div class="grid g-2">' + cls.map(c => {
        const st = S.studentsIn(c.id), gt = S.teachersOfClass(c.id);
        return '<section class="card cls-card"><div class="card-head"><div><h2>' + icon('grad') + esc(c.nama) + ' <span class="tag">' + st.length + ' students</span></h2>' +
          '<div class="chip-list" style="margin-top:8px">' + (gt.map(u => '<span class="tag brand">' + esc(u.nama.replace(/^(Mrs|Mr|Ms|Dr)\.\s+/, '')) + '</span>').join('') || '<span class="tag warn">No teachers</span>') + '</div></div>' +
          '<div style="display:flex;gap:4px"><button class="btn btn-ghost btn-icon btn-sm" data-editk="' + c.id + '" aria-label="Rename">' + icon('edit') + '</button><button class="btn btn-ghost btn-icon btn-sm" data-delk="' + c.id + '" aria-label="Delete class">' + icon('trash') + '</button></div></div>' +
          '<div>' + (st.map((x, i) => '<div class="stu-row"><span class="n">' + (i + 1) + '.</span><span class="grow">' + esc(x.nama) + '</span><button class="btn btn-ghost btn-icon btn-sm" data-dels="' + x.id + '" aria-label="Remove ' + esc(x.nama) + '">' + icon('trash') + '</button></div>').join('') || '<div class="empty" style="padding:20px">No students yet.</div>') + '</div>' +
          '<form class="add-stu" data-adds="' + c.id + '"><input name="nama" placeholder="New student name" aria-label="New student name for ' + esc(c.nama) + '"><button class="btn btn-primary" type="submit">' + icon('plus') + ' Add</button></form></section>';
      }).join('') + '</div>' +
      '<p class="tiny muted" style="margin-top:12px">Teachers for each class are assigned on the <a href="#/pengguna" style="text-decoration:underline">Users</a> page.</p>';
    H.submit = e => {
      const f = e.target.closest('[data-adds]'); if (!f) return;
      e.preventDefault();
      const nama = f.nama.value.trim(), kid = f.dataset.adds;
      if (!nama) { f.nama.classList.add('invalid'); f.nama.focus(); return toast('Enter a student name.', 'bad'); }
      if (S.studentsIn(kid).some(x => x.nama.toLowerCase() === nama.toLowerCase())) return toast('This student is already in the class.', 'bad');
      S.saveStudent({ id: S.uid('s'), nama, kelasId: kid });
      toast(nama + ' added'); kelasPage();
      const inp = $('[data-adds="' + kid + '"] input'); if (inp) inp.focus();
    };
    H.click = async e => {
      const ds = e.target.closest('[data-dels]');
      if (ds) {
        const x = S.db.students.find(y => y.id === ds.dataset.dels);
        if (await confirmBox('Remove student?', esc(x.nama) + ' will be removed from the class list. Past reports are not affected.', 'Remove', true)) { S.deleteStudent(x.id); toast('Student removed'); kelasPage(); }
        return;
      }
      if (e.target.closest('[data-newk]')) return classModal(null);
      const ek = e.target.closest('[data-editk]'); if (ek) return classModal(cls.find(c => c.id === ek.dataset.editk));
      const dk = e.target.closest('[data-delk]');
      if (dk) {
        const c = cls.find(x => x.id === dk.dataset.delk);
        if (await confirmBox('Delete class ' + esc(c.nama) + '?', 'The class and its ' + S.studentsIn(c.id).length + ' students will be deleted and removed from their teachers.', 'Delete', true)) { S.deleteClass(c.id); toast('Class deleted'); kelasPage(); }
      }
    };
  }
  function classModal(c) {
    openModal(c ? 'Rename class' : 'Add class', '<form class="form" id="kForm"><label class="field"><span>Class name *</span><input id="kNama" value="' + esc(c ? c.nama : '') + '" placeholder="e.g. Year 11 Arts"></label><p class="form-error" id="kErr" hidden></p></form>',
      '<button class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" id="kSave">' + icon('save') + ' Save</button>', m => {
        const save = () => {
          const nama = $('#kNama', m).value.trim(), err = $('#kErr', m);
          if (!nama) { err.textContent = 'Class name is required.'; err.hidden = false; return; }
          if (S.db.classes.some(x => x.nama.toLowerCase() === nama.toLowerCase() && (!c || x.id !== c.id))) { err.textContent = 'This class name already exists.'; err.hidden = false; return; }
          S.saveClass({ ...(c || { id: S.uid('k') }), nama });
          closeModal(); toast('Class saved'); kelasPage();
        };
        $('#kSave', m).onclick = save;
        $('#kForm', m).onsubmit = e => { e.preventDefault(); save(); };
      });
  }

  /* =========================================================
     TETAPAN (admin)
     ========================================================= */
  function tetapan() {
    setTitle('Settings');
    const st = S.db.settings;
    view.innerHTML = '<div class="page-head"><div><h1>School Settings</h1><p>School details and demo data.</p></div></div>' +
      '<div class="grid g-2"><section class="card"><div class="card-head"><h2>' + icon('school') + ' School details</h2></div><div class="card-body"><form class="form" id="sForm">' +
      '<label class="field"><span>School name</span><input id="sNama" value="' + esc(st.namaSekolah) + '"></label>' +
      '<div class="form-row"><label class="field"><span>School code</span><input id="sKod" value="' + esc(st.kodSekolah) + '"></label><label class="field"><span>Total teaching staff</span><input type="number" min="1" id="sGuru" value="' + st.jumlahGuru + '"></label></div>' +
      '<label class="field"><span>City / state</span><input id="sDaerah" value="' + esc(st.daerah) + '"></label>' +
      '<div><button class="btn btn-primary" type="submit">' + icon('save') + ' Save details</button></div></form></div></section>' +
      '<section class="card"><div class="card-head"><h2>' + icon('grad') + ' Classes & students</h2></div><div class="card-body" style="display:grid;gap:12px"><p class="muted">' + S.db.classes.length + ' classes · ' + S.db.students.length + ' students. Manage each class list and its teachers.</p><div><a class="btn btn-primary" href="#/kelas">' + icon('grad') + ' Open Classes & Students</a></div></div></section></div>' +
      '<section class="card" style="margin-top:18px"><div class="card-head"><h2>' + icon('undo') + ' Demo data</h2></div><div class="card-body" style="display:flex;justify-content:space-between;gap:14px;align-items:center;flex-wrap:wrap"><p class="muted" style="max-width:560px">Reset all data (users, rosters, reports) to the original sample data. This cannot be undone.</p><button class="btn btn-danger" data-reset>' + icon('undo') + ' Reset demo data</button></div></section>';
    H.submit = e => {
      if (e.target.id !== 'sForm') return;
      e.preventDefault();
      Object.assign(S.db.settings, { namaSekolah: $('#sNama').value.trim() || st.namaSekolah, kodSekolah: $('#sKod').value.trim(), jumlahGuru: Math.max(1, +$('#sGuru').value || 1), daerah: $('#sDaerah').value.trim() });
      S.save(); renderShell(); setActive('tetapan'); toast('School details saved');
    };
    H.click = async e => {
      if (e.target.closest('[data-reset]')) {
        if (await confirmBox('Reset demo data?', 'All changes will be lost and the original sample data restored.', 'Reset', true)) {
          S.reset();
          if (!S.user(me.id)) { S.logout(); location.replace('login.html'); return; }
          toast('Demo data restored'); renderShell(); go('#/dashboard');
        }
      }
    };
  }

  /* =========================================================
     PROFIL
     ========================================================= */
  function profil() {
    setTitle('Profile');
    const mine = S.rostersForUser(me.id);
    view.innerHTML = '<div class="page-head"><div><h1>My Profile</h1><p>Account details and security.</p></div></div>' +
      '<div class="grid g-2"><section class="card card-pad" style="display:grid;gap:16px;align-content:start"><div style="display:flex;gap:14px;align-items:center">' + avatar(me).replace('class="avatar', 'style="width:64px;height:64px;font-size:1.2rem;border-radius:18px" class="avatar') +
      '<div><h2 style="font-size:1.15rem;font-weight:800">' + esc(me.nama) + '</h2><p class="muted">' + esc(me.jawatan) + '</p><span class="role-tag ' + me.role + '">' + (isAdmin() ? 'Admin' : 'Teacher') + '</span></div></div>' +
      '<div class="report-meta"><div class="meta"><small>Email</small><b>' + esc(me.email) + '</b></div><div class="meta"><small>Phone</small><b>' + esc(me.telefon || '-') + '</b></div><div class="meta"><small>School</small><b>' + esc(S.db.settings.namaSekolah) + '</b></div><div class="meta"><small>Duty turns</small><b>' + mine.length + ' weeks</b></div></div>' +
      '<button class="btn btn-danger" data-logout2 style="justify-self:start">' + icon('logout') + ' Log out</button></section>' +
      '<section class="card"><div class="card-head"><h2>' + icon('lock') + ' Change password</h2></div><div class="card-body"><form class="form" id="pwForm">' +
      '<label class="field"><span>Current password</span><input type="password" id="pw0" autocomplete="current-password"></label>' +
      '<label class="field"><span>New password</span><input type="password" id="pw1" autocomplete="new-password"></label>' +
      '<label class="field"><span>Confirm new password</span><input type="password" id="pw2" autocomplete="new-password"></label>' +
      '<div><button class="btn btn-primary" type="submit">' + icon('save') + ' Update</button></div></form></div></section></div>';
    H.click = e => { if (e.target.closest('[data-logout2]')) logout(); };
    H.submit = e => {
      e.preventDefault();
      if ($('#pw0').value !== me.password) return toast('Current password is incorrect.', 'bad');
      if ($('#pw1').value.length < 6) return toast('New password must be at least 6 characters.', 'bad');
      if ($('#pw1').value !== $('#pw2').value) return toast('Password confirmation does not match.', 'bad');
      S.saveUser({ ...me, password: $('#pw1').value }); me = S.user(me.id); e.target.reset(); toast('Password updated');
    };
  }

  /* ---------- Mula ---------- */
  addEventListener('beforeunload', () => flush());
  addEventListener('pagehide', () => flush());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  renderShell();
  route();
})();
