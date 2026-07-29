const fs = require('fs');
const path = require('path');

const mappings = {
  'tb_pelanggan': 'data_pelanggan_meteran',
  'tb_billing': 'tagihan_air_pelanggan',
  'tb_meter_pelanggan': 'pembacaan_meter_staf',
  'tb_permohonan': 'permohonan_pasang_baru',
  'pengaduan': 'pengaduan_layanan_pelanggan',
  'aksi_pengaduan': 'tugas_perbaikan_staf',
  'tb_golongan': 'master_tarif_air',
  'transactions': 'jurnal_transaksi_keuangan',
  'inventory': 'stok_material_pipa',
  'assets': 'inventaris_aset_tetap',
  'budgets': 'anggaran_operasional',
  'lpp_uploads': 'laporan_penagihan_kasir',
  'notifications': 'notifikasi_pengguna',
  'customer_activity': 'log_aktivitas_pelanggan',
  'tb_activity_user_admin': 'log_aktivitas_staf_admin',
  'tb_meter_records': 'pembacaan_meter_staf',
  'tb_tagihan': 'tagihan_air_pelanggan',
  'tugas_staff': 'tugas_perbaikan_staf',
  'tasks': 'tugas_perbaikan_staf'
};

function processDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        processDirectory(fullPath);
      }
    } else if (/\.(ts|tsx|js|jsx)$/.test(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      
      for (const [oldName, newName] of Object.entries(mappings)) {
        const regexSingle = new RegExp(`'${oldName}'`, 'g');
        if (regexSingle.test(content)) {
          content = content.replace(regexSingle, `'${newName}'`);
          changed = true;
        }
        
        const regexDouble = new RegExp(`"${oldName}"`, 'g');
        if (regexDouble.test(content)) {
          content = content.replace(regexDouble, `"${newName}"`);
          changed = true;
        }
        
        const regexBacktick = new RegExp(`\`${oldName}\``, 'g');
        if (regexBacktick.test(content)) {
          content = content.replace(regexBacktick, `\`${newName}\``);
          changed = true;
        }
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated collections in: ${fullPath}`);
      }
    }
  }
}

console.log("Processing PDAM_Pelanggan...");
processDirectory('d:/PDAM_Pelanggan/src');
console.log("Processing PDAM_seruyan...");
processDirectory('d:/PDAM_seruyan/src');
console.log("Done.");
