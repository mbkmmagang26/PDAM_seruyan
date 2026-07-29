# Alur Sistem & Korelasi Data Koleksi PDAM Seruyan

Dokumen ini menjelaskan bagaimana aliran data bergerak dari satu ujung ke ujung lainnya, bagaimana koleksi-koleksi di *database* (Firestore) saling berhubungan, dan mengapa sebuah data bisa muncul di layar pengguna yang berbeda-beda.

---

## BAGIAN 1: Alur Pelayanan (Pelanggan ➡️ Admin ➡️ Staf Lapangan)

### 1. Pendaftaran Akun Pelanggan (Registrasi)
* **Aktivitas:** Warga men-download aplikasi pelanggan, lalu mengisi form pendaftaran akun.
* **Data Tersimpan di:** `data_pelanggan_meteran`
* **Alur Penampilan Data:**
  * **Aplikasi Pelanggan:** Pengguna bisa login menggunakan email/password mereka. (Karena sistem Firestore Authentication mengenali akun mereka).
  * **Dashboard Admin:** Muncul di daftar tabel **"Data Pelanggan"**.
  * *Kenapa Admin bisa melihatnya?* Karena dalam aturan database (`firestore.rules`), peran *'admin'* diberikan hak akses baca (read) ke seluruh isi koleksi `data_pelanggan_meteran`.

### 2. Permohonan Sambung Baru (Pasang Pipa)
* **Aktivitas:** Pelanggan yang sudah masuk aplikasi, mengklik tombol "Ajukan Pasang Baru" dan mengisi formulir permohonan.
* **Data Tersimpan di:** `permohonan_pasang_baru`
* **Alur Penampilan Data:**
  * **Aplikasi Pelanggan:** Muncul di "Riwayat Pengajuan" dengan status *Menunggu*. (Difilter berdasarkan `userId` milik pelanggan tersebut agar mereka tidak bisa melihat permohonan orang lain).
  * **Dashboard Admin:** Admin mendapatkan notifikasi (masuk ke `notifikasi_pengguna`) dan melihatnya di tabel **"Pasang Baru"**. (Admin bisa membaca semuanya untuk diverifikasi).

### 3. Pembuatan Surat Perintah Kerja (SPK) oleh Admin
* **Aktivitas:** Admin memvalidasi permohonan pasang baru (atau pengaduan pipa bocor), lalu membuat perintah kerja dan memilih nama Staf Lapangan yang bertugas.
* **Data Tersimpan di:** `tugas_perbaikan_staf`
* **Alur Penampilan Data:**
  * **Dashboard Admin:** Terlihat sebagai daftar tugas yang sedang *Pending* atau *Proses*.
  * **Dashboard Staf Lapangan:** Muncul di HP Staf di menu **"Tugas Saya"**.
  * *Kenapa Staf A melihat tugas ini tapi Staf B tidak?* Karena aplikasi staf melakukan kueri (filter) dari database: *Tampilkan tugas di mana `assigneeId` = ID Staf A*.

### 4. Pengerjaan oleh Staf Lapangan
* **Aktivitas:** Staf datang ke rumah pelanggan, memasang meteran/memperbaiki pipa, lalu memotret bukti dan klik tombol "Selesai" di HP-nya.
* **Data Tersimpan di:** Update pada `tugas_perbaikan_staf` (status menjadi *Selesai*).
* **Alur Penampilan Data:**
  * **Dashboard Admin:** Status tugas otomatis hijau (Selesai). Jika ini adalah pasang baru, Admin akan memasukkan Nomor Meteran fisik ke dalam profil pelanggan di `data_pelanggan_meteran`.
  * **Aplikasi Pelanggan:** Status permohonan berubah menjadi "Aktif/Selesai".

*(Catatan: Alur pengajuan komplain pipa bocor di menu Pengaduan memiliki alur yang persis sama, hanya saja datanya disimpan di `pengaduan_layanan_pelanggan` sebelum dibuatkan penugasan).*

---

