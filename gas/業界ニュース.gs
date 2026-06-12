/**
 * みわダッシュボード ─ 業界ニュース取得用 GAS Web App
 * =====================================================================
 * Bing ニュース RSS（直リンクが取れる）を主データ源、Google ニュース RSS を
 * 補助として、キーワード検索の結果をサーバー側で集約・重複除去して返します。
 *
 * ★ ポイント:
 *   - 返すリンクは必ず各メディアの「直 URL」（news.google.com / www.google.com は含めない）。
 *     → google.com ドメインがブロックされている環境でも記事を開けます。
 *   - Bing は <link> の url= パラメータから直 URL を確実に取得。
 *   - Google は ID デコード／変換 API で直 URL に解決し、解決できない記事は捨てます。
 *
 * ■ 返す JSON: [ { title, link(直URL), source(ドメイン), date(ms), keyword }, ... ]
 *
 * ■ クエリ（任意）
 *   ?q=クリーニング,洗濯   キーワード（カンマ/改行区切り、省略時 DEFAULT_KEYWORDS）
 *   &ex=ハウスクリーニング  除外キーワード（タイトル/媒体に含めば除外）
 *   &n=30                  最大件数（既定 30）
 *   &days=14               何日前まで（既定 14・Google のみ厳密適用）
 *   &debug=1               解決方法の内訳など診断情報を返す
 */

var DEFAULT_KEYWORDS = [
  'クリーニング', 'クリーニング業界', '洗濯', 'コインランドリー', 'アパレル トレンド'
];

// =====================================================================
//  ★ 高速化のしくみ（重要）
//   ① 作り置き: setupNewsTrigger を1度実行すると 2時間ごとに refreshNews が
//      裏でニュースを収集し、結果をキャッシュに保存。ユーザーが開いたときは
//      その「保存済み」を返すだけなので即時表示。
//   ② リンク解決は「実際に返す件数ぶん」だけに限定（従来は最大70件→大幅減）。
//   ③ Bing/Google の RSS 取得を fetchAll で並列化。
//   ※ コード貼り替え後は必ず再デプロイ＋ setupNewsTrigger を1回実行。
// =====================================================================
function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    var hasCustomKw = !!(p.q || p.keywords);
    var keywords = hasCustomKw
      ? (p.q || p.keywords).split(/[\n,]+/).map(trim_).filter(String)
      : DEFAULT_KEYWORDS;
    var excludes = (p.ex || p.exclude || '')
      ? (p.ex || p.exclude).split(/[\n,]+/).map(function (s) { return trim_(s).toLowerCase(); }).filter(String)
      : [];
    var limit = parseInt(p.n, 10) || 30;
    var days  = parseInt(p.days, 10) || 14;
    var debug = p.debug === '1';

    var isDefault = !excludes.length && limit === 30 && days === 14 &&
      keywords.length === DEFAULT_KEYWORDS.length &&
      keywords.every(function (k, i) { return k === DEFAULT_KEYWORDS[i]; });
    var key = cacheKeyForQuery_(keywords, excludes, limit, days);
    var cache = CacheService.getScriptCache();

    // ① キャッシュ（作り置き）を最優先で返す → 体感は即時
    if (!debug) {
      var hit = cache.get(key);
      if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);
      if (isDefault) {
        var persisted = loadDefaultCache_();
        if (persisted) {
          try { cache.put(key, persisted, 21600); } catch (e2) {}
          return ContentService.createTextOutput(persisted).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    // キャッシュが無い時だけ、その場で収集（②必要数だけ解決＋③並列取得）
    var diag = {};
    var out = buildNews_(keywords, excludes, limit, days, diag);
    var jsonStr = JSON.stringify(out);
    try { cache.put(key, jsonStr, 21600); } catch (e3) {}   // 6時間キャッシュ
    if (isDefault) saveDefaultCache_(jsonStr);

    if (debug) {
      return json({
        keywords: keywords, excludes: excludes,
        bingRaw: diag.bingRaw, googleRaw: diag.googleRaw,
        collected: diag.collected, returned: out.length, cached: false,
        sample: out.slice(0, 8).map(function (x) {
          return { src: x._src, source: x.source, link: x.link, title: x.title.slice(0, 40) };
        })
      });
    }
    return json(out);
  } catch (fatal) {
    return json({ error: true, message: String(fatal) });
  }
}

