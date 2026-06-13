/**
 * みわダッシュボード ─ 共有データ API（読み書き両対応 Web App）
 * =====================================================================
 * 1つの Google スプレッドシートを「クラウドのデータ置き場」として、
 * 全ページ・全端末から読み書きするための汎用 API です。
 *
 *  ・1ページ = 1タブ（シート）。例: フィードバック / 売上 / シフト …
 *  ・先頭行 = 見出し（列名）。各行はその見出しをキーにした JSON になる。
 *  ・「id」列を主キーとして 追加 / 更新 / 削除 する。
 *
 * ───────────────────────────────────────────────────────────────────
 * ■ 導入手順（1回だけ）
 *   1. 置き場にしたい Google スプレッドシートを新規作成（中身は空でOK）。
 *   2. 拡張機能 → Apps Script を開き、このコードを全文貼り付け。
 *   3. 上の SPREADSHEET_ID に、そのスプレッドシートのURLの
 *        https://docs.google.com/spreadsheets/d/【ここ】/edit
 *      の【ここ】を貼る。（同じスプレッドシートに紐付けたScriptなら空欄でも可）
 *   4. デプロイ → 新しいデプロイ → 種類「ウェブアプリ」
 *        実行するユーザー：自分
 *        アクセスできるユーザー：全員
 *      → デプロイ。表示された「ウェブアプリ URL（/exec で終わる）」を控える。
 *   5. その URL を polished-cloud.jsx の CLOUD_API_URL に貼る。以上。
 *
 *   ※ コードを直したら毎回「デプロイを管理 → 編集（鉛筆）→ 新バージョン → デプロイ」。
 *
 * ───────────────────────────────────────────────────────────────────
 * ■ 読み取り（GET）
 *   GET  ?sheet=フィードバック            → [ {id, ...}, ... ] を返す
 *   GET  ?sheet=フィードバック&callback=cb → JSONP（cb({...})）
 *
 * ■ 書き込み（POST, body は JSON 文字列 / Content-Type: text/plain）
 *   { "sheet":"フィードバック", "action":"add",        "row": {...} }
 *   { "sheet":"フィードバック", "action":"update", "id":"...", "row": {...} }
 *   { "sheet":"フィードバック", "action":"delete", "id":"..." }
 *   { "sheet":"フィードバック", "action":"replaceAll", "rows": [ {...}, ... ] }
 *   返り値: { ok:true, ... }  失敗時: { error:true, message:"..." }
 * =====================================================================
 */

var SPREADSHEET_ID = '';   // ←（任意）対象スプレッドシートID。空ならScript紐付け先を使う。

// ─────────────────────────────────────────────────────────────────────
function doGet(e) {
  var p = (e && e.parameter) || {};
  var out;
  try {
    // クレーム・事故品フォームの取込（GETでも叩けるように）
    if (p.action === 'importClaimForm') { return reply_(importClaimForm(), p.callback); }
    if (p.action === 'importVehicleForm') { return reply_(importVehicleForm(), p.callback); }
    var sheetName = p.sheet || p.tab || '';
    if (!sheetName) { out = { error: true, message: 'sheet パラメータが必要です' }; }
    else { out = readSheet_(sheetName); }
  } catch (err) {
    out = { error: true, message: String(err && err.message || err) };
  }
  return reply_(out, p.callback);
}

