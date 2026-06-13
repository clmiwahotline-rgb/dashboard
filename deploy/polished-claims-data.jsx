// クレーム・事故品 — 共通ヘルパー / データ層（クラウド共有 + 写真Drive）
// シート「クレーム」。localStorage: miwa.claim.v1 / miwa.claim.files.v1
// 行: { id, ts, occurredOn, receivedOn, store, type, customer, memberNo,
//       maker, makerContact, item, detail, status, amount, staff, files[], comments[] }

const CLAIM_KEY = "miwa.claim.v1";
const CLAIM_FILES_KEY = "miwa.claim.files.v1";

const CLAIM_STORES = [
  "本店", "新田店", "草加西口店", "モールプラザ草加店", "蒲生店", "西友蒲生伊原店",
  "東川口店", "東川口2号店", "マミーマート川口安行店", "八潮工場", "東川口工場", "ルート", "本部",
];

// 種別
const CLAIM_TYPES = [
  { id: "クレーム", color: "#c5221f", bg: "#fde2e2" },
  { id: "破損",     color: "#d9730a", bg: "#fdebcf" },
  { id: "紛失",     color: "#8430ce", bg: "#f3e8fd" },
  { id: "変色",     color: "#9a6700", bg: "#fef3cd" },
  { id: "付着",     color: "#1a73e8", bg: "#e3f0fd" },
  { id: "その他",   color: "#5f6368", bg: "#eef0f2" },
];
const CLAIM_TYPE_BY = Object.fromEntries(CLAIM_TYPES.map((t) => [t.id, t]));

// 対応状況
const CLAIM_STATUS = [
  { id: "受付",   color: "#1a73e8", bg: "#e3f0fd", unresolved: true },
  { id: "対応中", color: "#d9730a", bg: "#fdebcf", unresolved: true },
  { id: "解決",   color: "#1e8e3e", bg: "#e6f4ea", unresolved: false },
  { id: "弁償",   color: "#8430ce", bg: "#f3e8fd", unresolved: false },
];
const CLAIM_STATUS_BY = Object.fromEntries(CLAIM_STATUS.map((s) => [s.id, s]));
const isUnresolved = (status) => (CLAIM_STATUS_BY[status] || {}).unresolved === true;

// ── サンプル ────────────────────────────────────────────
const SEED_CLAIMS = [];

// ── ユーティリティ ──────────────────────────────────────
const cNow = new Date();
const cToday = `${cNow.getFullYear()}-${String(cNow.getMonth() + 1).padStart(2, "0")}-${String(cNow.getDate()).padStart(2, "0")}`;
const yenC = (n) => "¥" + Math.round(n || 0).toLocaleString("ja-JP");
const dateSlash = (s) => (s || "").replaceAll("-", "/");
const relTimeC = (ts) => {
  if (!ts) return "";
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "たった今";
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}日前`;
  const dt = new Date(ts);
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
};
const fullTimeC = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const fileExtC = (name) => ((name || "").split(".").pop() || "").toUpperCase().slice(0, 4);
const fmtBytesC = (n) => {
  if (!n && n !== 0) return "";
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + " KB";
  return (n / 1024 / 1024).toFixed(1) + " MB";
};

// Drive サムネ / 閲覧
// iOS Safari はサードパーティCookieをブロックするため drive.google.com/thumbnail は表示されない。
// Cookie不要でCDN配信される lh3.googleusercontent.com/d/<id> 形式を使う（共有「全員」前提）。
const driveThumbC = (id, w) => `https://lh3.googleusercontent.com/d/${id}=w${w || 600}`;
const driveViewC = (id) => `https://drive.google.com/file/d/${id}/view`;

// ── 添付を縮小して dataURL 化（即時表示用）────────────────
const readClaimFile = (file) => new Promise((resolve) => {
  const isImg = /^image\//.test(file.type);
  if (isImg) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1100;
        let { width: w, height: h } = img;
        if (w > MAX || h > MAX) { const k = MAX / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k); }
        const cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        cv.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve({ name: file.name, type: file.type, size: file.size, url: cv.toDataURL("image/jpeg", 0.82), isImg: true });
      };
      img.onerror = () => resolve({ name: file.name, type: file.type, size: file.size, url: reader.result, isImg: true });
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  } else if (file.size <= 3 * 1024 * 1024) {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, url: reader.result, isImg: false });
    reader.readAsDataURL(file);
  } else {
    resolve({ name: file.name, type: file.type, size: file.size, url: "", isImg: false });
  }
});

// JSON文字列/配列どちらでも配列で返す
const parseArr = (x) => {
  if (Array.isArray(x)) return x;
  if (typeof x === "string" && x.trim()) { try { const v = JSON.parse(x); return Array.isArray(v) ? v : []; } catch { return []; } }
  return [];
};

