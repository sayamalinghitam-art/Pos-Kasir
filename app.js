/* ===== 1. DATA & LOCAL STORAGE ===== */
const KEY = "mini-pos-v1";
const $ = s => document.querySelector(s);
const rp = n => "Rp" + Number(n).toLocaleString("id-ID");
const hariIni = () => new Date().toLocaleDateString("sv-SE");
const esc = s => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function seed() {
  return { next: 7, cart: {}, trx: [], products: [
    { id: 1, nama: "Nasi goreng", harga: 12000, stok: 10 },
    { id: 2, nama: "Mie ayam", harga: 10000, stok: 8 },
    { id: 3, nama: "Es teh manis", harga: 4000, stok: 20 },
    { id: 4, nama: "Gorengan", harga: 2000, stok: 4 },
    { id: 5, nama: "Air mineral", harga: 3000, stok: 15 },
    { id: 6, nama: "Kopi sachet", harga: 3500, stok: 0 }
  ] };
}
function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.products) return d; } catch (e) {}
  return seed();
}
function simpan() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); }
  catch (e) { alert("Penyimpanan browser penuh. Hapus beberapa produk berfoto atau pakai foto yang lebih kecil."); }
}
let db = load();

/* ===== 2. LOGIKA KERANJANG & VALIDASI STOK ===== */
const cari = id => db.products.find(p => p.id == id);
const total = () => Object.entries(db.cart).reduce((s, [id, q]) => s + cari(id).harga * q, 0);
const metode = () => document.querySelector("[name=metode]:checked").value;

function beli(id) {
  const p = cari(id);
  if (!p || p.stok < 1) return;
  p.stok--;
  db.cart[id] = (db.cart[id] || 0) + 1;
  selesai();
}
function kurangi(id) {
  cari(id).stok++;
  if (--db.cart[id] < 1) delete db.cart[id];
  selesai();
}
function hapusProduk(id) {
  if (!confirm("Hapus produk ini?")) return;
  delete db.cart[id];
  db.products = db.products.filter(p => p.id != id);
  selesai();
}
function selesai() { simpan(); render(); }

/* ===== 3. TAMPILAN ===== */
function badge(stok) {
  if (stok < 1) return ["danger", "Habis"];
  if (stok < 5) return ["warning", "Menipis"];
  return ["success", "Aman"];
}
function render() {
  const t = db.trx.filter(x => x.tgl === hariIni());
  $("#mOmzet").textContent = rp(t.reduce((s, x) => s + x.total, 0));
  $("#mStok").textContent = db.products.reduce((s, p) => s + p.stok, 0);
  $("#mTrx").textContent = t.length;
  $("#produk").innerHTML = db.products.map(p => {
    const [warna, label] = badge(p.stok);
    return `<div class="col"><div class="card h-100">${p.gambar ? `<img src="${p.gambar}" class="card-img-top" alt="${esc(p.nama)}" style="height:120px;object-fit:cover">` : ""}<div class="card-body d-flex flex-column">
      <div class="d-flex justify-content-between align-items-start">
        <h2 class="h6 mb-1">${esc(p.nama)}</h2><span class="badge text-bg-${warna}">${label}</span></div>
      <div class="text-muted small mb-2">${rp(p.harga)} · stok ${p.stok}</div>
      <div class="mt-auto d-flex gap-2">
        <button class="btn btn-primary flex-grow-1" data-beli="${p.id}" ${p.stok < 1 ? "disabled" : ""}>Beli</button>
        <button class="btn btn-outline-danger" data-hapus="${p.id}" aria-label="Hapus ${esc(p.nama)}">✕</button>
      </div></div></div></div>`;
  }).join("") || `<p class="text-muted">Belum ada produk. Tambahkan lewat form di atas.</p>`;
  const ids = Object.keys(db.cart);
  $("#keranjang").innerHTML = ids.length ? ids.map(id => {
    const p = cari(id), q = db.cart[id];
    return `<li class="list-group-item d-flex align-items-center gap-2">
      <div class="flex-grow-1"><div>${esc(p.nama)}</div><small class="text-muted">${rp(p.harga)} × ${q}</small></div>
      <button class="btn btn-sm btn-outline-secondary" data-kurang="${id}" aria-label="Kurangi">−</button>
      <b>${q}</b>
      <button class="btn btn-sm btn-outline-secondary" data-beli="${id}" ${p.stok < 1 ? "disabled" : ""} aria-label="Tambah">+</button></li>`;
  }).join("") : `<li class="list-group-item text-muted">Keranjang kosong.</li>`;
  hitung();
}
function hitung() {
  const tot = total(), tunai = metode() === "Tunai", uang = +$("#uang").value || 0;
  $("#total").textContent = rp(tot);
  $("#boxTunai").hidden = !tunai;
  const k = $("#kembali"), sel = uang - tot;
  k.className = "mt-1 fw-semibold " + (sel >= 0 ? "text-success" : "text-danger");
  k.textContent = !tunai || !uang ? "" : sel >= 0 ? "Kembalian " + rp(sel) : "Uang kurang " + rp(-sel);
  $("#bayar").disabled = !tot || (tunai && uang < tot);
}

