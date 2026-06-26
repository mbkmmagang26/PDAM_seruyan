# Analisis dan Perancangan Sistem Aplikasi PDAM Tirta Seruyan

Dokumen ini berisi rancangan alur logika sistem (Flowmap) dan interaksi antarmuka pengguna (User Flow) yang digunakan sebagai lampiran laporan MBKM.

---

## 1. Flowmap (Cross-Functional Flowchart)

### A. Flowmap Prosedur Pembukuan Manual (Sistem Lama / Sebelum Aplikasi)
```mermaid
flowchart TD
    subgraph L1 [Lajur: Kasir / Staf]
        direction TB
        S_START([START]) --> M1[/Menerima Pembayaran Manual/]
        M1 --> M2(Tulis Kuitansi Kertas Rangkap 2)
        M2 --> M3[\"Dokumen: Kuitansi (Bawa Pulang Pelanggan)"\]
        M2 --> M4[\"Dokumen: Kuitansi (Arsip PDAM)"\]
        M4 --> M5(Buat Rekap Penerimaan Harian)
        M5 --> M6[\"Dokumen: Rekap Kas Harian"\]
    end

    subgraph L2 [Lajur: Bagian Keuangan]
        direction TB
        K1(Terima Rekap & Uang Fisik) --> K2{Jumlah Cocok?}
        K2 -- Tidak --> K3(Kembalikan untuk Dicek Ulang)
        K3 -.-> M5
        K2 -- Ya --> K4(Catat Manual ke Buku Tulis / Excel Kas Umum)
        K4 --> K5(Rekap Akhir Bulan ke Buku Besar Manual)
        K5 --> K6(Ketik Laporan Keuangan Akhir di Word/Excel)
        K6 --> K7[\"Dokumen: Laporan Keuangan Kertas"\]
    end

    subgraph L3 [Lajur: Direktur]
        direction TB
        D1(Terima Laporan Fisik) --> D2(Cek & Tanda Tangan)
        D2 --> D3[\"Dokumen: Laporan Keuangan ACC"\]
        D3 --> S_END([END])
    end

    %% Hubungan Antar Lajur
    M6 ==> K1
    K7 ==> D1

    %% Warna Lajur & Terminal
    style L1 fill:#f9f9f9,stroke:#333,stroke-width:1px
    style L2 fill:#e6f3ff,stroke:#333,stroke-width:1px
    style L3 fill:#fff3e6,stroke:#333,stroke-width:1px
    style S_START fill:#222,stroke:#000,stroke-width:2px,color:#fff,font-weight:bold
    style S_END fill:#222,stroke:#000,stroke-width:2px,color:#fff,font-weight:bold
    style K2 fill:#fff,stroke:#333,stroke-width:2px
    style M3 fill:#fffbdd,stroke:#b08800,stroke-width:2px
    style M4 fill:#fffbdd,stroke:#b08800,stroke-width:2px
    style M6 fill:#fffbdd,stroke:#b08800,stroke-width:2px
    style K7 fill:#fffbdd,stroke:#b08800,stroke-width:2px
    style D3 fill:#fffbdd,stroke:#b08800,stroke-width:2px
```

### B. Flowmap Pengaduan & Perbaikan (Sistem Usulan)
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

### C. Flowmap Pencatatan Meter, Tagihan & Akunting (Siklus Bulanan Sistem Usulan)
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

### D. User Flow Akuntan (Mengelola Laporan Keuangan)
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
    style C fill:#fdf4ff,stroke:#6f42c1
    style D fill:#fdf4ff,stroke:#6f42c1
    style E fill:#fff,stroke:#333,stroke-width:2px
    style F fill:#fdf4ff,stroke:#6f42c1
    style G fill:#fdf4ff,stroke:#6f42c1
    style H fill:#fff,stroke:#333,stroke-width:2px
    style I fill:#e6ffe6,stroke:#28a745,stroke-width:2px
```

### E. User Flow Direktur (Pemantauan Keuangan)
```mermaid
flowchart LR
    S_START([START]) --> A(Halaman Login)
    A --> B(Dashboard Pemantauan Utama)
    B --> C(Menu Laporan Keuangan)
    C --> D(Tinjau Neraca Saldo / Jurnal)
    D --> E{Unduh Laporan?}
    E -- Ya --> F(Export PDF / Excel)
    E -- Tidak --> S_END([END])
    F --> S_END

    style S_START fill:#222,stroke:#000,color:#fff,font-weight:bold
    style S_END fill:#222,stroke:#000,color:#fff,font-weight:bold
    style A fill:#fff3e6,stroke:#d97706
    style B fill:#fff3e6,stroke:#d97706
    style C fill:#fff3e6,stroke:#d97706
    style D fill:#fff3e6,stroke:#d97706
    style E fill:#fff,stroke:#333,stroke-width:2px
    style F fill:#e6ffe6,stroke:#28a745,stroke-width:2px
