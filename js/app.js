/* =============================================================
 * app.js — Web GIS Pertanahan
 * Gambar/edit poligon, atribut, pencarian, ringkasan, toast.
 * Penyimpanan via window.Storage (backend file JSON / localStorage).
 * ============================================================= */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const ATTR_KEYS = [
    "pemilik", "noSertifikat", "nib", "jenisHak", "status",
    "penggunaan", "desa", "kecamatan", "kabupaten", "provinsi", "keterangan",
  ];
  const ATTR_LABELS = {
    pemilik: "Pemilik", noSertifikat: "No. Sertifikat", nib: "NIB",
    jenisHak: "Jenis Hak", status: "Status", penggunaan: "Penggunaan",
    desa: "Desa/Kelurahan", kecamatan: "Kecamatan", kabupaten: "Kabupaten",
    provinsi: "Provinsi", keterangan: "Keterangan",
  };

  let parcels = [];
  let activeId = null;
  let seq = 1;
  let editingId = null;
  let filter = "";
  let pickedColor = null;

  // Palet warna bidang (garis + isi senada)
  const PALETTE = [
    { color: "#e8590c", fill: "#ffa94d" }, // oranye
    { color: "#1971c2", fill: "#74c0fc" }, // biru
    { color: "#2b8a3e", fill: "#69db7c" }, // hijau
    { color: "#9c36b5", fill: "#da77f2" }, // ungu
    { color: "#c2255c", fill: "#faa2c1" }, // merah muda
    { color: "#e8a700", fill: "#ffe066" }, // kuning
    { color: "#0c8599", fill: "#66d9e8" }, // teal
    { color: "#495057", fill: "#adb5bd" }, // abu
  ];


  // ---------- TOAST ----------
  let toastTimer = null;
  function toast(msg, kind) {
    const el = $("toast");
    el.className = "toast show" + (kind ? " " + kind : "");
    el.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = "toast hidden"; }, 2600);
  }

  function setStatus(text, saving) {
    const el = $("save-status");
    el.textContent = text;
    el.classList.toggle("saving", !!saving);
  }

  // ---------- HELPERS ----------
  function newId() { return "GB-" + String(seq++).padStart(3, "0"); }

  function seedData() {
    return (window.LAND_PARCELS || []).map((d) => ({
      id: d.id, name: d.name,
      attributes: { ...d.attributes }, style: { ...d.style },
      points: d.autoSort === false ? d.points : window.Geo.sortClockwise(d.points),
    }));
  }

  async function persist() {
    setStatus("Menyimpan…", true);
    const ok = await window.Storage.saveAll(
      parcels.map((p) => ({ id: p.id, name: p.name, attributes: p.attributes, style: p.style, points: p.latlngs }))
    );
    setStatus(window.Storage.mode === "backend" ? "Tersimpan ke file ✓" : "Tersimpan di browser ✓");
    return ok;
  }

  // ---------- PETA + LAYERS ----------
  const gHybrid = L.tileLayer("https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
    maxZoom: 22, maxNativeZoom: 21, subdomains: ["mt0", "mt1", "mt2", "mt3"], attribution: "Google Hybrid",
  });
  const gSat = L.tileLayer("https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
    maxZoom: 22, maxNativeZoom: 21, subdomains: ["mt0", "mt1", "mt2", "mt3"], attribution: "Google Satelit",
  });
  const esri = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 22, maxNativeZoom: 19, attribution: "Esri World Imagery",
  });
  const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 22, maxNativeZoom: 19, attribution: "© OpenStreetMap",
  });

  const map = L.map("map", { center: [-6.2007, 106.8172], zoom: 17, layers: [gHybrid] });

  L.control.layers({
    "Google Hybrid (satelit + label)": gHybrid, "Google Satelit": gSat,
    "Esri Satelit": esri, "Peta Jalan (OSM)": osm,
  }, null, { position: "topright", collapsed: false }).addTo(map);
  L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);

  const vertexLayer = L.layerGroup().addTo(map);
  const drawnItems = new L.FeatureGroup().addTo(map);

  map.addControl(new L.Control.Draw({
    position: "topleft",
    draw: {
      polygon: { allowIntersection: false, showArea: false, shapeOptions: { color: "#e8590c", weight: 2 } },
      rectangle: { shapeOptions: { color: "#e8590c", weight: 2 } },
      polyline: false, circle: false, circlemarker: false, marker: false,
    },
    edit: { featureGroup: drawnItems, remove: true },
  }));

  // ---------- RENDER POLIGON ----------
  function llFromLayer(layer) { return layer.getLatLngs()[0].map((c) => [c.lat, c.lng]); }

  function buildLayer(p) {
    const layer = L.polygon(p.latlngs, {
      color: p.style?.color || "#e8590c", weight: 2,
      fillColor: p.style?.fillColor || "#ffa94d", fillOpacity: p.style?.fillOpacity ?? 0.35,
    });
    layer.on("click", () => selectParcel(p.id));
    layer._parcelId = p.id;
    return layer;
  }

  function metricsOf(p) {
    return { area: window.Geo.area(p.latlngs), perimeter: window.Geo.perimeter(p.latlngs), centroid: window.Geo.centroid(p.latlngs) };
  }

  function bindPopup(p) {
    const m = metricsOf(p);
    const a = window.Geo.formatArea(m.area);
    p.layer.bindPopup(`<b>${p.name}</b><br>Luas: ${a.m2} m² (${a.ha} ha)<br>Keliling: ${m.perimeter.toFixed(1)} m<br>Titik: ${p.latlngs.length}`);
  }

  function refreshVertices() {
    vertexLayer.clearLayers();
    const p = parcels.find((x) => x.id === activeId);
    if (!p) return;
    p.latlngs.forEach((c, i) => {
      const icon = L.divIcon({ className: "", html: `<div class="vertex-label">${i + 1}</div>`, iconSize: [22, 22], iconAnchor: [11, 11] });
      L.marker(c, { icon }).bindPopup(`<b>Titik ${i + 1}</b><br>Lat: ${c[0].toFixed(6)}<br>Lon: ${c[1].toFixed(6)}`).addTo(vertexLayer);
    });
  }

  function renderSummary() {
    const total = parcels.reduce((s, p) => s + window.Geo.area(p.latlngs), 0);
    $("sum-count").textContent = parcels.length;
    $("sum-area").textContent = total.toLocaleString("id-ID", { maximumFractionDigits: 0 });
    $("sum-ha").textContent = (total / 10000).toLocaleString("id-ID", { maximumFractionDigits: 3 });
  }

  function matchFilter(p) {
    if (!filter) return true;
    const hay = [p.name, p.id, p.attributes?.pemilik, p.attributes?.noSertifikat, p.attributes?.nib].join(" ").toLowerCase();
    return hay.includes(filter);
  }

  function renderList() {
    const el = $("parcel-list");
    $("parcel-count").textContent = parcels.length;
    el.innerHTML = "";
    const shown = parcels.filter(matchFilter);
    if (!shown.length) { el.innerHTML = `<p class="muted">${parcels.length ? "Tidak ada hasil cocok." : "Belum ada bidang."}</p>`; return; }
    shown.forEach((p) => {
      const a = window.Geo.formatArea(window.Geo.area(p.latlngs));
      const div = document.createElement("div");
      div.className = "parcel-item" + (p.id === activeId ? " active" : "");
      div.innerHTML = `<div class="pi-name">${p.name}</div><div class="pi-meta">${p.id} • ${a.m2} m² • ${p.latlngs.length} titik</div>`;
      div.addEventListener("click", () => selectParcel(p.id));
      el.appendChild(div);
    });
  }

  function renderInfo(p) {
    const el = $("parcel-info");
    if (!p) { el.innerHTML = '<p class="muted">Pilih bidang pada daftar atau klik poligon di peta.</p>'; return; }
    const m = metricsOf(p);
    const a = window.Geo.formatArea(m.area);
    let h = `<div class="info-actions"><button class="btn" id="ia-edit">✏️ Edit Info</button><button class="btn btn-danger" id="ia-del">🗑️ Hapus</button></div>`;
    h += `<div class="stat-grid"><div class="stat-card"><div class="sc-label">Luas</div><div class="sc-value">${a.m2} m²</div><div class="sc-sub">${a.ha} ha • ${a.are} are</div></div>`;
    h += `<div class="stat-card"><div class="sc-label">Keliling</div><div class="sc-value">${m.perimeter.toFixed(1)} m</div><div class="sc-sub">${p.latlngs.length} titik sudut</div></div></div>`;
    h += `<table class="attr-table"><tbody><tr><th>Nama Bidang</th><td>${p.name}</td></tr><tr><th>ID</th><td>${p.id}</td></tr>`;
    ATTR_KEYS.forEach((k) => { h += `<tr><th>${ATTR_LABELS[k]}</th><td>${p.attributes?.[k] || "-"}</td></tr>`; });
    h += `<tr><th>Titik Pusat</th><td>${m.centroid[0].toFixed(6)}, ${m.centroid[1].toFixed(6)}</td></tr></tbody></table><div class="coord-list">`;
    p.latlngs.forEach((c, i) => { h += `<div class="coord-row"><span class="cr-idx">#${i + 1}</span><span>${c[0].toFixed(6)}, ${c[1].toFixed(6)}</span></div>`; });
    h += `</div>`;
    // Panjang tiap sisi
    const sides = window.Geo.sideLengths(p.latlngs);
    h += `<div class="side-list"><b>Panjang Sisi:</b>`;
    sides.forEach((s) => { h += `<div class="side-row"><span>Titik ${s.from} → ${s.to}</span><span>${s.len.toFixed(1)} m</span></div>`; });
    h += `</div>`;
    // Penjelasan ramah-pengguna
    h += `<div class="note"><b>Penjelasan:</b> Luas adalah besar area di dalam batas tanah (1 ha = 10.000 m², 1 are = 100 m²). ` +
      `Keliling adalah total panjang seluruh batas. "Panjang Sisi" adalah jarak antar titik sudut yang berurutan. ` +
      `Semua angka dihitung dari koordinat dan bersifat estimasi — acuan resmi tetap pengukuran BPN.</div>`;
    el.innerHTML = h;

    $("ia-edit").addEventListener("click", () => openModal(p.id));
    $("ia-del").addEventListener("click", () => deleteParcel(p.id));
  }

  function renderAll() {
    drawnItems.clearLayers();
    parcels.forEach((p) => { p.layer = buildLayer(p); drawnItems.addLayer(p.layer); bindPopup(p); });
    renderSummary();
    renderList();
    refreshVertices();
    renderInfo(parcels.find((x) => x.id === activeId));
  }

  function selectParcel(id) {
    activeId = id;
    renderList();
    refreshVertices();
    const p = parcels.find((x) => x.id === id);
    renderInfo(p);
    if (p) { p.layer.openPopup(); map.fitBounds(p.layer.getBounds(), { padding: [60, 60] }); }
  }

  async function deleteParcel(id) {
    const p = parcels.find((x) => x.id === id);
    if (!p || !confirm(`Hapus bidang "${p.name}"?`)) return;
    parcels = parcels.filter((x) => x.id !== id);
    if (activeId === id) activeId = parcels[0]?.id || null;
    await window.Storage.remove(id);
    await persist();
    renderAll();
    toast("Bidang dihapus", "ok");
  }

  // ---------- MODAL ----------
  const form = $("attr-form");
  function renderSwatches(current) {
    const wrap = $("color-swatches");
    if (!wrap) return;
    wrap.innerHTML = "";
    PALETTE.forEach((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "swatch" + (c.color === current ? " active" : "");
      b.style.background = c.color;
      b.title = c.color;
      b.setAttribute("aria-label", "Warna " + c.color);
      b.addEventListener("click", () => {
        pickedColor = c;
        wrap.querySelectorAll(".swatch").forEach((s) => s.classList.remove("active"));
        b.classList.add("active");
      });
      wrap.appendChild(b);
    });
  }

  function openModal(id) {
    editingId = id;
    const p = parcels.find((x) => x.id === id);
    if (!p) return;
    pickedColor = null;
    form.name.value = p.name || "";
    ATTR_KEYS.forEach((k) => { if (form[k]) form[k].value = p.attributes?.[k] || ""; });
    renderSwatches(p.style?.color);
    $("modal-backdrop").classList.remove("hidden");
  }

  function closeModal() { editingId = null; $("modal-backdrop").classList.add("hidden"); }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const p = parcels.find((x) => x.id === editingId);
    if (p) {
      p.name = form.name.value.trim() || p.name;
      ATTR_KEYS.forEach((k) => { if (form[k]) p.attributes[k] = form[k].value.trim(); });
      if (pickedColor) {
        p.style = { color: pickedColor.color, fillColor: pickedColor.fill, fillOpacity: 0.35 };
        p.layer.setStyle({ color: pickedColor.color, fillColor: pickedColor.fill });
      }
      bindPopup(p);
      await persist();
      renderSummary(); renderList(); renderInfo(p);
      toast("Info bidang tersimpan", "ok");

    }
    closeModal();
  });
  $("modal-cancel").addEventListener("click", closeModal);
  $("modal-backdrop").addEventListener("click", (e) => { if (e.target === $("modal-backdrop")) closeModal(); });

  // ---------- DRAW EVENTS ----------
  map.on(L.Draw.Event.CREATED, async (e) => {
    const p = {
      id: newId(), name: "Bidang Baru",
      attributes: ATTR_KEYS.reduce((o, k) => ((o[k] = ""), o), {}),
      style: { color: "#e8590c", fillColor: "#ffa94d", fillOpacity: 0.35 },
      latlngs: llFromLayer(e.layer),
    };
    parcels.push(p);
    activeId = p.id;
    await persist();
    renderAll();
    openModal(p.id);
    toast("Bidang baru dibuat — lengkapi infonya", "ok");
  });

  map.on(L.Draw.Event.EDITED, async (e) => {
    e.layers.eachLayer((layer) => {
      const p = parcels.find((x) => x.id === layer._parcelId);
      if (p) { p.latlngs = llFromLayer(layer); bindPopup(p); }
    });
    await persist();
    renderSummary(); renderList(); refreshVertices(); renderInfo(parcels.find((x) => x.id === activeId));
    toast("Bentuk bidang diperbarui", "ok");
  });

  map.on(L.Draw.Event.DELETED, async (e) => {
    e.layers.eachLayer((layer) => { parcels = parcels.filter((x) => x.id !== layer._parcelId); });
    if (!parcels.find((x) => x.id === activeId)) activeId = parcels[0]?.id || null;
    await persist();
    renderAll();
    toast("Bidang dihapus", "ok");
  });

  // ---------- SEARCH ----------
  $("search").addEventListener("input", (e) => { filter = e.target.value.trim().toLowerCase(); renderList(); });

  // ---------- IMPORT / EXPORT ----------
  $("btn-export").addEventListener("click", () => {
    const features = parcels.map((p) => {
      const m = metricsOf(p);
      const ring = [...p.latlngs, p.latlngs[0]].map((c) => [c[1], c[0]]);
      return { type: "Feature", properties: { id: p.id, name: p.name, luas_m2: Math.round(m.area * 10) / 10, keliling_m: Math.round(m.perimeter * 10) / 10, ...p.attributes }, geometry: { type: "Polygon", coordinates: [ring] } };
    });
    const blob = new Blob([JSON.stringify({ type: "FeatureCollection", features }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "bidang-tanah.geojson"; a.click();
    URL.revokeObjectURL(url);
    toast("GeoJSON diunduh", "ok");
  });

  $("file-import").addEventListener("change", (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const fc = JSON.parse(reader.result);
        const feats = fc.type === "FeatureCollection" ? fc.features : [fc];
        let added = 0;
        feats.forEach((f) => {
          if (!f.geometry || f.geometry.type !== "Polygon") return;
          const ring = f.geometry.coordinates[0].map((c) => [c[1], c[0]]);
          if (ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]) ring.pop();
          const pr = f.properties || {};
          parcels.push({
            id: newId(), name: pr.name || "Bidang Impor",
            attributes: ATTR_KEYS.reduce((o, k) => ((o[k] = pr[k] || ""), o), {}),
            style: { color: "#1971c2", fillColor: "#74c0fc", fillOpacity: 0.35 },
            latlngs: ring,
          });
          added++;
        });
        activeId = parcels[parcels.length - 1]?.id || activeId;
        await persist();
        renderAll();
        toast(`Import selesai: ${added} bidang`, "ok");
      } catch (err) { toast("File GeoJSON tidak valid", "err"); }
    };
    reader.readAsText(file);
    ev.target.value = "";
  });

  $("btn-reset").addEventListener("click", async () => {
    if (!confirm("Muat ulang data awal? Perubahan tersimpan akan diganti.")) return;
    window.Storage.clearLocal();
    parcels = seedData().map((r) => ({ id: r.id, name: r.name, attributes: { ...r.attributes }, style: { ...r.style }, latlngs: r.points }));
    activeId = parcels[0]?.id || null;
    await persist();
    renderAll();
    toast("Data awal dimuat ulang", "ok");
  });

  // ---------- KURSOR ----------
  map.on("mousemove", (e) => { $("mouse-coord").textContent = `Lat: ${e.latlng.lat.toFixed(6)}, Lon: ${e.latlng.lng.toFixed(6)}`; });

  // ---------- API untuk modul GPS (gps.js) ----------
  async function addParcelFromLatlngs(latlngs) {
    const p = {
      id: newId(), name: "Bidang GPS",
      attributes: ATTR_KEYS.reduce((o, k) => ((o[k] = ""), o), {}),
      style: { color: "#2b8a3e", fillColor: "#69db7c", fillOpacity: 0.35 },
      latlngs: window.Geo.sortClockwise(latlngs),
    };
    parcels.push(p);
    activeId = p.id;
    await persist();
    renderAll();
    map.fitBounds(p.layer.getBounds(), { padding: [60, 60] });
    openModal(p.id);
  }

  window.GIS = { map, toast, addParcelFromLatlngs };


  // ---------- INIT ----------
  async function init() {
    const mode = await window.Storage.init();
    const badge = $("storage-badge");
    badge.textContent = mode === "backend" ? "💾 File Lokal" : "🌐 Browser";
    badge.classList.add(mode);

    let raw = await window.Storage.load();
    if (!raw || !raw.length) raw = seedData(); // pertama kali: pakai data contoh
    const ids = raw.map((r) => parseInt(String(r.id).replace(/\D/g, ""), 10)).filter((n) => !isNaN(n));
    seq = (ids.length ? Math.max(...ids) : 0) + 1;
    parcels = raw.map((r) => ({
      id: r.id || newId(), name: r.name || "Bidang",
      attributes: { ...r.attributes }, style: { ...r.style }, latlngs: r.points || r.latlngs,
    }));
    activeId = parcels[0]?.id || null;
    renderAll();
    if (parcels.length) {
      let b = parcels[0].layer.getBounds();
      parcels.slice(1).forEach((p) => (b = b.extend(p.layer.getBounds())));
      map.fitBounds(b, { padding: [50, 50] });
    }
    // simpan awal supaya seed langsung tertulis ke file/localStorage
    await persist();
    setStatus(mode === "backend" ? "Terhubung ke backend ✓" : "Mode browser ✓");
  }

  init();
})();
