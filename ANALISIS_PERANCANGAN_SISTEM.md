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
