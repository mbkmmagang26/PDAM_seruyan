# DOKUMEN MATERI BELAJAR DAN KONVERSI NILAI MBKM: SISTEM INFORMASI AKUNTANSI (SIA) BERBASIS CLOUD FIRESTORE

---

## BAB 1: PERANCANGAN BASIS DATA NOSQL (FIRESTORE) UNTUK SISTEM INFORMASI AKUNTANSI (SIA)

### 1.1 Rancangan Arsitektur Basis Data NoSQL Firestore untuk SIA
Firebase Cloud Firestore adalah database dokumen NoSQL yang sangat skalabel dan mendukung sinkronisasi data secara real-time. Dalam konteks Sistem Informasi Akuntansi (SIA), terdapat perbedaan mendasar dibanding database relasional (SQL) tradisional. 

Untuk menjamin kecepatan kueri, efisiensi biaya pembacaan data (*read operations*), dan integritas data akuntansi, berikut adalah prinsip arsitektur yang dirancang untuk SIA:

*   **Pola *Flat Collection* (Koleksi Datar):** Dibandingkan menggunakan *Subcollection* bersarang (*nested*), struktur terbaik untuk entitas utama akuntansi adalah menggunakan koleksi tingkat atas (*root collections*). Hal ini mempermudah kueri agregasi (seperti pembuatan Buku Besar dan Neraca Lajur) yang membutuhkan pencarian lintas akun dan tanggal.
*   **Denormalisasi Terkendali:** Pada NoSQL, join data dinilai mahal. Oleh karena itu, dokumen transaksi jurnal (`transactions`) akan menyimpan salinan informasi kode akun (`category`) secara langsung.
*   **Transaksi Atomik (*Batched Writes*):** Akuntansi menganut asas berpasangan (*double-entry bookkeeping*). Setiap pencatatan jurnal harus melibatkan minimal dua baris (Debit dan Kredit) yang seimbang. Firestore memfasilitasi ini dengan fitur *Batched Writes* untuk menjamin bahwa seluruh entri jurnal tersimpan bersamaan atau dibatalkan seluruhnya jika terjadi eror (*All-or-Nothing*).

#### Arsitektur Koleksi Utama SIA di Firestore
1.  **`/coa` (Koleksi Root):** Menyimpan daftar master data akun / Chart of Accounts (COA).
2.  **`/transactions` (Koleksi Root):** Menyimpan baris entri jurnal (debit/kredit) yang terhubung ke kode akun.
3.  **`/user` (Koleksi Root):** Menyimpan profil pengguna dan hak akses (Direktur, Admin, Staf Akuntansi).
4.  **`/settings` (Koleksi Root):** Menyimpan konfigurasi sistem, seperti tahun buku aktif dan status penguncian periode (Lock Status) pasca-rekonsiliasi.

---

### 1.2 Struktur Koleksi dan Dokumen Chart of Accounts (COA)
Koleksi `/coa` berfungsi sebagai direktori master akun. Dokumen di dalam koleksi ini disimpan dengan **Document ID** yang disamakan dengan Kode Akun (misalnya: `1110` untuk Kas) untuk mempercepat pencarian data tanpa perlu melakukan kueri pencarian.

#### Spesifikasi Skema Dokumen (`/coa/{account_code}`)

| Nama Field | Tipe Data | Keterangan | Contoh Nilai |
| :--- | :--- | :--- | :--- |
| `code` | `String` | Kode unik akun (Primary Key/Doc ID). Menentukan urutan COA. | `"1110"` |
| `name` | `String` | Nama akun/perkiraan. | `"Kas dan Setara Kas"` |
| `category` | `String` | Kategori utama akun. Pilihan: `Aset`, `Liabilitas`, `Ekuitas`, `Pendapatan`, `Beban`. | `"Aset"` |
| `normalBalance` | `String` | Saldo normal akun dalam akuntansi. Pilihan: `Debit` atau `Kredit`. | `"Debit"` |
| `level` | `Number` | Hierarki akun untuk format laporan keuangan (1: Header Utama, 2: Sub-Header, 3: Akun Pos/Detail). | `3` |
| `isActive` | `Boolean` | Status keaktifan akun dalam sistem transaksi. | `true` |
| `createdAt` | `Timestamp` | Waktu pembuatan akun pertama kali. | `2026-06-05T02:00:00Z` |