// ── ニュース収集本体（doGet / 定期更新の両方から呼ぶ）────────────────
function buildNews_(keywords, excludes, limit, days, diagOut) {
  // ③ RSS をまとめて並列取得（Bing＝直リンク主, Google＝補助）
  var reqs = [];
  keywords.forEach(function (kw) {
    reqs.push({ type: 'bing',   kw: kw, url: bingUrl_(kw) });
    reqs.push({ type: 'google', kw: kw, url: googleUrl_(kw, days) });
  });
  var httpReqs = reqs.map(function (r) {
    return { url: r.url, muteHttpExceptions: true, followRedirects: true,
             headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } };
  });
  var resps = [];
  try { resps = UrlFetchApp.fetchAll(httpReqs); } catch (e) { resps = []; }

  var all = [];
  for (var i = 0; i < reqs.length; i++) {
    var resp = resps[i]; if (!resp) continue;
    try {
      if (reqs[i].type === 'bing') parseBing_(resp, reqs[i].kw, all);
      else parseGoogle_(resp, reqs[i].kw, all);
    } catch (e) {}
  }

  if (diagOut) {
    diagOut.bingRaw = all.filter(function (x) { return x._src === 'bing'; }).length;
    diagOut.googleRaw = all.filter(function (x) { return x._src === 'google'; }).length;
  }

  // 除外
  if (excludes.length) {
    all = all.filter(function (it) {
      var hay = (it.title + ' ' + (it.source || '')).toLowerCase();
      for (var x = 0; x < excludes.length; x++) if (hay.indexOf(excludes[x]) !== -1) return false;
      return true;
    });
  }
  if (diagOut) diagOut.collected = all.length;

  // 新しい順 → タイトル正規化で重複除去
  // ② 解決対象を絞るため、プールは「返す件数＋少しの予備」だけにする
  all.sort(function (a, b) { return b.date - a.date; });
  var seen = {}, out = [];
  var pool = limit + 12;
  for (var j = 0; j < all.length; j++) {
    var key = all[j].title.toLowerCase().replace(/[\s\u3000・,、。!?！？\-–—|｜「」『』【】]/g, '');
    if (!key || seen[key]) continue;
    seen[key] = true;
    out.push(all[j]);
    if (out.length >= pool) break;
  }

  // ② Google 由来の未解決リンクのみ直 URL に解決（件数が少ないので速い）
  resolveLinks_(out);

  // 開けない/記事でないリンクを除外 → 件数で切る
  out = out.filter(function (it) { return isArticleUrl_(it.link); }).slice(0, limit);
  out.forEach(function (it) { if (!it.source) it.source = hostOf_(it.link); });
  return out;
}

// ── キャッシュ鍵・永続化（標準キーワードぶんは Properties にも保存）──────
function cacheKeyForQuery_(keywords, excludes, limit, days) {
  var s = 'news|' + keywords.join(',') + '|' + excludes.join(',') + '|' + limit + '|' + days;
  var d = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, s);
  return 'news_' + d.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}
function saveDefaultCache_(jsonStr) {
  // Properties は1値9KB上限。収まる時だけ保存（キャッシュ失効時の即時表示用）
  try { if (jsonStr && jsonStr.length < 9000) PropertiesService.getScriptProperties().setProperty('news_default', jsonStr); } catch (e) {}
}
function loadDefaultCache_() {
  try { return PropertiesService.getScriptProperties().getProperty('news_default'); } catch (e) { return null; }
}