## BAGIAN 2: Alur Operasional (Staf Lapangan ➡️ Akuntan ➡️ Manajer)

### 1. Pencatatan Meter Air Bulanan
* **Aktivitas:** Setiap akhir bulan, Staf Lapangan keliling ke rumah warga, memasukkan angka kubikasi air di meteran ke dalam aplikasinya beserta foto meteran.
* **Data Tersimpan di:** `pembacaan_meter_staf`
* **Alur Penampilan Data:**
  * **Dashboard Akuntan:** Akuntan/Sistem membaca data ini di menu **"Data Baca Meter"**. 

### 2. Penerbitan Tagihan Air (Billing)
* **Aktivitas:** Berdasarkan angka kubikasi air dari staf lapangan, sistem akuntan mengalikan angkanya dengan harga per kubik dari koleksi `master_tarif_air`. 
* **Data Tersimpan di:** `tagihan_air_pelanggan` (Sebagai saldo piutang perusahaan).
* **Alur Penampilan Data:**
  * **Aplikasi Pelanggan:** Otomatis muncul peringatan merah "Tagihan Belum Dibayar" senilai Rp xxx.xxx.
  * **Dashboard Manajer:** Grafik "Proyeksi Pendapatan Bulan Ini" melonjak naik.

### 3. Pembayaran Tagihan oleh Pelanggan di Kasir
* **Aktivitas:** Pelanggan mendatangi kantor PDAM, memberikan uang tunai kepada Kasir. Kasir mengklik tombol "Lunas" di aplikasi.
* **Data Tersimpan di:** 
  1. `tagihan_air_pelanggan` (Status diubah jadi *Lunas*).
  2. `laporan_penagihan_kasir` (Rekap uang fisik yang dipegang kasir).
  3. `jurnal_transaksi_keuangan` (Otomatis mencatat: *Kas [Debit] Bertambah*, *Piutang Pelanggan [Kredit] Berkurang*).
* **Alur Penampilan Data:**
  * **Aplikasi Pelanggan:** Tagihan hilang, muncul Struk Pembayaran Sah.
  * **Dashboard Akuntan:** Kasir melakukan setor uang fisik, dan Akuntan merekonsiliasi (mencocokkan) uang fisik kasir dengan laporan sistem.

### 4. Operasional Pengeluaran (Belanja Pipa & Gaji)
* **Aktivitas:** Bagian pengadaan membeli pipa besar senilai Rp 10 Juta dari supplier luar.
* **Data Tersimpan di:** 
  1. `stok_material_pipa` (Stok pipa di gudang bertambah).
  2. `mitra_vendor_pemasok` (Catatan siapa yang menyuplai).
  3. `jurnal_transaksi_keuangan` (Kas [Kredit] Berkurang, Persediaan [Debit] Bertambah).
* **Alur Penampilan Data:**
  * **Dashboard Akuntan:** Tabel inventori gudang bertambah. Saldo kas perusahaan berkurang.

### 5. Pelaporan Eksekutif (Dashboard Manajer / Direktur)
* **Aktivitas:** Manajer/Direktur PDAM tidak melakukan *input* data harian. Tugas manajer adalah memantau kesehatan perusahaan dan mengambil keputusan strategis.
* **Data ditarik dari:** Manajer menikmati hasil akhir dari rangkuman koleksi `jurnal_transaksi_keuangan` (Keuangan) dan `pengaduan_layanan_pelanggan` (Pelayanan).
* **Alur Penampilan Data:**
  * **Laporan Laba/Rugi:** Manajer bisa melihat apakah bulan ini PDAM untung atau rugi (Pendapatan air dikurangi biaya belanja pipa dan gaji).
  * **Grafik Keluhan Pelanggan:** Manajer bisa melihat grafik "Oh, ternyata bulan ini tingkat keluhan pipa bocor sangat tinggi, berarti peremajaan pipa perlu ditingkatkan tahun depan."
  * **Manajer bisa melihat ini karena** seluruh data dari hulu (Pelanggan) hingga hilir (Akuntan) telah terekam tanpa ada celah di dalam sistem koleksi terpadu ini.