---

### 1.3 Contoh Simulasi Data JSON untuk Penginputan COA
Berikut adalah contoh simulasi data berformat JSON yang merepresentasikan data master COA untuk masing-masing klasifikasi utama akuntansi:

```json
[
  {
    "code": "1110",
    "name": "Kas Utama",
    "category": "Aset",
    "normalBalance": "Debit",
    "level": 3,
    "isActive": true
  },
  {
    "code": "1210",
    "name": "Piutang Usaha Pelanggan",
    "category": "Aset",
    "normalBalance": "Debit",
    "level": 3,
    "isActive": true
  },
  {
    "code": "2110",
    "name": "Utang Usaha",
    "category": "Liabilitas",
    "normalBalance": "Kredit",
    "level": 3,
    "isActive": true
  },
  {
    "code": "3110",
    "name": "Modal Disetor",
    "category": "Ekuitas",
    "normalBalance": "Kredit",
    "level": 3,
    "isActive": true
  },
  {
    "code": "4110",
    "name": "Pendapatan Penjualan Air",
    "category": "Pendapatan",
    "normalBalance": "Kredit",
    "level": 3,
    "isActive": true
  },
  {
    "code": "5110",
    "name": "Beban Gaji dan Upah",
    "category": "Beban",
    "normalBalance": "Debit",
    "level": 3,
    "isActive": true
  }
]
```

---

## BAB 2: ALIRAN DATA REAL-TIME, RESILIENSI JARINGAN, DAN QUERY EFISIEN

### 2.1 Aliran Data Transaksi Keuangan Harian dari Frontend ke Firestore
Mekanisme pencatatan transaksi harian pada SIA harus menjamin bahwa setiap entri jurnal tersimpan dengan aman, konsisten, dan langsung tersinkronisasi ke seluruh antarmuka pengguna secara **real-time**.

#### 1. Proses Pengiriman Data (Write Path)
Ketika staf akuntansi menginput transaksi melalui formulir Jurnal Umum, data akan dikirim ke Firestore melalui langkah-langkah berikut:
*   **Validasi Keseimbangan (Balancing):** Sistem di sisi *client* (Frontend) memastikan total **Debit** sama dengan total **Kredit** sebelum fungsi pengiriman dijalankan.
*   **Pembentukan Payload Dokumen:** Data transaksi dibentuk menjadi objek dokumen JSON dengan menyertakan atribut audit trail seperti `createdAt` menggunakan `serverTimestamp()`, identitas pembuat (`authorId` dan `authorName`), serta nomor referensi (`reference`).
*   **Operasi Atomik (Batched Writes):** Untuk memastikan asas pembukuan berpasangan (*double-entry bookkeeping*) terpenuhi secara konsisten, pengiriman dokumen transaksi dilakukan menggunakan metode **`writeBatch()`**. Ini mencegah kondisi *partial write* (misalnya hanya akun debit yang tersimpan, sedangkan akun kredit gagal disimpan).

#### 2. Sinkronisasi Data Real-Time (Read Path)
Untuk menampilkan daftar jurnal dan ringkasan saldo pada dashboard utama secara instan tanpa memuat ulang halaman (*page refresh*), frontend memanfaatkan fungsi listener **`onSnapshot()`** dari Firestore SDK. Listener ini akan membuka koneksi *WebSockets* presisten ke server Firebase dan langsung memicu pembaruan state aplikasi setiap kali ada perubahan pada koleksi `/transactions`.

```javascript
// Contoh pemanggilan listener real-time di frontend
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

const q = query(collection(db, "transactions"), orderBy("date", "desc"));
const unsubscribe = onSnapshot(q, (snapshot) => {
  const transactionList = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  // Update State UI
  setTransactions(transactionList);
});
```

---

### 2.2 Mekanisme Offline Persistence dan Pencegahan Data Loss
Jaringan internet yang tidak stabil di area operasional (seperti kantor cabang PDAM) dapat memicu kegagalan transaksi jika sistem hanya mengandalkan koneksi online. Firebase Firestore menyediakan fitur **Offline Persistence** berbasis penyimpanan lokal browser (IndexedDB).