function doPost(e) {
  var out;
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    var action = body.action;

    // ─ Google Drive へのファイルアップロード（sheet 不要）─
    if (action === 'uploadFile') {
      out = uploadFile_(body.name, body.type, body.data);
      return reply_(out, null);
    }

    // ─ Google サインイン認証・ユーザー管理（sheet 不要）─
    if (action === 'verifyLogin') { return reply_(verifyLogin_(body.idToken), null); }
    if (action === 'listUsers')   { return reply_(listUsers_(body.idToken), null); }
    if (action === 'addUser')     { return reply_(addUser_(body.idToken, body.user), null); }
    if (action === 'updateUser')  { return reply_(updateUser_(body.idToken, body.email, body.patch), null); }
    if (action === 'removeUser')  { return reply_(removeUser_(body.idToken, body.email), null); }

    // ─ クレーム・事故品フォームの取込（sheet 不要）─
    if (action === 'importClaimForm') { return reply_(importClaimForm(), null); }
    if (action === 'importVehicleForm') { return reply_(importVehicleForm(), null); }

    var sheetName = body.sheet || body.tab;
    if (!sheetName) throw new Error('sheet が必要です');

    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      if (action === 'add')             out = addRow_(sheetName, body.row || {});
      else if (action === 'update')     out = updateRow_(sheetName, body.id, body.row || {});
      else if (action === 'delete')     out = deleteRow_(sheetName, body.id);
      else if (action === 'replaceAll') out = replaceAll_(sheetName, body.rows || []);
      else throw new Error('未知の action: ' + action);
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    out = { error: true, message: String(err && err.message || err) };
  }
  return reply_(out, null);
}

// ─── 添付ファイルを Drive に保存（共有ボード用）─────────────────────
//   body: { action:'uploadFile', name, type, data(base64) }
//   返り値: { ok:true, fileId, url }
var DRIVE_FOLDER_NAME = 'みわ共有ボード添付';

// ★★★ クラウド保存（写真・テキスト）が失敗する時はこれを実行 ★★★
//   Apps Script エディタ上部の関数選択で「authorizeAll」を選び ▶実行。
//   「権限を確認」→ Google アカウントで【スプレッドシートとドライブの両方】を許可。
//   ※必ず両方許可すること（片方だけだと反対側が保存できません）。
//   実行後に必ず「デプロイを管理 → 編集 → 新バージョン → デプロイ」で再デプロイ。
function authorizeAll() {
  // ① スプレッドシート権限を要求（テキストデータ保存に必要）
  var ss = book_();
  var shName = ss.getSheets()[0] ? ss.getSheets()[0].getName() : '(なし)';
  // ② ドライブ権限を要求（写真保存に必要）
  var folder = getOrCreateFolder_(DRIVE_FOLDER_NAME);
  var test = folder.createFile(Utilities.newBlob('ok', 'text/plain', '_auth_check.txt'));
  test.setTrashed(true);
  var msg = 'OK: スプレッドシート「' + ss.getName() + '」（先頭シート: ' + shName +
            '）とドライブ「' + DRIVE_FOLDER_NAME + '」の両方が使用可能になりました。再デプロイしてください。';
  Logger.log(msg);
  return msg;
}
// 旧名（ドライブのみ）— 互換のため残置。通常は authorizeAll を使う。
function authorizeDrive() { return authorizeAll(); }

function getOrCreateFolder_(name) {
  var it = DriveApp.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(name);
}
function uploadFile_(name, type, dataBase64) {
  if (!dataBase64) throw new Error('data が必要です');
  var bytes = Utilities.base64Decode(dataBase64);
  var blob = Utilities.newBlob(bytes, type || 'application/octet-stream', name || ('file_' + Date.now()));
  var folder = getOrCreateFolder_(DRIVE_FOLDER_NAME);
  var file = folder.createFile(blob);
  // リンクを知っている全員が閲覧可（サムネイル表示に必要）
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  return { ok: true, fileId: file.getId(), url: 'https://drive.google.com/file/d/' + file.getId() + '/view' };
}