```

### F. User Flow Kasir Loket (Pelayanan Pembayaran Fisik)
```mermaid
flowchart LR
    S_START([START]) --> A(Halaman Login)
    A --> B(Dashboard Kasir / Admin)
    B --> C(Cari ID Pelanggan)
    C --> D(Halaman Detail Tagihan)
    D --> E(Terima Pembayaran Tunai)
    E --> F(Proses Pelunasan Tagihan)
    F --> G(Cetak Kuitansi Kertas)
    G --> S_END([END])

    style S_START fill:#222,stroke:#000,color:#fff,font-weight:bold
    style S_END fill:#222,stroke:#000,color:#fff,font-weight:bold
    style A fill:#f0f8ff,stroke:#0366d6
    style B fill:#f0f8ff,stroke:#0366d6
    style C fill:#f0f8ff,stroke:#0366d6
    style D fill:#f0f8ff,stroke:#0366d6
    style E fill:#f0f8ff,stroke:#0366d6
    style F fill:#f0f8ff,stroke:#0366d6
    style G fill:#e6ffe6,stroke:#28a745,stroke-width:2px
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

---

## 4. Entity Relationship Diagram (ERD) Basis Data

Berikut adalah arsitektur basis data relasional yang mengelola seluruh data operasional dan transaksi akuntansi (Buku Besar/Jurnal) di sistem PDAM.

```mermaid
erDiagram
    user_admin ||--o{ tb_pelanggan : "mengelola"
    user_admin {
        string uid PK "Firebase Auth UID"
        string nama
        string email
        string role "Admin, Staff, Keuangan, Kasir, Direktur"
    }

    tb_pelanggan ||--o{ pengaduan_pelanggan : "mengajukan"
    tb_pelanggan ||--o{ tb_billing : "memiliki tagihan"
    tb_pelanggan {
        string id PK "Document ID"
        string no_meter
        string nama_pelanggan
        string golongan
        timestamp created_at
    }

    pengaduan_pelanggan {
        string id PK "Document ID"
        string pelanggan_id FK "Reference"
        string deskripsi_keluhan
        string status "Menunggu, Diproses, Selesai"
        timestamp tanggal_lapor
    }

    tb_billing ||--o| transactions : "memicu jurnal (runTransaction)"
    tb_billing {
        string id PK "Document ID"
        string pelanggan_id FK "Reference"
        number stand_awal
        number stand_akhir
        number pemakaian
        number total_tagihan
        string status "Belum Lunas, Lunas"
    }

    coa ||--o{ transactions : "diklasifikasikan_sebagai"
    coa {
        string id PK "Document ID"
        string kode_akun
        string nama_akun
        string tipe_akun
    }

    transactions {
        string id PK "Document ID"
        string billing_id FK "Reference"
        string coa_id FK "Reference"
        string deskripsi
        number debit
        number kredit
        timestamp tanggal_transaksi
    }
```

---

## 5. Data Flow Diagram (DFD)

Meskipun secara konvensional DFD digambar menggunakan *tool* desain khusus, berikut adalah representasi arsitektur DFD menggunakan sintaks Mermaid (Flowchart Mode) untuk menggambarkan aliran data antar entitas (*Entity*), proses (*Process*), dan *Database* (*Data Store*).

### A. DFD Level 0 (Context Diagram)
```mermaid
flowchart TD
    %% Entitas Luar
    E1[Pelanggan]
    E2[Petugas Lapangan]
    E3[Kasir Loket]
    E4[Akuntan]

    %% Sistem Utama
    S0((0.0\nSistem Informasi\nDatabase PDAM))

    %% Aliran Data
    E1 -->|1. Data Registrasi & Keluhan| S0
    S0 -->|2. Info Tagihan & Status Keluhan| E1
    
    E2 -->|3. Foto & Angka Stand Meter| S0
    S0 -->|4. Penugasan Lapangan| E2
    
    E3 -->|5. Input Pembayaran Tagihan| S0
    S0 -->|6. Status Validasi & Cetak Kuitansi| E3
    
    E4 -->|7. Query Laporan & Setup COA| S0
    S0 -->|8. Data Jurnal Transaksi| E4

    classDef entity fill:#e6f3ff,stroke:#0366d6,stroke-width:2px;
    classDef system fill:#fffbdd,stroke:#b08800,stroke-width:2px,shape:circle;
    
    class E1,E2,E3,E4 entity;
    class S0 system;
```