// ── localStorage ────────────────────────────────────────
const claimLoad = () => {
  try { const s = localStorage.getItem(CLAIM_KEY); if (s) { const v = JSON.parse(s); if (Array.isArray(v)) return v; } } catch {}
  return SEED_CLAIMS;
};
const claimSave = (rows) => { try { localStorage.setItem(CLAIM_KEY, JSON.stringify(rows)); } catch {} };
const cFileMapLoad = () => { try { return JSON.parse(localStorage.getItem(CLAIM_FILES_KEY)) || {}; } catch { return {}; } };
const cFileMapSave = (m) => { try { localStorage.setItem(CLAIM_FILES_KEY, JSON.stringify(m)); } catch {} };

const CLAIM_SHEET = "クレーム";

const normalizeClaim = (r) => ({
  id: Number(r.id) || r.id,
  ts: Number(r.ts) || (r.ts ? Date.parse(r.ts) : Date.now()),
  occurredOn: r.occurredOn || "", receivedOn: r.receivedOn || "",
  store: r.store || "", type: r.type || "その他",
  customer: r.customer || "", memberNo: r.memberNo || r.contact || "",
  maker: r.maker || "", makerContact: r.makerContact || "",
  item: r.item || "", detail: r.detail || "",
  status: r.status || "受付", amount: Number(r.amount) || 0, staff: r.staff || "",
  files: parseArr(r.files), comments: parseArr(r.comments),
});

// 表示用に Drive/ローカルの実体を解決
const resolveClaimFile = (f, local) => {
  const fileId = f.fileId || (local && local.fileId) || "";
  const localUrl = (local && local.url) || f.url || "";
  const isImg = !!f.isImg;
  return {
    name: f.name, type: f.type, size: f.size, isImg, fileId,
    thumb: isImg ? (fileId ? driveThumbC(fileId, 600) : localUrl) : "",
    open: isImg ? (fileId ? driveThumbC(fileId, 1600) : localUrl) : "",
    href: fileId ? driveViewC(fileId) : localUrl,
    driveLink: !!fileId, remote: !fileId && !localUrl,
  };
};
const hydrateClaims = (rows, fm) => rows.map((r) => {
  const lf = fm[r.id] || [];
  const files = parseArr(r.files).map((f, i) => resolveClaimFile(f, lf.find((l) => l.name === f.name) || lf[i]));
  // comments / files はクラウド由来だと文字列で来るため必ず配列化（未配列だと描画でクラッシュ）
  return { ...r, files, comments: parseArr(r.comments) };
});

// 送信用：ファイルは軽量メタのみ（fileId 付き）
const stripClaim = (c, cloudFiles) => ({
  id: c.id, ts: c.ts, occurredOn: c.occurredOn, receivedOn: c.receivedOn,
  store: c.store, type: c.type, customer: c.customer, memberNo: c.memberNo,
  maker: c.maker, makerContact: c.makerContact,
  item: c.item, detail: c.detail, status: c.status, amount: c.amount, staff: c.staff,
  files: cloudFiles || (c.files || []).map((f) => ({ name: f.name, type: f.type, size: f.size, isImg: !!f.isImg, fileId: f.fileId || "" })),
  comments: c.comments || [],
});