// ═══════════════════════════════════════════════════════════════════
//  クレーム・事故品 — Googleフォーム回答の取込
//  回答スプレッドシート（フォーム連携）の各行を「クレーム」シートへ
//  1回だけ取り込む（フォームのタイムスタンプで重複防止）。
//  取り込んだ後は、通常のクレームとしてダッシュボードで状況・コメント・
//  写真を管理できる。
//
//  ■ 使い方
//   ・手動  : ダッシュボードの「フォームから取込」ボタン
//             もしくは エディタで importClaimForm を ▶実行
//   ・自動  : setupClaimFormTrigger を【1度だけ】▶実行
//             → 以後5分ごとに自動取込
//  ※ 別スプレッドシート（フォーム回答）を読むため、初回実行時に
//    「権限を確認」が出たら許可してください。
// ═══════════════════════════════════════════════════════════════════
var CLAIM_FORM_SS_ID    = '1669Edp_ZwJgVbZOkO-wxa9pq2x1oZG40kIZkb8Oaxbw'; // 回答スプレッドシートID
var CLAIM_FORM_SHEET    = '';            // 空 = 先頭シート（「フォームの回答 1」）
var CLAIM_SHEET_NAME    = 'クレーム';
var CLAIM_STATUS_VALID  = ['受付', '対応中', '解決', '弁償'];

function claimFormSheet_() {
  var ss = CLAIM_FORM_SS_ID ? SpreadsheetApp.openById(CLAIM_FORM_SS_ID) : book_();
  if (CLAIM_FORM_SHEET) { var s = ss.getSheetByName(CLAIM_FORM_SHEET); if (s) return s; }
  return ss.getSheets()[0];
}

// 見出し文（長い質問文）から、対応するクレーム項目キーを推定
function claimFieldOf_(header) {
  var h = String(header || '');
  if (/タイムスタンプ|timestamp/i.test(h)) return '_ts';
  if (/発生時刻|時刻/.test(h))             return '_occurredTime';
  if (/発生日/.test(h))                    return 'occurredOn';
  if (/受付日/.test(h))                    return 'receivedOn';
  if (/店舗|拠点|どちらの店/.test(h))       return 'store';
  if (/種別/.test(h))                      return 'type';
  if (/連絡先/.test(h))                    return 'makerContact'; // メーカーより先に判定
  if (/メーカー/.test(h))                  return 'maker';
  if (/顧客|お客様|氏名/.test(h))           return 'customer';
  if (/会員/.test(h))                      return 'memberNo';
  if (/品目|品名|品/.test(h))              return 'item';
  if (/内容|状況|詳細/.test(h))            return 'detail';
  if (/対応状況|ステータス|状態/.test(h))   return 'status';
  if (/弁償|返金|金額/.test(h))            return 'amount';
  if (/担当/.test(h))                      return 'staff';
  if (/写真|添付|画像|ファイル/.test(h))    return '_photos';
  return null;
}

// Googleフォームの写真URL（複数可）→ [{name,type,size,isImg,fileId}]。共有も付与。
function claimExtractPhotos_(cellValue) {
  var s = String(cellValue || '').trim();
  if (!s) return [];
  var ids = [];
  s.split(/[\s,、]+/).forEach(function (p) {
    var m = p.match(/[?&]id=([-\w]{20,})/) || p.match(/\/d\/([-\w]{20,})/) || p.match(/^([-\w]{25,})$/);
    if (m && ids.indexOf(m[1]) < 0) ids.push(m[1]);
  });
  return ids.map(function (id) {
    try {
      var f = DriveApp.getFileById(id);
      try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
      var mt = '';
      try { mt = f.getMimeType(); } catch (e) {}
      return { name: f.getName(), type: mt || 'image/jpeg', size: 0, isImg: /^image\//.test(mt || 'image/'), fileId: id };
    } catch (e) {
      return { name: '写真', type: 'image/jpeg', size: 0, isImg: true, fileId: id };
    }
  });
}

function claimToIso_(v) {
  if (v instanceof Date) return v.toISOString();
  if (!v) return '';
  var d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toISOString();
}
function claimDateOnly_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Tokyo', 'yyyy-MM-dd');
  var s = String(v || '').trim();
  if (!s) return '';
  var d = new Date(s);
  return isNaN(d.getTime()) ? s : Utilities.formatDate(d, 'Asia/Tokyo', 'yyyy-MM-dd');
}

