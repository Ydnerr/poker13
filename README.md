# 🃏 Poker 13

Game kartu **13 kartu** (gaya Tiến Lên) yang bisa dimainkan langsung di browser. Main bareng teman lewat kode room, atau lawan bot. Nggak perlu install, buka dan main.

**🎮 Main sekarang:** [poker13.my.id](https://poker13.my.id)

## ✨ Fitur

- **Multiplayer online** untuk 2 sampai 4 pemain. Buat room, bagikan kode, langsung main.
- **Lawan bot** dengan beberapa tingkat kesulitan. Slot yang kosong bisa diisi bot.
- **Voice chat** (WebRTC), bisa pilih mode open mic atau tahan buat ngomong.
- **Chat room** dan **reaksi emoji** selama main.
- **Indikator ping** server dan tiap pemain, plus status offline.
- **Bot pengganti otomatis.** Kalau pemain putus, tutup browser, atau pindah tab terlalu lama, bot ambil alih sampai dia balik.
- **Tutorial** di dalam game, dan pilihan ukuran kartu.
- **Ringan di HP.** Aset kartu di-cache lewat service worker, jadi buka kedua kalinya lebih cepat dan hemat kuota.

## 📖 Aturan singkat

- Tiap pemain dapat 13 kartu. Yang kartunya habis duluan jadi **juara 1**.
- Urutan kartu dari kecil ke besar: `3 4 5 6 7 8 9 10 J Q K A 2`.
- Logo (♠ ♣ ♦ ♥) tidak dibandingkan. Angka yang sama tidak bisa saling mengalahkan. Logo hanya menentukan siapa yang pegang 3♠ di awal.
- Di awal game ada fase **kumpulin 3**: semua kartu 3 dikeluarkan sekaligus.
- Kombinasi: kartu tunggal, kembar, seri (minimal 3 kartu, satu logo, angka 3 sampai 10), dan bom.
- **Seri spesial J Q K:** tepat 3 kartu J, Q, K satu logo juga dianggap seri. Ini seri 3 kartu tertinggi, jadi menang lawan seri 3 kartu biasa (mis. 8 9 10). Boleh ditambah 1 pasangan (5 kartu) seperti seri biasa. Nggak bisa disambung ke 10 atau A, dan bukan bom.
- **Bom** yang menimpa kartu 2 langsung menang.
- Habis kartu dengan kartu 2 berarti **ngebom diri sendiri**: kalah, dan game diulang dari fase kumpulin 3.
- Pemegang **kartu murni** (tanpa J, Q, K) boleh berhenti dan langsung jadi juara, game tetap lanjut untuk yang lain.
- Giliran bergerak ke arah kanan.

Penjelasan lengkap dengan contoh ada di menu **Tutorial** dalam game.

## 🗂️ Struktur project

```
index.html      kerangka halaman
style.css       tampilan
game.js         SUMBER logika game (edit di sini)
game.min.js     hasil build dari game.js (ini yang dimuat browser)
sw.js           service worker (cache aset)
build.sh        skrip build
cards/          gambar kartu (0 sampai 51, plus back)
cover/          background
```

## 🛠️ Menjalankan dan mengembangkan sendiri

**Butuh:** Node.js (untuk build) dan akun Firebase (Realtime Database).

1. Clone repo ini.
2. Buat project di [Firebase](https://console.firebase.google.com), aktifkan **Realtime Database**, lalu isi konfigurasi Firebase kamu di bagian config pada `game.js`.
3. Atur **Rules** Realtime Database supaya pemain bisa baca dan tulis ke data room.
4. Edit `game.js`, lalu build:
   ```sh
   sh build.sh
   ```
   Skrip ini membuat `game.min.js` memakai esbuild (diunduh otomatis lewat `npx`).
5. Jalankan lewat server statis apa saja, atau deploy ke GitHub Pages.

### Versi rilis

Nomor versi (`VER` di `game.js`) dinaikkan tiap rilis:

- **Major** (`v45`): aturan atau struktur data game berubah. Game yang sedang berjalan di versi lama ikut terputus.
- **Minor** (`v44.10`): perubahan tampilan atau perbaikan kecil. Game yang sedang berjalan tetap aman.

Halaman otomatis memuat ulang saat ada versi baru.

## 🧱 Dibuat dengan

- HTML, CSS, dan JavaScript murni (tanpa framework)
- Firebase Realtime Database untuk room dan sinkronisasi
- WebRTC untuk voice chat
- GitHub Pages untuk hosting

## 🙏 Kredit

- Gambar kartu: [Vecteezy.com](https://www.vecteezy.com) (Free License, atribusi wajib). Lihat `cards/CREDITS.txt` dan `cards/Vecteezy-License-Information.pdf`.
- Dibuat dengan bantuan AI (Claude).

## 📄 Lisensi

Kode: *(isi lisensi pilihanmu, misalnya MIT)*.
Gambar kartu mengikuti lisensi Vecteezy di atas dan **tidak** ikut lisensi kode.