#### 1. Cara Kerja Penyimpanan Cache Lokal
Ketika fitur ini diaktifkan, setiap operasi penulisan (*write*) oleh pengguna akan langsung ditulis ke dalam database lokal perangkat (*local cache*) terlebih dahulu sebelum dikirim ke server cloud.
*   **Aplikasi Tetap Responsif:** Pengguna dapat terus bekerja menginput jurnal meskipun koneksi internet terputus total. UI akan langsung diperbarui seolah-olah data telah berhasil disimpan.
*   **Rekonsiliasi Otomatis (Queue Sync):** Firestore mengelola antrean (*queue*) operasi penulisan lokal. Begitu perangkat mendeteksi adanya koneksi internet kembali, SDK Firestore secara otomatis mengirimkan akumulasi data lokal tersebut ke server Firebase di cloud untuk disinkronkan (*automatic reconciliation*).

#### 2. Konfigurasi Aktivasi Offline Persistence (Firebase SDK v9+)
Berikut adalah konfigurasi teknis untuk mengaktifkan ketahanan data offline di file inisialisasi database (`firebase.ts`):

```typescript
import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
};

const app = initializeApp(firebaseConfig);

// Inisialisasi Firestore dengan mengaktifkan persistent cache untuk multi-tab
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
```

---

### 2.3 Skema Pemanggilan (Query) yang Efisien untuk Jurnal dan Buku Besar
Struktur NoSQL menuntut desain kueri yang matang. Jika kueri dirancang secara buruk, biaya pembacaan data (*read operations*) pada Firebase akan membengkak, dan kinerja aplikasi akan melambat.

#### 1. Kueri Rekapitulasi Jurnal Umum (Urutan Waktu)
Untuk menyusun Laporan Jurnal Umum, data ditarik berdasarkan rentang waktu tertentu. Kueri ini membatasi dokumen yang dibaca hanya pada periode akuntansi yang sedang dibuka dengan memanfaatkan operator perbandingan (`>=` dan `<=`).

```javascript
import { collection, query, where, orderBy } from "firebase/firestore";

// Kueri Transaksi Jurnal Umum berdasarkan Rentang Tanggal
const qJurnal = query(
  collection(db, "transactions"),
  where("date", ">=", "2026-06-01"),
  where("date", "<=", "2026-06-30"),
  orderBy("date", "desc")
);
```

#### 2. Kueri Buku Besar (Filter per Akun)
Laporan Buku Besar menyajikan mutasi dari satu akun spesifik (misalnya akun Kas). Kueri ini menggunakan filter presisi pada atribut `category` (kode akun) dan mengurutkannya secara kronologis berdasarkan tanggal transaksi.

```javascript
// Kueri Buku Besar untuk Akun Kas (Kode: 1110)
const qBukuBesar = query(
  collection(db, "transactions"),
  where("category", "==", "1110"),
  where("date", ">=", "2026-06-01"),
  where("date", "<=", "2026-06-30"),
  orderBy("date", "asc")
);
```

#### 3. Kebutuhan Indeks Komposit (Composite Index)
Ketika melakukan kueri yang menggabungkan metode filter kesamaan (`where("category", "==")`) dengan pengurutan data (`orderBy("date")`), Firestore secara bawaan akan menolak kueri tersebut kecuali pengembang membuat **Composite Index** di Firebase Console.
*   **Penyebab:** Tanpa indeks komposit, Firestore harus melakukan pemindaian koleksi secara penuh (*full collection scan*) yang sangat lambat.
*   **Solusi:** Pengembang perlu membuka tautan indeks yang muncul di log eror konsol browser, kemudian membuat indeks komposit baru dengan ketentuan:
    *   **Field 1:** `category` (Ascending)
    *   **Field 2:** `date` (Ascending / Descending)

---

## BAB 3: KEAMANAN DATA KEUANGAN DAN ROLE-BASED ACCESS CONTROL (RBAC) PADA FIRESTORE

