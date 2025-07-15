// ====== DATA DAN KONSTANTA INVESTASI ====== //
const sahamKey = "dataSaham";
const hargaSahamKey = "hargaSahamTerakhir";
let dataSaham = [];
let hargaSahamTerakhir = {};

// ====== FUNGSI UTILITAS DARI SCRIPT UTAMA ====== //
function formatRupiah(angka) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(angka);
}

function formatTanggal(tanggal) {
  const date = new Date(tanggal);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// ====== FUNGSI UTILITAS KHUSUS INVESTASI ====== //
function validasiInputSaham(kode, lembar, harga, tanggal) {
  const errors = [];
  
  if (!kode || kode.trim() === "") {
    errors.push("Kode saham harus diisi");
  } else if (!/^[A-Z]{3,5}$/.test(kode.trim().toUpperCase())) {
    errors.push("Kode saham harus 3-5 huruf kapital (contoh: BBCA, TLKM)");
  }
  
  if (!lembar || lembar <= 0 || lembar % 1 !== 0) {
    errors.push("Jumlah lembar harus bilangan bulat positif");
  }
  
  if (!harga || harga <= 0) {
    errors.push("Harga per lembar harus lebih dari 0");
  }
  
  if (!tanggal) {
    errors.push("Tanggal transaksi harus diisi");
  }
  
  return errors;
}

function cekKepemilikanSaham(kode, lembarJual) {
  const kodeUpper = kode.toUpperCase();
  let totalKepemilikan = 0;
  
  dataSaham.forEach(item => {
    if (item.kode.toUpperCase() === kodeUpper) {
      if (item.tipe === "beli") {
        totalKepemilikan += item.lembar;
      } else if (item.tipe === "jual") {
        totalKepemilikan -= item.lembar;
      }
    }
  });
  
  return totalKepemilikan >= lembarJual;
}

function hitungRataRataHargaBeli(kode) {
  const kodeUpper = kode.toUpperCase();
  let totalLembar = 0;
  let totalModal = 0;
  
  dataSaham.forEach(item => {
    if (item.kode.toUpperCase() === kodeUpper && item.tipe === "beli") {
      totalLembar += item.lembar;
      totalModal += (item.lembar * item.harga) + (item.biaya || 0);
    }
  });
  
  return totalLembar > 0 ? totalModal / totalLembar : 0;
}

// ====== FUNGSI LOCALSTORAGE INVESTASI ====== //
function simpanDataSaham() {
  try {
    localStorage.setItem(sahamKey, JSON.stringify(dataSaham));
    localStorage.setItem(hargaSahamKey, JSON.stringify(hargaSahamTerakhir));
    return true;
  } catch (error) {
    console.error("Gagal menyimpan data saham:", error);
    alert("Gagal menyimpan data investasi. Storage mungkin penuh.");
    return false;
  }
}

function muatDataSaham() {
  try {
    const dataSahamStr = localStorage.getItem(sahamKey);
    const hargaSahamStr = localStorage.getItem(hargaSahamKey);
    
    if (dataSahamStr) {
      const parsedData = JSON.parse(dataSahamStr);
      // Validasi dan bersihkan data yang korup
      dataSaham = parsedData.filter(item => 
        item && 
        item.kode && 
        typeof item.lembar === 'number' && 
        typeof item.harga === 'number' &&
        item.tanggal &&
        (item.tipe === 'beli' || item.tipe === 'jual')
      );
    }
    
    if (hargaSahamStr) {
      hargaSahamTerakhir = JSON.parse(hargaSahamStr);
    }
    
    return true;
  } catch (error) {
    console.error("Gagal memuat data saham:", error);
    alert("Gagal memuat data investasi. Data mungkin korup.");
    dataSaham = [];
    hargaSahamTerakhir = {};
    return false;
  }
}

// ====== FUNGSI HARGA PASAR DINAMIS ====== //
function getHargaPasar(kode) {
  const kodeUpper = kode.toUpperCase();
  
  // Jika ada harga terakhir yang disimpan, gunakan itu
  if (hargaSahamTerakhir[kodeUpper]) {
    return hargaSahamTerakhir[kodeUpper];
  }
  
  // Harga pasar dummy yang lebih realistis
  const hargaPasarDummy = {
    BBCA: 9450,
    BBRI: 4890,
    TLKM: 4150,
    UNVR: 4050,
    ASII: 6200,
    BMRI: 5800,
    GGRM: 56000,
    INDF: 8100,
    KLBF: 1580,
    SMGR: 4200,
    ICBP: 10500,
    HMSP: 1420,
    ADRO: 2800,
    PGAS: 1250,
    PTBA: 3100,
    BBTN: 1800,
    BRIS: 2350,
    ANTM: 2100,
    INCO: 4500,
    TINS: 1250
  };
  
  return hargaPasarDummy[kodeUpper] || 5000;
}

function updateHargaPasar(kode, hargaBaru) {
  const kodeUpper = kode.toUpperCase();
  hargaSahamTerakhir[kodeUpper] = hargaBaru;
  simpanDataSaham();
}

// ====== FUNGSI MENAMPILKAN RINGKASAN INVESTASI ====== //
function updateRingkasanInvestasi() {
  let portofolio = {};
  let realizedPL = 0;
  let totalInvestasi = 0;

  // Hitung posisi saham dan realized P/L
  dataSaham.forEach((item) => {
    const kode = item.kode.toUpperCase();
    const totalTransaksi = (item.lembar * item.harga) + (item.biaya || 0);
    
    if (!portofolio[kode]) {
      portofolio[kode] = { 
        lembar: 0, 
        totalModal: 0, 
        totalBiaya: 0,
        transaksi: []
      };
    }

    if (item.tipe === "beli") {
      portofolio[kode].lembar += item.lembar;
      portofolio[kode].totalModal += item.lembar * item.harga;
      portofolio[kode].totalBiaya += item.biaya || 0;
      totalInvestasi += totalTransaksi;
    } else if (item.tipe === "jual") {
      portofolio[kode].lembar -= item.lembar;
      
      // Hitung realized P/L (simplified FIFO)
      const rataHargaBeli = hitungRataRataHargaBeli(kode);
      const modalTerjual = item.lembar * rataHargaBeli;
      const hasilJual = (item.lembar * item.harga) - (item.biaya || 0);
      realizedPL += hasilJual - modalTerjual;
    }
    
    portofolio[kode].transaksi.push(item);
  });

  let totalNilaiPortofolio = 0;
  let totalUnrealizedPL = 0;

  const tbody = document.getElementById("tabel-portofolio");
  if (tbody) tbody.innerHTML = "";

  // Tampilkan portfolio yang masih ada
  for (let kode in portofolio) {
    const data = portofolio[kode];
    if (data.lembar <= 0) continue;

    const rataModal = (data.totalModal + data.totalBiaya) / data.lembar;
    const hargaPasar = getHargaPasar(kode);
    const nilaiSaatIni = data.lembar * hargaPasar;
    const modalTotal = data.totalModal + data.totalBiaya;
    const unrealizedPL = nilaiSaatIni - modalTotal;
    const persentasePL = modalTotal > 0 ? ((unrealizedPL / modalTotal) * 100).toFixed(2) : 0;

    totalNilaiPortofolio += nilaiSaatIni;
    totalUnrealizedPL += unrealizedPL;

    // Tampilkan ke tabel portofolio
    if (tbody) {
      const row = document.createElement("tr");
      const plClass = unrealizedPL >= 0 ? 'text-success' : 'text-danger';
      const plSymbol = unrealizedPL >= 0 ? '+' : '';
      
      row.innerHTML = `
        <td><strong>${kode}</strong></td>
        <td class="text-center">${data.lembar.toLocaleString()}</td>
        <td class="text-right">${formatRupiah(rataModal)}</td>
        <td class="text-right">
          ${formatRupiah(hargaPasar)}
          <button class="btn-update-harga" onclick="updateHargaModal('${kode}', ${hargaPasar})" title="Update harga">
            📊
          </button>
        </td>
        <td class="text-right ${plClass}">
          ${plSymbol}${formatRupiah(Math.abs(unrealizedPL))} 
          <small>(${persentasePL}%)</small>
        </td>
      `;
      tbody.appendChild(row);
    }
  }

  // Update ringkasan dengan pengecekan elemen
  const nilaiPortofolioEl = document.getElementById("nilai-portofolio");
  if (nilaiPortofolioEl) {
    nilaiPortofolioEl.textContent = formatRupiah(totalNilaiPortofolio);
  }
  
  const unrealizedElement = document.getElementById("unrealized-pl");
  if (unrealizedElement) {
    unrealizedElement.textContent = formatRupiah(totalUnrealizedPL);
    unrealizedElement.className = totalUnrealizedPL >= 0 ? 'text-success' : 'text-danger';
  }
  
  const realizedElement = document.getElementById("realized-pl");
  if (realizedElement) {
    realizedElement.textContent = formatRupiah(realizedPL);
    realizedElement.className = realizedPL >= 0 ? 'text-success' : 'text-danger';
  }

  // Update grafik portfolio
  updatePortfolioChart(portofolio);
}

// ====== GRAFIK PORTFOLIO SEDERHANA ====== //
function updatePortfolioChart(portofolio) {
  const chartContainer = document.getElementById("portfolio-chart");
  if (!chartContainer) return;

  const portfolioData = [];
  let totalNilai = 0;

  for (let kode in portofolio) {
    const data = portofolio[kode];
    if (data.lembar <= 0) continue;

    const hargaPasar = getHargaPasar(kode);
    const nilaiSaatIni = data.lembar * hargaPasar;
    
    portfolioData.push({
      kode,
      nilai: nilaiSaatIni,
      lembar: data.lembar
    });
    
    totalNilai += nilaiSaatIni;
  }

  if (portfolioData.length === 0) {
    chartContainer.innerHTML = '<p style="color: #666;">Belum ada portfolio saham</p>';
    return;
  }

  const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF8A80', '#82B1FF'];
  
  let chartHTML = '<div class="portfolio-chart-container">';
  
  portfolioData.forEach((item, index) => {
    const persentase = ((item.nilai / totalNilai) * 100).toFixed(1);
    const color = colors[index % colors.length];
    
    chartHTML += `
      <div class="portfolio-item">
        <div class="portfolio-bar" style="width: ${persentase}%; background-color: ${color}"></div>
        <div class="portfolio-label">
          <span class="saham-kode">${item.kode}</span>
          <span class="saham-nilai">${formatRupiah(item.nilai)} (${persentase}%)</span>
        </div>
      </div>
    `;
  });
  
  chartHTML += '</div>';
  chartContainer.innerHTML = chartHTML;
}

// ====== MODAL UPDATE HARGA ====== //
function updateHargaModal(kode, hargaSekarang) {
  const hargaBaru = prompt(`Update harga ${kode}:\nHarga sekarang: ${formatRupiah(hargaSekarang)}\n\nMasukkan harga baru:`);
  
  if (hargaBaru && !isNaN(hargaBaru) && parseFloat(hargaBaru) > 0) {
    updateHargaPasar(kode, parseFloat(hargaBaru));
    updateRingkasanInvestasi();
    tampilkanRiwayatSaham();
  }
}

// ====== RIWAYAT TRANSAKSI SAHAM ====== //
function tampilkanRiwayatSaham() {
  const tbody = document.getElementById("tabel-transaksi-saham");
  if (!tbody) return;
  
  tbody.innerHTML = "";

  if (dataSaham.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="6" style="text-align: center; color: #666;">Belum ada transaksi saham</td>`;
    tbody.appendChild(row);
    return;
  }

  // Urutkan berdasarkan tanggal terbaru
  const dataTerurut = [...dataSaham].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

  dataTerurut.forEach((item, index) => {
    const originalIndex = dataSaham.findIndex(original => 
      original.kode === item.kode && 
      original.tanggal === item.tanggal && 
      original.lembar === item.lembar &&
      original.harga === item.harga &&
      original.timestamp === item.timestamp
    );

    const total = (item.harga * item.lembar) + (item.biaya || 0);
    const tipeClass = item.tipe === 'beli' ? 'badge-success' : 'badge-danger';
    const tipeText = item.tipe === 'beli' ? 'BELI' : 'JUAL';
    
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatTanggal(item.tanggal)}</td>
      <td><strong>${item.kode.toUpperCase()}</strong></td>
      <td><span class="badge ${tipeClass}">${tipeText}</span></td>
      <td class="text-right">${formatRupiah(item.harga)}</td>
      <td class="text-right">${item.lembar.toLocaleString()}</td>
      <td class="text-right">${formatRupiah(total)}</td>
      <td class="text-center">
        <button class="btn-hapus" onclick="hapusTransaksiSaham(${originalIndex})" title="Hapus transaksi">
          <span>🗑️</span>
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// ====== HAPUS TRANSAKSI SAHAM ====== //
function hapusTransaksiSaham(index) {
  if (confirm("Hapus transaksi saham ini?")) {
    dataSaham.splice(index, 1);
    
    if (simpanDataSaham()) {
      updateRingkasanInvestasi();
      tampilkanRiwayatSaham();
    }
  }
}

// ====== INISIALISASI INVESTASI ====== //
function inisialisasiInvestasi() {
  muatDataSaham();
  updateRingkasanInvestasi();
  tampilkanRiwayatSaham();
}

// ====== EVENT LISTENERS ====== //
document.addEventListener("DOMContentLoaded", function() {
  // Pastikan halaman investasi sudah dimuat
  if (document.getElementById("btn-catat-saham")) {
    
    // Inisialisasi data
    inisialisasiInvestasi();
    
    // Event listener untuk tombol catat saham
    document.getElementById("btn-catat-saham").addEventListener("click", () => {
      // Set tanggal hari ini sebagai default
      const today = new Date().toISOString().split('T')[0];
      document.getElementById("tanggal-saham").value = today;
      document.getElementById("modal-saham").classList.remove("hidden");
      document.getElementById("kode-saham").focus();
    });

    // Event listener untuk tombol tutup modal
    document.getElementById("tutup-modal-saham").addEventListener("click", () => {
      document.getElementById("modal-saham").classList.add("hidden");
      document.getElementById("form-transaksi-saham").reset();
    });

    // Tutup modal jika klik di luar modal
    document.getElementById("modal-saham").addEventListener("click", (e) => {
      if (e.target.id === "modal-saham") {
        document.getElementById("modal-saham").classList.add("hidden");
        document.getElementById("form-transaksi-saham").reset();
      }
    });

    // Toggle beli/jual
    document.getElementById("btn-beli-saham").addEventListener("click", () => {
      document.getElementById("tipe-saham").value = "beli";
      aktifkanToggleSaham("btn-beli-saham");
    });

    document.getElementById("btn-jual-saham").addEventListener("click", () => {
      document.getElementById("tipe-saham").value = "jual";
      aktifkanToggleSaham("btn-jual-saham");
    });

    // Auto-format kode saham
    document.getElementById("kode-saham").addEventListener("input", function(e) {
      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 5);
    });

    // Submit form transaksi saham
    document.getElementById("form-transaksi-saham").addEventListener("submit", function (e) {
      e.preventDefault();

      const kode = document.getElementById("kode-saham").value.trim().toUpperCase();
      const lembar = parseInt(document.getElementById("lembar").value);
      const harga = parseFloat(document.getElementById("harga-saham").value);
      const biaya = parseFloat(document.getElementById("biaya-transaksi").value || "0");
      const tanggal = document.getElementById("tanggal-saham").value;
      const tipe = document.getElementById("tipe-saham").value;

      // Validasi input
      const errors = validasiInputSaham(kode, lembar, harga, tanggal);
      
      if (errors.length > 0) {
        alert("Error:\n" + errors.join("\n"));
        return;
      }

      // Validasi khusus untuk penjualan
      if (tipe === "jual" && !cekKepemilikanSaham(kode, lembar)) {
        alert(`Tidak dapat menjual ${lembar} lembar ${kode}. Kepemilikan Anda tidak mencukupi.`);
        return;
      }

      const transaksi = {
        kode,
        lembar,
        harga,
        biaya,
        tanggal,
        tipe,
        timestamp: new Date().toISOString()
      };

      dataSaham.push(transaksi);
      
      // Update harga pasar dengan harga transaksi terbaru
      updateHargaPasar(kode, harga);
      
      if (simpanDataSaham()) {
        document.getElementById("form-transaksi-saham").reset();
        document.getElementById("modal-saham").classList.add("hidden");

        updateRingkasanInvestasi();
        tampilkanRiwayatSaham();
        
        // Reset toggle ke beli
        document.getElementById("tipe-saham").value = "beli";
        aktifkanToggleSaham("btn-beli-saham");
        
        // Success message
        alert("Transaksi berhasil disimpan!");
      }
    });
  }
});

// ====== FUNGSI TOGGLE SAHAM ====== //
function aktifkanToggleSaham(idAktif) {
  const btnBeli = document.getElementById("btn-beli-saham");
  const btnJual = document.getElementById("btn-jual-saham");
  
  if (btnBeli && btnJual) {
    btnBeli.classList.remove("active");
    btnJual.classList.remove("active");
    
    const activeBtn = document.getElementById(idAktif);
    if (activeBtn) {
      activeBtn.classList.add("active");
    }
  }
}

// ====== EXPORT/IMPORT DATA SAHAM ====== //
function exportDataSaham() {
  const dataExport = {
    saham: dataSaham,
    hargaTerakhir: hargaSahamTerakhir,
    exported: new Date().toISOString(),
    version: "1.0"
  };
  
  const dataBlob = new Blob([JSON.stringify(dataExport, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = `investasi_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}

function importDataSaham(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importedData = JSON.parse(e.target.result);
      
      if (importedData.saham && Array.isArray(importedData.saham)) {
        if (confirm("Import data akan mengganti semua data investasi yang ada. Lanjutkan?")) {
          dataSaham = importedData.saham;
          hargaSahamTerakhir = importedData.hargaTerakhir || {};
          simpanDataSaham();
          inisialisasiInvestasi();
          alert("Data investasi berhasil diimpor!");
        }
      } else {
        alert("Format file tidak valid!");
      }
    } catch (error) {
      alert("Gagal membaca file!");
    }
  };
  reader.readAsText(file);
}