// 請求書管理 — 受取請求（売上・顧客請求）の一覧 / PDF添付 / AI抽出 / 自動採番
// クラウド共有：シート「請求書」。PDF実体は Drive 保存。
// localStorage: miwa.invoice.v1 / miwa.invoice.files.v1
// 行: { id, ts, no, vendor, title, issueDate, dueDate, amount, status, note, files[] }

const INV_KEY = "miwa.invoice.v1";
const INV_FILES_KEY = "miwa.invoice.files.v1";
const INVOICE_SHEET = "請求書";

// 入金状況（受け取り側）
const INV_STATUS = [
  { id: "入金待ち", color: "#d9730a", bg: "#fdebcf", open: true },
  { id: "入金済",   color: "#1e8e3e", bg: "#e6f4ea", open: false },
];
const INV_STATUS_BY = Object.fromEntries(INV_STATUS.map((s) => [s.id, s]));
const invIsOpen = (st) => (INV_STATUS_BY[st] || {}).open === true;

// ── ユーティリティ ──────────────────────────────────────
const iNow = new Date();
const iToday = `${iNow.getFullYear()}-${String(iNow.getMonth() + 1).padStart(2, "0")}-${String(iNow.getDate()).padStart(2, "0")}`;
const iYen = (n) => "¥" + Math.round(n || 0).toLocaleString("ja-JP");
const iSlash = (s) => (s || "").replaceAll("-", "/");
const iFileExt = (name) => ((name || "").split(".").pop() || "").toUpperCase().slice(0, 4);
const iBytes = (n) => { if (!n && n !== 0) return ""; if (n < 1024) return n + " B"; if (n < 1048576) return (n / 1024).toFixed(0) + " KB"; return (n / 1048576).toFixed(1) + " MB"; };
const iDriveView = (id) => `https://drive.google.com/file/d/${id}/view`;
const iDriveThumb = (id, w) => `https://lh3.googleusercontent.com/d/${id}=w${w || 600}`;
const iDaysUntil = (s) => { if (!s) return null; const d = new Date(s + "T00:00:00"); if (isNaN(d)) return null; return Math.round((d - new Date(iToday + "T00:00:00")) / 864e5); };
const iParseArr = (x) => { if (Array.isArray(x)) return x; if (typeof x === "string" && x.trim()) { try { const v = JSON.parse(x); return Array.isArray(v) ? v : []; } catch { return []; } } return []; };

// ── サンプル ────────────────────────────────────────────
const SEED_INVOICES = [];

// ── PDF テキスト抽出 → AI で項目化 ──────────────────────
const extractPdfText = async (file) => {
  const lib = window.pdfjsLib;
  if (!lib) return "";
  try {
    const buf = await file.arrayBuffer();
    const pdf = await lib.getDocument({ data: buf }).promise;
    let out = "";
    for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
      const page = await pdf.getPage(i);
      const c = await page.getTextContent();
      // ── 行構造を座標から復元 ──────────────────────────
      // pdf.js は文字を細切れ（item）で返し並びもバラバラ。y座標で行に束ね、
      // x座標で左→右に並べ直すと「請求日：2026年5月10日」のように
      // ラベルと値が同じ行に揃い、日付・金額・取引先の対応が取れる。
      const rows = [];
      for (const it of c.items) {
        if (!it.str || !it.str.trim()) continue;
        const y = Math.round(it.transform[5]);
        const x = it.transform[4];
        let row = rows.find((r) => Math.abs(r.y - y) <= 3);
        if (!row) { row = { y, items: [] }; rows.push(row); }
        row.items.push({ x, s: it.str });
      }
      rows.sort((a, b) => b.y - a.y); // 上→下
      for (const r of rows) {
        // 同一行は左→右。日本語はスペース無し結合の方がキーワード検出に強い（「請 求」→「請求」）
        const line = r.items.sort((a, b) => a.x - b.x).map((o) => o.s).join("");
        if (line.trim()) out += line + "\n";
      }
      out += "\n";
    }
    return out.slice(0, 6000);
  } catch { return ""; }
};
// PDF 1ページ目を画像（dataURL）に描画 — 画像PDFのプレビュー用
const renderPdfPreview = async (file) => {
  const lib = window.pdfjsLib;
  if (!lib) return "";
  try {
    const buf = await file.arrayBuffer();
    const pdf = await lib.getDocument({ data: buf }).promise;
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(1.4, 760 / base.width);
    const vp = page.getViewport({ scale });
    const cv = document.createElement("canvas");
    cv.width = vp.width; cv.height = vp.height;
    await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
    return cv.toDataURL("image/jpeg", 0.78);
  } catch { return ""; }
};

