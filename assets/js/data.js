/* SIGAP — lapisan data (localStorage) + data contoh.
   Semua data demo dijana relatif kepada tarikh hari ini supaya sentiasa "segar". */
(function () {
  const KEY = 'sigap_en_db_v1';
  const SESSION_KEY = 'sigap_en_session';

  /* ---------- Utiliti tarikh ---------- */
  const HARI = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const BULAN_PENUH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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
    { key: 'guru', title: 'Teacher Attendance', short: 'Teachers', icon: 'userCheck', desc: 'Record absent teachers and the reason.' },
    { key: 'pelajar', title: 'Student Attendance', short: 'Students', icon: 'grad', desc: 'Mark student attendance by class.' },
    { key: 'kesihatan', title: 'Sick Students & Clinic', short: 'Health', icon: 'health', desc: 'Students who were unwell, treated in the sick bay or taken to a clinic.' },
    { key: 'sekitar', title: 'School Grounds & Facilities', short: 'Grounds', icon: 'leaf', desc: 'Cleanliness, safety and facilities check.' },
    { key: 'pelawat', title: 'Visitors', short: 'Visitors', icon: 'badge', desc: 'Visitors to the school today (if any).' },
    { key: 'disiplin', title: 'Discipline Report', short: 'Discipline', icon: 'alert', desc: 'Lateness, truancy, uniform and other offences.' },
    { key: 'aktiviti', title: 'Daily Activities', short: 'Activities', icon: 'flag', desc: 'Activities / programmes held today.' },
    { key: 'pengesahan', title: 'Management Approval', short: 'Approval', icon: 'shield', desc: 'Duty teacher declaration and administrator approval.' },
    { key: 'tamat', title: 'Done', short: 'Done', icon: 'done', desc: "Summary of today's report." }
  ];
  const SEBAB_GURU = ['Sick Leave (MC)', 'Course / Workshop', 'Official Duty', 'Personal Leave', 'Maternity Leave', 'Unrecorded Leave', 'Other'];
  const TINDAKAN_SAKIT = ['Rested in sick bay', 'Taken to clinic', 'Picked up by parent', 'Sent to hospital'];
  const KESALAHAN = ['Late arrival', 'Skipping class', 'Untidy uniform', 'Untidy hair', 'Mobile phone in class', 'Fighting', 'Other'];
  const ASPEK = [
    { key: 'kelas', label: 'Classroom cleanliness' },
    { key: 'tandas', label: 'Student toilets' },
    { key: 'kantin', label: 'Cafeteria & food hygiene' },
    { key: 'kawasan', label: 'Grounds, field & gardens' },
    { key: 'pagar', label: 'Fences & entrances' },
    { key: 'longkang', label: 'Drains' },
    { key: 'keselamatan', label: 'Security (guards)' },
    { key: 'utiliti', label: 'Electricity & water supply' }
  ];
  const STATUS_ASPEK = ['Good', 'Fair', 'Needs Action'];
  const STATUS = {
    draf: { label: 'Draft', short: 'Draft', tone: 'muted' },
    dihantar: { label: 'Pending Approval', short: 'Pending', tone: 'warn' },
    disahkan: { label: 'Approved', short: 'Approved', tone: 'ok' },
    dikembalikan: { label: 'Needs Correction', short: 'Correction', tone: 'bad' },
    tiada: { label: 'Not Filled', short: 'Not filled', tone: 'ghost' }
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
  const STAFF = ['Mrs. Zarina binti Abu', 'Mr. Hafiz bin Rahman', 'Mrs. Tan Mei Ling', 'Mr. Suresh a/l Muthu', 'Mrs. Faridah binti Salleh', 'Ms. Nur Aisyah binti Karim',
    'Mr. Azman bin Daud', 'Mrs. Wong Siew Yen', 'Mrs. Kavitha a/p Raman', 'Mr. Mohd Firdaus bin Ali', 'Mrs. Rosmah binti Jusoh', 'Ms. Lee Hui Min',
    'Mr. Ramli bin Ahmad', 'Mrs. Salmiah binti Idris', 'Mr. Chong Kah Wai', 'Mrs. Norhayati binti Musa'];
  const SIMPTOM = ['Fever', 'Stomach ache', 'Headache', 'Injury during PE', 'Asthma', 'Vomiting', 'Sprained ankle', 'Toothache'];
  const PELAWAT = [
    { nama: 'Mr. Rizal bin Osman', organisasi: 'Cambridge Assessment', tujuan: 'IGCSE centre inspection' },
    { nama: 'Mrs. Aishah binti Latif', organisasi: 'Parent', tujuan: 'Meeting with Year 9 Emerald form teacher' },
    { nama: 'Mr. Gopal a/l Naidu', organisasi: 'Electrical contractor', tujuan: 'Substation maintenance' },
    { nama: 'Mrs. Chew Li Fang', organisasi: 'Parent-Teacher Association', tujuan: 'PTA committee meeting' },
    { nama: 'Insp. Hairul bin Zaki', organisasi: 'Shah Alam District Police', tujuan: 'Crime prevention talk' },
    { nama: 'Mr. Kamarul bin Yassin', organisasi: 'Textbook supplier', tujuan: 'Textbook delivery' }
  ];
  const AKTIVITI = [
    ['07:20', 'Weekly school assembly', 'School quadrangle'],
    ['07:30', 'Morning registration & reflection', 'Classrooms'],
    ['10:00', 'House sports practice', 'School field'],
    ['11:00', 'Anti-Drug Awareness Talk', 'Main Hall'],
    ['14:30', 'CCA: Clubs & Societies', 'Classrooms'],
    ['14:30', 'School Band Practice', 'Hall'],
    ['09:00', 'Reading Programme', 'Library'],
    ['12:30', 'Science Department Meeting', 'Meeting Room'],
    ['08:00', 'Mid-Year Exams (Year 11)', 'Exam Hall'],
    ['15:00', 'Class clean-up day', 'Whole school']
  ];

  // Satu baris kehadiran bagi setiap kelas (snapshot enrolmen dari senarai pelajar)
  function attRow(c, students) { const n = students.filter(x => x.kelasId === c.id).length; return { kelasId: c.id, nama: c.nama, enrolmen: n, hadir: n, tidakHadir: [], disemak: false }; }
  function blankReport(date, rosterId, uid, settings, classes, students) {
    const items = {};
    ASPEK.forEach(a => { items[a.key] = { status: 'Good', catatan: '' }; });
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
    if (r() < 0.25) rep.pelajar.catatan = 'Several Year 10 students are representing the school at an inter-school competition.';
    const ks = Math.floor(r() * 3);
    for (let i = 0; i < ks; i++) rep.kesihatan.push({ ...pickStu(), simptom: pick(SIMPTOM), tindakan: pick(TINDAKAN_SAKIT.slice(0, 3)), masa: pad(8 + Math.floor(r() * 5)) + ':' + pad(Math.floor(r() * 4) * 15) });
    ASPEK.forEach(a => {
      const x = r();
      if (x < 0.12) rep.sekitar.items[a.key] = { status: 'Needs Action', catatan: a.key === 'tandas' ? "Leaking pipe in Block B boys' toilet" : a.key === 'longkang' ? 'Blocked drain near the cafeteria' : 'Needs maintenance attention' };
      else if (x < 0.3) rep.sekitar.items[a.key] = { status: 'Fair', catatan: a.key === 'kelas' ? 'Litter in the level 2 corridor' : '' };
    });
    if (r() < 0.6) { const p = pick(PELAWAT); rep.pelawat.push({ ...p, masuk: '09:' + pad(Math.floor(r() * 6) * 10), keluar: '11:' + pad(Math.floor(r() * 6) * 10) }); }
    const dn = 1 + Math.floor(r() * 5);
    for (let i = 0; i < dn; i++) {
      const kes = r() < 0.6 ? 'Late arrival' : pick(KESALAHAN);
      rep.disiplin.push({ ...pickStu(), kesalahan: kes, masa: kes === 'Late arrival' ? '07:' + pad(31 + Math.floor(r() * 25)) : pad(9 + Math.floor(r() * 4)) + ':' + pad(Math.floor(r() * 6) * 10), tindakan: kes === 'Late arrival' ? 'Name recorded, verbal warning' : 'Referred to Discipline Teacher' });
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
        ulasan: status === 'disahkan' ? pick(['Complete report. Thank you.', 'Approved. Please keep an eye on the Block B toilet issue.', 'Good. Keep monitoring late arrivals.', '']) : 'Please recheck student attendance for 10 Science and complete the visitor details.'
      };
    }
    return rep;
  }

  function seed() {
    const users = [
      { id: 'u1', nama: 'Dr. Rohana binti Ismail', email: 'admin@sigap.edu.my', password: 'admin123', role: 'admin', jawatan: 'Principal', telefon: '01X-XXX XXXX' },
      { id: 'u2', nama: 'Mr. Kamal bin Hassan', email: 'kamal@sigap.edu.my', password: 'admin123', role: 'admin', jawatan: 'Head of Student Affairs', telefon: '01X-XXX XXXX' },
      { id: 'u3', nama: 'Ms. Aminah binti Yusof', email: 'aminah@sigap.edu.my', password: 'guru123', role: 'guru', jawatan: 'Bahasa Melayu Teacher', telefon: '01X-XXX XXXX' },
      { id: 'u4', nama: 'Ms. Lim Wei Ling', email: 'lim@sigap.edu.my', password: 'guru123', role: 'guru', jawatan: 'Mathematics Teacher', telefon: '01X-XXX XXXX' },
      { id: 'u5', nama: 'Mr. Rajesh a/l Kumar', email: 'rajesh@sigap.edu.my', password: 'guru123', role: 'guru', jawatan: 'Science Teacher', telefon: '01X-XXX XXXX' },
      { id: 'u6', nama: 'Ms. Nurul Huda binti Ahmad', email: 'nurul@sigap.edu.my', password: 'guru123', role: 'guru', jawatan: 'English Teacher', telefon: '01X-XXX XXXX' },
      { id: 'u7', nama: 'Mr. Faizal bin Omar', email: 'faizal@sigap.edu.my', password: 'guru123', role: 'guru', jawatan: 'PE Teacher', telefon: '01X-XXX XXXX' },
      { id: 'u8', nama: 'Ms. Siti Mariam binti Zakaria', email: 'mariam@sigap.edu.my', password: 'guru123', role: 'guru', jawatan: 'History Teacher', telefon: '01X-XXX XXXX' }
    ];
    const classes = ['Year 7 Emerald', 'Year 8 Sapphire', 'Year 9 Emerald', 'Year 10 Science', 'Year 10 Arts', 'Year 11 Science'].map((n, i) => ({ id: 'k' + (i + 1), nama: n }));
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
    const settings = { namaSekolah: 'Seri Murni International School', kodSekolah: 'SMIS-01', jumlahGuru: 48, daerah: 'Petaling Jaya, Selangor' };

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
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.warn('Save failed', e); } }
  function reset() { db = seed(); save(); }
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const API = {
    D, STEPS, SEBAB_GURU, TINDAKAN_SAKIT, KESALAHAN, ASPEK, STATUS_ASPEK, STATUS, STAFF,
    get db() { return db || load(); },
    load, save, reset, uid,
    initials: n => n.replace(/\b(Mrs|Mr|Ms|Dr|Insp)\.?\s+/g, '').split(/\s+/).filter(w => w && !/^(bin|binti|a\/l|a\/p)$/i.test(w)).slice(0, 2).map(w => w[0]).join('').toUpperCase(),

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
    setResume(userId, date, step) { try { localStorage.setItem('sigap_en_resume_' + userId, JSON.stringify({ date, step, at: Date.now() })); } catch (e) { } },
    getResume(userId) { try { return JSON.parse(localStorage.getItem('sigap_en_resume_' + userId)); } catch (e) { return null; } },
    clearResume(userId) { try { localStorage.removeItem('sigap_en_resume_' + userId); } catch (e) { } },

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
