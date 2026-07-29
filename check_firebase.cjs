const https = require('https');

function getCollection(collectionName) {
  return new Promise((resolve, reject) => {
    const url = `https://firestore.googleapis.com/v1/projects/pdam-seruyan/databases/(default)/documents/${collectionName}?pageSize=10`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function check() {
  try {
    const jurnal = await getCollection('jurnal_transaksi_keuangan');
    console.log(JSON.stringify(jurnal, null, 2));
  } catch(e) {
    console.error(e);
  }
}

check();