### B. DFD Level 1 (Rincian Proses Utama)
```mermaid
flowchart TD
    %% Entitas Luar
    E1[Pelanggan]
    E2[Petugas Lapangan]
    E3[Kasir Loket]
    E4[Akuntan]

    %% Proses (Lingkaran)
    P1((1.0\nBilling &\nPembayaran))
    P2((2.0\nOperasional\n& Loket))
    P3((3.0\nPenjurnalan\nOtomatis))
    P4((4.0\nPenyusunan\nNeraca Saldo))

    %% Data Stores (Silinder)
    DS1[(D1. tb_pelanggan)]
    DS2[(D2. tb_billing)]
    DS3[(D3. pengaduan)]
    DS4[(D4. transactions)]
    DS5[(D5. coa)]

    %% --- Relasi Pelanggan ---
    E1 -->|Cek Tagihan & Bayar| P1
    P1 -->|Kuitansi / Bukti Lunas| E1
    E1 -->|Kirim Keluhan| P2
    P2 -->|Status Keluhan| E1

    %% --- Relasi Petugas Lapangan ---
    P2 -->|Assign Tugas| E2
    E2 -->|Input Meter / Foto| P2

    %% --- Relasi Kasir Loket ---
    E3 -->|Input Uang Tunai| P2
    P2 -->|Ubah Status Lunas| DS2

    %% --- Relasi Akuntan ---
    E4 -->|Setup Akun COA| P3
    P4 -->|Laporan PDF / Excel| E4

    %% --- Relasi antar Proses & Database ---
    P2 -->|Simpan Pemakaian| DS2
    P2 -->|Simpan Laporan| DS3
    
    DS2 -->|Data Pemakaian Valid| P1
    P1 -->|Update Status Lunas| DS2
    
    DS2 -->|Trigger runTransaction| P3
    DS5 -->|Referensi Kode Akun| P3
    P3 -->|Catat Debit/Kredit| DS4
    
    DS4 -->|Tarik Saldo Akun| P4

    %% Styling
    classDef entity fill:#e6f3ff,stroke:#0366d6,stroke-width:2px;
    classDef process fill:#f0fff4,stroke:#22863a,stroke-width:2px,shape:circle;
    classDef store fill:#f9f0ff,stroke:#6f42c1,stroke-width:2px;
    
    class E1,E2,E3,E4 entity;
    class P1,P2,P3,P4 process;
    class DS1,DS2,DS3,DS4,DS5 store;
```

---

## 6. Kamus Data (Data Dictionary)

Kamus Data berfungsi sebagai "buku spesifikasi teknis" pelengkap dari ERD. Jika ERD hanya menunjukkan gambaran relasi antartabel secara visual, maka Kamus Data merincikan tipe data (*Number*, *String*, *Timestamp*) dan batasan (*Primary Key*, *Foreign Key*) dari tiap *field* secara tekstual. Dokumentasi ini menjadi bukti komprehensif bagi penguji teknis bahwa arsitektur *database* dirancang secara terstruktur dan siap dieksekusi menjadi *source code*.

Berikut adalah detail skema data (Kamus Data) untuk koleksi NoSQL Firestore yang mendasari relasi pada ERD.

### 1. user_admin (Tabel: User)
Menyimpan data otentikasi dan hak akses seluruh entitas (internal & eksternal).
| Field | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | String (PK) | Firebase Auth UID / Document ID |
| `name` | String | Nama lengkap |
| `email` | String | Email untuk login |
| `phone` | String | Nomor HP/WA |
| `role` | String | Jabatan (`admin`, `staff`, `customer`, `direktur`, `accounting`) |
| `status` | String | Status akun (`active`, `pending`, `blocked`) |

### 2. tb_pelanggan (Tabel: Profil Pelanggan & Golongan)
Menyimpan profil master data khusus pelanggan PDAM.
| Field | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | String (PK) | Document ID Pelanggan |
| `golonganId`| String (FK)| Referensi ID kategori tarif (misal: R1, Niaga) |
| `address` | String | Alamat domisili lengkap |
| `avatar` | String | URL foto profil pengguna |

