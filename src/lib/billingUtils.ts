import { collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, query, where, orderBy, limit, runTransaction, serverTimestamp, increment } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Bill, Golongan, MeterReading, User } from '../types';

/**
 * Kalkulasi biaya pemakaian air berdasarkan blok tarif
 */
export const calculateBiayaPemakaian = (pemakaian: number, golongan: Golongan): number => {
  let biaya = 0;
  
  if (pemakaian > 0) {
    // Blok 1: 1-10 m3
    const blok1 = Math.min(pemakaian, 10);
    biaya += blok1 * golongan.tarif1_10;
    
    // Blok 2: 11-20 m3
    if (pemakaian > 10) {
      const blok2 = Math.min(pemakaian - 10, 10);
      biaya += blok2 * golongan.tarif11_20;
    }
    
    // Blok 3: > 20 m3
    if (pemakaian > 20) {
      const blok3 = pemakaian - 20;
      biaya += blok3 * golongan.tarif21_up;
    }
  }
  
  return biaya;
};

/**
 * Proses pembacaan meter dan generate billing
 */
export const processMeterReadingAndBilling = async (
  customerId: string,
  standAkhir: number,
  fotoUrl?: string
): Promise<{ success: boolean; message: string; billId?: string }> => {
  try {
    // 1. Dapatkan data pelanggan dari data_pelanggan_meteran
    const userDocRef = doc(db, 'data_pelanggan_meteran', customerId);
    const userSnap = await getDoc(userDocRef);
    
    if (!userSnap.exists()) {
      return { success: false, message: 'Data pelanggan tidak ditemukan.' };
    }
    
    const userData = userSnap.data();
    const userGolongan = userData.golongan || userData.gol;
    
    // 2. Dapatkan data Golongan berdasarkan nama
    let golQ;
    if (userGolongan) {
      golQ = query(collection(db, 'tb_golongan'), where('name', '==', userGolongan), limit(1));
    } else {
      // Fallback: pakai tarif pertama yang tersedia jika golongan belum diset admin
      golQ = query(collection(db, 'tb_golongan'), limit(1));
    }
    const golSnap = await getDocs(golQ);
    
    if (golSnap.empty) {
      return { success: false, message: 'Tidak ada data tarif di database. Hubungi administrator.' };
    }
    
    const golonganData = golSnap.docs[0].data() as Golongan;

    // 3. Dapatkan stand meter bulan lalu (Stand Awal)
    let standAwal = 0;
    const meterQ = query(
      collection(db, 'pembacaan_meter_staf'), 
      where('customerId', '==', customerId)
    );
    
    const meterSnap = await getDocs(meterQ);
    if (!meterSnap.empty) {
      // Sort in JavaScript to avoid Firestore composite index requirement
      const allMeters = meterSnap.docs.map(doc => doc.data() as MeterReading);
      allMeters.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      standAwal = allMeters[0].standAkhir;
    }

    // Validasi stand akhir
    if (standAkhir < standAwal) {
      return { success: false, message: 'Stand Akhir tidak boleh lebih kecil dari Stand Awal.' };
    }

    const pemakaian = standAkhir - standAwal;
    const dateNow = new Date();
    const currentMonth = `${dateNow.getFullYear()}-${String(dateNow.getMonth() + 1).padStart(2, '0')}`;
    const yearStr = String(dateNow.getFullYear());

    // 4. Simpan ke data_pelanggan_meteran
    const newMeterData: Omit<MeterReading, 'id'> = {
      customerId,
      month: currentMonth,
      year: yearStr,
      standAwal,
      standAkhir,
      pemakaian,
      fotoUrl,
      createdAt: new Date().toISOString()
    };
    
    const meterDocRef = await addDoc(collection(db, 'pembacaan_meter_staf'), newMeterData);

    // 5. Kalkulasi Tagihan (tagihan_air_pelanggan)
    const biayaPemakaian = calculateBiayaPemakaian(pemakaian, golonganData);
    const biayaAdmin = golonganData.biayaAdmin || 0;
    const totalAmount = biayaPemakaian + biayaAdmin;

    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const periodeBulan = monthNames[dateNow.getMonth()];
    const periodeTahun = yearStr;

    const newBillData: any = {
      customerId,
      userId: userData.userId || userData.uid || customerId,
      customerName: userData.nama || 'Pelanggan',
      meterReadingId: meterDocRef.id,
      month: currentMonth,
      year: yearStr,
      periodeBulan,
      periodeTahun,
      totalTagihan: totalAmount,
      usage: pemakaian,
      biayaAdmin,
      biayaPemakaian,
      amount: totalAmount,
      status: 'unpaid',
      createdAt: new Date().toISOString()
    };

    const billDocRef = await addDoc(collection(db, 'tagihan_air_pelanggan'), newBillData);

    // 6. Update sinkronisasi ke panel Accounting (data_pelanggan_meteran)
    // Di aplikasi ini, Panel Accounting membaca dari data_pelanggan_meteran
    // Kita cek apakah customer sudah ada di data_pelanggan_meteran
    const tbPelangganRef = doc(db, 'data_pelanggan_meteran', customerId);
    const tbPelangganSnap = await getDoc(tbPelangganRef);
    
    if (tbPelangganSnap.exists()) {
      await updateDoc(tbPelangganRef, {
        tagihanTunggakan: increment(totalAmount),
        lastUpdated: new Date().toISOString()
      });

      // Kirim Notifikasi ke Pelanggan
      const userUid = currentData.userId || '';
      if (userUid) {
        await addDoc(collection(db, 'notifikasi_pengguna'), {
          title: 'Tagihan Air Baru Diterbitkan',
          message: `Tagihan air periode ${currentMonth} sebesar ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalAmount)} telah diterbitkan. Silakan bayar sebelum tanggal jatuh tempo.`,
          userId: userUid,
          read: false,
          createdAt: serverTimestamp(),
          authorId: 'system',
          type: 'info',
          targetView: 'billing'
        });
      }
    } else {
      // Jika belum ada, buat baru
      await setDoc(tbPelangganRef, {
        nomorSambungan: customerId.substring(0, 8).toUpperCase(),
        no_meter: customerId.substring(0, 8).toUpperCase(),
        id_pelanggan: customerId.substring(0, 8).toUpperCase(),
        nama: userData.nama || 'Pelanggan',
        alamat: userData.alamat || '-',
        golongan: golonganData.name,
        gol: golonganData.name,
        tagihanTunggakan: totalAmount,
        lastUpdated: new Date().toISOString()
      });
    }

    // 7. Kirim log aktivitas
    await addDoc(collection(db, 'log_aktivitas_staf_admin'), {
      userId: auth.currentUser?.uid || 'system',
      userName: auth.currentUser?.displayName || 'Petugas Akuntansi',
      userRole: 'accounting',
      action: 'Cetak Tagihan',
      details: `Menerbitkan tagihan air periode ${currentMonth} untuk pelanggan ${userData.nama || 'Pelanggan'} sebesar ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalAmount)}`,
      timestamp: new Date().toISOString()
    });

    return { 
      success: true, 
      message: 'Pembacaan meter dan tagihan berhasil diproses.',
      billId: billDocRef.id
    };

  } catch (err: any) {
    console.error('Error generating billing:', err);
    return { success: false, message: 'Gagal memproses billing: ' + err.message };
  }
};

