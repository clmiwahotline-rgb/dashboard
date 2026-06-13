// シフト データ入出力ユーティリティ（CSV取込 / メモ / localStorage）
// window に公開して polished-stores.jsx から利用

const SHIFT_LS_KEY = "miwa.shift.data.v1";
const NOTE_LS_KEY  = "miwa.shift.notes.v1";
const HIST_LS_KEY  = "miwa.shift.history.v1";

const WD_JP = ["日", "月", "火", "水", "木", "金", "土"];
const pad2io = (n) => String(n).padStart(2, "0");

// 保存データ（CSV取込後）優先、なければ初期シード
const loadShiftData = () => {
  try { const s = JSON.parse(localStorage.getItem(SHIFT_LS_KEY)); if (s && Array.isArray(s.stores) && s.stores.length) return s; } catch (e) {}
  return window.SHIFT_2026_06 || { month: "2026-06", stores: [] };
};
const saveShiftData = (d) => { try { localStorage.setItem(SHIFT_LS_KEY, JSON.stringify(d)); } catch (e) {} };
const resetShiftData = () => { try { localStorage.removeItem(SHIFT_LS_KEY); } catch (e) {} };

const loadNotes = () => { try { const a = JSON.parse(localStorage.getItem(NOTE_LS_KEY)); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
const saveNotes = (a) => { try { localStorage.setItem(NOTE_LS_KEY, JSON.stringify(a)); } catch (e) {} };

// 編集履歴（シフト編集の変更ログ。新しい順に最大300件保持）
const loadHistory = () => { try { const a = JSON.parse(localStorage.getItem(HIST_LS_KEY)); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
const saveHistory = (a) => { try { localStorage.setItem(HIST_LS_KEY, JSON.stringify((a || []).slice(0, 300))); } catch (e) {} };

// ── 時刻パース "9-15" "14:30-19" → {s,e,text} ──
const ioParseTime = (str) => {
  if (!str) return null;
  const m = /(\d{1,2})(?::(\d{2}))?\s*[-~]\s*(?:(\d{1,2})(?::(\d{2}))?)?/.exec(str);
  if (!m) return null;
  const s = +m[1] + (m[2] ? +m[2] / 60 : 0);
  let e = m[3] != null ? (+m[3] + (m[4] ? +m[4] / 60 : 0)) : null;
  if (e != null && e <= s) e += 12;
  return { s, e, text: m[0].replace(/\s+/g, "") };
};
const ioHours = (c) => (c && c.time && c.time.e != null) ? (c.time.e - c.time.s) : 0;

// ── 日付正規化 "2026/6/1" "2026-06-01" "6/1" → "YYYY-MM-DD" ──
const ioNormDate = (raw, fallbackYear) => {
  const s = (raw || "").trim();
  let m = /^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/.exec(s);
  if (m) return `${m[1]}-${pad2io(+m[2])}-${pad2io(+m[3])}`;
  m = /^(\d{1,2})[\/\-.](\d{1,2})$/.exec(s);
  if (m) return `${fallbackYear}-${pad2io(+m[1])}-${pad2io(+m[2])}`;
  if (/^\d{8}$/.test(s)) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
  return null;
};

// ── CSV パーサ（引用符対応） ──
const parseCSV = (text) => {
  const rows = []; let row = [], cur = "", q = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += ch;
    } else {
      if (ch === '"') q = true;
      else if (ch === ",") { row.push(cur); cur = ""; }
      else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (ch === "\r") {}
      else cur += ch;
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(c => (c || "").trim() !== ""));
};

// ── ヘッダ列名 → 役割 のマッピング ──
const COLMAP = {
  store: /拠点|店舗|店名|場所名|location|store/i,
  staff: /スタッフ|氏名|名前|従業員|staff|name/i,
  date:  /日付|年月日|date/i,
  time:  /時間|シフト|勤務|time|shift/i,
  loc:   /役割|担当|配置|備考|場所|memo|role/i,
  type:  /種別|区分|type|kind/i,
};
const detectCols = (header) => {
  const idx = {};
  header.forEach((h, i) => {
    const key = (h || "").trim();
    for (const [role, re] of Object.entries(COLMAP)) {
      if (idx[role] == null && re.test(key)) { idx[role] = i; break; }
    }
  });
  return idx;
};

// ── CSV → SHIFT 構造へマージ ──
// columns: 拠点, スタッフ, 日付, 時間, 役割/備考(任意), 種別(勤務/応援, 任意)
const importShiftCSV = (text, base) => {
  const data = JSON.parse(JSON.stringify(base || { month: "2026-06", stores: [] }));
  const fallbackYear = (data.month || "2026-06").slice(0, 4);
  const rows = parseCSV(text);
  if (!rows.length) return { data, added: 0, error: "空のCSVです" };

  // ヘッダ判定（列名が1つでも一致すればヘッダ扱い）
  const head = rows[0].map(c => (c || "").trim());
  const idx = detectCols(head);
  let body, ci;
  if (Object.keys(idx).length >= 2) { body = rows.slice(1); ci = idx; }
  else { body = rows; ci = { store: 0, staff: 1, date: 2, time: 3, loc: 4, type: 5 }; } // ヘッダ無し既定列順

  const storeMap = {};
  data.stores.forEach(s => { storeMap[s.store] = s; });
  let added = 0;

  for (const r of body) {
    const store = (r[ci.store] || "").trim();
    const who   = (r[ci.staff] != null ? r[ci.staff] : "").trim();
    const date  = ioNormDate(r[ci.date], fallbackYear);
    const timeRaw = (r[ci.time] != null ? r[ci.time] : "").trim();
    const loc   = (ci.loc != null && r[ci.loc] != null ? r[ci.loc] : "").trim();
    const type  = (ci.type != null && r[ci.type] != null ? r[ci.type] : "").trim();
    if (!store || !date) continue;

    let st = storeMap[store];
    if (!st) { st = { store, sheet: "CSV", dates: [], weekday: {}, events: {}, help: {}, staff: [] }; data.stores.push(st); storeMap[store] = st; }

    const time = ioParseTime(timeRaw);
    const isHelp = /応援|help|ヘルプ/i.test(type) || /応援|HELP/i.test(who);

    if (isHelp) {
      const nm = who.replace(/応援|HELP/ig, "").trim() || loc || "応援";
      (st.help[date] = st.help[date] || []).push({ raw: (loc ? loc : "") + nm + timeRaw, name: nm, time });
      added++;
    } else if (who) {
      let p = st.staff.find(x => x.name === who);
      if (!p) { p = { name: who, cells: {}, days: 0, hours: 0 }; st.staff.push(p); }
      const raw = (loc ? loc : "") + timeRaw;
      p.cells[date] = { raw: raw || timeRaw, time };
      added++;
    }
  }

  // 集計・日付配列を再計算
  recomputeData(data);
  return { data, added, error: null };
};

// staff.days / hours、各 store.dates、を再計算
const recomputeData = (data) => {
  const allDates = new Set();
  for (const st of data.stores) {
    const ds = new Set();
    for (const p of st.staff) Object.keys(p.cells).forEach(d => ds.add(d));
    Object.keys(st.help || {}).forEach(d => ds.add(d));
    Object.keys(st.events || {}).forEach(d => ds.add(d));
    st.dates = [...ds].sort();
    st.dates.forEach(d => allDates.add(d));
    for (const p of st.staff) {
      let days = 0, hours = 0;
      for (const d of st.dates) { const c = p.cells[d]; if (c && c.time) { days++; hours += ioHours(c); } }
      p.days = days; p.hours = Math.round(hours * 4) / 4;
    }
  }
  data._allDates = [...allDates].sort();
  return data;
};

// 見本CSV（取込フォーマット）
const SAMPLE_CSV =
`拠点,スタッフ,日付,時間,役割・備考,種別
八潮工場,キラン,2026/6/1,9-15,,勤務
本店,酒寄,2026/6/1,14-19,受付,勤務
草加西口店,佐々木,2026/6/1,14-19,,応援
本店,内,2026/6/20,9-14,新田,勤務`;

Object.assign(window, {
  SHIFT_LS_KEY, NOTE_LS_KEY, HIST_LS_KEY, WD_JP,
  loadShiftData, saveShiftData, resetShiftData, loadNotes, saveNotes, loadHistory, saveHistory,
  ioParseTime, ioNormDate, parseCSV, importShiftCSV, recomputeData, SAMPLE_CSV,
});
