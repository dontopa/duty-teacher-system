/* SIGAP — lapisan data (localStorage) + data contoh.
   Semua data demo dijana relatif kepada tarikh hari ini supaya sentiasa "segar". */
(function () {
  const KEY = 'sigap_db_v1';
  const SESSION_KEY = 'sigap_session';

  /* ---------- Utiliti tarikh ---------- */
  const HARI = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
  const BULAN = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
  const BULAN_PENUH = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];

  const pad = n => String(n).padStart(2, '0');
  const toISO = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const mondayOf = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const day = x.getDay(); return addDays(x, day === 0 ? -6 : 1 - day); };
  const todayISO = () => toISO(new Date());
  const weekDays = mondayISO => [0, 1, 2, 3, 4].map(i => toISO(addDays(parseISO(mondayISO), i)));

  const D = {
    HARI, BULAN, BULAN_PENUH, toISO, parseISO, addDays, mondayOf, todayISO, weekDays,
    dayName: s => HARI[parseISO(s).getDay()],
    short: s => { const d = parseISO(s); return d.getDate() + ' ' + BULAN[d.getMonth()]; },
    long: s => { const d = parseISO(s); return HARI[d.getDay()] + ', ' + d.getDate() + ' ' + BULAN_PENUH[d.getMonth()] + ' ' + d.getFullYear(); },
    medium: s => { const d = parseISO(s); return d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear(); },
    weekRange: mon => { const a = parseISO(mon), b = addDays(a, 4); return a.getDate() + (a.getMonth() !== b.getMonth() ? ' ' + BULAN[a.getMonth()] : '') + ' – ' + b.getDate() + ' ' + BULAN[b.getMonth()] + ' ' + b.getFullYear(); },
    stamp: iso => { if (!iso) return '-'; const d = new Date(iso); return d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear() + ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  };

  /* ---------- Konstan domain ---------- */
  const STEPS = [
    { key: 'guru', title: 'Kehadiran Guru', short: 'Guru', icon: 'userCheck', desc: 'Rekod guru yang tidak hadir dan sebabnya.' },
    { key: 'pelajar', title: 'Kehadiran Pelajar', short: 'Pelajar', icon: 'grad', desc: 'Isi bilangan pelajar hadir mengikut kelas.' },
    { key: 'kesihatan', title: 'Pelajar Tidak Sihat & Klinik', short: 'Kesihatan', icon: 'health', desc: 'Pelajar sakit, dirawat di bilik sakit atau dibawa ke klinik.' },
    { key: 'sekitar', title: 'Keadaan Sekeliling Sekolah', short: 'Sekitar', icon: 'leaf', desc: 'Pemantauan kebersihan, keselamatan dan kemudahan.' },
    { key: 'pelawat', title: 'Kehadiran Pelawat', short: 'Pelawat', icon: 'badge', desc: 'Pelawat ke sekolah pada hari ini (jika ada).' },
    { key: 'disiplin', title: 'Laporan Disiplin', short: 'Disiplin', icon: 'alert', desc: 'Lewat hadir, ponteng, pakaian dan kesalahan lain.' },
    { key: 'aktiviti', title: 'Aktiviti Harian', short: 'Aktiviti', icon: 'flag', desc: 'Aktiviti / program yang berlangsung hari ini.' },
    { key: 'pengesahan', title: 'Pengesahan Pihak Pengurusan', short: 'Pengesahan', icon: 'shield', desc: 'Akuan guru bertugas dan pengesahan pentadbir.' },
    { key: 'tamat', title: 'Tamat', short: 'Tamat', icon: 'done', desc: 'Ringkasan laporan hari ini.' }
  ];
  const SEBAB_GURU = ['Cuti Sakit (MC)', 'Kursus / Bengkel', 'Urusan Rasmi', 'Cuti Rehat Khas', 'Cuti Bersalin', 'Cuti Tanpa Rekod', 'Lain-lain'];
  const TINDAKAN_SAKIT = ['Rehat di bilik sakit', 'Dibawa ke klinik', 'Dijemput ibu bapa', 'Dihantar ke hospital'];
  const KESALAHAN = ['Lewat hadir', 'Ponteng kelas', 'Pakaian tidak kemas', 'Rambut tidak kemas', 'Membawa telefon bimbit', 'Bergaduh', 'Lain-lain'];
  const ASPEK = [
    { key: 'kelas', label: 'Kebersihan bilik darjah' },
    { key: 'tandas', label: 'Tandas pelajar' },
    { key: 'kantin', label: 'Kantin & kebersihan makanan' },
    { key: 'kawasan', label: 'Kawasan, padang & taman' },
    { key: 'pagar', label: 'Pagar & pintu masuk' },
    { key: 'longkang', label: 'Longkang & saliran' },
    { key: 'keselamatan', label: 'Keselamatan (pengawal)' },
    { key: 'utiliti', label: 'Bekalan elektrik & air' }
  ];
  const STATUS_ASPEK = ['Baik', 'Sederhana', 'Perlu Tindakan'];
  const STATUS = {
    draf: { label: 'Draf', short: 'Draf', tone: 'muted' },
    dihantar: { label: 'Menunggu Pengesahan', short: 'Menunggu', tone: 'warn' },
    disahkan: { label: 'Disahkan', short: 'Disahkan', tone: 'ok' },
    dikembalikan: { label: 'Perlu Pembetulan', short: 'Pembetulan', tone: 'bad' },
    tiada: { label: 'Belum Diisi', short: 'Belum diisi', tone: 'ghost' }
  };

  /* ---------- Penjana data contoh ---------- */
  function rng(seed) { // mulberry32
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const STAFF = ['Pn. Zarina binti Abu', 'En. Hafiz bin Rahman', 'Pn. Tan Mei Ling', 'En. Suresh a/l Muthu', 'Pn. Faridah binti Salleh', 'Cik Nur Aisyah binti Karim',
    'En. Azman bin Daud', 'Pn. Wong Siew Yen', 'Pn. Kavitha a/p Raman', 'En. Mohd Firdaus bin Ali', 'Pn. Rosmah binti Jusoh', 'Cik Lee Hui Min',
    'En. Ramli bin Ahmad', 'Pn. Salmiah binti Idris', 'En. Chong Kah Wai', 'Pn. Norhayati binti Musa'];
  const SIMPTOM = ['Demam', 'Sakit perut', 'Pening kepala', 'Luka ketika PJ', 'Asma', 'Muntah', 'Terseliuh kaki', 'Sakit gigi'];
  const PELAWAT = [
    { nama: 'En. Rizal bin Osman', organisasi: 'PPD Petaling Perdana', tujuan: 'Pemantauan PdP' },
    { nama: 'Pn. Aishah binti Latif', organisasi: 'Ibu bapa', tujuan: 'Berjumpa guru kelas 3 Amanah' },
    { nama: 'En. Gopal a/l Naidu', organisasi: 'Kontraktor TNB', tujuan: 'Penyelenggaraan pencawang' },
    { nama: 'Pn. Chew Li Fang', organisasi: 'PIBG', tujuan: 'Mesyuarat AJK PIBG' },
    { nama: 'Insp. Hairul bin Zaki', organisasi: 'IPD Shah Alam', tujuan: 'Ceramah pencegahan jenayah' },
    { nama: 'En. Kamarul bin Yassin', organisasi: 'Pembekal buku teks', tujuan: 'Penghantaran buku SPBT' }
  ];
  const AKTIVITI = [
    ['07:20', 'Perhimpunan rasmi mingguan', 'Dataran sekolah'],
    ['07:30', 'Bacaan Yasin & doa pagi', 'Surau / Dewan'],
    ['10:00', 'Latihan rumah sukan', 'Padang sekolah'],
    ['11:00', 'Ceramah Kesedaran Anti-Dadah', 'Dewan Seri Murni'],
    ['14:30', 'Kokurikulum: Kelab & Persatuan', 'Bilik darjah'],
    ['14:30', 'Latihan Pasukan Pancaragam', 'Dewan'],
    ['09:00', 'Program Literasi Bahasa Inggeris', 'Pusat Sumber'],
    ['12:30', 'Mesyuarat Panitia Sains', 'Bilik Mesyuarat'],
    ['08:00', 'Ujian Pertengahan Tahun (Tingkatan 5)', 'Dewan Peperiksaan'],
    ['15:00', 'Gotong-royong kelas', 'Seluruh kawasan sekolah']
  ];

  // Satu baris kehadiran bagi setiap kelas (snapshot enrolmen dari senarai pelajar)
  function attRow(c, students) { const n = students.filter(x => x.kelasId === c.id).length; return { kelasId: c.id, nama: c.nama, enrolmen: n, hadir: n, tidakHadir: [], disemak: false }; }
  function blankReport(date, rosterId, uid, settings, classes, students) {
    const items = {};
    ASPEK.forEach(a => { items[a.key] = { status: 'Baik', catatan: '' }; });
    return {
      id: 'r_' + date, date, rosterId, filledBy: uid, status: 'draf',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), submittedAt: null,
      guru: { jumlah: settings.jumlahGuru, tidakHadir: [], catatan: '' },
      pelajar: { kelas: classes.map(c => attRow(c, students)), catatan: '' },
      kesihatan: [],
      sekitar: { items, catatan: '' },
      pelawat: [],
      disiplin: [],
      aktiviti: [],
      akuan: false,
      pengesahan: null
    };
  }

  function genReport(date, roster, status, r, settings, classes, users, students) {
    const pick = a => a[Math.floor(r() * a.length)];
    const filler = roster.teacherIds[Math.floor(r() * roster.teacherIds.length)];
    const fu = users.find(u => u.id === filler);
    const myCls = classes.filter(c => fu.kelasIds.includes(c.id));
    const rep = blankReport(date, roster.id, filler, settings, myCls, students);
    const pickStu = () => { const c = pick(myCls); const st = pick(students.filter(x => x.kelasId === c.id)); return { kelas: c.nama, kelasId: c.id, pelajarId: st.id, nama: st.nama }; };
    const n = Math.floor(r() * 4);
    const used = new Set();
    for (let i = 0; i < n; i++) { let s = pick(STAFF); if (used.has(s)) continue; used.add(s); rep.guru.tidakHadir.push({ nama: s, sebab: pick(SEBAB_GURU.slice(0, 4)) }); }
    rep.pelajar.kelas.forEach(k => {
      const pool = students.filter(x => x.kelasId === k.kelasId), n = Math.floor(r() * 3);
      const abs = new Set(); for (let i = 0; i < n; i++) abs.add(pick(pool));
      k.tidakHadir = [...abs].map(x => ({ id: x.id, nama: x.nama }));
      k.hadir = k.enrolmen - k.tidakHadir.length; k.disemak = status !== 'draf' || r() < .5;
    });
    if (r() < 0.25) rep.pelajar.catatan = 'Beberapa pelajar Tingkatan 4 menyertai pertandingan di peringkat daerah.';
    const ks = Math.floor(r() * 3);
    for (let i = 0; i < ks; i++) rep.kesihatan.push({ ...pickStu(), simptom: pick(SIMPTOM), tindakan: pick(TINDAKAN_SAKIT.slice(0, 3)), masa: pad(8 + Math.floor(r() * 5)) + ':' + pad(Math.floor(r() * 4) * 15) });
    ASPEK.forEach(a => {
      const x = r();
      if (x < 0.12) rep.sekitar.items[a.key] = { status: 'Perlu Tindakan', catatan: a.key === 'tandas' ? 'Paip bocor di tandas lelaki Blok B' : a.key === 'longkang' ? 'Longkang tersumbat berhampiran kantin' : 'Perlu perhatian penyelenggaraan' };
      else if (x < 0.3) rep.sekitar.items[a.key] = { status: 'Sederhana', catatan: a.key === 'kelas' ? 'Sampah di koridor tingkat 2' : '' };
    });
    if (r() < 0.6) { const p = pick(PELAWAT); rep.pelawat.push({ ...p, masuk: '09:' + pad(Math.floor(r() * 6) * 10), keluar: '11:' + pad(Math.floor(r() * 6) * 10) }); }
    const dn = 1 + Math.floor(r() * 5);
    for (let i = 0; i < dn; i++) {
      const kes = r() < 0.6 ? 'Lewat hadir' : pick(KESALAHAN);
      rep.disiplin.push({ ...pickStu(), kesalahan: kes, masa: kes === 'Lewat hadir' ? '07:' + pad(31 + Math.floor(r() * 25)) : pad(9 + Math.floor(r() * 4)) + ':' + pad(Math.floor(r() * 6) * 10), tindakan: kes === 'Lewat hadir' ? 'Nama dicatat, amaran lisan' : 'Dirujuk kepada Guru Disiplin' });
    }
    const dow = parseISO(date).getDay();
    const acts = dow === 1 ? [AKTIVITI[0]] : [AKTIVITI[1]];
    acts.push(AKTIVITI[2 + Math.floor(r() * (AKTIVITI.length - 2))]);
    if (r() < 0.5) acts.push(AKTIVITI[2 + Math.floor(r() * (AKTIVITI.length - 2))]);
    rep.aktiviti = [...new Map(acts.map(a => [a[1], a])).values()].sort((a, b) => a[0].localeCompare(b[0])).map(a => ({ masa: a[0], tajuk: a[1], catatan: a[2] }));
    rep.status = status;
    const day = parseISO(date);
    const t = new Date(day); t.setHours(14, 20 + Math.floor(r() * 30));
    rep.createdAt = rep.updatedAt = t.toISOString();
    if (status !== 'draf') { rep.akuan = true; rep.submittedAt = t.toISOString(); }
    if (status === 'disahkan' || status === 'dikembalikan') {
      const admin = users.filter(u => u.role === 'admin')[Math.floor(r() * 2)];
      const v = new Date(day); v.setDate(v.getDate() + (r() < 0.6 ? 0 : 1)); v.setHours(16, 5 + Math.floor(r() * 50));
      rep.pengesahan = {
        status, oleh: admin.id, pada: v.toISOString(),
        ulasan: status === 'disahkan' ? pick(['Laporan lengkap. Terima kasih.', 'Disahkan. Sila pantau isu tandas Blok B.', 'Baik. Teruskan pemantauan pelajar lewat.', '']) : 'Sila semak semula bilangan kehadiran pelajar kelas 4 Sains dan lengkapkan butiran pelawat.'
      };
    }
    return rep;
  }

  function seed() {
    const users = [
      { id: 'u1', nama: 'Pn. Hjh. Rohana binti Ismail', email: 'admin@sigap.edu.my', password: 'admin123', role: 'admin', jawatan: 'Pengetua', telefon: '012-334 5521' },
      { id: 'u2', nama: 'En. Kamal bin Hassan', email: 'kamal@sigap.edu.my', password: 'admin123', role: 'admin', jawatan: 'Penolong Kanan HEM', telefon: '013-778 2109' },
      { id: 'u3', nama: 'Cikgu Aminah binti Yusof', email: 'aminah@sigap.edu.my', password: 'guru123', role: 'guru', jawatan: 'Guru Bahasa Melayu', telefon: '011-2345 6789' },
      { id: 'u4', nama: 'Cikgu Lim Wei Ling', email: 'lim@sigap.edu.my', password: 'guru123', role: 'guru', jawatan: 'Guru Matematik', telefon: '016-552 8890' },
      { id: 'u5', nama: 'Cikgu Rajesh a/l Kumar', email: 'rajesh@sigap.edu.my', password: 'guru123', role: 'guru', jawatan: 'Guru Sains', telefon: '017-903 4412' },
      { id: 'u6', nama: 'Cikgu Nurul Huda binti Ahmad', email: 'nurul@sigap.edu.my', password: 'guru123', role: 'guru', jawatan: 'Guru Bahasa Inggeris', telefon: '019-221 0087' },
      { id: 'u7', nama: 'Cikgu Faizal bin Omar', email: 'faizal@sigap.edu.my', password: 'guru123', role: 'guru', jawatan: 'Guru Pendidikan Jasmani', telefon: '012-667 3301' },
      { id: 'u8', nama: 'Cikgu Siti Mariam binti Zakaria', email: 'mariam@sigap.edu.my', password: 'guru123', role: 'guru', jawatan: 'Guru Sejarah', telefon: '014-889 1276' }
    ];
    const classes = ['1 Amanah', '2 Bestari', '3 Amanah', '4 Sains', '4 Sastera', '5 Sains'].map((n, i) => ({ id: 'k' + (i + 1), nama: n }));
    const NAMA = [
      // 1 Amanah
      'Muhammad Adam bin Rizal', 'Nur Alya Sofea binti Azman', 'Lim Jun Hao', 'Arjun a/l Siva', 'Siti Nurhaliza binti Rahim', 'Ahmad Danish bin Kamal', 'Tan Yi Xuan', 'Nur Iman Qistina binti Hafiz', 'Muhammad Irfan bin Zulkifli', 'Priya a/p Ganesan',
      // 2 Bestari
      'Wong Kai Le', 'Haziq Hakimi bin Roslan', 'Aina Batrisyia binti Faizal', 'Darshan a/l Kumar', 'Aiman Hakim bin Shahrul', 'Chloe Teoh Xin Yi', 'Amirul Asyraf bin Nordin', 'Puteri Balqis binti Hisham', 'Nurul Ain binti Jamal', 'Ong Wei Jie',
      // 3 Amanah
      'Muhammad Harith bin Azlan', 'Sharifah Nur Aqilah', 'Kavin a/l Rajan', 'Nur Damia binti Sulaiman', 'Lee Zi Xuan', 'Adam Mikhail bin Hairul', 'Farah Nabilah binti Yusri', 'Thivyaa a/p Murugan', 'Afiq Danial bin Rosli', 'Goh Shu Ting',
      // 4 Sains
      'Nur Syafiqah binti Ismail', 'Muhammad Luqman bin Hakim', 'Chan Jia Wen', 'Hariz Iskandar bin Mazlan', 'Deeptha a/p Selvam', 'Ahmad Zikri bin Ramli', 'Nur Insyirah binti Kamarul', 'Yap Jun Kit', 'Aisyah Humaira binti Azri', 'Muhammad Syahmi bin Fuad',
      // 4 Sastera
      'Nur Adlina binti Rashid', 'Izzat Haikal bin Bakar', 'Ng Pei Shan', 'Mohd Faris bin Ghazali', 'Shalini a/p Krishnan', 'Nur Hidayah binti Salleh', 'Teh Wei Liang', 'Amir Hamzah bin Othman', 'Siti Khadijah binti Musa', 'Ravin a/l Subramaniam',
      // 5 Sains
      'Muhammad Aqil bin Firdaus', 'Nur Batrisyia binti Ahmad', 'Khoo Jia Hui', 'Danish Haikal bin Rahman', 'Kirthana a/p Mohan', 'Nur Farhana binti Zainal', 'Lau Chee Keong', 'Arif Hakimi bin Yaakob', 'Nur Qaseh binti Hamdan', 'Aidil Fitri bin Saad'
    ];
    const students = NAMA.map((n, i) => ({ id: 's' + (i + 1), nama: n, kelasId: classes[Math.floor(i / 10)].id }));
    const kelasGuru = { u3: ['k1', 'k2', 'k3'], u4: ['k4', 'k5'], u5: ['k4', 'k6'], u6: ['k1', 'k5', 'k6'], u7: ['k2', 'k3'], u8: ['k3', 'k5', 'k6'] };
    users.forEach(u => { u.kelasIds = kelasGuru[u.id] || []; });
    const settings = { namaSekolah: 'SMK Taman Seri Murni', kodSekolah: 'BEA8642', jumlahGuru: 48, daerah: 'Petaling Perdana, Selangor' };

    const thisMon = mondayOf(new Date());
    const plan = [[-3, ['u6', 'u8']], [-2, ['u7', 'u8']], [-1, ['u5', 'u6']], [0, ['u3', 'u4']], [1, ['u4', 'u7']], [2, ['u5', 'u3']], [3, ['u8', 'u6']]];
    const rosters = plan.map(([w, t]) => { const mon = toISO(addDays(thisMon, w * 7)); return { id: 'w_' + mon, weekStart: mon, teacherIds: t, ketua: t[0] }; });

    const r = rng(20261004);
    const reports = [];
    const today = todayISO();
    rosters.forEach(ro => {
      const days = weekDays(ro.weekStart).filter(d => d < today);
      days.forEach((d, i) => {
        let st;
        if (ro.weekStart < toISO(thisMon)) {
          st = 'disahkan';
          if (ro.weekStart === toISO(addDays(thisMon, -7))) { if (i === 4) st = 'dihantar'; if (i === 2) st = 'dikembalikan'; }
        } else {
          if (i === days.length - 1) return; // biarkan hari terkini kosong untuk demo
          st = i === 0 ? 'disahkan' : i === days.length - 2 ? 'draf' : 'dihantar';
        }
        reports.push(genReport(d, ro, st, r, settings, classes, users, students));
      });
    });
    return { version: 2, seededAt: new Date().toISOString(), users, classes, students, settings, rosters, reports };
  }

  /* ---------- Stor ---------- */
  let db = null;
  function load() {
    try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; }
    if (!db || db.version !== 2) { db = seed(); save(); }
    return db;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.warn('Gagal simpan', e); } }
  function reset() { db = seed(); save(); }
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const API = {
    D, STEPS, SEBAB_GURU, TINDAKAN_SAKIT, KESALAHAN, ASPEK, STATUS_ASPEK, STATUS, STAFF,
    get db() { return db || load(); },
    load, save, reset, uid,
    initials: n => n.replace(/\b(Pn|En|Cik|Cikgu|Hjh|Hj|Dr|Insp)\.?\s+/g, '').split(/\s+/).filter(w => w && !/^(bin|binti|a\/l|a\/p)$/i.test(w)).slice(0, 2).map(w => w[0]).join('').toUpperCase(),

    /* Sesi */
    login(email, password) {
      const u = API.db.users.find(x => x.email.toLowerCase() === String(email).trim().toLowerCase() && x.password === password);
      if (!u) return null;
      localStorage.setItem(SESSION_KEY, u.id);
      return u;
    },
    logout() { localStorage.removeItem(SESSION_KEY); },
    currentUser() { const id = localStorage.getItem(SESSION_KEY); return id ? API.user(id) : null; },

    /* Pengguna */
    user: id => API.db.users.find(u => u.id === id) || null,
    teachers: () => API.db.users.filter(u => u.role === 'guru'),
    saveUser(u) {
      const i = API.db.users.findIndex(x => x.id === u.id);
      if (i >= 0) API.db.users[i] = u; else API.db.users.push(u);
      save();
    },
    deleteUser(id) {
      db.users = db.users.filter(u => u.id !== id);
      db.rosters.forEach(r => { r.teacherIds = r.teacherIds.filter(t => t !== id); if (r.ketua === id) r.ketua = r.teacherIds[0] || null; });
      save();
    },

    /* Jadual bertugas */
    rosters: () => [...API.db.rosters].sort((a, b) => b.weekStart.localeCompare(a.weekStart)),
    rosterForDate(date) { const mon = toISO(mondayOf(parseISO(date))); return API.db.rosters.find(r => r.weekStart === mon) || null; },
    rostersForUser: id => API.rosters().filter(r => r.teacherIds.includes(id)),
    saveRoster(r) {
      const i = API.db.rosters.findIndex(x => x.id === r.id);
      if (i >= 0) API.db.rosters[i] = r; else API.db.rosters.push(r);
      save();
    },
    deleteRoster(id) { db.rosters = db.rosters.filter(r => r.id !== id); save(); },

    /* Laporan */
    reports: () => [...API.db.reports].sort((a, b) => b.date.localeCompare(a.date)),
    report: date => API.db.reports.find(r => r.date === date) || null,
    newReport(date, userId) { const ro = API.rosterForDate(date); return blankReport(date, ro ? ro.id : null, userId, API.db.settings, API.classesOf(API.user(userId)), API.db.students); },
    saveReport(rep) {
      rep.updatedAt = new Date().toISOString();
      const i = API.db.reports.findIndex(x => x.date === rep.date);
      if (i >= 0) API.db.reports[i] = rep; else API.db.reports.push(rep);
      save();
    },
    deleteReport(date) { db.reports = db.reports.filter(r => r.date !== date); save(); },

    /* Kelas & pelajar */
    classesOf(user) { return user && user.role === 'guru' ? API.db.classes.filter(c => (user.kelasIds || []).includes(c.id)) : API.db.classes; },
    studentsIn: kelasId => API.db.students.filter(s => s.kelasId === kelasId).sort((a, b) => a.nama.localeCompare(b.nama)),
    classByName: nama => API.db.classes.find(c => c.nama === nama) || null,
    teachersOfClass: kelasId => API.db.users.filter(u => u.role === 'guru' && (u.kelasIds || []).includes(kelasId)),
    saveStudent(st) { const i = API.db.students.findIndex(x => x.id === st.id); if (i >= 0) API.db.students[i] = st; else API.db.students.push(st); save(); },
    deleteStudent(id) { db.students = db.students.filter(s => s.id !== id); save(); },
    saveClass(c) { const i = API.db.classes.findIndex(x => x.id === c.id); if (i >= 0) API.db.classes[i] = c; else API.db.classes.push(c); save(); },
    deleteClass(id) {
      db.classes = db.classes.filter(c => c.id !== id);
      db.students = db.students.filter(s => s.kelasId !== id);
      db.users.forEach(u => { if (u.kelasIds) u.kelasIds = u.kelasIds.filter(k => k !== id); });
      save();
    },
    // Pastikan laporan mempunyai baris kehadiran untuk setiap kelas guru ini
    ensureClasses(rep, user) {
      API.classesOf(user).forEach(c => { if (!rep.pelajar.kelas.some(k => k.kelasId === c.id)) rep.pelajar.kelas.push(attRow(c, API.db.students)); });
      return rep;
    },

    /* Sambung sesi (auto-resume) */
    setResume(userId, date, step) { try { localStorage.setItem('sigap_resume_' + userId, JSON.stringify({ date, step, at: Date.now() })); } catch (e) { } },
    getResume(userId) { try { return JSON.parse(localStorage.getItem('sigap_resume_' + userId)); } catch (e) { return null; } },
    clearResume(userId) { try { localStorage.removeItem('sigap_resume_' + userId); } catch (e) { } },

    /* Statistik */
    pelajarStat(rep) {
      let e = 0, h = 0;
      rep.pelajar.kelas.forEach(k => { e += Number(k.enrolmen) || 0; h += Number(k.hadir) || 0; });
      return { enrolmen: e, hadir: h, pct: e ? (h / e) * 100 : 0 };
    },
    guruStat(rep) { const j = Number(rep.guru.jumlah) || 0, t = rep.guru.tidakHadir.length; return { jumlah: j, tidakHadir: t, hadir: j - t, pct: j ? ((j - t) / j) * 100 : 0 }; },
    isOnDuty(userId, date) { const r = API.rosterForDate(date); return !!(r && r.teacherIds.includes(userId)); },
    canEdit(user, date) {
      if (!user || user.role !== 'guru') return false;
      const dow = parseISO(date).getDay();
      if (dow === 0 || dow === 6 || !API.isOnDuty(user.id, date) || date > todayISO()) return false;
      const rep = API.report(date);
      return !rep || rep.status === 'draf' || rep.status === 'dikembalikan';
    }
  };
  window.SIGAP = API;
})();
