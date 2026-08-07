# Panduan Mendapatkan Kredensial Zoom Server-to-Server (S2S) OAuth

Untuk mengaktifkan pembuatan *Virtual Room* otomatis di CIMS, Anda perlu menghubungkan aplikasi dengan akun Zoom Anda (misalnya `ptkepulauanriau@gmail.com`) menggunakan metode **Server-to-Server OAuth**.

Berikut adalah langkah-langkah untuk mendapatkan `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, dan `ZOOM_CLIENT_SECRET`.

---

## Langkah 1: Login ke Zoom App Marketplace
1. Buka browser dan kunjungi [Zoom App Marketplace](https://marketplace.zoom.us/).
2. Login menggunakan akun email instansi (misal: `ptkepulauanriau@gmail.com`).
   *(Pastikan akun ini memiliki hak akses Administrator atau hak untuk membuat aplikasi developer di akun Zoom organisasi Anda).*

## Langkah 2: Buat Aplikasi Server-to-Server
1. Di pojok kanan atas, klik menu **Develop** lalu pilih **Build App**.
2. Anda akan melihat beberapa jenis aplikasi. Cari kotak yang bernama **Server-to-Server OAuth** dan klik tombol **Create**.
3. Beri nama aplikasi Anda, misalnya: `CIMS Virtual Court Integration`, lalu klik **Create**.

## Langkah 3: Ambil Kredensial (App Credentials)
Setelah aplikasi terbuat, Anda akan berada di halaman konfigurasi aplikasi.
1. Masuk ke tab **App Credentials** di menu sebelah kiri.
2. Di halaman ini, Anda akan melihat tiga informasi penting yang harus Anda *copy*:
   - **Account ID** $\rightarrow$ ini adalah `ZOOM_ACCOUNT_ID`
   - **Client ID** $\rightarrow$ ini adalah `ZOOM_CLIENT_ID`
   - **Client Secret** $\rightarrow$ ini adalah `ZOOM_CLIENT_SECRET` (Anda perlu mengeklik ikon mata/tampilkan untuk melihatnya).

## Langkah 4: Isi Informasi Aplikasi (Information)
1. Pindah ke tab **Information**.
2. Isi kolom wajib seperti **Company Name**, **Developer Name**, dan **Developer Email Address** (bisa menggunakan `ptkepulauanriau@gmail.com`).
3. Klik **Continue**.

## Langkah 5: Berikan Izin Akses (Scopes)
Agar CIMS dapat membuat jadwal (*meeting*) atas nama host, Anda harus memberikan izin khusus.
1. Pindah ke tab **Scopes**.
2. Klik tombol **+ Add Scopes**.
3. Centang izin berikut (minimum yang dibutuhkan):
   - **Meeting** $\rightarrow$ `meeting:write:admin` (Membuat dan mengelola meeting).
   - **Meeting** $\rightarrow$ `meeting:read:admin` (Melihat status meeting).
   - **User** $\rightarrow$ `user:read:admin` (Membaca data user, wajib jika host ditentukan lewat email).
4. Klik **Done** lalu **Continue**.

## Langkah 6: Aktivasi Aplikasi (Activation)
1. Pindah ke tab **Activation**.
2. Pastikan tertulis bahwa aplikasi siap diaktifkan, lalu klik tombol **Activate your app**.
3. Jika sudah aktif, aplikasi siap menerima permintaan (request) dari CIMS backend.

---

## Memasang ke Environment CIMS
Setelah semua didapatkan, buka file `.env` di server atau di proyek lokal Anda, dan isikan data tersebut:

```env
# Aktifkan mode integrasi sungguhan (Bukan Mock/Testing)
VIDEO_PROVIDER_MODE=HTTP
VIDEO_PROVIDER_URL=http://localhost:3010

# Masukkan Kredensial yang didapat dari Langkah 3
ZOOM_ACCOUNT_ID=xxxxxxxxxxxxxxxxx
ZOOM_CLIENT_ID=yyyyyyyyyyyyyyyyyy
ZOOM_CLIENT_SECRET=zzzzzzzzzzzzzzzzzzzzzzzz

# Tautkan dengan email instansi sebagai host persidangan
ZOOM_HOST_USER_ID=ptkepulauanriau@gmail.com
```

Setelah di-save, *restart* layanan CIMS (terutama `apps/api` dan `services/zoom-provider`).