### 3.1 Pentingnya Penerapan Protokol Keamanan RBAC pada SIA
Penerapan **Role-Based Access Control (RBAC)** memastikan pemisahan tugas (*Segregation of Duties*) berjalan secara sistemik untuk menjamin integritas laporan keuangan dan mencegah kecurangan.

Berikut adalah urgensi pembagian peran (role) pada sistem SIA:
*   **Mencegah Fraud (Kecurangan):** Membatasi hak akses agar staf yang menginput jurnal (misalnya transaksi kas keluar) tidak memiliki otoritas untuk memverifikasi atau menyetujui transaksinya sendiri.
*   **Melindungi Data Sensitif:** Menghalangi staf non-keuangan melihat data keuangan strategis, seperti neraca saldo atau laporan laba rugi perusahaan.
*   **Menjaga Validitas Data Historis:** Menjamin bahwa jurnal transaksi yang telah diselesaikan pada periode akuntansi sebelumnya tidak dapat diubah atau dihapus oleh staf tingkat bawah.

#### Matriks Otoritas Pengguna pada SIA

| Role / Peran | Otoritas Koleksi `/coa` (Master) | Otoritas Koleksi `/transactions` | Otoritas Koleksi `/user` (Manajemen) |
| :--- | :--- | :--- | :--- |
| **Admin** | Read & Write (Penuh) | Read Only | Read & Write (Penuh) |
| **Staff (Akuntan)** | Read Only | Read & Write (Terbatas pada periode aktif) | No Access |
| **Direktur (Manajer)**| Read Only | Read & Write (Otorisasi & Lock Jurnal) | Read Only |

---