// 回答シート → 「クレーム」シートへ取込（重複は formTs でスキップ）
function importClaimForm() {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { return { ok: false, message: '混雑しています。少し待って再実行してください。' }; }
  try {
    var fsh = claimFormSheet_();
    var values = fsh.getDataRange().getValues();
    if (values.length < 2) return { ok: true, imported: 0, total: 0 };
    var headers = values[0];
    var fieldByCol = headers.map(claimFieldOf_);

    // 既存クレームの formTs を集めて重複防止
    var existing = readSheet_(CLAIM_SHEET_NAME);
    var seen = {};
    existing.forEach(function (r) { if (r.formTs) seen[String(r.formTs)] = 1; });

    var imported = 0, total = 0;
    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      if (row.every(function (c) { return c === '' || c === null; })) continue;
      total++;
      var rec = {
        occurredOn: '', receivedOn: '', store: '', type: 'その他', customer: '',
        memberNo: '', maker: '', makerContact: '', item: '', detail: '',
        status: '受付', amount: 0, staff: '', files: [], comments: [],
      };
      var ts = '', occTime = '', photos = [];
      for (var c = 0; c < headers.length; c++) {
        var key = fieldByCol[c], val = row[c];
        if (!key) continue;
        if (key === '_ts') ts = claimToIso_(val);
        else if (key === '_occurredTime') occTime = String(val == null ? '' : val).trim();
        else if (key === '_photos') photos = claimExtractPhotos_(val);
        else if (key === 'occurredOn' || key === 'receivedOn') rec[key] = claimDateOnly_(val);
        else if (key === 'amount') rec.amount = Number(String(val).replace(/[^\d.\-]/g, '')) || 0;
        else if (key === 'status') { var sv = String(val || '').trim(); rec.status = CLAIM_STATUS_VALID.indexOf(sv) >= 0 ? sv : '受付'; }
        else if (key === 'type') { var tv = String(val || '').trim(); rec.type = tv || 'その他'; }
        else rec[key] = (val === '' || val == null) ? '' : String(val).trim();
      }
      if (!ts) ts = claimToIso_(new Date());
      if (seen[ts]) continue;                 // 取込済み
      if (!rec.receivedOn) rec.receivedOn = claimDateOnly_(ts);
      rec.files = photos;
      rec.formTs = ts;                         // 重複防止キー（クレームシートに保持）
      if (occTime) rec.occurredTime = occTime; // 発生時刻メモ（任意）
      rec.id = 'F' + new Date(ts).getTime() + Math.floor(Math.random() * 100);
      rec.ts = ts;
      addRow_(CLAIM_SHEET_NAME, rec);
      seen[ts] = 1;
      imported++;
    }
    return { ok: true, imported: imported, total: total };
  } catch (err) {
    return { ok: false, message: String(err && err.message || err) };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

// 5分ごとの自動取込トリガーを設置（1度だけ実行）
function setupClaimFormTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'importClaimForm') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('importClaimForm').timeBased().everyMinutes(5).create();
  Logger.log('OK: 5分ごとにフォーム取込を実行します。');
  return 'OK: 5分ごとにフォーム取込を実行します。';
}

// ═══════════════════════════════════════════════════════════════════
//  車両管理 — Googleフォーム回答の取込（給油 / 整備 に振り分け）
//  「車両報告フォーム（回答）」スプレッドシートの各行を、列D（報告種別）
//  で判定して 給油シート / 整備シート へ取込む（タイムスタンプで重複防止）。
//  車両マスタ（車両シート）はページ側で手動管理。取込は記録のみ。
//
//  ■ 使い方
//   ・手動 : 車両管理ページの「フォームから取込」ボタン／importVehicleForm を ▶実行
//   ・自動 : setupVehicleFormTrigger を【1度だけ】▶実行 → 以後5分ごと
// ═══════════════════════════════════════════════════════════════════
var VEHICLE_FORM_SS_ID = '1gkGDEGAO8NW-70lk_HmA1e0Elhb1rka9iDMAFfDGlxQ'; // 車両報告フォーム（回答）ID
var VEHICLE_FORM_SHEET = '';        // 空 = 先頭シート
var FUEL_SHEET_NAME    = '給油';
var MAINT_SHEET_NAME   = '整備';
var VEHICLE_SHEET_NAME = '車両';

