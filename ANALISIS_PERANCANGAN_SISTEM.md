# Analisis dan Perancangan Sistem Aplikasi PDAM Tirta Seruyan

Dokumen ini berisi rancangan alur logika sistem (Flowmap) dan interaksi antarmuka pengguna (User Flow) yang digunakan sebagai lampiran laporan MBKM.

---

## 1. Flowmap (Cross-Functional Flowchart)

### A. Flowmap Pengaduan & Perbaikan
```mermaid
flowchart TD
    subgraph L1 [Lajur: Pelanggan]
        direction TB
        S_START([START]) --> P1(Buka Aplikasi)
        P1 --> P2[/Isi Form Pengaduan/]
        P2 --> P3(Kirim Laporan)
        P4(Terima Notifikasi) --> S_END([END])
    end

    subgraph L2 [Lajur: Admin PDAM]
        direction TB
        A1(Terima Laporan) --> A2{Laporan Valid?}
        A2 -- Tidak --> A3(Tolak Laporan)
        A2 -- Ya --> A4(Buat Perintah Kerja)
        A5(Verifikasi Pekerjaan Staff) --> A6(Update Status Selesai)
    end

    subgraph L3 [Lajur: Staff Lapangan]
        direction TB
        S1(Terima Perintah Kerja) --> S2(Perbaikan di Lapangan)
        S2 --> S3[/Upload Foto Bukti/]
    end

    %% Hubungan Antar Lajur
    P3 ==> A1
    A3 -.-> P4
    A4 ==> S1
    S3 ==> A5
    A6 ==> P4

    %% Warna Lajur & Terminal
    style L1 fill:#f9f9f9,stroke:#333,stroke-width:1px
    style L2 fill:#e6f3ff,stroke:#333,stroke-width:1px
    style L3 fill:#fff3e6,stroke:#333,stroke-width:1px
    style S_START fill:#222,stroke:#000,stroke-width:2px,color:#fff,font-weight:bold
    style S_END fill:#222,stroke:#000,stroke-width:2px,color:#fff,font-weight:bold
```

### B. Flowmap Pencatatan Meter, Tagihan & Akunting (Siklus Bulanan)
```mermaid
flowchart TD
    subgraph L1 [Lajur: Staff Lapangan]
        direction TB
        S_START([START]) --> S1(Cek Daftar Pelanggan)
        S1 --> S2[/Input Angka Meter Air/]
    end

    subgraph L2 [Lajur: Admin / Sistem]
        direction TB
        A1(Sistem Menerima Data) --> A2(Hitung Pemakaian Air)
        A2 --> A3(Terbitkan Tagihan)
        A4(Update Status Jadi Lunas)
    end

    subgraph L3 [Lajur: Pelanggan]
        direction TB
        P1(Terima Notifikasi Tagihan) --> P2[/Lakukan Pembayaran/]
    end

    subgraph L4 [Lajur: Akunting]
        direction TB
        K1(Catat Uang Masuk di Kas) --> K2(Masuk Buku Besar)
        K2 --> S_END([END])
    end

    %% Hubungan Antar Lajur
    S2 ==> A1
    A3 ==> P1
    P1 ==> P2
    P2 ==> A4
    A4 ==> K1

    %% Warna Lajur & Terminal
    style L1 fill:#fff3e6,stroke:#333,stroke-width:1px
    style L2 fill:#e6f3ff,stroke:#333,stroke-width:1px
    style L3 fill:#f9f9f9,stroke:#333,stroke-width:1px
    style L4 fill:#e6ffe6,stroke:#333,stroke-width:1px
    style S_START fill:#222,stroke:#000,stroke-width:2px,color:#fff,font-weight:bold
    style S_END fill:#222,stroke:#000,stroke-width:2px,color:#fff,font-weight:bold
```

---

## 2. User Flow Aplikasi

### A. User Flow Aplikasi Pelanggan (Cek & Bayar Tagihan)
```mermaid
flowchart LR
    S_START([START]) --> A(Halaman Login)
    A --> B(Dashboard Pelanggan)
    B --> C(Menu Cek Tagihan)
    C --> D(Halaman Detail Tagihan)
    D --> E{Bayar Sekarang?}
    E -- Ya --> F(Halaman Konfirmasi & Bayar)
    E -- Tidak --> B
    F --> G(Halaman Bukti Lunas)
    G --> S_END([END])
    
    style S_START fill:#222,stroke:#000,color:#fff,font-weight:bold
    style S_END fill:#222,stroke:#000,color:#fff,font-weight:bold
    style A fill:#f1f8ff,stroke:#0366d6
    style B fill:#f1f8ff,stroke:#0366d6
    style C fill:#f1f8ff,stroke:#0366d6
    style D fill:#f1f8ff,stroke:#0366d6
    style E fill:#fff,stroke:#333,stroke-width:2px
    style F fill:#f1f8ff,stroke:#0366d6
    style G fill:#e6ffe6,stroke:#28a745,stroke-width:2px
```

