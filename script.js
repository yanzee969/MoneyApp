// ========== DATA DAN KONSTANTA ========== //
const transaksiKey = "dataTransaksi";
let dataTransaksi = [];
let dataTransaksiTerfilter = [];

// ========== FUNGSI UTILITAS ========== //
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

function validasiInput(jumlah, kategori, tanggal, deskripsi) {
  const errors = [];
  
  if (!jumlah || jumlah <= 0) {
    errors.push("Jumlah harus lebih dari 0");
  }
  
  if (!kategori || kategori.trim() === "") {
    errors.push("Kategori harus dipilih");
  }
  
  if (!tanggal) {
    errors.push("Tanggal harus diisi");
  }
  
  if (!deskripsi || deskripsi.trim() === "") {
    errors.push("Deskripsi harus diisi");
  }
  
  return errors;
}

// ========== FUNGSI LOCALSTORAGE ========== //
function simpanKeLocalStorage() {
  try {
    localStorage.setItem(transaksiKey, JSON.stringify(dataTransaksi));
    return true;
  } catch (error) {
    console.error("Gagal menyimpan ke localStorage:", error);
    alert("Gagal menyimpan data. Storage mungkin penuh atau dinonaktifkan.");
    return false;
  }
}

function muatDariLocalStorage() {
  try {
    const data = localStorage.getItem(transaksiKey);
    if (data) {
      dataTransaksi = JSON.parse(data);
      // Validasi dan bersihkan data yang korup
      dataTransaksi = dataTransaksi.filter(item => 
        item && 
        typeof item.jumlah === 'number' && 
        item.kategori && 
        item.tanggal && 
        item.deskripsi &&
        (item.tipe === 'pemasukan' || item.tipe === 'pengeluaran')
      );
      return true;
    }
    return false;
  } catch (error) {
    console.error("Gagal memuat dari localStorage:", error);
    alert("Gagal memuat data. Data mungkin korup.");
    dataTransaksi = [];
    return false;
  }
}

// ========== MENAMPILKAN RINGKASAN ========== //
function updateRingkasan() {
  let totalMasuk = 0;
  let totalKeluar = 0;

  dataTransaksi.forEach((item) => {
    if (item.tipe === "pemasukan") {
      totalMasuk += parseFloat(item.jumlah);
    } else {
      totalKeluar += parseFloat(item.jumlah);
    }
  });

  const saldo = totalMasuk - totalKeluar;
  
  document.getElementById("total-pemasukan").textContent = formatRupiah(totalMasuk);
  document.getElementById("total-pengeluaran").textContent = formatRupiah(totalKeluar);
  
  const saldoElement = document.getElementById("total-saldo");
  saldoElement.textContent = formatRupiah(saldo);
  
  // Ubah warna berdasarkan saldo
  if (saldo >= 0) {
    saldoElement.style.color = "#28a745";
  } else {
    saldoElement.style.color = "#dc3545";
  }
}

// ========== FUNGSI FILTER ========== //
function terapkanFilter() {
  const searchTerm = document.getElementById("search-deskripsi").value.toLowerCase();
  const filterTanggal = document.getElementById("filter-tanggal").value;
  const filterKategori = document.getElementById("filter-kategori").value;

  dataTransaksiTerfilter = dataTransaksi.filter(item => {
    const cocokDeskripsi = item.deskripsi.toLowerCase().includes(searchTerm);
    const cocokTanggal = !filterTanggal || item.tanggal === filterTanggal;
    const cocokKategori = !filterKategori || item.kategori === filterKategori;
    
    return cocokDeskripsi && cocokTanggal && cocokKategori;
  });

  tampilkanTransaksi();
}