function vehicleFormSheet_() {
  var ss = VEHICLE_FORM_SS_ID ? SpreadsheetApp.openById(VEHICLE_FORM_SS_ID) : book_();
  if (VEHICLE_FORM_SHEET) { var s = ss.getSheetByName(VEHICLE_FORM_SHEET); if (s) return s; }
  return ss.getSheets()[0];
}
function vehNum_(v) { return Number(String(v == null ? '' : v).replace(/[^\d.\-]/g, '')) || 0; }

function importVehicleForm() {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { return { ok: false, message: '混雑しています。少し待って再実行してください。' }; }
  try {
    var fsh = vehicleFormSheet_();
    var values = fsh.getDataRange().getValues();
    if (values.length < 2) return { ok: true, fuel: 0, maint: 0, total: 0 };
    var headers = values[0].map(function (h) { return String(h || ''); });
    function col(re) { for (var i = 0; i < headers.length; i++) { if (re.test(headers[i])) return i; } return -1; }
    var cTs = 0;
    var cDate = col(/日付/), cVeh = col(/車両/), cType = col(/どのような報告/);
    var cLiters = col(/給油量/), cAmount = col(/金額/), cOdo = col(/走行距離/);
    var cMaintType = col(/どんな整備|整備.*行/), cCost = col(/費用/), cDetail = col(/内容/), cShop = col(/店舗|整備工場/);

    var fuelExisting = readSheet_(FUEL_SHEET_NAME);
    var maintExisting = readSheet_(MAINT_SHEET_NAME);
    var seenF = {}, seenM = {};
    fuelExisting.forEach(function (r) { if (r.formTs) seenF[String(r.formTs)] = 1; });
    maintExisting.forEach(function (r) { if (r.formTs) seenM[String(r.formTs)] = 1; });

    var fuelN = 0, maintN = 0, total = 0;
    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      if (row.every(function (c) { return c === '' || c === null; })) continue;
      total++;
      var ts = claimToIso_(row[cTs]); if (!ts) ts = claimToIso_(new Date());
      var date = (cDate >= 0 ? claimDateOnly_(row[cDate]) : '') || claimDateOnly_(ts);
      var vehicle = String(cVeh >= 0 ? row[cVeh] : '').trim();
      var typeRaw = String(cType >= 0 ? row[cType] : '').trim();
      var liters = cLiters >= 0 ? vehNum_(row[cLiters]) : 0;
      var amount = cAmount >= 0 ? vehNum_(row[cAmount]) : 0;
      var odo = cOdo >= 0 ? vehNum_(row[cOdo]) : 0;
      var maintType = String(cMaintType >= 0 ? row[cMaintType] : '').trim();
      var cost = cCost >= 0 ? vehNum_(row[cCost]) : 0;
      var detail = String(cDetail >= 0 ? row[cDetail] : '').trim();
      var shop = String(cShop >= 0 ? row[cShop] : '').trim();

      var isWash = /洗車/.test(typeRaw);
      var isFuel = /給油/.test(typeRaw) || (liters > 0 && !maintType && !detail && !isWash);
      var isMaint = isWash || /整備|修理|点検|車検|タイヤ|オイル/.test(typeRaw) || !!maintType || !!detail;

      if (isFuel && !seenF[ts]) {
        addRow_(FUEL_SHEET_NAME, { id: 'VF' + new Date(ts).getTime() + Math.floor(Math.random() * 100), formTs: ts, date: date, vehicle: vehicle, liters: liters, amount: amount, odometer: odo });
        seenF[ts] = 1; fuelN++;
      }
      if (isMaint && !seenM[ts]) {
        addRow_(MAINT_SHEET_NAME, { id: 'VM' + new Date(ts).getTime() + Math.floor(Math.random() * 100), formTs: ts, date: date, vehicle: vehicle, type: isWash ? '洗車' : (maintType || '整備'), detail: detail, cost: cost, shop: shop });
        seenM[ts] = 1; maintN++;
      }
    }
    return { ok: true, fuel: fuelN, maint: maintN, total: total };
  } catch (err) {
    return { ok: false, message: String(err && err.message || err) };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function setupVehicleFormTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'importVehicleForm') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('importVehicleForm').timeBased().everyMinutes(5).create();
  Logger.log('OK: 5分ごとに車両フォーム取込を実行します。');
  return 'OK: 5分ごとに車両フォーム取込を実行します。';
}