### 3.2 Implementasi Firebase Security Rules untuk Proteksi Database
Firestore Security Rules bertindak sebagai baris pertahanan pertama di sisi server. Kode di bawah ini mengambil role pengguna dari dokumen `/user/{uid}` untuk membatasi hak akses pada koleksi `/transactions` dan `/coa`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Fungsi pembantu untuk memeriksa status login pengguna
    function isSignedIn() {
      return request.auth != null;
    }

    // Fungsi pembantu untuk mengambil data user dari koleksi '/user'
    function getUserData() {
      return get(/databases/$(database)/documents/user/$(request.auth.uid)).data;
    }

    // Fungsi pembantu untuk memeriksa apakah akun user aktif
    function isActiveUser() {
      return isSignedIn() && getUserData().status == "active";
    }

    // 1. Aturan Keamanan Koleksi '/user'
    match /user/{userId} {
      allow read: if isSignedIn();
      // Hanya role Admin yang dapat memodifikasi data user
      allow write: if isActiveUser() && getUserData().role == "admin";
    }

    // 2. Aturan Keamanan Koleksi '/coa' (Master Data)
    match /coa/{coaId} {
      allow read: if isActiveUser();
      // Hanya Admin yang bisa menambah/mengubah COA
      allow write: if isActiveUser() && getUserData().role == "admin";
    }

    // 3. Aturan Keamanan Koleksi '/transactions' (Jurnal Keuangan)
    match /transactions/{txId} {
      // Seluruh user aktif dengan role admin, staff, atau direktur dapat membaca transaksi
      allow read: if isActiveUser();
      
      // Pembatasan penulisan data transaksi:
      // - Staff dan Direktur dapat membuat transaksi baru (create)
      // - Transaksi yang sudah dikunci (isLocked == true) tidak boleh dihapus atau diubah (update/delete) oleh Staff
      allow create: if isActiveUser() && (getUserData().role == "staff" || getUserData().role == "direktur");
      allow update, delete: if isActiveUser() 
                            && getUserData().role == "direktur" 
                            && resource.data.isLocked == false;
    }
  }
}
```

---

### 3.3 Panduan Troubleshooting Kendala Teknis Masa Uji Coba
Selama fase uji coba prototipe SIA, pengembang sering kali menghadapi galat (*error*) teknis. Berikut adalah langkah-langkah penanganannya (*troubleshooting*):

#### 1. Mengatasi Error "Permission Denied" (FirebaseError: Missing or insufficient permissions)
*   **Verifikasi Status Autentikasi:** Pastikan pengguna telah melalui proses *Sign In* dengan benar di browser. Periksa apakah `auth.currentUser` di React bernilai aktif.
*   **Periksa Sinkronisasi Data Role:** Pastikan ID Dokumen di koleksi `/user` sama persis dengan **UID Autentikasi** pengguna (`request.auth.uid`). Jika dokumen user disimpan menggunakan ID acak, fungsi `get()` pada Security Rules akan gagal.
*   **Validasi Nilai Atribut:** Pastikan field `role` (misalnya: `"staff"`, `"admin"`, atau `"direktur"`) dan field `status` (misalnya: `"active"`) dieja dengan huruf kecil sesuai aturan di skrip rules.
*   **Gunakan Rules Playground:** Lakukan simulasi kueri di konsol Firebase pada menu **Firestore -> Rules -> Rules Playground** untuk melacak pada baris mana rules menolak akses kueri tersebut.

#### 2. Mengatasi Kendala Koneksi Database (Offline / Timeout)
*   **Uji Kredensial Firebase Config:** Periksa kembali file inisialisasi `firebase.ts`. Pastikan `apiKey` dan `projectId` sesuai dengan proyek konsol Firebase yang dituju.
*   **Periksa Blokir Port/Jaringan:** Beberapa jaringan kantor atau institusi memblokir lalu lintas *WebSocket* (port 443/80). Coba gunakan koneksi seluler untuk memastikan isu tersebut bukan dari kebijakan firewall lokal.
*   **Aktifkan Logging SDK Client:** Untuk melihat detail komunikasi antara browser dan server Firestore, aktifkan mode debug pada kode inisialisasi aplikasi:
    ```javascript
    import { setLogLevel } from "firebase/firestore";
    setLogLevel("debug"); // Menampilkan detail log koneksi di konsol browser
    ```

---

## BAB 4: MANAJEMEN REPOSITORI GITHUB DAN DOKUMENTASI FORMAL DATABASE SIA

### 4.1 Praktik Terbaik (Best Practices) Manajemen Repositori dengan GitHub
Untuk mendukung kolaborasi tim pengembang dan menjaga stabilitas kode aplikasi SIA selama masa pengembangan, diperlukan manajemen kontrol versi (*version control*) menggunakan GitHub.

#### 1. Strategi Pencabangan (*Branching Strategy*)
Aplikasi menggunakan variasi metode **Git Flow** yang disederhanakan untuk meminimalkan konflik kode (*merge conflicts*):
*   **`main` (Branch Produksi):** Menyimpan kode sumber yang sepenuhnya stabil, bebas galat, dan siap dideploy ke lingkungan produksi (*production*).
*   **`development` (Branch Integrasi):** Cabang utama penggabungan seluruh fitur baru sebelum masuk ke tahap rilis. Cabang ini digunakan untuk pengujian internal (*staging*).
*   **`feature/` (Branch Fitur):** Cabang sementara untuk mengembangkan modul baru (misalnya: `feature/jurnal-umum`, `feature/buku-besar`). Dibuat dari cabang `development` dan akan dihapus setelah digabungkan (*merged*).
*   **`hotfix/` (Branch Perbaikan Cepat):** Dibuat langsung dari `main` untuk memperbaiki bug kritis di produksi yang tidak bisa menunggu siklus rilis normal.

#### 2. Format Pesan Komit (*Conventional Commits*)
Setiap komit (*commit*) harus deskriptif dan mengikuti format baku agar riwayat pengembangan mudah ditelusuri:
*   **`feat:`** Digunakan untuk penambahan fitur baru.
    *   *Contoh:* `feat(accounting): add general ledger locking mechanism`
*   **`fix:`** Digunakan untuk perbaikan bug/galat.
    *   *Contoh:* `fix(db): resolve permission denied on transaction read`
*   **`docs:`** Digunakan untuk pembaruan dokumentasi (README, dokumen PDF).
    *   *Contoh:* `docs(readme): update setup guidelines and firestore schema`
*   **`refactor:`** Digunakan untuk restrukturisasi kode tanpa mengubah fungsionalitas.
    *   *Contoh:* `refactor(auth): optimize token validation flow`

#### 3. Alur Kerja Pull Request (PR) & Review Kode
Sebelum kode dari branch `feature/` digabungkan ke branch `development`, pengembang wajib mengajukan **Pull Request (PR)**.
*   **Deskripsi PR:** Harus memuat daftar perubahan, alasan perubahan, dan instruksi cara mengujinya.
*   **Peer Review:** Setidaknya satu pengembang lain (atau peninjau teknis) harus meninjau kode tersebut untuk memastikan standar kualitas dan keamanan terpenuhi.
*   **Integrasi Otomatis (CI/CD):** Menjalankan pengujian otomatis (*linter* dan *build check*) di GitHub Actions sebelum tombol *merge* diaktifkan.

---

### 4.2 Cara Mendokumentasikan Struktur Koleksi Basis Data SIA secara Formal
Dokumentasi basis data NoSQL yang rapi sangat krusial bagi pembimbing lapangan dan dosen penguji untuk menilai kualitas rancangan sistem Anda. Berikut adalah komponen utama untuk mendokumentasikan skema Firestore secara formal:

#### 1. Skema Hubungan Data Konseptual (Conceptual Relationship)
Meskipun Firestore bersifat NoSQL (tanpa skema relasional/Foreign Key fisik), hubungan logis antar-dokumen tetap harus digambarkan.

```
+-----------------------------------+             +----------------------------------+
|          Koleksi: /user           |             |          Koleksi: /coa           |
|      (DocID: UID Auth User)       |             |       (DocID: Kode Akun)         |
+-----------------+-----------------+             +----------------+-----------------+
                  |                                                |
                  | (relasi authorId)                              | (relasi category)
                  |                                                |
                  |                +-------------------------------+
                  |                |
                  v                v
            +-----+----------------+-----+
            |    Koleksi: /transactions  |
            |    (DocID: Auto-Generated) |
            +----------------------------+