// ── ブラウザだけで動く請求書ヒューリスティック解析 ─────
// （window.claude が無い実環境でも金額・日付・取引先を抽出）
const toHalf = (s) => (s || "").replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/[，、]/g, ",").replace(/[．]/g, ".").replace(/　/g, " ");
const jpYearFix = (y) => { y = Number(y); if (y < 100) y += 2000; return y; };
const parseJpDate = (str) => {
  const s = toHalf(str);
  let m = s.match(/(\d{4})\s*[年\/\-\.]\s*(\d{1,2})\s*[月\/\-\.]\s*(\d{1,2})/);
  if (m) return `${jpYearFix(m[1])}-${String(+m[2]).padStart(2, "0")}-${String(+m[3]).padStart(2, "0")}`;
  // 令和
  m = s.match(/令和\s*(\d{1,2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})/);
  if (m) return `${2018 + Number(m[1])}-${String(+m[2]).padStart(2, "0")}-${String(+m[3]).padStart(2, "0")}`;
  return "";
};
// ── 行単位ヒューリスティック解析 ────────────────────────
// 行構造（extractPdfText）を前提に、金額・日付・取引先・件名を抽出。
// window.claude が無い公開版・他PCでもこれだけで自動入力が効く。
const heuristicInvoice = (rawText) => {
  if (!rawText || rawText.trim().length < 8) return null;
  const lines = toHalf(rawText).split("\n").map((l) => l.trim()).filter(Boolean);
  const res = { vendor: "", title: "", issueDate: "", dueDate: "", amount: 0 };

  // ── 金額：請求金額/合計/お支払 などのラベル行を最優先、無ければ全体最大 ──
  const amtRe = /([¥￥]?\s*\d{1,3}(?:,\d{3})+|\b\d{4,9}\b)\s*(?:円)?/g;
  const amounts = [];
  for (const line of lines) {
    const strongKey = /(ご?請求金?額|お支払金?額|合計金額|税込合計|税込金額|総額|お振込金額)/.test(line);
    const key = strongKey || /(合計|税込|金額|お支払|ご請求)/.test(line);
    let am; amtRe.lastIndex = 0;
    while ((am = amtRe.exec(line))) {
      const num = Number(am[1].replace(/[¥￥,\s]/g, ""));
      if (!num || num < 100) continue;
      amounts.push({ num, key, strongKey });
    }
  }
  if (amounts.length) {
    const strong = amounts.filter((a) => a.strongKey);
    const keyed = amounts.filter((a) => a.key);
    const pool = strong.length ? strong : keyed.length ? keyed : amounts;
    res.amount = pool.reduce((mx, a) => (a.num > mx ? a.num : mx), 0);
  }

  // ── 日付：ラベルが同じ行にある日付で請求日/支払期限を判定 ──
  const dateRe = /(?:令和\s*\d{1,2}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日?)|(?:\d{4}\s*[年\/\-\.]\s*\d{1,2}\s*[月\/\-\.]\s*\d{1,2}\s*日?)/g;
  const allDates = [];
  for (const line of lines) {
    let m; dateRe.lastIndex = 0;
    while ((m = dateRe.exec(line))) { const iso = parseJpDate(m[0]); if (iso) allDates.push({ iso, line }); }
  }
  for (const d of allDates) {
    if (!res.dueDate && /(支払|お支払|振込|期限|期日|入金)/.test(d.line)) res.dueDate = d.iso;
    else if (!res.issueDate && /(請求日|発行|日付|請求書発行|年月日)/.test(d.line)) res.issueDate = d.iso;
  }
  if (!res.issueDate && allDates.length) res.issueDate = allDates[0].iso; // 先頭＝発行日が多い
  if (!res.dueDate && allDates.length > 1) {
    const rest = allDates.map((d) => d.iso).filter((x) => x !== res.issueDate).sort();
    if (rest.length) res.dueDate = rest[rest.length - 1]; // 残りで最も先＝期限が多い
  }

  // ── 取引先：会社/団体名。御中・様の行（＝宛先＝自社みわ）は除外 ──
  const ORG_RE = /(?:医療法人|学校法人|社会福祉法人|一般社団法人|一般財団法人|公益社団法人|公益財団法人|特定非営利活動法人|宗教法人)\s*[一-龯ぁ-んァ-ヶー\u30A0-\u30FFA-Za-z0-9・]{1,20}|(?:株式会社|有限会社|合同会社|合資会社|[（(]株[）)]|[（(]有[）)])\s*[一-龯ぁ-んァ-ヶー\u30A0-\u30FFA-Za-z0-9・]{1,20}|[一-龯ぁ-んァ-ヶー\u30A0-\u30FFA-Za-z0-9・]{1,20}(?:株式会社|有限会社|合同会社)|[一-龯ァ-ヶー\u30A0-\u30FF]{2,18}(?:小学校|中学校|高等学校|高校|大学|学園|幼稚園|保育園|病院|医院|診療所|クリニック|歯科|薬局|ホテル|旅館|組合|協会|商店|商事|工業|産業|製作所|サービス|事務所|センター|ストア)/g;
  const STOPTRAIL = /(?:御中|様|宛|行$|請求書|御請求書|請求日|発行日|件名|日付|頁|〒|TEL|Tel|電話|FAX|住所|金額|合計|小計|消費税|登録番号|インボイス|ｲﾝﾎﾞｲｽ|下記|以下|印).*$/;
  const cands = [];
  lines.forEach((line, li) => {
    const isRecipient = /(御中|様|宛先|請求先)/.test(line);
    let m; ORG_RE.lastIndex = 0;
    while ((m = ORG_RE.exec(line))) {
      let name = m[0].replace(STOPTRAIL, "").replace(/\s+/g, "").trim();
      if (name.length < 3) continue;
      if (/(クリーニングみわ|みわ)/.test(name)) continue; // 自社
      const ctx = (lines[li - 1] || "") + line + (lines[li + 1] || "");
      const issuerHint = /(登録番号|T\d|TEL|電話|〒|FAX|振込|口座|印)/.test(ctx); // 発行元の手がかり
      cands.push({ name, isRecipient, issuerHint });
    }
  });
  const pick = cands.find((c) => !c.isRecipient && c.issuerHint) || cands.find((c) => !c.isRecipient) || cands[0];
  if (pick) res.vendor = pick.name;

  // ── 件名：件名/品名/内容 ラベル行から ──
  const tl = lines.find((l) => /(件名|品名|内容|ご請求内容|摘要)[：:　\s]/.test(l));
  if (tl) {
    const t = tl.replace(/^.*?(?:件名|品名|内容|ご請求内容|摘要)[：:　\s]*/, "").trim();
    if (t && t.length <= 30) res.title = t;
  }

  const hit = (res.amount > 0) || res.issueDate || res.dueDate || res.vendor;
  return hit ? res : null;
};