// ── 定期更新（2時間ごと）──────────────────────────────────────────
//  setupNewsTrigger を【1度だけ】▶実行 → 以後2時間ごとに refreshNews を実行。
function refreshNews() {
  var out = buildNews_(DEFAULT_KEYWORDS, [], 30, 14, null);
  var jsonStr = JSON.stringify(out);
  try { CacheService.getScriptCache().put(cacheKeyForQuery_(DEFAULT_KEYWORDS, [], 30, 14), jsonStr, 21600); } catch (e) {}
  saveDefaultCache_(jsonStr);
  return out.length + ' 件をキャッシュしました';
}
function setupNewsTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'refreshNews') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('refreshNews').timeBased().everyHours(2).create();
  var msg = refreshNews(); // 今すぐ1回作り置き
  Logger.log('OK: 2時間ごとにニュースを更新します。今: ' + msg);
  return 'OK: 2時間ごとにニュースを更新します。今: ' + msg;
}

// ── Bing ニュース RSS（直リンクが取れる主データ源） ──────────────
function bingUrl_(kw) {
  return 'https://www.bing.com/news/search?q=' + encodeURIComponent(kw)
    + '&format=RSS&setlang=ja&cc=JP&mkt=ja-JP';
}
function parseBing_(resp, kw, out) {
  try {
    if (resp.getResponseCode() !== 200) return;
    var channel = XmlService.parse(resp.getContentText()).getRootElement().getChild('channel');
    if (!channel) return;
    channel.getChildren('item').forEach(function (it) {
      var title = trim_(it.getChildText('title') || '');
      var rawLink = it.getChildText('link') || '';
      var link = extractBingUrl_(rawLink);
      var pub = it.getChildText('pubDate') || '';
      if (!title || !link || link.indexOf('bing.com') !== -1) return;
      out.push({
        title: title, link: link, source: hostOf_(link),
        date: pub ? new Date(pub).getTime() : Date.now(), keyword: kw, _src: 'bing'
      });
    });
  } catch (err) {}
}

// Bing のクリック計測リンクから本来の URL を取り出す
function extractBingUrl_(link) {
  var m = link.match(/[?&]url=([^&]+)/);
  if (m) { try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; } }
  return link;
}

// ── Google ニュース RSS（補助・後でリンク解決） ─────────────────
function googleUrl_(kw, days) {
  return 'https://news.google.com/rss/search?q='
    + encodeURIComponent(kw + ' when:' + days + 'd') + '&hl=ja&gl=JP&ceid=JP:ja';
}
function parseGoogle_(resp, kw, out) {
  try {
    if (resp.getResponseCode() !== 200) return;
    var channel = XmlService.parse(resp.getContentText()).getRootElement().getChild('channel');
    if (!channel) return;
    channel.getChildren('item').forEach(function (it) {
      var raw = it.getChildText('title') || '';
      var link = it.getChildText('link') || '';
      var pub = it.getChildText('pubDate') || '';
      var srcEl = it.getChild('source');
      var source = srcEl ? srcEl.getText() : '';
      var title = raw;
      if (source && raw.length >= source.length + 3
          && raw.substring(raw.length - source.length - 3) === ' - ' + source) {
        title = raw.substring(0, raw.length - source.length - 3);
      } else if (!source && raw.indexOf(' - ') !== -1) {
        var i = raw.lastIndexOf(' - '); source = raw.substring(i + 3); title = raw.substring(0, i);
      }
      if (!title || !link) return;
      out.push({
        title: trim_(title), link: link.trim(), source: trim_(source),
        date: pub ? new Date(pub).getTime() : 0, keyword: kw, _g: true, _src: 'google'
      });
    });
  } catch (err) {}
}