// ═══════════════════════════════════════════════════════════════════
//  Google サインイン認証 ＆ アカウント管理
//  ・ユーザー一覧はシート「ユーザー」（列: email / name / role / active / addedAt）
//  ・role: 'admin'（アカウント管理可）/ 'staff'（通常）
//  ・初回アクセス時、下の ADMIN_SEED を自動登録する
// ═══════════════════════════════════════════════════════════════════
var USER_SHEET = 'ユーザー';
// 最初の管理者（ここは常に管理者として扱う＝ロックアウト防止）
var ADMIN_SEED = ['clmiwa.hotline@gmail.com', 'satoshi.3104service@gmail.com', 'miwako.4044service@gmail.com'];

// Google の id_token を検証し、payload(email,name,picture等)を返す。不正なら null。
function verifyIdToken_(idToken) {
  if (!idToken) return null;
  try {
    var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return null;
    var p = JSON.parse(res.getContentText());
    if (!p || !p.email) return null;
    if (String(p.email_verified) !== 'true' && p.email_verified !== true) return null;
    // 期限切れチェック
    if (p.exp && (Number(p.exp) * 1000 < Date.now())) return null;
    return p;
  } catch (e) { return null; }
}

function userSheet_() {
  var ss = book_();
  var sh = ss.getSheetByName(USER_SHEET);
  if (!sh) {
    sh = ss.insertSheet(USER_SHEET);
    sh.appendRow(['email', 'name', 'role', 'active', 'addedAt']);
  }
  // 先頭管理者を自動登録（無ければ）
  var existing = readSheet_(USER_SHEET).map(function (u) { return String(u.email || '').toLowerCase(); });
  ADMIN_SEED.forEach(function (em) {
    if (existing.indexOf(em.toLowerCase()) < 0) {
      sh.appendRow([em, '管理者', 'admin', true, new Date().toISOString()]);
    }
  });
  return sh;
}

function findUser_(email) {
  if (!email) return null;
  var rows = readSheet_(USER_SHEET);
  var lc = String(email).toLowerCase();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].email || '').toLowerCase() === lc) return rows[i];
  }
  // シード管理者は常に許可
  if (ADMIN_SEED.map(function (e) { return e.toLowerCase(); }).indexOf(lc) >= 0) {
    return { email: email, name: '管理者', role: 'admin', active: true };
  }
  return null;
}

function isActive_(u) { return u && (u.active === true || String(u.active).toLowerCase() === 'true' || u.active === 1 || u.active === '1'); }

// ログイン：トークン検証→許可リスト照合→ユーザー情報を返す
function verifyLogin_(idToken) {
  userSheet_(); // シート・シード保証
  var payload = verifyIdToken_(idToken);
  if (!payload) return { ok: false, reason: 'invalid_token', message: 'トークンを確認できませんでした。もう一度サインインしてください。' };
  var u = findUser_(payload.email);
  if (!u) return { ok: false, reason: 'not_allowed', email: payload.email, message: 'このアカウントは許可されていません。' };
  if (!isActive_(u)) return { ok: false, reason: 'disabled', email: payload.email, message: 'このアカウントは現在無効です。' };
  return {
    ok: true,
    email: payload.email,
    name: u.name || payload.name || payload.email,
    picture: payload.picture || '',
    role: u.role || 'staff',
  };
}

// 管理者トークンを要求するヘルパ
function requireAdmin_(idToken) {
  var payload = verifyIdToken_(idToken);
  if (!payload) return { ok: false, message: 'サインインが必要です。' };
  var u = findUser_(payload.email);
  if (!u || !isActive_(u)) return { ok: false, message: 'アクセス権がありません。' };
  if (String(u.role) !== 'admin') return { ok: false, message: '管理者のみ操作できます。' };
  return { ok: true, payload: payload };
}

