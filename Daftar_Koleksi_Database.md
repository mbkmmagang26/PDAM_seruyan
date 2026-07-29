# Daftar Koleksi Database (Firestore) Aplikasi PDAM Seruyan

Dokumen ini memuat daftar lengkap 18 koleksi utama yang menjadi arsitektur database aplikasi PDAM Seruyan. Struktur ini dirancang untuk mencakup seluruh operasional PDAM, mulai dari pelayanan publik hingga audit keuangan berlapis.

| No | Modul Sistem | Nama Koleksi Database | Penjelasan & Detail Fungsi |
|:---|:---|:---|:---|
| **1** | **Hak Akses & Pengguna** | `data_pelanggan_meteran` | **Buku Induk Pelanggan Publik.** Menyimpan profil masyarakat umum (nama, NIK, alamat, WA, golongan tarif, nomor meteran). Otomatis ditambahkan saat registrasi mandiri. |
| **2** | **Hak Akses & Pengguna** | `user_admin` | **Buku Induk Pegawai PDAM.** Sistem akses internal rahasia. Menyimpan profil Admin, Staf Lapangan, Akuntansi, beserta hak akses (*Role*) masing-masing. |
| **3** | **Pelayanan** | `permohonan_pasang_baru` | **Antrean Calon Pelanggan.** Formulir pasang baru. Admin akan mereview dan mengawal status pendaftaran dari "Menunggu Survei" hingga "Selesai Terpasang". |
| **4** | **Pelayanan** | `pengaduan_layanan_pelanggan` | **Pusat Bantuan & Komplain.** Menampung semua keluhan masyarakat (pipa bocor, air mati). Sangat krusial untuk respons cepat pelayanan. |
| **5** | **Operasional Lapangan** | `tugas_perbaikan_staf` | **Surat Perintah Kerja (SPK) Digital.** Penugasan tugas ke HP Staf Lapangan yang dilempar dari pengaduan atau pasang baru. Dilengkapi unggahan bukti foto pengerjaan. |
| **6** | **Operasional Lapangan** | `pembacaan_meter_staf` | **Buku Catat Meter Bulanan.** Bukti angka meteran hasil tinjauan staf keliling (foto + kubikasi). Menjadi dasar sistem penagihan keuangan bulanan. |
| **7** | **Keuangan** | `tagihan_air_pelanggan` | **Buku Piutang Perusahaan.** Menyimpan kalkulasi harga, denda, dan rincian total tagihan bulanan per pelanggan hasil dari olah data baca meter. |
| **8** | **Keuangan** | `laporan_penagihan_kasir` | **Laporan Setoran Harian (LPP).** Mencatat Laporan Penerimaan Penagihan bukti penerimaan pembayaran tunai yang diterima langsung oleh loket kasir PDAM. |
| **9** | **Keuangan** | `jurnal_transaksi_keuangan` | **Nadi Utama Akuntansi.** Jurnal Umum Buku Besar pembukuan (Debit-Kredit) riil. Merekam mutasi kas, utang, piutang, hingga aset. |
| **10** | **Keuangan** | `anggaran_operasional` | **Rencana & Plafon Pengeluaran.** Menjaga agar batas plafon pengeluaran per periode/departemen tidak jebol (kontrol budget). |
| **11** | **Master Data** | `master_tarif_air` | **Daftar Harga Air Tetap.** Menyimpan matriks harga air baku per meter kubik (M³) per golongan pelanggan (Rumah Tangga, Niaga, Sosial). |
| **12** | **Master Data** | `coa` | *(Chart of Accounts).* **Kamus Kode Akuntansi.** Master kode akun keuangan perusahaan (misal: 101 Kas, 201 Hutang Usaha, 401 Pendapatan Air). |
| **13** | **Master Data** | `mitra_vendor_pemasok` | **Buku Rekanan Bisnis.** Data pemasok (Supplier) atau vendor luar untuk kebutuhan pengadaan PDAM (material pipa, sewa alat, dll). |
| **14** | **Master Data** | `stok_material_pipa` | **Sistem Gudang/Inventori.** Memonitor stok fisik barang habis pakai (pipa PVC, water meter, seal) beserta sistem *alert* limit stok minimum. |
| **15** | **Master Data** | `inventaris_aset_tetap` | **Daftar Harta (Aset).** Pencatatan barang operasional jangka panjang (gedung, mobil tangki, pompa distribusi) guna memudahkan perhitungan penyusutan (depresiasi). |
| **16** | **Sistem & Log** | `notifikasi_pengguna` | **Kotak Masuk (Push Notification).** Pesan lonceng *alert* untuk pelanggan/pegawai, seperti pengingat tagihan jatuh tempo atau notifikasi tugas baru. |
| **17** | **Sistem & Log** | `log_aktivitas_pelanggan` | **CCTV Perilaku Pelanggan.** Analitik *back-end* tersembunyi yang menyimpan histori aksi pelanggan (kapan login, aktivitas klik penting). |
| **18** | **Sistem & Log** | `log_aktivitas_staf_admin` | **Audit Trail Staf Internal.** Rekaman jejak rahasia terkait aksi pegawai internal (siapa merubah tarif, kapan kasir menghapus transaksi) untuk pencegahan manipulasi ("orang dalam"). |

---
**Catatan:** Seluruh arsitektur tabel menggunakan format bahasa Indonesia (`snake_case`) murni guna memastikan kemudahan beradaptasi (*maintainability*) bagi penerus sistem PDAM Seruyan kelak.
