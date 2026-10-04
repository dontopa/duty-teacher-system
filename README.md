# SIGAP — Sistem Guru Bertugas Pintar

Sistem laporan **guru bertugas mingguan** untuk sekolah. Guru bertugas mengisi laporan **mengikut hari** (Isnin–Jumaat) dalam 9 langkah, dan pihak pengurusan menyemak serta mengesahkannya.

## Aliran laporan harian (9 langkah)

1. Laporan kehadiran guru
2. Laporan kehadiran pelajar (mengikut kelas, peratus dikira automatik)
3. Laporan pelajar tidak sihat & ke klinik
4. Laporan keadaan sekeliling sekolah
5. Laporan kehadiran pelawat (jika ada)
6. Laporan disiplin (lewat hadir, ponteng, dll.)
7. Laporan aktiviti harian
8. Pengesahan pihak pengurusan (akuan guru → sahkan / kembalikan oleh pentadbir)
9. Tamat (ringkasan, sedia dicetak)

## Peranan

| Peranan | Boleh buat |
|---|---|
| **Guru** | Lihat minggu bertugas & status setiap hari, isi laporan (draf disimpan automatik), hantar untuk pengesahan, buat pembetulan, cetak laporan |
| **Pentadbir** | Papan pemuka analitik, sahkan / kembalikan laporan dengan ulasan, urus jadual bertugas mingguan, urus pengguna, kelas & tetapan sekolah, set semula data demo |

## Akaun demo

| Peranan | E-mel | Kata laluan |
|---|---|---|
| Pentadbir (Pengetua) | `admin@sigap.edu.my` | `admin123` |
| Pentadbir (PK HEM) | `kamal@sigap.edu.my` | `admin123` |
| Guru (bertugas minggu ini) | `aminah@sigap.edu.my` | `guru123` |
| Guru (bertugas minggu ini) | `lim@sigap.edu.my` | `guru123` |
| Guru lain | `rajesh@`, `nurul@`, `faizal@`, `mariam@sigap.edu.my` | `guru123` |

Data contoh (jadual 7 minggu, laporan disahkan / menunggu / perlu pembetulan / draf) dijana relatif kepada tarikh hari ini.

## Cara jalankan

Tiada build step — HTML, CSS & JavaScript tulen.

```bash
python3 -m http.server 8000
# buka http://localhost:8000
```

Atau hos terus di GitHub Pages / mana-mana hos statik.

## Struktur

```
index.html          Landing page (animasi & motion)
login.html          Log masuk + akaun demo
app.html            Papan pemuka (SPA, hash routing)
assets/css/         landing.css, app.css (mod gelap & paparan mudah alih)
assets/js/data.js   Lapisan data + penjana data contoh
assets/js/app.js    Logik aplikasi (dashboard, wizard 9 langkah, pengesahan, jadual, pengguna, tetapan)
assets/img/         logo.svg, favicon.svg
```

> **Nota:** Ini versi demo — data disimpan dalam `localStorage` pelayar dan kata laluan tidak disulitkan. Untuk kegunaan sebenar, lapisan `assets/js/data.js` perlu disambungkan ke backend (cth. Laravel / Supabase / Firebase) dengan pengesahan selamat.