### 3. pengaduan_pelanggan (Tabel: Task)
Menyimpan manajemen perintah kerja lapangan terpadu.
| Field | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | String (PK) | Document ID Task |
| `title` | String | Judul tugas/keluhan |
| `type` | String | Tipe tugas (`repair`, `reading`, `disconnection`, `new_connection`) |
| `status` | String | Status penyelesaian (`pending`, `assigned`, `in-progress`, `completed`) |
| `assignedTo`| String (FK)| ID Staff Lapangan yang bertugas |
| `customerId`| String (FK)| ID Pelanggan pelapor |
| `report` | Object | Menyimpan *notes* dan foto bukti eksekusi |

### 4. tb_billing (Tabel: Bill & MeterReading)
Menyimpan rekapitulasi penagihan dan hasil pembacaan meter.
| Field | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | String (PK) | Document ID |
| `customerId`| String (FK)| Referensi ID pelanggan |
| `month/year`| String | Periode tagihan |
| `standAwal/Akhir`| Number| Pencatatan angka kubikasi air |
| `amount` | Number | Nominal Rupiah tagihan penuh (Pemakaian + Admin) |
| `status` | String | Status pembayaran (`paid`, `unpaid`) |

### 5. Jurnal & Keuangan (Tabel: COA & transactions)
Koleksi komprehensif untuk transaksi jurnal akuntansi.
| Field | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | String (PK) | Document ID Transaksi/Buku Besar |
| `billingId` | String (FK)| Referensi ke ID penagihan lunas |
| `coaId` | String (FK)| Referensi ke *Chart of Accounts* |
| `debit` | Number | Pemasukan kas/aset |
| `kredit` | Number | Pengeluaran/kewajiban |

---

## 7. Peta Navigasi (Sitemap) Lintas Aplikasi

Sitemap (Peta Navigasi) adalah pemetaan struktur pohon yang menjabarkan hierarki seluruh halaman dan menu di dalam aplikasi. Fungsi utama sitemap ini adalah untuk memudahkan pembaca laporan (terutama pihak Manajemen PDAM atau dosen Non-IT) dalam membayangkan ruang lingkup fitur sistem secara utuh tanpa harus menjalankan aplikasi. Pemetaan ini sekaligus menjadi kerangka dasar penyusunan Modul Panduan Pengguna (*User Manual*).

Struktur menu di bawah ini memetakan komponen antarmuka yang aktual dikembangkan berdasarkan arsitektur modul sistem React.

### A. Peta Navigasi PDAM Pelanggan (Front-Office)
```mermaid
flowchart TD
    ROOT[Aplikasi PDAM Pelanggan] --> M1(Auth / Login)
    ROOT --> M2(Dashboard Beranda)
    ROOT --> M3(Billing & Pembayaran)
    ROOT --> M4(Usage / Riwayat Pemakaian)
    ROOT --> M5(Support & Pengaduan)
    ROOT --> M6(Pendaftaran Sambungan Baru)
    ROOT --> M7(Profil Akun)

    style ROOT fill:#0366d6,stroke:#000,color:#fff,font-weight:bold
    style M1 fill:#f6f8fa,stroke:#d1d5da
    style M2 fill:#f6f8fa,stroke:#d1d5da
    style M3 fill:#f6f8fa,stroke:#d1d5da
    style M4 fill:#f6f8fa,stroke:#d1d5da
    style M5 fill:#f6f8fa,stroke:#d1d5da
    style M6 fill:#f6f8fa,stroke:#d1d5da
    style M7 fill:#f6f8fa,stroke:#d1d5da
```

### B. Peta Navigasi PDAM Seruyan (Back-Office SIA)
```mermaid
flowchart TD
    ROOT[Aplikasi PDAM Seruyan SIA] --> MOD1{Modul Administrator}
    ROOT --> MOD2{Modul Staff Lapangan}
    ROOT --> MOD3{Modul Akuntansi & Direktur}

    MOD1 --> A1(Dashboard Analitik)
    MOD1 --> A2(Billing Management)
    MOD1 --> A3(Tarif Golongan Setup)
    MOD1 --> A4(Manajemen Keluhan / Repairs)
    MOD1 --> A5(Pantau Distribusi / WaterFlow)

    MOD2 --> S1(Daftar Perintah Kerja / Tasks)
    MOD2 --> S2(Input Stand Meter Air)
    MOD2 --> S3(Eksekusi Pemutusan Saluran)

    MOD3 --> K1(Dashboard Keuangan & Log Aktivitas)
    MOD3 --> K2(Jurnal Umum & Buku Besar)
    MOD3 --> K3(Neraca Lajur & Laporan Akhir)
    MOD3 --> K4(Hutang AP & Piutang AR)
    MOD3 --> K5(Daftar Rekening Ditagih & LPP)
    MOD3 --> K6(Aset Tetap & Persediaan)
    MOD3 --> K7(Rekonsiliasi & Anggaran)

    style ROOT fill:#28a745,stroke:#000,color:#fff,font-weight:bold
    style MOD1 fill:#fff3e6,stroke:#d97706,stroke-width:2px
    style MOD2 fill:#e6f3ff,stroke:#0366d6,stroke-width:2px
    style MOD3 fill:#f9f0ff,stroke:#6f42c1,stroke-width:2px
```

