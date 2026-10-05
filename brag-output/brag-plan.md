# /brag — SIGAP

**Apa:** SIGAP (Sistem Guru Bertugas Pintar) — guru bertugas mingguan isi laporan harian 9 langkah dari telefon, pengurusan sahkan dengan satu klik.
**Untuk siapa:** Guru bertugas dan pentadbir sekolah (Pengetua / PK HEM).
**Beza:** Ganti borang kertas; wizard berpandu 9 langkah mengikut hari; draf automatik; pengesahan terus.
**Hook visual:** Kad "Anda bertugas minggu ini" sebenar — 5 petak hari muncul satu per satu, Jumaat masih "Belum diisi".
**UI sebenar ditunjuk:** kad bertugas, wizard telefon (kehadiran pelajar diisi, stepper 1→9), akuan + hantar, kotak pengesahan admin.
**Nada:** `default` — ringkas, ceria, kemas. Bahasa Melayu (bahasa produk).
**Kapsyen kongsi:** "Giliran bertugas minggu ni? Laporan harian siap dari telefon — 9 langkah, terus disahkan."
**Format:** landskap 1920×1080, 30fps, ~21s. Muzik 120 BPM, F major (F–Dm–B♭–C), kesan bunyi dalam kunci sama.

## Papan cerita

| # | Masa | Babak | Kandungan |
|---|---|---|---|
| 1 | 0.0–3.0s | Hook | "Minggu ni, giliran anda bertugas." Kad bertugas sebenar naik; petak Isnin–Jumaat muncul satu per satu; kursor ketuk Jumaat. |
| 2 | 3.0–6.0s | Reveal | Bulatan teal mengembang dari petak Jumaat → logo SIGAP + "Sistem Guru Bertugas Pintar". |
| 3 | 6.0–11.0s | Sorotan 1 | "9 langkah. Terus dari telefon." Wizard telefon: nombor hadir ditaip setiap kelas, statistik mengira; stepper bergerak 1→8; senarai 9 langkah bertanda ✓. |
| 4 | 11.0–14.5s | Sorotan 2 | "Akuan. Hantar. Siap." Kursor tanda akuan → Hantar untuk Pengesahan → ikon ✓ + konfeti. |
| 5 | 14.5–17.5s | Sorotan 3 | "Pengurusan sahkan, serta-merta." Tetingkap admin: ulasan ditaip, klik Sahkan → chip Menunggu → Disahkan. |
| 6 | 17.5–21.0s | Outro | Logo SIGAP, "Laporan guru bertugas. Tanpa kertas.", pautan repo. |