// ========== MENAMPILKAN RIWAYAT TRANSAKSI ========== //
function tampilkanTransaksi() {
  const tbody = document.getElementById("tabel-riwayat");
  tbody.innerHTML = "";

  // Gunakan data terfilter jika ada, atau semua data
  const dataUntukDitampilkan = dataTransaksiTerfilter.length > 0 || 
    document.getElementById("search-deskripsi").value ||
    document.getElementById("filter-tanggal").value ||
    document.getElementById("filter-kategori").value 
    ? dataTransaksiTerfilter : dataTransaksi;

  // Urutkan berdasarkan tanggal terbaru
  const dataTerurut = [...dataUntukDitampilkan].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

  if (dataTerurut.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="5" style="text-align: center; color: #666;">Tidak ada transaksi yang sesuai</td>`;
    tbody.appendChild(row);
    return;
  }

  dataTerurut.forEach((item, index) => {
    const row = document.createElement("tr");
    const originalIndex = dataTransaksi.findIndex(original => 
      original.tanggal === item.tanggal && 
      original.deskripsi === item.deskripsi && 
      original.jumlah === item.jumlah
    );

    const tipeClass = item.tipe === 'pemasukan' ? 'text-success' : 'text-danger';
    const tipeSymbol = item.tipe === 'pemasukan' ? '+' : '-';

    row.innerHTML = `
      <td>${formatTanggal(item.tanggal)}</td>
      <td><span class="badge badge-${item.tipe}">${item.kategori}</span></td>
      <td>${item.deskripsi}</td>
      <td class="${tipeClass}">${tipeSymbol}${formatRupiah(item.jumlah)}</td>
      <td>
        <button class="btn-hapus" onclick="hapusTransaksi(${originalIndex})">
          <span>🗑️</span> Hapus
        </button>
      </td>
    `;

    tbody.appendChild(row);
  });
}

// ========== HAPUS TRANSAKSI ========== //
function hapusTransaksi(index) {
  if (confirm("Yakin ingin menghapus transaksi ini?")) {
    dataTransaksi.splice(index, 1);
    
    if (simpanKeLocalStorage()) {
      updateRingkasan();
      updatePieChart();
      terapkanFilter(); // Refresh tampilan dengan filter yang ada
    }
  }
}

// ========== PIE CHART YANG DIPERBAIKI ========== //
function updatePieChart() {
  const pengeluaranPerKategori = {};
  
  dataTransaksi.forEach(item => {
    if (item.tipe === 'pengeluaran') {
      pengeluaranPerKategori[item.kategori] = (pengeluaranPerKategori[item.kategori] || 0) + item.jumlah;
    }
  });

  const chartContainer = document.getElementById("pie-chart");
  
  if (Object.keys(pengeluaranPerKategori).length === 0) {
    chartContainer.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">Belum ada data pengeluaran</p>';
    return;
  }

  const total = Object.values(pengeluaranPerKategori).reduce((sum, val) => sum + val, 0);
  const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
  
  // Buat chart dengan styling inline
  let chartHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      margin: 10px 0;
    ">
      <h4 style="margin: 0 0 15px 0; color: #333; text-align: center;">Distribusi Pengeluaran</h4>
  `;
  
  // Buat legend dan bar chart
  Object.entries(pengeluaranPerKategori).forEach(([kategori, jumlah], index) => {
    const persentase = ((jumlah / total) * 100).toFixed(1);
    const color = colors[index % colors.length];
    
    chartHTML += `
      <div style="margin-bottom: 12px;">
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px;
          font-size: 14px;
        ">
          <span style="
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <span style="
              width: 16px;
              height: 16px;
              background-color: ${color};
              border-radius: 3px;
              display: inline-block;
            "></span>
            <strong>${kategori}</strong>
          </span>
          <span style="color: #666;">${persentase}%</span>
        </div>
        <div style="
          background-color: #e9ecef;
          height: 20px;
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 5px;
        ">
          <div style="
            width: ${persentase}%;
            height: 100%;
            background-color: ${color};
            transition: width 0.3s ease;
          "></div>
        </div>
        <div style="
          font-size: 12px;
          color: #666;
          text-align: right;
        ">
          ${formatRupiah(jumlah)}
        </div>
      </div>
    `;
  });
  
  chartHTML += '</div>';
  chartContainer.innerHTML = chartHTML;
}

// ========== MODAL TAMBAH TRANSAKSI ========== //
document.getElementById("btn-tambah-transaksi").addEventListener("click", () => {
  // Set tanggal hari ini sebagai default
  document.getElementById("tanggal").value = new Date().toISOString().split('T')[0];
  document.getElementById("modal-transaksi").classList.remove("hidden");
  document.getElementById("jumlah").focus();
});

document.getElementById("tutup-modal").addEventListener("click", () => {
  document.getElementById("modal-transaksi").classList.add("hidden");
  document.getElementById("form-tambah-transaksi").reset();
});

// Tutup modal jika klik di luar modal
document.getElementById("modal-transaksi").addEventListener("click", (e) => {
  if (e.target.id === "modal-transaksi") {
    document.getElementById("modal-transaksi").classList.add("hidden");
    document.getElementById("form-tambah-transaksi").reset();
  }
});

// Toggle jenis transaksi
document.getElementById("btn-pengeluaran").addEventListener("click", () => {
  document.getElementById("tipe-transaksi").value = "pengeluaran";
  aktifkanToggle("btn-pengeluaran");
});

document.getElementById("btn-pemasukan").addEventListener("click", () => {
  document.getElementById("tipe-transaksi").value = "pemasukan";
  aktifkanToggle("btn-pemasukan");
});

function aktifkanToggle(idAktif) {
  document.getElementById("btn-pemasukan").classList.remove("active");
  document.getElementById("btn-pengeluaran").classList.remove("active");
  document.getElementById(idAktif).classList.add("active");
}

// Submit form transaksi
document.getElementById("form-tambah-transaksi").addEventListener("submit", function (e) {
  e.preventDefault();

  const jumlah = parseFloat(document.getElementById("jumlah").value);
  const kategori = document.getElementById("kategori").value.trim();
  const tanggal = document.getElementById("tanggal").value;
  const deskripsi = document.getElementById("deskripsi").value.trim();
  const tipe = document.getElementById("tipe-transaksi").value;

  // Validasi input
  const errors = validasiInput(jumlah, kategori, tanggal, deskripsi);
  
  if (errors.length > 0) {
    alert("Error:\n" + errors.join("\n"));
    return;
  }

  const transaksiBaru = {
    jumlah,
    kategori,
    tanggal,
    deskripsi,
    tipe,
    timestamp: new Date().toISOString()
  };

  dataTransaksi.push(transaksiBaru);
  
  if (simpanKeLocalStorage()) {
    document.getElementById("form-tambah-transaksi").reset();
    document.getElementById("modal-transaksi").classList.add("hidden");

    updateRingkasan();
    updatePieChart();
    terapkanFilter();
    
    // Reset toggle ke pengeluaran
    document.getElementById("tipe-transaksi").value = "pengeluaran";
    aktifkanToggle("btn-pengeluaran");
  }
});

// ========== EVENT LISTENER UNTUK FILTER ========== //
document.getElementById("search-deskripsi").addEventListener("input", terapkanFilter);
document.getElementById("filter-tanggal").addEventListener("change", terapkanFilter);
document.getElementById("filter-kategori").addEventListener("change", terapkanFilter);

// ========== EXPORT/IMPORT DATA ========== //
function exportData() {
  const dataExport = {
    transaksi: dataTransaksi,
    exported: new Date().toISOString(),
    version: "1.0"
  };
  
  const dataBlob = new Blob([JSON.stringify(dataExport, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = `keuangan_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importedData = JSON.parse(e.target.result);
      
      if (importedData.transaksi && Array.isArray(importedData.transaksi)) {
        if (confirm("Import data akan mengganti semua data yang ada. Lanjutkan?")) {
          dataTransaksi = importedData.transaksi;
          simpanKeLocalStorage();
          inisialisasi();
          alert("Data berhasil diimpor!");
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

// ========== FUNGSI INISIALISASI ========== //
function inisialisasi() {
  muatDariLocalStorage();
  updateRingkasan();
  updatePieChart();
  terapkanFilter();
  
  // Set tanggal hari ini di filter
  document.getElementById("tanggal").value = new Date().toISOString().split('T')[0];
}

// ========== INISIALISASI SAAT LOAD ========== //
if (document.getElementById("tabel-riwayat")) {
  document.addEventListener("DOMContentLoaded", inisialisasi);
}