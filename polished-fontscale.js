/* ============================================================
   みわダッシュボード ─ 共通ヘッダー（全ページ共通・PC）
   ------------------------------------------------------------
   ページ最上部に置くグリーンの固定ヘッダーバー。
     ・左 … ページ名＋サブ（ファイル名から自動）
     ・右 … 文字サイズ（丸ボタン→小ポップアップ 標準/大/特大）
            アカウント（丸ボタン→メニュー）
   各ページは </body> 直前で
     <script src="polished-fontscale.js"></script>
   を1行読み込むだけ。設定は localStorage に保存し全ページで維持。
   ============================================================ */
(function () {
  var KEY = "miwa.fontscale.v1";
  var HEADER_H = 60; // px（全ページ共通の高さ）
  var LEVELS = [
    { id: "s",  label: "標準", z: 1 },
    { id: "l",  label: "大",   z: 1.15 },
    { id: "xl", label: "特大", z: 1.30 }
  ];

  // ── ページ名・サブ（ファイル名→表示）──
  var PAGE_INFO = {
    "index.html":            { title: "みわダッシュボード", sub: "クリーニングみわ 管理ダッシュボード" },
    "売上レポート.html":      { title: "売上レポート", sub: "店舗別・昨対比" },
    "クレーム・事故品.html":  { title: "クレーム・事故品", sub: "入力・確認" },
    "シミ抜き報告.html":      { title: "シミ抜き報告", sub: "処理・除去率" },
    "工場報告.html":          { title: "工場報告", sub: "生産性・工数" },
    "フィードバック.html":    { title: "フィードバック", sub: "改善・原因" },
    "車両管理.html":          { title: "車両管理", sub: "期限・給油・整備" },
    "請求書管理.html":        { title: "請求書管理", sub: "入金待ち・PDF" },
    "AIレポート.html":        { title: "AIレポート", sub: "自動分析・出力" },
    "共有ボード.html":        { title: "共有ボード", sub: "投稿・添付" },
    "お知らせ.html":          { title: "お知らせ", sub: "社内連絡・通知" },
    "業界ニュース.html":      { title: "業界ニュース", sub: "クリーニング業界の最新" },
    "アカウント管理.html":    { title: "アカウント管理", sub: "利用者・権限" },
    "ありがとうカード.html":  { title: "ありがとうカード", sub: "閲覧・コメント" },
    "更新レポート.html":      { title: "更新レポート", sub: "変更履歴" },
    "シフト.html":            { title: "シフト", sub: "月間シフト表" },
    "シフト_公開用.html":     { title: "シフト", sub: "月間シフト表" },
    "機能説明書.html":        { title: "機能説明書", sub: "使い方ガイド" },
    "機能説明書_編集用.html": { title: "機能説明書", sub: "使い方ガイド" },
    "サインイン設定手順.html": { title: "サインイン設定手順", sub: "初回ログイン" }
  };
  function pageInfo() {
    var file = "";
    try { file = decodeURIComponent((location.pathname || "").split("/").pop() || ""); } catch (e) { file = ""; }
    if (PAGE_INFO[file]) return PAGE_INFO[file];
    // フォールバック：<title> を区切りで分解
    var t = (document.title || "").split(/\s*[・｜|]\s*/)[0].trim();
    return { title: t || "みわダッシュボード", sub: "" };
  }
  function curFile() {
    try { return decodeURIComponent((location.pathname || "").split("/").pop() || ""); } catch (e) { return ""; }
  }
  function isHome() {
    var f = curFile();
    return f === "" || f === "index.html";
  }

  function getLevel() {
    try { var v = localStorage.getItem(KEY); return v && LEVELS.some(function (l) { return l.id === v; }) ? v : "s"; }
    catch (e) { return "s"; }
  }
  function zoomFor(id) { for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) return LEVELS[i].z; return 1; }
  function apply(id) {
    var z = zoomFor(id);
    try { document.body.style.zoom = (z === 1 ? "" : String(z)); } catch (e) {}
  }
  // 早期適用（チラつき防止）
  if (document.body) apply(getLevel());
  else document.addEventListener("DOMContentLoaded", function () { apply(getLevel()); });

  // ── 認証ユーザー ──
  function getUser() { try { return (window.MiwaAuth && window.MiwaAuth.user && window.MiwaAuth.user()) || null; } catch (e) { return null; } }
  function isAdmin() { try { return !!(window.MiwaAuth && window.MiwaAuth.isAdmin && window.MiwaAuth.isAdmin()); } catch (e) { return false; } }
  function logout() { try { if (window.MiwaAuth && window.MiwaAuth.logout) window.MiwaAuth.logout(); } catch (e) {} }
  var EU = function (s) { try { return encodeURIComponent(s); } catch (e) { return s; } };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // スマホ判定（device.js / フッターと同条件）→ 戻る先・ダッシュボードリンクをモバイルアプリへ
  function isPhone() {
    try {
      var ua = navigator.userAgent || "";
      var phoneUA = /Android.+Mobile|iPhone|iPod|webOS|BlackBerry|IEMobile|Opera Mini|Mobile.+Firefox/i.test(ua);
      var narrowTouch = window.matchMedia("(max-width: 760px)").matches && (navigator.maxTouchPoints || 0) > 1;
      return phoneUA || narrowTouch;
    } catch (e) { return false; }
  }
  function homeHref() { return isPhone() ? (EU("モバイル.html") + "?view=mobile") : "index.html"; }

  function injectStyle() {
    if (document.getElementById("miwa-header-style")) return;
    // スマホ最上部のステータスバーをヘッダーと同じ緑に揃える（白バー/バーなしの不統一を解消）
    try {
      var tc = document.querySelector('meta[name="theme-color"]');
      if (!tc) { tc = document.createElement("meta"); tc.setAttribute("name", "theme-color"); document.head.appendChild(tc); }
      tc.setAttribute("content", "#0a7d4a");
    } catch (e) {}
    var style = document.createElement("style");
    style.id = "miwa-header-style";
    style.textContent =
      ":root{--mh-h:" + HEADER_H + "px;}" +
      // 固定バー（フル幅・グリーングラデ）
      "#miwa-header{position:fixed;top:0;left:0;right:0;z-index:8000;height:var(--mh-h);" +
      "background:linear-gradient(115deg,#0a7d4a 0%,#15a05a 50%,#34b36c 100%);" +
      "box-shadow:0 2px 14px rgba(11,90,60,.28);" +
      "font-family:'Plus Jakarta Sans','Zen Kaku Gothic New',-apple-system,sans-serif;}" +
      "#miwa-header .mh-inner{max-width:1480px;height:100%;margin:0 auto;padding:0 28px;display:flex;align-items:center;gap:12px;}" +
      // 戻るボタン（左端）
      "#miwa-header .mh-back{width:38px;height:38px;flex-shrink:0;border-radius:50%;display:flex;align-items:center;justify-content:center;" +
      "color:#fff;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.34);text-decoration:none;cursor:pointer;padding:0;" +
      "transition:background .14s,transform .12s;}" +
      "#miwa-header .mh-back:hover{background:rgba(255,255,255,.28);}" +
      "#miwa-header .mh-back:active{transform:scale(.94);}" +
      "#miwa-header .mh-back svg{width:20px;height:20px;}" +
      // タイトル
      "#miwa-header .mh-titles{min-width:0;display:flex;flex-direction:column;justify-content:center;}" +
      "#miwa-header .mh-title{font-size:19px;font-weight:800;color:#fff;letter-spacing:-0.01em;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
      "#miwa-header .mh-sub{font-size:11.5px;font-weight:600;color:rgba(255,255,255,.86);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
      "#miwa-header .mh-spacer{flex:1;}" +
      // 丸ボタン（白半透明）
      "#miwa-header .mh-btn{position:relative;width:40px;height:40px;flex-shrink:0;border-radius:50%;cursor:pointer;" +
      "display:flex;align-items:center;justify-content:center;padding:0;color:#fff;" +
      "background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.34);transition:background .14s,transform .12s;}" +
      "#miwa-header .mh-btn:hover{background:rgba(255,255,255,.28);}" +
      "#miwa-header .mh-btn:active{transform:scale(.94);}" +
      "#miwa-header .mh-btn svg{width:19px;height:19px;}" +
      "#miwa-header .mh-btn img{width:100%;height:100%;border-radius:50%;object-fit:cover;}" +
      "#miwa-header .mh-acct,#miwa-header .mh-fs{position:relative;}" +
      // ポップアップ共通
      "#miwa-header .mh-pop{position:absolute;top:48px;right:0;background:var(--card,#fff);border:1px solid var(--line,#eceaf5);" +
      "border-radius:16px;box-shadow:0 16px 44px rgba(20,19,46,.22);padding:6px;display:none;}" +
      "#miwa-header .open .mh-pop{display:block;}" +
      // 文字サイズポップアップ
      "#miwa-header .mh-fs .mh-pop{width:168px;}" +
      "#miwa-header .mh-fs-head{font-size:10.5px;font-weight:800;color:var(--ink-mute,#8a8db0);padding:7px 10px 5px;letter-spacing:.02em;}" +
      "#miwa-header .mh-fs-opt{display:flex;align-items:center;gap:9px;width:100%;border:0;background:transparent;cursor:pointer;font-family:inherit;" +
      "color:var(--ink-soft,#4d4f73);font-weight:700;text-align:left;padding:9px 10px;border-radius:10px;transition:background .12s;}" +
      "#miwa-header .mh-fs-opt:hover{background:var(--bg-2,#eef0f3);}" +
      "#miwa-header .mh-fs-opt.on{background:#e7f6ee;color:#0b7a45;}" +
      "#miwa-header .mh-fs-opt .lab{flex:1;}" +
      "#miwa-header .mh-fs-opt.s .lab{font-size:13px;} #miwa-header .mh-fs-opt.l .lab{font-size:15px;} #miwa-header .mh-fs-opt.xl .lab{font-size:17.5px;}" +
      "#miwa-header .mh-fs-opt .ck{width:15px;height:15px;flex-shrink:0;opacity:0;color:#0b7a45;}" +
      "#miwa-header .mh-fs-opt.on .ck{opacity:1;}" +
      // アカウントメニュー
      "#miwa-header .mh-acct .mh-pop{width:250px;}" +
      "#miwa-header .mh-id{display:flex;align-items:center;gap:11px;padding:11px 12px 12px;}" +
      "#miwa-header .mh-id-av{width:42px;height:42px;flex-shrink:0;border-radius:999px;overflow:hidden;background:#e7f6ee;color:#0b7a45;" +
      "display:flex;align-items:center;justify-content:center;font-weight:800;font-size:17px;}" +
      "#miwa-header .mh-id-av img{width:100%;height:100%;object-fit:cover;display:block;}" +
      "#miwa-header .mh-id-meta{min-width:0;flex:1;}" +
      "#miwa-header .mh-id-name{font-size:13.5px;font-weight:800;color:var(--ink,#14132e);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:6px;}" +
      "#miwa-header .mh-role{font-size:9.5px;font-weight:800;color:#fff;background:#1e9e52;border-radius:999px;padding:2px 7px;flex-shrink:0;}" +
      "#miwa-header .mh-id-mail{font-size:11px;color:var(--ink-mute,#8a8db0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;}" +
      "#miwa-header .mh-sep{height:1px;background:var(--line,#eceaf5);margin:4px 6px;}" +
      "#miwa-header .mh-link{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:0;background:transparent;cursor:pointer;" +
      "font-family:inherit;font-size:13px;font-weight:700;color:var(--ink-soft,#4d4f73);padding:9px 12px;border-radius:10px;text-decoration:none;transition:background .12s;}" +
      "#miwa-header .mh-link:hover{background:var(--bg-2,#eef0f3);}" +
      "#miwa-header .mh-link svg{width:16px;height:16px;flex-shrink:0;color:var(--ink-mute,#8a8db0);}" +
      "#miwa-header .mh-link.danger{color:#c5221f;} #miwa-header .mh-link.danger svg{color:#c5221f;}" +
      // 本文をバーの下へ
      "body{padding-top:var(--mh-h)!important;}" +
      ".app{min-height:calc(100vh - var(--mh-h))!important;}" +
      ".app{padding-top:16px!important;}" +
      // ページ内の旧「戻る」リンクは共通ヘッダーに統一したため非表示
      "a.back,a.cl-back{display:none!important;}" +
      // 旧：浮動ヘッダー用の余白指定は不要
      "@media (max-width:560px){#miwa-header .mh-inner{padding:0 14px;gap:8px;}#miwa-header .mh-title{font-size:17px;}}" +
      "@media print{#miwa-header{display:none!important;}body{padding-top:0!important;}}";
    document.head.appendChild(style);
  }

  function fsIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17 7 7l4 10"/><path d="M4.2 13.5h5.6"/><path d="M14 17l3-7 3 7"/><path d="M14.9 14.4h4.2"/></svg>';
  }
  function ckIcon() {
    return '<svg class="ck" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  }

  function build() {
    if (document.getElementById("miwa-header")) return;
    injectStyle();

    var info = pageInfo();
    var user = getUser();
    var admin = isAdmin();
    var cur = getLevel();

    var header = document.createElement("div");
    header.id = "miwa-header";

    var titlesHtml =
      '<div class="mh-titles"><div class="mh-title">' + esc(info.title) + '</div>' +
      (info.sub ? '<div class="mh-sub">' + esc(info.sub) + '</div>' : '') + '</div>';

    // 戻るボタン（ホーム以外の全ページ）— スマホではモバイルアプリへ
    var backHtml = isHome() ? '' :
      '<a class="mh-back" href="' + homeHref() + '" aria-label="ダッシュボードへ戻る" title="ダッシュボードへ戻る">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></a>';

    // 文字サイズ ポップアップ
    var fsOptsHtml = LEVELS.map(function (l) {
      return '<button type="button" class="mh-fs-opt ' + l.id + (l.id === cur ? ' on' : '') +
        '" data-lv="' + l.id + '"><span class="lab">' + l.label + '</span>' + ckIcon() + '</button>';
    }).join("");
    var fsHtml =
      '<div class="mh-fs">' +
      '<button type="button" class="mh-btn" id="mh-fs-btn" aria-label="文字サイズ" aria-haspopup="true" aria-expanded="false">' + fsIcon() + '</button>' +
      '<div class="mh-pop" role="menu"><div class="mh-fs-head">文字サイズ</div>' + fsOptsHtml + '</div></div>';

    // アカウント（ボタンは常に人マークで統一）
    var initial = (user && (user.name || user.email) ? (user.name || user.email).slice(0, 1) : "");
    var personSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6"/></svg>';
    var avHtml = personSvg;
    var menuRows = "";
    if (user) {
      var idAv = user.picture ? '<img src="' + esc(user.picture) + '" alt="" referrerpolicy="no-referrer">' : esc(initial || "?");
      menuRows +=
        '<div class="mh-id"><div class="mh-id-av">' + idAv + '</div>' +
        '<div class="mh-id-meta"><div class="mh-id-name">' + esc(user.name || user.email || "ユーザー") +
        (admin ? '<span class="mh-role">管理者</span>' : '') + '</div>' +
        '<div class="mh-id-mail">' + esc(user.email || "") + '</div></div></div><div class="mh-sep"></div>';
    }
    menuRows += '<a class="mh-link" href="' + homeHref() + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5 12 3l9 6.5"/><path d="M5 10v10h14V10"/></svg>ダッシュボード</a>';
    menuRows += '<a class="mh-link" href="' + EU("機能説明書.html") + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>機能説明書</a>';
    if (admin) menuRows += '<a class="mh-link" href="' + EU("アカウント管理.html") + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/></svg>アカウント管理</a>';
    if (user) menuRows += '<div class="mh-sep"></div><button type="button" class="mh-link danger" id="mh-logout"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>ログアウト</button>';
    var acctHtml =
      '<div class="mh-acct">' +
      '<button type="button" class="mh-btn" id="mh-acct-btn" aria-label="アカウント" aria-haspopup="true" aria-expanded="false">' + avHtml + '</button>' +
      '<div class="mh-pop" role="menu">' + menuRows + '</div></div>';

    header.innerHTML = '<div class="mh-inner">' + backHtml + titlesHtml + '<div class="mh-spacer"></div>' + fsHtml + acctHtml + '</div>';
    document.body.insertBefore(header, document.body.firstChild);

    // ── 文字サイズ ──
    var fsWrap = header.querySelector(".mh-fs");
    var fsBtn = header.querySelector("#mh-fs-btn");
    fsBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      closeAll(); var open = fsWrap.classList.toggle("open"); fsBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    header.querySelectorAll(".mh-fs-opt").forEach(function (b) {
      b.addEventListener("click", function () {
        var lv = b.getAttribute("data-lv");
        try { localStorage.setItem(KEY, lv); } catch (e) {}
        apply(lv);
        header.querySelectorAll(".mh-fs-opt").forEach(function (x) { x.classList.toggle("on", x === b); });
      });
    });

    // ── アカウント ──
    var acctWrap = header.querySelector(".mh-acct");
    var acctBtn = header.querySelector("#mh-acct-btn");
    acctBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      closeAll(); var open = acctWrap.classList.toggle("open"); acctBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    var lo = header.querySelector("#mh-logout");
    if (lo) lo.addEventListener("click", function () { logout(); });

    function closeAll() {
      fsWrap.classList.remove("open"); acctWrap.classList.remove("open");
      fsBtn.setAttribute("aria-expanded", "false"); acctBtn.setAttribute("aria-expanded", "false");
    }
    document.addEventListener("click", function (e) { if (!header.contains(e.target)) closeAll(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAll(); });

    apply(getLevel());
  }

  if (document.body) build();
  else document.addEventListener("DOMContentLoaded", build);

  // 認証がページ読込後に確定したらアバターを更新
  var tries = 0;
  var poll = setInterval(function () {
    tries++;
    var u = getUser();
    var existing = document.getElementById("miwa-header");
    if (u && existing && !existing.getAttribute("data-user")) {
      existing.setAttribute("data-user", "1");
      existing.remove();
      build();
      clearInterval(poll);
    }
    if (tries > 40) clearInterval(poll);
  }, 500);
})();
