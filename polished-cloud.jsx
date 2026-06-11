// みわダッシュボード ─ 共有クラウド クライアント（全ページ共通）
// =====================================================================
// GAS Web App（gas/みわ共有API.gs）経由で Google スプレッドシートを
// 読み書きする。URL は下の CLOUD_API_URL に「1度だけ」貼れば、
// 全ページ・全端末で共有される（= 端末ごとの設定が不要になる）。
//
//   読む : await cloudGet('フィードバック')          → [ {id,...}, ... ] / null(失敗)
//   足す : await cloudAdd('フィードバック', row)       → { ok, id, ts }
//   直す : await cloudUpdate('フィードバック', id, row) → { ok }
//   消す : await cloudDelete('フィードバック', id)      → { ok }
//   全置換: await cloudReplaceAll('フィードバック', rows)→ { ok, count }
//
// 未設定（CLOUD_API_URL=""）のときは各関数は安全に no-op を返し、
// 各ページは従来どおり localStorage で動作する（壊れない）。
// =====================================================================

// ★★★ ここに GAS の /exec URL を貼る ★★★
const CLOUD_API_URL = "https://script.google.com/macros/s/AKfycbyvBTM4ZijS0hDjKBVjczQywjXYOZJnszLqgqfTZhsNdfd-GSPQp-LYlRxfCMedkg8/exec";
// 例: "https://script.google.com/macros/s/AKfycb...../exec"

const cloudEnabled = () => !!CLOUD_API_URL;

// ─── 読み取り（fetch → 失敗時 JSONP フォールバック） ───────────────
function _cloudJsonp(url) {
  return new Promise((resolve) => {
    const cb = "__cloudCb_" + Math.random().toString(36).slice(2);
    const sep = url.includes("?") ? "&" : "?";
    const s = document.createElement("script");
    const timer = setTimeout(() => { cleanup(); resolve(null); }, 15000);
    function cleanup() { try { delete window[cb]; } catch {} s.remove(); clearTimeout(timer); }
    window[cb] = (data) => { cleanup(); resolve(data); };
    s.onerror = () => { cleanup(); resolve(null); };
    s.src = url + sep + "callback=" + cb;
    document.body.appendChild(s);
  });
}

async function cloudGet(sheet) {
  if (!CLOUD_API_URL) return null;
  const base = CLOUD_API_URL + (CLOUD_API_URL.includes("?") ? "&" : "?")
    + "sheet=" + encodeURIComponent(sheet) + "&t=" + Date.now();
  let data = null;
  try {
    const res = await fetch(base, { redirect: "follow" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    data = await res.json();
  } catch (_) {
    data = await _cloudJsonp(base);   // CORS等で失敗したら JSONP
  }
  if (!data) return null;
  if (data.error) { console.warn("cloudGet error:", data.message); return null; }
  return Array.isArray(data) ? data : (data.rows || []);
}

// ─── 書き込み（text/plain にして CORS プリフライトを回避） ──────────
async function cloudPost(payload) {
  if (!CLOUD_API_URL) return { ok: false, offline: true };
  try {
    const res = await fetch(CLOUD_API_URL, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data && data.error) { console.warn("cloudPost error:", data.message); return { ok: false, message: data.message }; }
    return data || { ok: true };
  } catch (e) {
    console.warn("cloudPost failed:", e);
    return { ok: false, message: String(e) };
  }
}

const cloudAdd        = (sheet, row)     => cloudPost({ sheet, action: "add", row });
const cloudUpdate     = (sheet, id, row) => cloudPost({ sheet, action: "update", id, row });
const cloudDelete     = (sheet, id)      => cloudPost({ sheet, action: "delete", id });
const cloudReplaceAll = (sheet, rows)    => cloudPost({ sheet, action: "replaceAll", rows });
// Google Drive へファイルをアップロード（base64）。返り値 { ok, fileId, url }
const cloudUploadFile = (name, type, dataBase64) =>
  cloudPost({ sheet: "_files", action: "uploadFile", name, type, data: dataBase64 });
// クレーム・事故品フォームの回答を「クレーム」シートへ取込。返り値 { ok, imported, total }
const cloudImportClaimForm = () => cloudPost({ action: "importClaimForm" });
// 車両報告フォームの回答を「給油」「整備」シートへ取込。返り値 { ok, fuel, maint, total }
const cloudImportVehicleForm = () => cloudPost({ action: "importVehicleForm" });
// フィードバック報告フォームの回答を「フィードバック」シートへ取込。返り値 { ok, imported, total }
const cloudImportFeedbackForm = () => cloudPost({ action: "importFeedbackForm" });

const sameId = (a, b) => String(a) === String(b);

Object.assign(window, {
  CLOUD_API_URL, cloudEnabled, cloudGet,
  cloudAdd, cloudUpdate, cloudDelete, cloudReplaceAll, cloudUploadFile, cloudImportClaimForm, cloudImportVehicleForm, cloudImportFeedbackForm, sameId,
});
