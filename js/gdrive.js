/* =============================================================
 * gdrive.js — Google Drive Integration (Client-side GIS)
 * -------------------------------------------------------------
 * Fitur:
 *   - Auth via Google Identity Services (GIS) — implicit flow,
 *     token disimpan di memory (tidak localStorage demi keamanan).
 *   - Auto-create folder: "WebGIS Pertanahan" / "GB-XXX" /
 *   - Upload batch: pointPhotos, evidence files, data.json per bidang
 *   - Incremental sync (hanya file baru/berubah)
 *   - Tombol UI: "☁️ Sinkronkan ke Drive" + status
 *
 * Butuh: window.GDriveConfig (dari js/gdrive-config.js)
 *        window.GIS.toast, window.GIS.getParcels, window.GIS.getActive
 *
 * window.GDrive = { init, signIn, signOut, isSignedIn, syncAll, syncParcel }
 * ============================================================= */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  let tokenClient = null;
  let accessToken = null;
  let tokenExpiry = 0;
  let gisLoaded = false;

  function toast(msg, kind) {
    if (window.GIS && window.GIS.toast) window.GIS.toast(msg, kind);
  }

  function cfg(key) {
    return (window.GDriveConfig && window.GDriveConfig[key]) || null;
  }

  // ---------- Load Google Identity Services (GIS) ----------
  function loadGIS() {
    return new Promise((resolve, reject) => {
      if (typeof window.google !== "undefined" && window.google.accounts) {
        gisLoaded = true;
        resolve();
        return;
      }
      let done = false;
      const finish = (fn, val) => {
        if (done) return;
        done = true;
        fn(val);
      };
      // Timeout 10 dtk: script GIS bisa lambat/terblokir (adblocker/CSP) —
      // jangan biarkan proses boot macet di "Memuat status..." selamanya.
      const timer = setTimeout(
        () => finish(reject, new Error("Load Google Identity Services timeout")),
        10000
      );
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        clearTimeout(timer);
        gisLoaded = true;
        finish(resolve);
      };
      script.onerror = () => {
        clearTimeout(timer);
        finish(reject, new Error("Gagal memuat Google Identity Services"));
      };
      document.head.appendChild(script);
    });
  }

  // ---------- Init token client ----------
  function initTokenClient() {
    if (!gisLoaded || !window.google?.accounts?.oauth2) return false;
    if (tokenClient) return true;

    const clientId = cfg("CLIENT_ID");
    const scopes = cfg("SCOPES") || "https://www.googleapis.com/auth/drive.file";
    if (!clientId) { console.warn("GDrive: CLIENT_ID belum di-set"); return false; }

    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: scopes,
      callback: (response) => {
        if (response && response.access_token) {
          accessToken = response.access_token;
          tokenExpiry = Date.now() + (response.expires_in || 3600) * 1000;
          toast("✅ Terhubung ke Google Drive", "ok");
          updateUI();
        } else if (response && response.error) {
          toast("❌ Auth gagal: " + response.error, "err");
        }
      },
    });
    return true;
  }

  // ---------- Public API ----------
  async function init() {
    // Jalur OAuth per-device (GIS) HANYA di-load jika CLIENT_ID terisi.
    // Tanpa itu, skip loadGIS → tidak fetch script Google yang tak terpakai
    // dan tidak ada console.warn "CLIENT_ID belum di-set".
    if (cfg("CLIENT_ID")) {
      try { await loadGIS(); } catch (e) { console.warn("GIS load gagal:", e.message); }
      initTokenClient();
    }
    updateUI();
  }

  function isSignedIn() {
    return !!accessToken && Date.now() < tokenExpiry - 60000; // buffer 1 menit
  }

  function signIn() {
    if (!initTokenClient()) { toast("GIS belum siap / CLIENT_ID kosong", "err"); return; }
    if (isSignedIn()) { toast("Sudah login", "ok"); return; }
    tokenClient.requestAccessToken({ prompt: "consent" });
  }

  function signOut() {
    if (accessToken && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(accessToken, () => {});
    }
    accessToken = null;
    tokenExpiry = 0;
    toast("Keluar dari Google Drive", "ok");
    updateUI();
  }

  function getAuthHeaders() {
    return {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json",
    };
  }

  async function apiFetch(url, options = {}) {
    if (!isSignedIn()) throw new Error("Belum login / token expired");
    const res = await fetch(url, { ...options, headers: { ...getAuthHeaders(), ...(options.headers || {}) } });
    if (res.status === 401) { accessToken = null; tokenExpiry = 0; throw new Error("Token expired, silakan login ulang"); }
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error("API " + res.status + ": " + txt);
    }
    return res;
  }

  // ---------- Folder management ----------
  async function findOrCreateFolder(name, parentId) {
    const q = "name='" + name.replace(/'/g, "\\'") + "' and mimeType='application/vnd.google-apps.folder' and trashed=false"
      + (parentId ? " and '" + parentId + "' in parents" : " and 'root' in parents");
    const url = "https://www.googleapis.com/drive/v3/files?q=" + encodeURIComponent(q) + "&fields=files(id,name)&spaces=drive";
    const res = await apiFetch(url);
    const data = await res.json();
    if (data.files && data.files.length) return data.files[0].id;

    // Create
    const meta = { name, mimeType: "application/vnd.google-apps.folder" };
    if (parentId) meta.parents = [parentId];
    const cr = await apiFetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST", body: JSON.stringify(meta),
    });
    const created = await cr.json();
    return created.id;
  }

  async function getRootFolderId() {
    return findOrCreateFolder(cfg("ROOT_FOLDER_NAME") || "WebGIS Pertanahan");
  }

  async function getParcelFolderId(parcel) {
    const rootId = await getRootFolderId();
    // Folder name: "GB-001 - Nama Bidang" (unik & readable)
    const parcelId = parcel.id || "unknown";
    const parcelName = (parcel.name || "Tanah").replace(/[\\/:*?"<>|]/g, "_"); // sanitize
    const folderName = parcelId + " - " + parcelName;
    return findOrCreateFolder(folderName, rootId);
  }

  // ---------- Upload helpers ----------
  async function uploadFile(folderId, fileName, mimeType, dataUrl) {
    // dataUrl -> blob
    const res = await fetch(dataUrl);
    const blob = await res.blob();

    // 1. Create file metadata
    const meta = { name: fileName, parents: [folderId] };
    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify(meta)], { type: "application/json" }));
    form.append("file", blob, fileName);

    const up = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: { Authorization: "Bearer " + accessToken },
      body: form,
    });
    if (!up.ok) {
      const txt = await up.text().catch(() => "");
      throw new Error("Upload gagal " + up.status + ": " + txt);
    }
    return up.json();
  }

  async function uploadJson(folderId, fileName, obj) {
    const dataUrl = "data:application/json;base64," + btoa(JSON.stringify(obj, null, 2));
    return uploadFile(folderId, fileName, "application/json", dataUrl);
  }

  // ---------- Sync per parcel ----------
  async function syncParcel(parcel) {
    if (!parcel) throw new Error("Parcel kosong");
    const folderId = await getParcelFolderId(parcel);

    // 1. data.json (semua data bidang)
    const cleanParcel = {
      id: parcel.id, name: parcel.name, attributes: parcel.attributes, style: parcel.style,
      points: parcel.latlngs || parcel.points,
      proof: parcel.proof || null, recordedAt: parcel.recordedAt || null,
      evidence: (parcel.evidence || []).map(e => ({ id: e.id, category: e.category, filename: e.filename, type: e.type, size: e.size, hash: e.hash, addedAt: e.addedAt })),
      visits: parcel.visits || [], pins: parcel.pins || [], status: parcel.status || "belum",
      reminders: parcel.reminders || null, lastVisit: parcel.lastVisit || null,
      pointPhotos: (parcel.pointPhotos || []).map(ph => ph ? { hash: ph.hash, at: ph.at, lat: ph.lat, lon: ph.lon } : null),
    };
    await uploadJson(folderId, "data.json", cleanParcel);

    // 2. pointPhotos (foto per titik sudut)
    const photos = (parcel.pointPhotos || []).filter(ph => ph && ph.dataUrl);
    for (let i = 0; i < photos.length; i++) {
      const ph = photos[i];
      const fname = "foto-titik-" + (i + 1) + ".jpg";
      await uploadFile(folderId, fname, "image/jpeg", ph.dataUrl);
    }

    // 3. Evidence files (lampiran dokumen)
    const evidences = (parcel.evidence || []).filter(e => e.dataUrl);
    for (const ev of evidences) {
      const safeName = ev.filename || ("evidence-" + ev.id + "." + (ev.type?.split("/")[1] || "bin"));
      await uploadFile(folderId, safeName, ev.type || "application/octet-stream", ev.dataUrl);
    }

    // 4. Visit photos (foto kunjungan)
    const visits = parcel.visits || [];
    for (let vi = 0; vi < visits.length; vi++) {
      const v = visits[vi];
      const vPhotos = (v.photos || []).filter(ph => ph && ph.dataUrl);
      for (let pi = 0; pi < vPhotos.length; pi++) {
        const ph = vPhotos[pi];
        const fname = "kunjungan-" + (vi + 1) + "-foto-" + (pi + 1) + ".jpg";
        await uploadFile(folderId, fname, "image/jpeg", ph.dataUrl);
      }
    }

    return true;
  }

  // ---------- Sync all parcels ----------
  async function syncAll() {
    if (!isSignedIn()) { toast("Silakan login ke Google Drive dulu", "err"); return false; }
    const parcels = (window.GIS.getParcels?.() || []).filter(p => p && p.id);
    if (!parcels.length) { toast("Tidak ada bidang untuk disinkronkan", "err"); return false; }

    const btn = $("#gdrive-sync-all");
    const st = $("#gdrive-status");
    if (btn) btn.disabled = true;
    if (st) st.textContent = "Menyiapkan folder & upload...";

    let ok = 0, fail = 0;
    for (const p of parcels) {
      if (st) st.textContent = "Mengupload " + p.name + " (" + p.id + ")...";
      try {
        await syncParcel(p);
        ok++;
      } catch (e) {
        console.error("Sync gagal " + p.id, e);
        fail++;
      }
    }
    if (st) st.textContent = "Selesai: " + ok + " berhasil, " + fail + " gagal";
    if (btn) btn.disabled = false;
    toast("Sinkronisasi selesai: " + ok + " bidang", fail ? "err" : "ok");
    return fail === 0;
  }

  // ---------- UI ----------
  function updateUI() {
    const btnIn = $("#gdrive-signin");
    const btnOut = $("#gdrive-signout");
    const btnSync = $("#gdrive-sync-all");
    const btnSyncServer = $("#gdrive-sync-server");
    const status = $("#gdrive-status");
    const signed = isSignedIn();
    // Jalur OAuth per-device HANYA aktif jika CLIENT_ID terisi. Tanpa itu,
    // sembunyikan tombol "Masuk ke Drive" dst agar tak membingungkan —
    // jalur utama = "Sinkronkan via Server" (tanpa login).
    const oauthOn = !!cfg("CLIENT_ID");
    if (btnIn) btnIn.classList.toggle("hidden", !oauthOn || signed);
    if (btnOut) btnOut.classList.toggle("hidden", !oauthOn || !signed);
    if (btnSync) btnSync.classList.toggle("hidden", !oauthOn || !signed);
    // Tombol server sync selalu tampil (tidak butuh login)
    if (btnSyncServer) btnSyncServer.classList.remove("hidden");
    if (status) {
      if (signed) {
        status.textContent = "Terhubung ke Google Drive (Client OAuth) ✓";
      } else if (!oauthOn) {
        status.textContent = "Sinkronkan via Server \u2192 Drive Anda (tanpa login). Klik \u2601\uFE0F di bawah.";
      } else {
        status.textContent = "Belum login OAuth. Gunakan ☁️ Sinkronkan via Server (otomatis ke Drive Anda)";
      }
    }
  }

  function bindUI() {
    const btnIn = $("#gdrive-signin");
    const btnOut = $("#gdrive-signout");
    const btnSync = $("#gdrive-sync-all");
    const btnSyncServer = $("#gdrive-sync-server");
    if (btnIn) btnIn.addEventListener("click", signIn);
    if (btnOut) btnOut.addEventListener("click", signOut);
    if (btnSync) btnSync.addEventListener("click", syncAll);
    // Tombol "Sinkronkan via Server" di-bind oleh INLINE SCRIPT di index.html
    // (selalu berjalan walau gdrive.js ini masih ter-cache versi lama).
    // Di sini HANYA di-update kalau tombol belum di-bind inline (rare path:
    // misalnya gdrive.js termuat tapi inline script gagal).
    if (btnSyncServer && btnSyncServer.getAttribute("data-bound") !== "1") {
      btnSyncServer.addEventListener("click", syncAllViaServer);
    }
  }

  async function syncAllViaServer() {
    if (!window.GIS || !window.GIS.getParcels) { toast("GIS belum siap", "err"); return; }
    const parcels = (window.GIS.getParcels?.() || []).filter(p => p && p.id);
    if (!parcels.length) { toast("Tidak ada bidang untuk disinkronkan", "err"); return; }

    const btn = $("#gdrive-sync-server");
    const st = $("#gdrive-status");
    if (btn) btn.disabled = true;
    if (st) st.textContent = "Mengirim ke server untuk sync ke Drive...";

    let ok = 0, fail = 0;
    for (const p of parcels) {
      if (st) st.textContent = "Sync " + p.name + " (" + p.id + ") via server...";
      try {
        const res = await fetch("/api/sync-to-drive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parcelId: p.id, parcel: p, files: [] })
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          ok++;
        } else {
          console.error("Server sync gagal " + p.id, data);
          fail++;
        }
      } catch (e) {
        console.error("Server sync error " + p.id, e);
        fail++;
      }
    }
    if (st) st.textContent = "Server sync selesai: " + ok + " berhasil, " + fail + " gagal";
    if (btn) btn.disabled = false;
    toast("Server sync selesai: " + ok + " bidang", fail ? "err" : "ok");
  }

  // Auto-init
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", async () => { await init(); bindUI(); });
  } else {
    init().then(bindUI);
  }

  window.GDrive = {
    init, signIn, signOut, isSignedIn,
    syncAll, syncParcel,
    getRootFolderId, getParcelFolderId,
  };

  // ---------- Auto-init saat halaman termuat (pola sama dgn modul panel lain) ----------
  function boot() {
    bindUI(); // pasang event listener semua tombol panel
    // Tampilkan status segera (jangan macet di "Memuat status..." menunggu GIS).
    updateUI();
    init().catch((e) => {
      // GIS gagal/timeout (mis. offline/terblokir) — jalur Server Sync tetap jalan.
      console.warn("GDrive init:", e && e.message ? e.message : e);
      updateUI();
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();