function listUsers_(idToken) {
  var chk = requireAdmin_(idToken);
  if (!chk.ok) return chk;
  userSheet_();
  return { ok: true, users: readSheet_(USER_SHEET) };
}

function addUser_(idToken, user) {
  var chk = requireAdmin_(idToken);
  if (!chk.ok) return chk;
  if (!user || !user.email) return { ok: false, message: 'メールアドレスが必要です。' };
  var sh = userSheet_();
  if (findUser_(user.email) && readSheet_(USER_SHEET).some(function (u) { return String(u.email).toLowerCase() === String(user.email).toLowerCase(); })) {
    return { ok: false, message: 'すでに登録済みのメールアドレスです。' };
  }
  sh.appendRow([
    String(user.email).trim(),
    user.name || '',
    user.role === 'admin' ? 'admin' : 'staff',
    true,
    new Date().toISOString(),
  ]);
  return { ok: true };
}

function updateUser_(idToken, email, patch) {
  var chk = requireAdmin_(idToken);
  if (!chk.ok) return chk;
  var sh = userSheet_();
  var values = sh.getDataRange().getValues();
  var head = values[0];
  var col = {}; head.forEach(function (h, i) { col[h] = i; });
  var lc = String(email).toLowerCase();
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][col['email']]).toLowerCase() === lc) {
      if (patch.hasOwnProperty('name'))   sh.getRange(r + 1, col['name'] + 1).setValue(patch.name);
      if (patch.hasOwnProperty('role'))   sh.getRange(r + 1, col['role'] + 1).setValue(patch.role === 'admin' ? 'admin' : 'staff');
      if (patch.hasOwnProperty('active')) sh.getRange(r + 1, col['active'] + 1).setValue(!!patch.active);
      return { ok: true };
    }
  }
  return { ok: false, message: '対象が見つかりません。' };
}

function removeUser_(idToken, email) {
  var chk = requireAdmin_(idToken);
  if (!chk.ok) return chk;
  // シード管理者は削除不可（ロックアウト防止）
  if (ADMIN_SEED.map(function (e) { return e.toLowerCase(); }).indexOf(String(email).toLowerCase()) >= 0) {
    return { ok: false, message: 'この管理者は削除できません。' };
  }
  var sh = userSheet_();
  var values = sh.getDataRange().getValues();
  var head = values[0];
  var emailCol = head.indexOf('email');
  var lc = String(email).toLowerCase();
  for (var r = values.length - 1; r >= 1; r--) {
    if (String(values[r][emailCol]).toLowerCase() === lc) { sh.deleteRow(r + 1); return { ok: true }; }
  }
  return { ok: false, message: '対象が見つかりません。' };
}

// ─── 応答ヘルパ（JSON / JSONP） ──────────────────────────────────────
function reply_(obj, callback) {
  var json = JSON.stringify(obj);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── スプレッドシート / シート取得 ──────────────────────────────────
function book_() {
  return SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
}

function getOrCreateSheet_(name) {
  var ss = book_();
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

// ─── 読み取り：行→オブジェクト配列 ─────────────────────────────────
function readSheet_(name) {
  var ss = book_();
  var sh = ss.getSheetByName(name);
  if (!sh) return [];                       // 無ければ空配列
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];         // 見出しのみ or 空
  var headers = values[0].map(function (h) { return String(h).trim(); });
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    if (r.every(function (c) { return c === '' || c === null; })) continue; // 空行スキップ
    var o = {};
    for (var c = 0; c < headers.length; c++) {
      if (!headers[c]) continue;
      o[headers[c]] = r[c];
    }
    rows.push(o);
  }
  return rows;
}