// ── データ層フック ──────────────────────────────────────
const useClaimData = () => {
  const cloudOn = (typeof cloudEnabled === "function") && cloudEnabled();
  const [claims, setClaims] = React.useState(() => hydrateClaims(claimLoad(), cFileMapLoad()));
  const [cloudState, setCloudState] = React.useState(cloudOn ? "loading" : "off");
  const [lastSync, setLastSync] = React.useState(null);
  const [uploadWarn, setUploadWarn] = React.useState(null); // 写真アップロード失敗の理由（権限エラー等）
  const [saveStatus, setSaveStatus] = React.useState(null); // 保存/アップロード進捗 { phase, done, total }
  const clearUploadWarn = React.useCallback(() => setUploadWarn(null), []);

  React.useEffect(() => { claimSave(claims.map((c) => stripClaim(c))); }, [claims]);

  const pull = React.useCallback(async () => {
    if (!cloudOn) return;
    setCloudState("loading");
    const remote = await cloudGet(CLAIM_SHEET);
    if (remote == null) { setCloudState("error"); return; }
    const fm = cFileMapLoad();
    if (remote.length) setClaims(hydrateClaims(remote.map(normalizeClaim), fm));
    else { const local = claimLoad(); if (local.length) await cloudReplaceAll(CLAIM_SHEET, local.map((c) => stripClaim(c))); }
    setCloudState("ok"); setLastSync(Date.now());
  }, [cloudOn]);

  React.useEffect(() => { pull(); }, [pull]);
  React.useEffect(() => {
    if (!cloudOn) return;
    const t = setInterval(pull, 30000);
    return () => clearInterval(t);
  }, [cloudOn, pull]);

  // 写真を Drive にアップロードして fileId を確定
  const uploadClaimFiles = async (id, files, onProgress) => {
    if (!cloudOn || !files || !files.length) return (files || []).map((f) => ({ name: f.name, type: f.type, size: f.size, isImg: !!f.isImg, fileId: f.fileId || "" }));
    const localFiles = cFileMapLoad()[id] || []; // 端末内に残る元画像（url 付き）— 再アップロードの取りこぼし防止
    const out = [];
    let failMsg = null, attempted = 0, ok = 0;
    // 未アップロード（fileId 無し）の画像枚数＝アップロード対象
    const need = files.filter((f) => !f.fileId).length;
    let processed = 0;
    for (const f of files) {
      let fileId = f.fileId || "";
      // f.url（新規追加時）が無ければ端末内の控えから dataURL を回収
      const localUrl = f.url || (localFiles.find((l) => l.name === f.name) || {}).url || "";
      const b64 = (localUrl || "").split(",")[1];
      if (!fileId && b64) {
        attempted++;
        if (onProgress) onProgress({ done: processed, total: need });
        try {
          const res = await cloudUploadFile(f.name, f.type || "application/octet-stream", b64);
          if (res && res.ok && res.fileId) { fileId = res.fileId; ok++; }
          else if (res && res.message) failMsg = res.message;
          else failMsg = "アップロードに失敗しました";
        } catch (e) { failMsg = String((e && e.message) || e); }
        processed++;
        if (onProgress) onProgress({ done: processed, total: need });
      }
      out.push({ name: f.name, type: f.type, size: f.size, isImg: !!f.isImg, fileId });
    }
    // 失敗が1件でもあれば理由を表示（権限エラー等）。全成功なら警告を消す
    if (attempted > 0 && ok < attempted) setUploadWarn(failMsg || "写真をクラウドに保存できませんでした");
    else if (attempted > 0 && ok === attempted) setUploadWarn(null);
    // ローカル控えに fileId 反映（url は保持して再アップロード可能に）
    const fm = cFileMapLoad();
    fm[id] = files.map((f, i) => {
      const prev = (fm[id] || []).find((l) => l.name === f.name) || {};
      return { ...f, url: f.url || prev.url || "", fileId: out[i].fileId };
    });
    cFileMapSave(fm);
    return out;
  };

  const upsert = async (claim, isNew) => {
    // 即時：ローカル反映（url は既存の控えを保持＝再アップロードの取りこぼし防止）
    if (claim.files && claim.files.length) {
      const fm = cFileMapLoad();
      const prev = fm[claim.id] || [];
      fm[claim.id] = claim.files.map((f) => ({ ...f, url: f.url || (prev.find((l) => l.name === f.name) || {}).url || "" }));
      cFileMapSave(fm);
    }
    setClaims((prev) => {
      const next = isNew ? [claim, ...prev] : prev.map((c) => (sameId(c.id, claim.id) ? claim : c));
      return hydrateClaims(next.map((c) => (sameId(c.id, claim.id) ? { ...c, files: claim.files } : c)), cFileMapLoad());
    });
    // クラウド：写真アップ→保存
    if (cloudOn) {
      const hasPhotos = (claim.files || []).some((f) => !f.fileId && f.isImg);
      setSaveStatus({ phase: hasPhotos ? "uploading" : "saving", done: 0, total: (claim.files || []).filter((f) => !f.fileId).length });
      const cloudFiles = await uploadClaimFiles(claim.id, claim.files, (p) => setSaveStatus({ phase: "uploading", done: p.done, total: p.total }));
      setClaims((prev) => hydrateClaims(prev.map((c) => (sameId(c.id, claim.id) ? { ...c, files: cloudFiles.map((cf) => ({ ...cf })) } : c)), cFileMapLoad()));
      const payload = stripClaim(claim, cloudFiles);
      setSaveStatus({ phase: "saving", done: 0, total: 0 });
      try {
        if (isNew) await cloudAdd(CLAIM_SHEET, payload); else await cloudUpdate(CLAIM_SHEET, claim.id, payload);
      } catch (e) {}
      setSaveStatus(null);
    }
  };

  const remove = (id) => {
    setClaims((prev) => prev.filter((c) => !sameId(c.id, id)));
    const fm = cFileMapLoad(); if (fm[id]) { delete fm[id]; cFileMapSave(fm); }
    if (cloudOn) cloudDelete(CLAIM_SHEET, id);
  };

  return { claims, upsert, remove, cloudOn, cloudState, lastSync, pull, uploadWarn, clearUploadWarn, saveStatus };
};

Object.assign(window, {
  CLAIM_STORES, CLAIM_TYPES, CLAIM_TYPE_BY, CLAIM_STATUS, CLAIM_STATUS_BY, isUnresolved,
  yenC, dateSlash, relTimeC, fullTimeC, fileExtC, fmtBytesC, readClaimFile, cToday,
  useClaimData,
});