```

*   **Relasi Transaksi ke User:** Dokumen di `/transactions` menyimpan atribut `authorId` yang berelasi logis (*Logical Join*) dengan Document ID di koleksi `/user`.
*   **Relasi Transaksi ke COA:** Dokumen di `/transactions` menyimpan atribut `category` yang berisi kode akun yang terdaftar pada Document ID di koleksi `/coa`.

#### 2. Kamus Data Formal (Data Dictionary)
Tuliskan kamus data untuk seluruh koleksi utama secara detail. Sebagai contoh, dokumentasi untuk koleksi `/transactions` disajikan sebagai berikut:

##### **Nama Koleksi:** `/transactions`
*   **Deskripsi:** Menyimpan seluruh data mutasi entri jurnal (debit/kredit) harian.
*   **Pola Doc ID:** Auto-generated oleh Firestore SDK.

| Nama Field | Tipe Data | Nullable | Deskripsi |
| :--- | :--- | :--- | :--- |
| `date` | `String` | No | Tanggal transaksi dalam format `YYYY-MM-DD`. |
| `reference` | `String` | Yes | Nomor referensi dokumen fisik transaksi (misal: BKM-001). |
| `description`| `String` | No | Keterangan deskriptif transaksi. |
| `category` | `String` | No | Kode Akun COA terkait yang menjadi tujuan pos jurnal. |
| `type` | `String` | No | Jenis mutasi transaksi. Nilai: `income` (debit) / `expense` (kredit). |
| `amount` | `Number` | No | Nominal uang transaksi. Nilai harus positif (>= 0). |
| `isLocked` | `Boolean` | No | Menandakan apakah jurnal telah dikunci pasca-rekonsiliasi. |
| `authorId` | `String` | No | ID pengguna yang menginput transaksi (berelasi dengan `/user`). |

#### 3. Dokumentasi Skrip Inisialisasi Database (Database Seeder)
Untuk mempermudah pembimbing lapangan melakukan pengujian aplikasi secara mandiri dari awal, sertakan panduan eksekusi skrip inisialisasi basis data (*seeder*).
*   Jelaskan bahwa proyek SIA ini menyediakan skrip `create_default_users.js` untuk membuat akun percobaan secara otomatis di Firebase Auth dan Firestore.
*   Tuliskan langkah menjalankannya di terminal:
    ```bash
    node create_default_users.js
    ```