// ─── 見出し行を取得（無ければ作る）、必要なら列を増やす ───────────────
function ensureHeaders_(sh, keys) {
  var lastCol = sh.getLastColumn();
  var headers = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0]
                            .map(function (h) { return String(h).trim(); }) : [];
  var changed = false;
  // id, ts は先頭に確保
  ['id', 'ts'].forEach(function (k) {
    if (headers.indexOf(k) === -1) { headers.unshift(k); changed = true; }
  });
  keys.forEach(function (k) {
    if (k && headers.indexOf(k) === -1) { headers.push(k); changed = true; }
  });
  if (changed || lastCol === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return headers;
}

// ─── 値を「文字列のまま」保つため、書き込み範囲を text 書式に ──────────
function asTextRow_(headers, obj) {
  return headers.map(function (h) {
    var v = obj[h];
    if (v === undefined || v === null) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  });
}

// ─── 追加 ──────────────────────────────────────────────────────────
function addRow_(name, row) {
  var sh = getOrCreateSheet_(name);
  if (!row.id) row.id = String(Date.now()) + Math.floor(Math.random() * 1000);
  if (!row.ts) row.ts = new Date().toISOString();
  var headers = ensureHeaders_(sh, Object.keys(row));
  var rowIndex = sh.getLastRow() + 1;
  var range = sh.getRange(rowIndex, 1, 1, headers.length);
  range.setNumberFormat('@');               // 文字列固定（日付/数値の自動変換を防ぐ）
  range.setValues([asTextRow_(headers, row)]);
  return { ok: true, id: row.id, ts: row.ts };
}

// ─── 更新（id 一致行を上書き） ──────────────────────────────────────
function updateRow_(name, id, row) {
  if (id == null || id === '') throw new Error('update には id が必要です');
  var sh = getOrCreateSheet_(name);
  var info = findRow_(sh, id);
  if (!info) {
    // 無ければ追加扱い
    row.id = id;
    return addRow_(name, row);
  }
  var merged = {};
  // 既存値を残しつつ row で上書き
  info.headers.forEach(function (h, i) { merged[h] = info.values[i]; });
  Object.keys(row).forEach(function (k) { merged[k] = row[k]; });
  merged.id = id;
  var headers = ensureHeaders_(sh, Object.keys(merged));
  var range = sh.getRange(info.rowIndex, 1, 1, headers.length);
  range.setNumberFormat('@');
  range.setValues([asTextRow_(headers, merged)]);
  return { ok: true, id: id };
}

// ─── 削除 ──────────────────────────────────────────────────────────
function deleteRow_(name, id) {
  if (id == null || id === '') throw new Error('delete には id が必要です');
  var sh = getOrCreateSheet_(name);
  var info = findRow_(sh, id);
  if (!info) return { ok: true, deleted: 0 };
  sh.deleteRow(info.rowIndex);
  return { ok: true, deleted: 1 };
}

// ─── 全置換（一括取込用） ───────────────────────────────────────────
function replaceAll_(name, rows) {
  var sh = getOrCreateSheet_(name);
  // 全列キーを収集
  var keySet = {};
  rows.forEach(function (r) { Object.keys(r).forEach(function (k) { keySet[k] = 1; }); });
  sh.clear();
  var headers = ensureHeaders_(sh, Object.keys(keySet));
  if (rows.length) {
    var matrix = rows.map(function (r) {
      if (!r.id) r.id = String(Date.now()) + Math.floor(Math.random() * 100000);
      if (!r.ts) r.ts = new Date().toISOString();
      return asTextRow_(headers, r);
    });
    var range = sh.getRange(2, 1, matrix.length, headers.length);
    range.setNumberFormat('@');
    range.setValues(matrix);
  }
  return { ok: true, count: rows.length };
}

// ─── id で行を探す ─────────────────────────────────────────────────
function findRow_(sh, id) {
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return null;
  var headers = values[0].map(function (h) { return String(h).trim(); });
  var idCol = headers.indexOf('id');
  if (idCol === -1) return null;
  var target = String(id);
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === target) {
      return { rowIndex: i + 1, headers: headers, values: values[i] };
    }
  }
  return null;
}