/**
 * Proses pembayaran tagihan
 */
export const processPayment = async (billId: string, customerId: string, amount: number): Promise<{ success: boolean; message: string }> => {
  try {
    const billRef = doc(db, 'tagihan_air_pelanggan', billId);
    const tbPelangganRef = doc(db, 'data_pelanggan_meteran', customerId);

    // Menggunakan runTransaction untuk memastikan pembaruan data tagihan bulanan
    // dan pemotongan saldo tunggakan berjalan secara atomik (mencegah balapan data/race condition).
    // 1. Jalankan Transaksi Firestore untuk mengupdate status tagihan dan tunggakan secara atomik
    await runTransaction(db, async (transaction) => {
      const billSnap = await transaction.get(billRef);
      const tbPelangganSnap = await transaction.get(tbPelangganRef);

      if (!billSnap.exists()) {
        throw new Error('Data tagihan tidak ditemukan.');
      }

      // Update status tagihan_air_pelanggan jadi paid
      transaction.update(billRef, {
        status: 'paid',
        paidDate: new Date().toISOString()
      });

      // Kurangi tagihanTunggakan di data_pelanggan_meteran
      if (tbPelangganSnap.exists()) {
        const currentData = tbPelangganSnap.data();
        const currentTunggakan = currentData.tagihanTunggakan || 0;
        const newTunggakan = Math.max(0, currentTunggakan - amount);
        
        transaction.update(tbPelangganRef, {
          tagihanTunggakan: newTunggakan,
          lastUpdated: new Date().toISOString()
        });

        // Kirim Notifikasi ke Pelanggan
        const userUid = currentData.userId || '';
        if (userUid) {
          const notifRef = doc(collection(db, 'notifikasi_pengguna'));
          transaction.set(notifRef, {
            title: 'Pembayaran Dikonfirmasi',
            message: `Pembayaran tagihan sebesar ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)} telah berhasil dikonfirmasi oleh petugas. Terima kasih atas pembayaran Anda.`,
            userId: userUid,
            read: false,
            createdAt: serverTimestamp(),
            authorId: 'system',
            type: 'success',
            targetView: 'billing'
          });
        }
      }

      // Kirim log aktivitas ke manager
      const activityRef = doc(collection(db, 'log_aktivitas_staf_admin'));
      transaction.set(activityRef, {
        userId: auth.currentUser?.uid || 'system',
        userName: auth.currentUser?.displayName || 'Petugas Pembayaran',
        userRole: 'accounting',
        action: 'Penerimaan Pembayaran',
        details: `Memverifikasi pembayaran tagihan sebesar ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)} untuk customer ID: ${customerId}`,
        timestamp: new Date().toISOString()
      });
    });

    // Integrasi modul billing ke akuntansi: mendeteksi COA kas & piutang air secara dinamis,
    // lalu membuat entri double-entry (debit/kredit) otomatis pada koleksi transactions.
    // 2. Catat Ayat Jurnal otomatis untuk penerimaan kas air (Cash Receipt Journal) secara asinkron
    try {
      const coaSnap = await getDocs(collection(db, 'coa'));
      const coaList = coaSnap.docs.map(doc => doc.data());
      
      const findCoaCode = (prefix: string) => {
        const matched = coaList.find(c => c.code && c.code.startsWith(prefix) && c.level === 3);
        return matched ? matched.code : prefix;
      };

      const kasAccount = findCoaCode('1.1.1.01'); // Kas Loket Kantor
      const piutangAccount = findCoaCode('1.1.3');  // Piutang Air
      
      const todayStr = new Date().toISOString().split('T')[0];
      const billSnap = await getDoc(billRef);
      const billData = billSnap.exists() ? billSnap.data() : {};
      const desc = `Pembayaran Tagihan Air a/n ${billData.customerName || 'Pelanggan'} - Periode ${billData.periodeBulan || ''} ${billData.periodeTahun || ''}`;
      
      // Debit: Kas Loket Kantor
      await addDoc(collection(db, 'jurnal_transaksi_keuangan'), {
        date: todayStr,
        reference: `BKM-${billId.substring(0, 5).toUpperCase()}`,
        description: desc,
        category: kasAccount,
        type: 'income', // Debit
        amount: amount,
        status: 'pending',
        createdAt: new Date().toISOString(),
        authorId: 'system-billing',
        authorName: 'Sistem Billing Otomatis'
      });

      // Kredit: Piutang Air
      await addDoc(collection(db, 'jurnal_transaksi_keuangan'), {
        date: todayStr,
        reference: `BKM-${billId.substring(0, 5).toUpperCase()}`,
        description: desc,
        category: piutangAccount,
        type: 'expense', // Kredit
        amount: amount,
        status: 'pending',
        createdAt: new Date().toISOString(),
        authorId: 'system-billing',
        authorName: 'Sistem Billing Otomatis'
      });
    } catch (journalErr) {
      console.error('Gagal mencatatkan ayat jurnal otomatis:', journalErr);
    }

    return { success: true, message: 'Pembayaran berhasil dikonfirmasi dan dicatat ke keuangan.' };
  } catch (err: any) {
    console.error('Error processing payment:', err);
    return { success: false, message: 'Gagal memproses pembayaran: ' + err.message };
  }
};