// 返り値 { vendor, title, issueDate, dueDate, amount } or null（claude優先・無ければヒューリスティック）
const aiExtractInvoice = async (text) => {
  if (!text) return null;
  // ① ブラウザだけで動く解析（実環境でも必ず動く）
  const base = heuristicInvoice(text);
  // ② window.claude が使える編集環境ならAIで補強
  if (window.claude && typeof window.claude.complete === "function") {
    const prompt = `あなたは経理アシスタントです。次の請求書PDFから抽出したテキストを読み、以下のJSONのみを返してください（前後の説明は不要）。
- vendor: 請求元/取引先の会社名（自社「クリーニングみわ」ではなく相手先）
- title: 件名・内容の要約（20字以内）
- issueDate: 請求日/発行日（YYYY-MM-DD、不明なら""）
- dueDate: 支払期限（YYYY-MM-DD、不明なら""）
- amount: 合計金額（税込）の数値のみ（カンマ・円記号なし、不明なら0）

テキスト:
"""
${text}
"""

JSON:`;
    try {
      const res = await window.claude.complete(prompt);
      const m = res.match(/\{[\s\S]*\}/);
      if (m) {
        const obj = JSON.parse(m[0]);
        const ai = {
          vendor: obj.vendor || "", title: obj.title || "",
          issueDate: /^\d{4}-\d{2}-\d{2}$/.test(obj.issueDate) ? obj.issueDate : "",
          dueDate: /^\d{4}-\d{2}-\d{2}$/.test(obj.dueDate) ? obj.dueDate : "",
          amount: Number(String(obj.amount).replace(/[^\d.]/g, "")) || 0,
        };
        // AIの結果を優先しつつ、欠けはヒューリスティックで補完
        return {
          vendor: ai.vendor || (base && base.vendor) || "",
          title: ai.title || (base && base.title) || "",
          issueDate: ai.issueDate || (base && base.issueDate) || "",
          dueDate: ai.dueDate || (base && base.dueDate) || "",
          amount: ai.amount || (base && base.amount) || 0,
        };
      }
    } catch {}
  }
  return base;
};