### B. User Flow Staff Lapangan (Input Angka Meter)
```mermaid
flowchart LR
    S_START([START]) --> A(Halaman Login)
    A --> B(Dashboard Staff)
    B --> C(Menu Tugas / Tasks)
    C --> D(Pilih Nama Pelanggan)
    D --> E(Form Input Stand Meter)
    E --> F{Data Valid?}
    F -- Tidak --> E
    F -- Ya --> G(Halaman Upload Foto)
    G --> H(Tugas Selesai)
    H --> S_END([END])

    style S_START fill:#222,stroke:#000,color:#fff,font-weight:bold
    style S_END fill:#222,stroke:#000,color:#fff,font-weight:bold
    style A fill:#fffbdd,stroke:#b08800
    style B fill:#fffbdd,stroke:#b08800
    style C fill:#fffbdd,stroke:#b08800
    style D fill:#fffbdd,stroke:#b08800
    style E fill:#fffbdd,stroke:#b08800
    style F fill:#fff,stroke:#333,stroke-width:2px
    style G fill:#fffbdd,stroke:#b08800
    style H fill:#e6ffe6,stroke:#28a745,stroke-width:2px
```

### C. User Flow Admin PDAM (Menugaskan Perbaikan Gangguan)
```mermaid
flowchart LR
    S_START([START]) --> A(Halaman Login)
    A --> B(Dashboard Admin)
    B --> C(Menu Pengaduan)
    C --> D(Halaman Detail Pengaduan)
    D --> E{Tindak Lanjuti?}
    E -- Tidak --> F(Ubah Status Ditolak)
    E -- Ya --> G(Halaman Data Perintah Kerja)
    G --> H(Assign ke Staff Lapangan)
    F --> S_END([END])
    H --> S_END

    style S_START fill:#222,stroke:#000,color:#fff,font-weight:bold
    style S_END fill:#222,stroke:#000,color:#fff,font-weight:bold
    style A fill:#f0fff4,stroke:#22863a
    style B fill:#f0fff4,stroke:#22863a
    style C fill:#f0fff4,stroke:#22863a
    style D fill:#f0fff4,stroke:#22863a
    style E fill:#fff,stroke:#333,stroke-width:2px
    style F fill:#ffe6e6,stroke:#d73a49
    style G fill:#f0fff4,stroke:#22863a
    style H fill:#e6ffe6,stroke:#28a745,stroke-width:2px
```

### D. User Flow Direktur / Akunting (Cek Laporan Keuangan)
```mermaid
flowchart LR
    S_START([START]) --> A(Halaman Login)
    A --> B(Dashboard Keuangan)
    B --> C(Menu Buku Besar)
    C --> D(Halaman Data Transaksi)
    D --> E{Perlu Edit Data?}
    E -- Ya --> F(Form Edit Transaksi)
    F --> G(Simpan Perubahan)
    E -- Tidak --> H{Cetak Laporan?}
    G --> H
    H -- Ya --> I(Download PDF / Excel)
    H -- Tidak --> S_END([END])
    I --> S_END

    style S_START fill:#222,stroke:#000,color:#fff,font-weight:bold
    style S_END fill:#222,stroke:#000,color:#fff,font-weight:bold
    style A fill:#fdf4ff,stroke:#6f42c1
    style B fill:#fdf4ff,stroke:#6f42c1
    style C fill:#fff,stroke:#333,stroke-width:2px
    style D fill:#fdf4ff,stroke:#6f42c1
    style E fill:#fdf4ff,stroke:#6f42c1
    style F fill:#fdf4ff,stroke:#6f42c1
    style G fill:#fdf4ff,stroke:#6f42c1
    style H fill:#fff,stroke:#333,stroke-width:2px
    style I fill:#e6ffe6,stroke:#28a745,stroke-width:2px
```

---

## 3. Flowchart Sistem

### A1. Flowchart Proses Login Aplikasi Pelanggan
```mermaid
flowchart TD
    S_START([START]) --> P1(Buka Aplikasi Pelanggan)
    P1 --> A[/Input Email dan Password/]
    A --> DB[(Database Users)]
    DB --> B(Sistem Memvalidasi Data)
    B --> C{Data Cocok?}
    C -- Tidak --> D(Tampilkan Pesan Error)
    D --> A
    C -- Ya --> F(Masuk Dashboard Pelanggan)
    F --> S_END([END])

    style S_START fill:#222,stroke:#000,color:#fff,font-weight:bold
    style S_END fill:#222,stroke:#000,color:#fff,font-weight:bold
    style C fill:#fff,stroke:#333,stroke-width:2px
```