/* ===== 4. BAYAR & CETAK NOTA ===== */
function bayar() {
  const tot = total(), m = metode(), uang = m === "Tunai" ? +$("#uang").value : tot;
  const item = Object.entries(db.cart).map(([id, q]) => ({ nama: cari(id).nama, harga: cari(id).harga, q }));
  const waktu = new Date().toLocaleTimeString("id-ID");
  db.trx.push({ tgl: hariIni(), jam: waktu, total: tot, metode: m, item });
  $("#nota").innerHTML =
    `<div style="text-align:center"><b>MINI POS KANTIN</b><br>${hariIni()} ${waktu}</div><hr>` +
    item.map(i => `${esc(i.nama)}<br>&nbsp;${i.q} x ${rp(i.harga)} = ${rp(i.q * i.harga)}<br>`).join("") +
    `<hr>Total: ${rp(tot)}<br>Metode: ${m}<br>` +
    (m === "Tunai" ? `Bayar: ${rp(uang)}<br>Kembali: ${rp(uang - tot)}<br>` : "") +
    `<hr><div style="text-align:center">Terima kasih</div>`;
  db.cart = {};
  $("#uang").value = "";
  simpan(); render();
  window.print();
}

/* ===== FOTO PRODUK ===== */
function kecilkan(file) {
  return new Promise((ok, gagal) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const r = Math.min(1, 300 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = img.width * r; c.height = img.height * r;
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok(c.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = gagal;
    img.src = url;
  });
}

/* ===== 5. EVENT ===== */
document.addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  const d = b.dataset;
  if (d.beli) beli(d.beli);
  else if (d.kurang) kurangi(d.kurang);
  else if (d.hapus) hapusProduk(d.hapus);
});
$("#uang").addEventListener("input", hitung);
document.querySelectorAll("[name=metode]").forEach(r => r.addEventListener("change", hitung));
$("#bayar").addEventListener("click", bayar);
$("#reset").addEventListener("click", () => {
  if (confirm("Hapus semua data dan kembali ke data contoh?")) { db = seed(); simpan(); render(); }
});
$("#fProduk").addEventListener("submit", async e => {
  e.preventDefault();
  const nama = $("#fNama").value.trim(), harga = +$("#fHarga").value, stok = +$("#fStok").value;
  if (!nama || harga < 1 || stok < 0 || !Number.isInteger(stok)) return alert("Isi nama, harga (> 0), dan stok (bilangan bulat ≥ 0).");
  let gambar = "";
  const f = $("#fGambar").files[0];
  if (f) {
    try { gambar = await kecilkan(f); }
    catch (err) { return alert("File gambar tidak bisa dibaca. Gunakan file .jpg atau .jpeg."); }
  }
  db.products.push({ id: db.next++, nama, harga, stok, gambar });
  e.target.reset(); selesai();
});
render();