// ファイル → dataURL（PDF/画像）
const readInvoiceFile = (file) => new Promise((resolve) => {
  const isImg = /^image\//.test(file.type);
  if (file.size <= 4 * 1024 * 1024) {
    const r = new FileReader();
    r.onload = () => resolve({ name: file.name, type: file.type, size: file.size, url: r.result, isImg });
    r.readAsDataURL(file);
  } else {
    resolve({ name: file.name, type: file.type, size: file.size, url: "", isImg });
  }
});

// ── localStorage ────────────────────────────────────────
const invLoad = () => { try { const s = localStorage.getItem(INV_KEY); if (s) { const v = JSON.parse(s); if (Array.isArray(v)) return v; } } catch {} return SEED_INVOICES; };
const invSave = (rows) => { try { localStorage.setItem(INV_KEY, JSON.stringify(rows)); } catch {} };
const iFileMapLoad = () => { try { return JSON.parse(localStorage.getItem(INV_FILES_KEY)) || {}; } catch { return {}; } };
const iFileMapSave = (m) => { try { localStorage.setItem(INV_FILES_KEY, JSON.stringify(m)); } catch {} };

const normalizeInv = (r) => ({
  id: r.id || ("iv" + Date.now()), ts: Number(r.ts) || (r.ts ? Date.parse(r.ts) : Date.now()),
  no: r.no || "", vendor: r.vendor || "", title: r.title || "",
  issueDate: r.issueDate || "", dueDate: r.dueDate || "",
  amount: Number(r.amount) || 0, status: INV_STATUS_BY[r.status] ? r.status : "入金待ち", note: r.note || "",
  files: iParseArr(r.files),
});
const resolveInvFile = (f, local) => {
  const fileId = f.fileId || (local && local.fileId) || "";
  const localUrl = (local && local.url) || f.url || "";
  return { name: f.name, type: f.type, size: f.size, isImg: !!f.isImg, fileId,
    href: fileId ? iDriveView(fileId) : localUrl, thumb: f.isImg ? (fileId ? iDriveThumb(fileId, 400) : localUrl) : "",
    driveLink: !!fileId, remote: !fileId && !localUrl };
};
const hydrateInv = (rows, fm) => rows.map((r) => {
  const lf = fm[r.id] || [];
  return { ...r, files: (r.files || []).map((f, i) => resolveInvFile(f, lf.find((l) => l.name === f.name) || lf[i])) };
});
const stripInv = (c, cloudFiles) => ({
  id: c.id, ts: c.ts, no: c.no, vendor: c.vendor, title: c.title,
  issueDate: c.issueDate, dueDate: c.dueDate, amount: c.amount, status: c.status, note: c.note,
  files: cloudFiles || (c.files || []).map((f) => ({ name: f.name, type: f.type, size: f.size, isImg: !!f.isImg, fileId: f.fileId || "" })),
});

// 自動採番：YYYY-NNNN（年内連番）
const nextInvoiceNo = (rows) => {
  const y = String(iNow.getFullYear());
  let max = 0;
  rows.forEach((r) => { const m = String(r.no || "").match(new RegExp("^" + y + "-(\\d+)$")); if (m) max = Math.max(max, parseInt(m[1], 10)); });
  return `${y}-${String(max + 1).padStart(4, "0")}`;
};