### A2. Flowchart Proses Login Aplikasi Internal (Portal Pegawai)
```mermaid
flowchart TD
    S_START([START]) --> P1(Buka Halaman Utama Internal PDAM)
    P1 --> P2[/User Memilih Portal: Admin / Staff / Keuangan/]
    P2 --> L1[/Input Email & Password/]
    
    L1 --> DB[(Database Users)]
    DB --> B(Sistem Validasi Kredensial & Kesesuaian Role)
    B --> C{Login Valid?}
    
    C -- Tidak --> D(Tampilkan Pesan Error)
    D --> P2
    
    C -- Ya --> E{Role = Admin?}
    E -- Ya --> G(Masuk Dashboard Admin)
    E -- Tidak --> E2{Role = Staff Lapangan?}
    E2 -- Ya --> H(Masuk Dashboard Staff)
    E2 -- Tidak --> I(Masuk Dashboard Keuangan)
    
    G --> S_END([END])
    H --> S_END
    I --> S_END

    style S_START fill:#222,stroke:#000,color:#fff,font-weight:bold
    style S_END fill:#222,stroke:#000,color:#fff,font-weight:bold
    style C fill:#fff,stroke:#333,stroke-width:2px
    style E fill:#fff,stroke:#333,stroke-width:2px
    style E2 fill:#fff,stroke:#333,stroke-width:2px
```

### B. Flowchart Perhitungan Tagihan (Billing)
```mermaid
flowchart TD
    S_START([START]) --> A[/Sistem Menerima Input Stand Meter Baru/]
    
    A --> DB1[(Database: Meter_Readings)]
    DB1 --> B(Baca Data Stand Meter Bulan Lalu)
    B --> C(Hitung: Pemakaian = Stand Baru - Stand Lama)
    
    C --> DB2[(Database: Users & Golongan)]
    DB2 --> D(Cek ID Golongan Pelanggan)
    D --> E(Ambil Data Tarif Dasar & Biaya Admin)
    
    E --> F{Ada Tunggakan Sebelumnya?}
    F -- Ya --> G(Hitung: Tagihan = [Pemakaian * Tarif] + Admin + Denda)
    F -- Tidak --> H(Hitung: Tagihan = [Pemakaian * Tarif] + Admin)
    
    G --> I(Simpan Record Tagihan Baru)
    H --> I
    I --> DB3[(Database: Bills)]
    
    DB3 --> J[\"Dokumen: Invoice / Struk Tagihan Air"\]
    J --> S_END([END])

    style S_START fill:#222,stroke:#000,color:#fff,font-weight:bold
    style S_END fill:#222,stroke:#000,color:#fff,font-weight:bold
    style F fill:#fff,stroke:#333,stroke-width:2px
    style DB1 fill:#f9f0ff,stroke:#6f42c1,stroke-width:2px
    style DB2 fill:#f9f0ff,stroke:#6f42c1,stroke-width:2px
    style DB3 fill:#f9f0ff,stroke:#6f42c1,stroke-width:2px
    style J fill:#fffbdd,stroke:#b08800,stroke-width:2px
```

### C. Flowchart Proses Pembayaran & Pencatatan Kas
```mermaid
flowchart TD
    S_START([START]) --> A[/Terima Input Pembayaran Pelanggan/]
    A --> DB1[(Database: Bills)]
    DB1 --> B(Cek Validasi Jumlah Tagihan)
    B --> C{Pembayaran Valid?}
    C -- Tidak --> D(Tolak Pembayaran)
    D --> A
    C -- Ya --> E(Ubah Status Tagihan menjadi LUNAS)
    E --> DB1_UPDATE[(Database: Bills)]
    DB1_UPDATE --> F(Kirim Data Pendapatan ke Akunting)
    F --> DB2[(Database: Buku_Besar)]
    DB2 --> G(Simpan Record Pemasukan)
    G --> H[\"Dokumen: Kuitansi Pembayaran Lunas"\]
    H --> S_END([END])

    style S_START fill:#222,stroke:#000,color:#fff,font-weight:bold
    style S_END fill:#222,stroke:#000,color:#fff,font-weight:bold
    style C fill:#fff,stroke:#333,stroke-width:2px
    style DB1 fill:#f9f0ff,stroke:#6f42c1,stroke-width:2px
    style DB1_UPDATE fill:#f9f0ff,stroke:#6f42c1,stroke-width:2px
    style DB2 fill:#f9f0ff,stroke:#6f42c1,stroke-width:2px
    style H fill:#fffbdd,stroke:#b08800,stroke-width:2px
```