---

## 8. Catatan Keputusan Perancangan Sistem (Design Decisions)

Sebagai bentuk pertanggungjawaban akademis, berikut adalah penjabaran alasan analitis (*rationale*) di balik penyusunan diagram-diagram di dalam dokumen ini:

### A. Standarisasi Keputusan Logika (Boolean Decision)
Pada seluruh **Flowchart Sistem**, seluruh simbol belah ketupat (*Decision Point*) dibatasi hanya menggunakan format logika biner murni (**Ya/Tidak**). Tidak ada *output* ganda lebih dari dua cabang atau *output* yang bersifat ambigu. Hal ini dilakukan demi memenuhi standar penulisan algoritma komputasi akademis yang dapat dieksekusi oleh mesin.

### B. Penghindaran Garis Ruwet (Spaghetti Diagram)
Dalam penggambaran flowchart, beberapa instansi *Database* sengaja digambar ganda (misal: memunculkan `DB1` di awal proses, lalu memunculkan `DB1_UPDATE` di akhir proses meskipun keduanya mereferensikan koleksi yang sama). Keputusan ini diambil secara sengaja untuk menjaga estetika dan keterbacaan dokumen. Jika dipaksakan kembali ditarik ke satu simbol awal, garis (*flowline*) akan melompat mundur saling menabrak dan menciptakan *spaghetti diagram* yang membingungkan pembaca.

### C. Pemisahan Hak Akses Direktur & Akuntan (*Separation of Duties*)
Dalam *User Flow* dan rancangan *Role* ERD, peran **Direktur** dan **Akuntan (Keuangan)** dipisah menjadi entitas fungsional yang berbeda. Ini merupakan bentuk implementasi dari prinsip *Separation of Duties* dalam Sistem Informasi Akuntansi (SIA). Akuntan diberikan akses operasional untuk memanipulasi *database* (melakukan mutasi, koreksi jurnal, dan pencatatan). Sebaliknya, *role* Direktur dibatasi secara sistem dengan wewenang *Read-Only* (hanya dapat melihat *dashboard*, meninjau, dan mengunduh laporan Neraca Saldo) demi mencegah manipulasi data internal (*fraud*).

### D. Eksistensi Entitas Kasir Loket (*Hybrid Workflow*)
Meskipun hasil akhir sistem telah mendigitalisasi layanan secara mandiri (aplikasi PDAM Pelanggan), DFD Level 0, Flowmap, dan User Flow sengaja tetap mempertahankan eksistensi aktor **Kasir Loket**. Keputusan ini didasarkan pada realitas operasional demografi masyarakat daerah (Seruyan), di mana loket fisik PDAM tidak bisa dihapuskan 100% karena sebagian pelanggan konvensional tetap akan datang membawa uang tunai. Sistem *back-office* mengakomodasi *hybrid workflow* ini dengan menyediakan modul khusus Kasir agar pembayaran manual tetap tercatat secara *real-time* ke *database* terpusat.

### E. Mekanisme *Looping Balance* pada Laporan Keuangan
Pada flowchart **Laporan Keuangan (Jurnal & Buku Besar)**, ditanamkan mekanisme putaran balik (*error-looping*) ketika total Debit dan Kredit terdeteksi *Out of Balance*. Sistem dirancang untuk menolak penerbitan laporan akhir (*Hard-Block*) sebelum keseimbangan nilai matematis tercapai, dan akan melempar kembali notifikasi *error* agar Akuntan merevisi entri jurnal. Hal ini menjamin bahwa seluruh *output* dokumen finansial mematuhi Standar Akuntansi Keuangan (SAK) secara *strict*.