// ── データ層フック ──────────────────────────────────────
const useInvoiceData = () => {
  const cloudOn = (typeof cloudEnabled === "function") && cloudEnabled();
  const [invoices, setInvoices] = React.useState(() => hydrateInv(invLoad(), iFileMapLoad()));
  const [cloudState, setCloudState] = React.useState(cloudOn ? "loading" : "off");
  const [lastSync, setLastSync] = React.useState(null);

  React.useEffect(() => { invSave(invoices.map((c) => stripInv(c))); }, [invoices]);

  const pull = React.useCallback(async () => {
    if (!cloudOn) return;
    setCloudState("loading");
    const remote = await cloudGet(INVOICE_SHEET);
    if (remote == null) { setCloudState("error"); return; }
    const fm = iFileMapLoad();
    if (remote.length) setInvoices(hydrateInv(remote.map(normalizeInv), fm));
    else { const local = invLoad(); if (local.length) await cloudReplaceAll(INVOICE_SHEET, local.map((c) => stripInv(c))); }
    setCloudState("ok"); setLastSync(Date.now());
  }, [cloudOn]);

  React.useEffect(() => { pull(); }, [pull]);
  React.useEffect(() => { if (!cloudOn) return; const t = setInterval(pull, 30000); return () => clearInterval(t); }, [cloudOn, pull]);

  const uploadFiles = async (id, files) => {
    if (!cloudOn || !files || !files.length) return (files || []).map((f) => ({ name: f.name, type: f.type, size: f.size, isImg: !!f.isImg, fileId: f.fileId || "" }));
    const out = [];
    for (const f of files) {
      let fileId = f.fileId || "";
      const b64 = (f.url || "").split(",")[1];
      if (!fileId && b64) { try { const res = await cloudUploadFile(f.name, f.type || "application/pdf", b64); if (res && res.ok) fileId = res.fileId; } catch {} }
      out.push({ name: f.name, type: f.type, size: f.size, isImg: !!f.isImg, fileId });
    }
    const fm = iFileMapLoad(); fm[id] = files.map((f, i) => ({ ...f, fileId: out[i].fileId })); iFileMapSave(fm);
    return out;
  };

  const upsert = async (inv, isNew) => {
    if (inv.files && inv.files.length) { const fm = iFileMapLoad(); fm[inv.id] = inv.files; iFileMapSave(fm); }
    setInvoices((prev) => {
      const next = isNew ? [inv, ...prev] : prev.map((c) => (String(c.id) === String(inv.id) ? inv : c));
      return hydrateInv(next.map((c) => (String(c.id) === String(inv.id) ? { ...c, files: inv.files } : c)), iFileMapLoad());
    });
    if (cloudOn) {
      const cloudFiles = await uploadFiles(inv.id, inv.files);
      setInvoices((prev) => hydrateInv(prev.map((c) => (String(c.id) === String(inv.id) ? { ...c, files: cloudFiles.map((cf) => ({ ...cf })) } : c)), iFileMapLoad()));
      const payload = stripInv(inv, cloudFiles);
      if (isNew) cloudAdd(INVOICE_SHEET, payload); else cloudUpdate(INVOICE_SHEET, inv.id, payload);
    }
  };
  const remove = (id) => {
    setInvoices((prev) => prev.filter((c) => String(c.id) !== String(id)));
    const fm = iFileMapLoad(); if (fm[id]) { delete fm[id]; iFileMapSave(fm); }
    if (cloudOn) cloudDelete(INVOICE_SHEET, id);
  };

  return { invoices, upsert, remove, cloudOn, cloudState, lastSync, pull, nextNo: () => nextInvoiceNo(invoices) };
};

window.useInvoiceData = useInvoiceData;
Object.assign(window, { INV_STATUS, INV_STATUS_BY, invIsOpen, iYen, iSlash, iToday, iDaysUntil, iFileExt, iBytes, readInvoiceFile, extractPdfText, aiExtractInvoice, renderPdfPreview, nextInvoiceNo });
