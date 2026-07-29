const fs = require('fs');
let content = fs.readFileSync('src/pages/accounting/views/LaporanKeuangan.tsx', 'utf8');

const lines = content.split(/\r?\n/);

let newLines = [];
let i = 0;
while (i < lines.length) {
    if (i === 94) {
        // Line 95 in 1-indexed is index 94
        newLines.push(`        if (t.category) {
          if (balances[t.category] === undefined) balances[t.category] = 0;
          
          const acc = coa.find(c => c.code === t.category);
          const typeStr = acc ? acc.type : (t.category.startsWith('1') ? 'ASSET' : t.category.startsWith('2') ? 'LIABILITY' : t.category.startsWith('3') ? 'EQUITY' : t.category.startsWith('4') ? 'REVENUE' : 'EXPENSE');
          const isAssetOrExpense = typeStr === 'ASSET' || typeStr === 'EXPENSE';

          let debit = 0;
          let kredit = 0;

          if (t.type === 'income') {
             debit = t.amount || 0;
          } else if (t.type === 'expense') {
             kredit = t.amount || 0;
          } else {
             debit = t.amount || 0;
          }

          if (t.authorId === 'system-billing') {
            debit = t.amount || 0;
            kredit = 0;
          }
          
          if (isAssetOrExpense) balances[t.category] += (debit - kredit);
          else balances[t.category] += (kredit - debit);
        }

        if (t.contraEntry && t.contraEntry.category) {
          const cCat = t.contraEntry.category;
          if (balances[cCat] === undefined) balances[cCat] = 0;
          
          const acc = coa.find(c => c.code === cCat);
          const typeStr = acc ? acc.type : (cCat.startsWith('1') ? 'ASSET' : cCat.startsWith('2') ? 'LIABILITY' : cCat.startsWith('3') ? 'EQUITY' : cCat.startsWith('4') ? 'REVENUE' : 'EXPENSE');
          const cIsAssetOrExpense = typeStr === 'ASSET' || typeStr === 'EXPENSE';

          let cDebit = 0;
          let cKredit = 0;

          if (t.type === 'income') {
             cKredit = t.contraEntry.amount || 0;
          } else if (t.type === 'expense') {
             cDebit = t.contraEntry.amount || 0;
          } else {
             cKredit = t.contraEntry.amount || 0;
          }

          if (t.authorId === 'system-billing') {
            cDebit = 0;
            cKredit = t.contraEntry.amount || 0;
          }
          
          if (cIsAssetOrExpense) balances[cCat] += (cDebit - cKredit);
          else balances[cCat] += (cKredit - cDebit);
        }
      });
      return balances;
    };

    const cumulativeBalances = calculateBalances(cumulativeTx);
    const periodBalances = calculateBalances(periodTx);

    // Sync Master Data for Integration (Neraca)
    let totalInjectedAssets = 0;
    let totalInjectedLiabilities = 0;

    coa.forEach(c => {
      const name = (c.name || '').toLowerCase();
      const code = (c.code || '');
      
      // Persediaan
      if (name.includes('persediaan') && masterData.inventory > 0) {
        cumulativeBalances[code] = (cumulativeBalances[code] || 0) + masterData.inventory;
        totalInjectedAssets += masterData.inventory;
      }
      
      // Aset Tetap Mapping
      if (code.startsWith('1.3')) {
        let injected = 0;
        if (name.includes('tanah') && masterData.assetsByCat['Tanah']) {
          injected = masterData.assetsByCat['Tanah'];
        } else if ((name.includes('bangunan') || name.includes('instalasi')) && masterData.assetsByCat['Bangunan Air / Instalasi']) {
          injected = masterData.assetsByCat['Bangunan Air / Instalasi'];
        } else if ((name.includes('peralatan') || name.includes('mesin')) && masterData.assetsByCat['Peralatan & Mesin']) {
          injected = masterData.assetsByCat['Peralatan & Mesin'];
        } else if (name.includes('aset tetap') && !name.includes('akumulasi')) {
           const mappedTotal = (masterData.assetsByCat['Tanah'] || 0) + (masterData.assetsByCat['Bangunan Air / Instalasi'] || 0) + (masterData.assetsByCat['Peralatan & Mesin'] || 0);
           if (masterData.assets - mappedTotal > 0) {
             injected = (masterData.assets - mappedTotal);
           }
        }
        if (injected > 0) {
          cumulativeBalances[code] = (cumulativeBalances[code] || 0) + injected;
          totalInjectedAssets += injected;
        }
      }

      // Hutang
      if (name.includes('hutang dagang') && masterData.debt > 0) {
        cumulativeBalances[code] = (cumulativeBalances[code] || 0) + masterData.debt;
        totalInjectedLiabilities += masterData.debt;
      }
    });

    // Menyeimbangkan Neraca akibat injeksi Master Data
    const netInjection = totalInjectedAssets - totalInjectedLiabilities;
    if (netInjection > 0) {
      const equityAccount = coa.find(c => c.code && c.code.startsWith('3') && c.level === 3) || coa.find(c => c.code && c.code.startsWith('3'));
      if (equityAccount) {
        cumulativeBalances[equityAccount.code] = (cumulativeBalances[equityAccount.code] || 0) + netInjection;
      }
    }
`);
        // Skip up to line 160
        i = 159;
    } else {
        newLines.push(lines[i]);
    }
    i++;
}

fs.writeFileSync('src/pages/accounting/views/LaporanKeuangan.tsx', newLines.join('\n'));