// ── Google ニュースのリダイレクト URL を直 URL に解決 ────────────
function resolveLinks_(items) {
  var cache = CacheService.getScriptCache();
  var BATCH = 'https://news.google.com/_/DotsSplashUi/data/batchexecute';

  var pending = [];
  items.forEach(function (item) {
    if (item.link.indexOf('news.google.com') === -1) return; // 既に直URL
    var id = articleId_(item.link);
    if (!id) return;
    var ck = cacheKey_(id);
    var cached = cache.get(ck);
    if (cached) { item.link = cached; item.source = hostOf_(cached); return; }
    var direct = decodeFromId_(id);  // 通信不要
    if (direct) { item.link = direct; item.source = hostOf_(direct); cache.put(ck, direct, 21600); return; }
    pending.push({ item: item, id: id });
  });
  if (!pending.length) return;

  // 記事ページから署名を取り、変換 API で解決
  var pageReqs = pending.map(function (p) {
    return { url: 'https://news.google.com/rss/articles/' + p.id,
             muteHttpExceptions: true, followRedirects: true,
             headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } };
  });
  var pageResps; try { pageResps = UrlFetchApp.fetchAll(pageReqs); } catch (e) { return; }

  var step2 = [];
  for (var i = 0; i < pending.length; i++) {
    try {
      var html = pageResps[i].getContentText();
      var sg = (html.match(/data-n-a-sg="([^"]+)"/) || [])[1];
      var ts = (html.match(/data-n-a-ts="([^"]+)"/) || [])[1];
      var aid = (html.match(/data-n-a-id="([^"]+)"/) || [])[1] || pending[i].id;
      if (!sg || !ts) continue;
      var inner = JSON.stringify(['garturlreq',
        [['X','X',['X','X'],null,null,1,1,'US:en',null,1,null,null,null,null,null,0,1],
         'X','X',1,[1,1,1],1,1,null,0,0,null,0], aid, ts, sg]);
      var freq = JSON.stringify([[['Fbv4je', inner, null, 'generic']]]);
      step2.push({ item: pending[i].item, id: pending[i].id, payload: 'f.req=' + encodeURIComponent(freq) });
    } catch (e) {}
  }
  if (!step2.length) return;

  var postReqs = step2.map(function (s) {
    return { url: BATCH, method: 'post',
             contentType: 'application/x-www-form-urlencoded;charset=UTF-8',
             payload: s.payload, muteHttpExceptions: true,
             headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } };
  });
  var postResps; try { postResps = UrlFetchApp.fetchAll(postReqs); } catch (e) { return; }

  for (var k = 0; k < step2.length; k++) {
    try {
      var text = postResps[k].getContentText();
      var marker = text.indexOf('garturlres');
      if (marker === -1) continue;
      var chunk = text.substring(marker, marker + 4000)
        .replace(/\\\//g, '/').replace(/\\u003d/g, '=').replace(/\\u0026/g, '&');
      var m = chunk.match(/https?:\/\/[^\s"\\]+/);
      if (m && isArticleUrl_(m[0])) {
        step2[k].item.link = m[0]; step2[k].item.source = hostOf_(m[0]);
        cache.put(cacheKey_(step2[k].id), m[0], 21600);
      }
    } catch (e) {}
  }
}

// ── ユーティリティ ──────────────────────────────────────────────
function articleId_(link) { var m = link.match(/\/(?:articles|read)\/([^?\/]+)/); return m ? m[1] : null; }

function decodeFromId_(id) {
  try {
    var b64 = id.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    var str = Utilities.newBlob(Utilities.base64Decode(b64)).getDataAsString('UTF-8');
    var m = str.match(/https?:\/\/[^\s\u0000-\u001f"'<>\\]+/);
    if (!m) return null;
    var url = m[0].replace(/[\u0080-\u00ff]+$/, '');
    if (!isArticleUrl_(url)) return null;
    return url;
  } catch (e) { return null; }
}

function cacheKey_(id) {
  var d = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, id);
  return 'gnu_' + d.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

function hostOf_(url) { var m = url.match(/^https?:\/\/([^\/]+)/); return m ? m[1].replace(/^www\./, '') : ''; }

// 開ける記事直 URL かどうか（google系・画像のみ除外）
function isArticleUrl_(u) {
  if (!u || !/^https?:\/\//.test(u)) return false;
  var h = hostOf_(u).toLowerCase();
  if (!h || h.indexOf('.') === -1) return false;
  // google 系ドメインは開けない/画像なので除外
  if (/(^|\.)google\.com$|(^|\.)google\.co|googleusercontent|gstatic|ggpht/.test(h)) return false;
  if (h === 'bing.com' || h.indexOf('.bing.com') !== -1) return false;
  // 画像ファイルは除外
  if (/\.(png|jpe?g|gif|webp|svg|ico|bmp)(\?|$)/i.test(u)) return false;
  return true;
}
function trim_(s) { return (s || '').replace(/^\s+|\s+$/g, ''); }
function json(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