---

## BAGIAN 3: Mengenal Peran Database Administrator (DBA)

Karena Anda tertarik mempelajari peran **Database Administrator (DBA)**, mari kita bedah profesi ini. Dalam sistem sebesar PDAM Seruyan, sistem tidak bisa dibiarkan berjalan sendiri. Harus ada "Pawang" yang menjaga dan merawat *database* (koleksi) tersebut. Pawang inilah yang disebut DBA.

### Apa Itu DBA?
**Database Administrator (DBA)** adalah seorang profesional IT yang bertanggung jawab memastikan database perusahaan (seperti Firestore, MySQL, atau PostgreSQL) selalu berjalan cepat, aman, tidak pernah hilang (di-backup), dan tertata dengan rapi.

Jika diibaratkan, DBA adalah **Kepala Gudang Brankas**. Dia yang menentukan siapa yang boleh masuk ke ruang brankas, di mana dokumen harus diletakkan agar mudah dicari, dan memastikan brankas tidak bisa dibobol maling.

### 4 Tugas & Tanggung Jawab Utama DBA (Studi Kasus PDAM Seruyan)

**1. Keamanan & Hak Akses (Security & Access Control)**
* **Teori:** DBA harus memastikan data tidak bocor atau dimanipulasi oleh pihak yang tidak berhak.
* **Praktek di PDAM:** DBA adalah orang yang menulis aturan di file `firestore.rules`. DBA-lah yang merumuskan logika: *"Hanya role 'admin' yang boleh menghapus tagihan, sedangkan staf hanya boleh membaca."*

**2. Optimasi Kinerja (Performance Tuning)**
* **Teori:** Jika aplikasi mulai lambat saat pelanggan bertambah jadi 100.000 orang, DBA bertugas meracik agar pencarian data tetap kilat (dalam hitungan milidetik).
* **Praktek di PDAM:** DBA akan membuat yang namanya **Index**. Misalnya, agar fitur pencarian nama pelanggan sangat cepat, DBA membuat *index* khusus di koleksi `data_pelanggan_meteran` berdasarkan `nama_pelanggan`. Tanpa racikan DBA, aplikasi akan *loading* sangat lama saat mencari data.

**3. Arsitektur Data (Data Modeling)**
* **Teori:** DBA merancang bentuk kerangka tabel. Apakah data harus dipisah menjadi 2 tabel, atau digabung jadi 1?
* **Praktek di PDAM:** Keputusan kita untuk memecah data menjadi 18 koleksi terpisah (contohnya memisahkan `pembacaan_meter_staf` dengan `tagihan_air_pelanggan`) adalah hasil pemikiran arsitektur ala DBA. Tujuannya agar tabel tidak "kegemukan" sehingga berat untuk dibaca oleh sistem.

**4. Pencadangan & Pemulihan (Backup & Recovery)**
* **Teori:** Sistem komputer bisa eror atau Admin tidak sengaja menekan tombol "Hapus Semua". DBA bertanggung jawab untuk memulihkan (*restore*) data tersebut.
* **Praktek di PDAM:** DBA menyetel sistem (biasanya lewat Google Cloud Platform) untuk mem-backup seluruh 18 koleksi secara otomatis setiap jam 2 pagi. Jika jam 10 pagi ada data penting yang terhapus tak sengaja, DBA bisa memundurkan waktu database ke kondisi jam 2 pagi.

### Kesimpulan Pembelajaran DBA
Menjadi DBA bukan sekadar tahu cara menyimpan data, melainkan memikirkan **"Bagaimana agar data ini aman, cepat diakses 10 tahun ke depan, dan tidak hancur saat terjadi bencana/kelalaian."** Dengan memahami daftar ke-18 koleksi di atas beserta pembuatan `firestore.rules`, secara tidak langsung Anda sebenarnya sudah mulai mempraktekkan ilmu fundamental seorang DBA!