### D. Flowchart Pengajuan Sambungan Baru
```mermaid
flowchart TD
    S_START([START]) --> A[/Terima Form Pendaftaran Sambungan Baru/]
    A --> DB1[(Database: Permohonan)]
    DB1 --> B(Sistem Menyimpan Data Permohonan)
    B --> C(Admin Cek Validasi Kelengkapan Dokumen)
    C --> D{Dokumen Lengkap?}
    D -- Tidak --> E(Kirim Notifikasi Dokumen Kurang)
    E --> S_END([END])
    D -- Ya --> F(Buat Perintah Kerja Pemasangan)
    F --> DB2[(Database: Tasks)]
    DB2 --> G(Tunggu Konfirmasi Staff Selesai Pasang)
    G --> H{Pemasangan Selesai?}
    H -- Tidak --> G
    H -- Ya --> I(Generate ID Pelanggan Baru)
    I --> DB3[(Database: Users)]
    DB3 --> J(Aktifkan Status Pelanggan)
    J --> S_END

    style S_START fill:#222,stroke:#000,color:#fff,font-weight:bold
    style S_END fill:#222,stroke:#000,color:#fff,font-weight:bold
    style D fill:#fff,stroke:#333,stroke-width:2px
    style H fill:#fff,stroke:#333,stroke-width:2px
    style DB1 fill:#f9f0ff,stroke:#6f42c1,stroke-width:2px
    style DB2 fill:#f9f0ff,stroke:#6f42c1,stroke-width:2px
    style DB3 fill:#f9f0ff,stroke:#6f42c1,stroke-width:2px
```

### E. Flowchart Pengaduan / Pelaporan Gangguan
```mermaid
flowchart TD
    S_START([START]) --> A[/Terima Input Form Pengaduan/]
    A --> DB1[(Database: Pengaduan)]
    DB1 --> B(Sistem Menyimpan Pengaduan Status PENDING)
    B --> C(Admin Review Laporan)
    C --> D{Laporan Masuk Akal?}
    D -- Tidak --> E(Ubah Status DITOLAK)
    E --> DB1
    E --> S_END([END])
    D -- Ya --> F(Ubah Status DIPROSES)
    F --> DB1
    F --> G(Buat Perintah Kerja Perbaikan)
    G --> DB2[(Database: Tasks)]
    DB2 --> H(Staff Konfirmasi Selesai & Upload Foto)
    H --> I(Ubah Status SELESAI)
    I --> DB1
    I --> J[\"Dokumen: Bukti Penyelesaian Gangguan"\]
    J --> S_END

    style S_START fill:#222,stroke:#000,color:#fff,font-weight:bold
    style S_END fill:#222,stroke:#000,color:#fff,font-weight:bold
    style D fill:#fff,stroke:#333,stroke-width:2px
    style DB1 fill:#f9f0ff,stroke:#6f42c1,stroke-width:2px
    style DB2 fill:#f9f0ff,stroke:#6f42c1,stroke-width:2px
    style J fill:#fffbdd,stroke:#b08800,stroke-width:2px
```

### F. Flowchart Laporan Keuangan (Jurnal & Buku Besar Akunting)
```mermaid
flowchart TD
    S_START([START]) --> A[/Input Tanggal Filter Laporan/]
    A --> DB1[(Database: Buku_Besar)]
    DB1 --> B(Sistem Mengambil Data Transaksi Keuangan)
    B --> C{Data Ditemukan?}
    
    C -- Tidak --> D(Tampilkan Pesan: Data Kosong)
    D --> S_END([END])
    
    C -- Ya --> E(Sistem Mengelompokkan Data berdasarkan Kode COA)
    E --> F(Kalkulasi Total Debit dan Kredit)
    F --> G{Debit & Kredit Balance?}
    
    G -- Tidak --> H(Tampilkan Pesan: Out of Balance)
    H --> I[/Input: Perbaiki Data Jurnal/]
    I --> DB1_UPDATE[(Database: Buku_Besar)]
    DB1_UPDATE --> E
    
    G -- Ya --> J(Generate Format Laporan Buku Besar Akhir)
    J --> K[\"Dokumen: Laporan Keuangan"\]
    
    K --> S_END([END])

    style S_START fill:#222,stroke:#000,color:#fff,font-weight:bold
    style S_END fill:#222,stroke:#000,color:#fff,font-weight:bold
    style C fill:#fff,stroke:#333,stroke-width:2px
    style G fill:#fff,stroke:#333,stroke-width:2px
    style DB1 fill:#f9f0ff,stroke:#6f42c1,stroke-width:2px
    style DB1_UPDATE fill:#f9f0ff,stroke:#6f42c1,stroke-width:2px
    style K fill:#fffbdd,stroke:#b08800,stroke-width:2px
```
