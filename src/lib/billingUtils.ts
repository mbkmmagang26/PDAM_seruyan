import { collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, query, where, orderBy, limit, runTransaction, serverTimestamp } from 'firebase/firestore';
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
    // 1. Dapatkan data pelanggan dari tb_pelanggan
    const userDocRef = doc(db, 'tb_pelanggan', customerId);
    const userSnap = await getDoc(userDocRef);
    
    if (!userSnap.exists()) {
      return { success: false, message: 'Data pelanggan tidak ditemukan.' };
    }
    
    const userData = userSnap.data();
    const userGolongan = userData.golongan || userData.gol;
    if (!userGolongan) {
       return { success: false, message: 'Pelanggan belum memiliki Golongan Tarif.' };
    }

    // 2. Dapatkan data Golongan berdasarkan nama
    const golQ = query(collection(db, 'tb_golongan'), where('name', '==', userGolongan), limit(1));
    const golSnap = await getDocs(golQ);
    
    if (golSnap.empty) {
      return { success: false, message: 'Data Golongan tidak ditemukan.' };
    }
    
    const golonganData = golSnap.docs[0].data() as Golongan;

    // 3. Dapatkan stand meter bulan lalu (Stand Awal)
    let standAwal = 0;
    const meterQ = query(
      collection(db, 'tb_meter_pelanggan'), 
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

    // 4. Simpan ke tb_meterpelanggan
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
    
    const meterDocRef = await addDoc(collection(db, 'tb_meter_pelanggan'), newMeterData);

    // 5. Kalkulasi Tagihan (tb_billing)
    const biayaPemakaian = calculateBiayaPemakaian(pemakaian, golonganData);
    const biayaAdmin = golonganData.biayaAdmin || 0;
    const totalAmount = biayaPemakaian + biayaAdmin;

    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const periodeBulan = monthNames[dateNow.getMonth()];
    const periodeTahun = yearStr;

    const newBillData: Omit<Bill, 'id'> = {
      customerId,
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

    const billDocRef = await addDoc(collection(db, 'tb_billing'), newBillData);

    // 6. Update sinkronisasi ke panel Accounting (tb_pelanggan)
    // Di aplikasi ini, Panel Accounting membaca dari tb_pelanggan
    // Kita cek apakah customer sudah ada di tb_pelanggan
    const tbPelangganRef = doc(db, 'tb_pelanggan', customerId);
    const tbPelangganSnap = await getDoc(tbPelangganRef);
    
    if (tbPelangganSnap.exists()) {
      const currentData = tbPelangganSnap.data();
      const currentTunggakan = currentData.tagihanTunggakan || 0;
      await updateDoc(tbPelangganRef, {
        tagihanTunggakan: currentTunggakan + totalAmount,
        lastUpdated: new Date().toISOString()
      });

      // Kirim Notifikasi ke Pelanggan
      const userUid = currentData.userId || '';
      if (userUid) {
        await addDoc(collection(db, 'notifications'), {
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
    await addDoc(collection(db, 'log_aktivitas_internal'), {
      userId: auth.currentUser?.uid || 'system',
      userName: auth.currentUser?.displayName || 'Petugas Akuntansi',
      activityType: 'Cetak Tagihan',
      description: `Menerbitkan tagihan air periode ${currentMonth} untuk pelanggan ${userData.nama || 'Pelanggan'} sebesar ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalAmount)}`,
      createdAt: serverTimestamp()
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
    const billRef = doc(db, 'tb_billing', billId);
    const tbPelangganRef = doc(db, 'tb_pelanggan', customerId);

    // Menggunakan runTransaction untuk memastikan pembaruan data tagihan bulanan
    // dan pemotongan saldo tunggakan berjalan secara atomik (mencegah balapan data/race condition).
    // 1. Jalankan Transaksi Firestore untuk mengupdate status tagihan dan tunggakan secara atomik
    await runTransaction(db, async (transaction) => {
      const billSnap = await transaction.get(billRef);
      const tbPelangganSnap = await transaction.get(tbPelangganRef);

      if (!billSnap.exists()) {
        throw new Error('Data tagihan tidak ditemukan.');
      }

      // Update status tb_billing jadi paid
      transaction.update(billRef, {
        status: 'paid',
        paidDate: new Date().toISOString()
      });

      // Kurangi tagihanTunggakan di tb_pelanggan
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
          const notifRef = doc(collection(db, 'notifications'));
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
      const activityRef = doc(collection(db, 'log_aktivitas_internal'));
      transaction.set(activityRef, {
        userId: auth.currentUser?.uid || 'system',
        userName: auth.currentUser?.displayName || 'Petugas Pembayaran',
        activityType: 'Penerimaan Pembayaran',
        description: `Memverifikasi pembayaran tagihan sebesar ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)} untuk customer ID: ${customerId}`,
        createdAt: serverTimestamp()
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
      await addDoc(collection(db, 'transactions'), {
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
      await addDoc(collection(db, 'transactions'), {
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
