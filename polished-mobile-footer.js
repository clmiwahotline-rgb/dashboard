// みわダッシュボード ─ スマホ用ヘッダー＋フッタータブバー（PC版ページに注入）
// =====================================================================
//  スマホでPC版ページを開いたとき、モバイルアプリと同一デザインの
//  グリーンヘッダー＋下部タブ（ホーム/業務メニュー/シフト/お知らせ）を表示。
//
//  ① PWA メタタグ注入 → ホーム画面アプリでスタンドアロンが維持される
//  ② グリーンヘッダー注入 → モバイル.html SPA と同一デザインに統一
//  ③ 下部タブバー注入 → 全ページ共通フッター
//
//  - スマホ端末のみ表示（PC/タブレットでは何もしない）
//  - モバイル.html 自身（独自ヘッダー/タブバーあり）では動かさない
// =====================================================================
(function () {
  /* ─── 端末判定 ─────────────────────────────────────── */
  function isPhone() {
    try {
      var ua = navigator.userAgent || "";
      var phoneUA = /Android.+Mobile|iPhone|iPod|webOS|BlackBerry|IEMobile|Opera Mini|Mobile.+Firefox/i.test(ua);
      var narrowTouch = window.matchMedia("(max-width: 760px)").matches && (navigator.maxTouchPoints || 0) > 1;
      return phoneUA || narrowTouch;
    } catch (e) { return false; }
  }

  var here = "";
  try { here = decodeURIComponent((location.pathname.split("/").pop() || "")); } catch (e) {}
  if (here === "モバイル.html") return;   // モバイルアプリ本体はスキップ
  if (!isPhone()) return;                 // スマホ以外は表示しない

  /* ─── ① PWA メタタグを動的注入 ──────────────────────
     ホーム画面から追加したアプリでページ遷移してもスタンドアロンモードが
     維持されるよう、全 PC ページにも apple-mobile-web-app-capable を付与。  */
  (function injectPwaMeta() {
    var head = document.head || document.getElementsByTagName("head")[0];
    if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
      var m = document.createElement("meta");
      m.name = "apple-mobile-web-app-capable";
      m.content = "yes";
      head.insertBefore(m, head.firstChild);
    }
    if (!document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')) {
      var s = document.createElement("meta");
      s.name = "apple-mobile-web-app-status-bar-style";
      s.content = "black-translucent";
      head.insertBefore(s, head.firstChild);
    }
    if (!document.querySelector('meta[name="apple-mobile-web-app-title"]')) {
      var t = document.createElement("meta");
      t.name = "apple-mobile-web-app-title";
      t.content = "みわ";
      head.insertBefore(t, head.firstChild);
    }
  })();

  /* ─── スマホ時 PC サイドバー類を隠す ────────────────── */
  try { document.documentElement.classList.add("mf-phone"); } catch (e) {}

  /* ─── アクティブタブ ─────────────────────────────────── */
  function activeTab() {
    if (here === "index.html" || here === "") return "home";
    if (here === "シフト.html")                return "shift";
    if (here === "お知らせ.html" || here === "業界ニュース.html") return "news";
    return "menu";
  }

  /* ─── ページ別タイトル・サブタイトル ──────────────────── */
  var PAGE_META = {
    "index.html":          { title: "ダッシュボード",    sub: "全店舗・工場・スタッフ" },
    "売上レポート.html":    { title: "売上レポート",      sub: "店舗別・昨対比" },
    "シフト.html":          { title: "シフト",            sub: "月間シフト表" },
    "共有ボード.html":      { title: "共有ボード",        sub: "投稿・添付" },
    "料金表.html":          { title: "料金表",            sub: "クリーニング・加工・物販" },
    "FAQ管理.html":         { title: "FAQ管理",           sub: "知識・回答編集" },
    "シミ抜き報告.html":    { title: "シミ抜き報告",      sub: "処理・除去率" },
    "工場報告.html":        { title: "工場報告",          sub: "生産性・工数" },
    "フィードバック.html":  { title: "フィードバック",    sub: "改善・原因" },
    "車両管理.html":        { title: "車両管理",          sub: "期限・給油・整備" },
    "請求書管理.html":      { title: "請求書管理",        sub: "入金待ち・PDF" },
    "AIレポート.html":      { title: "AIレポート",        sub: "自動分析・出力" },
    "お知らせ.html":        { title: "お知らせ",          sub: "全店舗" },
    "業界ニュース.html":    { title: "業界ニュース",      sub: "" },
    "ありがとうカード.html":{ title: "ありがとうカード",  sub: "閲覧・コメント" },
    "クレーム・事故品.html":{ title: "クレーム・事故品",  sub: "" },
    "アカウント管理.html":  { title: "アカウント管理",    sub: "" },
    "更新レポート.html":    { title: "更新レポート",      sub: "" },
  };

  /* ─── SVG アイコン ─────────────────────────────────── */
  var ICO = {
    home:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
    menu:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/></svg>',
    shift:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="4.5" width="18" height="16" rx="2.2"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/></svg>',
    news:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h10M7 17h6"/></svg>',
    back:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 18l-6-6 6-6"/></svg>',
    aa:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17 7 7l4 10"/><path d="M4.2 13.5h5.6"/><path d="M14 17l3-7 3 7"/><path d="M14.9 14.4h4.2"/></svg>',
    person: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6"/></svg>',
  };

  /* ─── フォントスケール ─────────────────────────────── */
  var FS_KEY    = "miwa.fontscale.v1";
  var FS_LEVELS = [
    { id: "s",  label: "標準", z: 1    },
    { id: "l",  label: "大",   z: 1.15 },
    { id: "xl", label: "特大", z: 1.30 },
  ];
  function getFsId() {
    try {
      var v = localStorage.getItem(FS_KEY);
      return FS_LEVELS.some(function (l) { return l.id === v; }) ? v : "s";
    } catch (e) { return "s"; }
  }
  function applyFs(id) {
    var lvl = null;
    for (var i = 0; i < FS_LEVELS.length; i++) { if (FS_LEVELS[i].id === id) { lvl = FS_LEVELS[i]; break; } }
    if (!lvl) lvl = FS_LEVELS[0];
    try { document.body.style.zoom = lvl.z === 1 ? "" : String(lvl.z); } catch (e) {}
    try { localStorage.setItem(FS_KEY, id); } catch (e) {}
  }
  // ページ読み込み時に直ちに適用
  applyFs(getFsId());

  /* ─── DOM 構築 ─────────────────────────────────────── */
  function build() {
    if (document.getElementById("mf-topbar")) return;

    var act  = activeTab();
    var meta = PAGE_META[here] || { title: (document.title || "").split("・")[0].trim(), sub: "" };
    var fsId = getFsId();

    /* ── CSS ── */
    var css = document.createElement("style");
    css.id  = "mf-style";
    css.textContent = [
      /* CSS 変数 */
      ":root{",
        "--mf-sab:env(safe-area-inset-bottom,0px);",
        "--mf-sat:env(safe-area-inset-top,0px);",
        "--mf-h:64px;",
        "--mf-topbar-h:56px;",
      "}",

      /* body に上下パディング（ヘッダー＋フッター分） */
      "body{",
        "padding-top:calc(var(--mf-topbar-h) + var(--mf-sat)) !important;",
        "padding-bottom:calc(var(--mf-h) + var(--mf-sab) + 4px) !important;",
      "}",

      /* ② グリーンヘッダー（SPA の .m-header と同一デザイン） */
      "#mf-topbar{",
        "position:fixed;left:0;right:0;top:0;z-index:1200;",
        "padding:calc(var(--mf-sat) + 10px) 16px 10px;",
        "height:calc(var(--mf-topbar-h) + var(--mf-sat));",
        "background:linear-gradient(115deg,#0a7d4a 0%,#15a05a 50%,#34b36c 100%);",
        "box-shadow:0 2px 14px rgba(11,90,60,.28);",
        "display:flex;align-items:center;gap:10px;",
        "font-family:'Plus Jakarta Sans','Zen Kaku Gothic New',-apple-system,BlinkMacSystemFont,sans-serif;",
      "}",
      "#mf-topbar-titles{min-width:0;flex:1;}",
      "#mf-topbar-title{font-size:19px;font-weight:800;color:#fff;letter-spacing:-0.01em;}",
      "#mf-topbar-sub{font-size:11.5px;color:rgba(255,255,255,.86);font-weight:600;margin-top:1px;",
        "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70vw;}",

      /* アイコンボタン（SPA の .m-header-icon と同一） */
      ".mf-icon-btn{",
        "width:38px;height:38px;border-radius:50%;",
        "border:1px solid rgba(255,255,255,.34);background:rgba(255,255,255,.16);color:#fff;",
        "display:flex;align-items:center;justify-content:center;cursor:pointer;",
        "flex-shrink:0;position:relative;-webkit-tap-highlight-color:transparent;",
        "text-decoration:none;",
      "}",
      ".mf-icon-btn:active{transform:scale(0.94);}",
      ".mf-icon-btn svg{width:19px;height:19px;}",
      "#mf-back-btn svg{width:18px;height:18px;}",

      /* 文字サイズ ポップアップ */
      "#mf-fs-pop{",
        "position:fixed;top:calc(var(--mf-sat) + 60px);right:52px;z-index:1300;",
        "width:168px;background:#fff;border:1px solid #eceaf5;border-radius:16px;",
        "box-shadow:0 16px 44px rgba(20,19,46,.22);padding:6px;",
        "font-family:'Plus Jakarta Sans','Zen Kaku Gothic New',-apple-system,BlinkMacSystemFont,sans-serif;",
      "}",
      "#mf-fs-pop.mf-hidden{display:none;}",
      ".mf-fs-head{font-size:10.5px;font-weight:800;color:#8a8db0;padding:7px 10px 5px;}",
      ".mf-fs-opt{",
        "display:flex;align-items:center;gap:9px;width:100%;border:0;background:transparent;",
        "cursor:pointer;font-weight:700;text-align:left;padding:10px;border-radius:10px;",
        "font-family:inherit;color:#4d4f73;",
      "}",
      ".mf-fs-opt:active{background:#eef0f3;}",
      ".mf-fs-opt.mf-on{background:#e7f6ee;color:#0b7a45;}",
      ".mf-fs-opt .mf-lab{flex:1;}",
      ".mf-fs-opt.s .mf-lab{font-size:13px;}",
      ".mf-fs-opt.l .mf-lab{font-size:15px;}",
      ".mf-fs-opt.xl .mf-lab{font-size:17.5px;}",
      ".mf-fs-ck{width:15px;height:15px;flex-shrink:0;opacity:0;color:#0b7a45;}",
      ".mf-fs-ck svg{width:15px;height:15px;}",
      ".mf-fs-opt.mf-on .mf-fs-ck{opacity:1;}",

      /* ③ 下部タブバー */
      "#mf-tabbar{",
        "position:fixed;left:0;right:0;bottom:0;z-index:1200;",
        "height:calc(var(--mf-h) + var(--mf-sab));padding-bottom:var(--mf-sab);",
        "display:flex;",
        "background:color-mix(in oklch,#fff 92%,transparent);",
        "backdrop-filter:saturate(180%) blur(16px);-webkit-backdrop-filter:saturate(180%) blur(16px);",
        "border-top:1px solid #e6e8ec;box-shadow:0 -4px 18px rgba(15,23,42,.06);",
      "}",
      "#mf-tabbar a{",
        "flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;",
        "text-decoration:none;color:#8a9099;-webkit-tap-highlight-color:transparent;",
        "font-family:'Plus Jakarta Sans','Zen Kaku Gothic New',-apple-system,BlinkMacSystemFont,sans-serif;",
      "}",
      "#mf-tabbar a svg{width:23px;height:23px;}",
      "#mf-tabbar a span{font-size:10.5px;font-weight:700;white-space:nowrap;}",
      "#mf-tabbar a.active{color:#2a6fdb;}",
      "#mf-tabbar a:active{transform:translateY(1px);}",

      /* PC サイドバー類を隠す / レイアウト調整 */
      "html.mf-phone .mobile-menu,html.mf-phone .mobile-scrim,html.mf-phone .sidebar{display:none !important;}",
      "html.mf-phone .shell{grid-template-columns:1fr !important;}",
      "html.mf-phone .main{padding-left:14px !important;padding-right:14px !important;}",
      "html.mf-phone .app{padding-top:0 !important;}",   /* body の padding-top に一本化 */

      "@media print{#mf-topbar,#mf-tabbar{display:none !important;}body{padding-top:0 !important;padding-bottom:0 !important;}}",
    ].join("");
    document.head.appendChild(css);

    /* ── ② グリーンヘッダー DOM ── */
    var topbar = document.createElement("div");
    topbar.id = "mf-topbar";
    topbar.innerHTML =
      /* 戻るボタン → モバイル.html#menu（SPA 業務メニューへ） */
      '<button id="mf-back-btn" class="mf-icon-btn" aria-label="戻る" style="margin-right:-2px">' +
        ICO.back +
      '</button>' +
      /* タイトル */
      '<div id="mf-topbar-titles">' +
        '<div id="mf-topbar-title">' + (meta.title || "") + '</div>' +
        (meta.sub ? '<div id="mf-topbar-sub">' + meta.sub + '</div>' : '') +
      '</div>' +
      /* 文字サイズボタン */
      '<div style="position:relative;flex-shrink:0">' +
        '<button id="mf-fs-btn" class="mf-icon-btn" title="文字サイズ" aria-label="文字サイズ">' +
          ICO.aa +
        '</button>' +
        '<div id="mf-fs-pop" class="mf-hidden">' +
          '<div class="mf-fs-head">文字サイズ</div>' +
          FS_LEVELS.map(function (l) {
            var on = l.id === fsId ? " mf-on" : "";
            return '<button class="mf-fs-opt ' + l.id + on + '" data-fs-id="' + l.id + '">' +
              '<span class="mf-lab">' + l.label + '</span>' +
              '<span class="mf-fs-ck"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>' +
            '</button>';
          }).join("") +
        '</div>' +
      '</div>' +
      /* アカウントボタン */
      '<a href="' + encodeURI("モバイル.html?view=mobile#about") + '" class="mf-icon-btn" title="アカウント・その他" aria-label="アカウント・その他">' +
        ICO.person +
      '</a>';

    document.body.insertBefore(topbar, document.body.firstChild);

    /* 戻るボタン → history.back() / なければ業務メニューへ */
    document.getElementById("mf-back-btn").addEventListener("click", function () {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        location.href = encodeURI("モバイル.html?view=mobile#menu");
      }
    });

    /* 文字サイズ ポップアップ開閉 */
    var fsPop = document.getElementById("mf-fs-pop");
    var fsBtn = document.getElementById("mf-fs-btn");

    fsBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      fsPop.classList.toggle("mf-hidden");
    });

    var fsOpts = fsPop.querySelectorAll(".mf-fs-opt");
    for (var i = 0; i < fsOpts.length; i++) {
      (function (btn) {
        btn.addEventListener("click", function () {
          var id = btn.getAttribute("data-fs-id");
          applyFs(id);
          for (var j = 0; j < fsOpts.length; j++) {
            fsOpts[j].classList.toggle("mf-on", fsOpts[j].getAttribute("data-fs-id") === id);
          }
          fsPop.classList.add("mf-hidden");
        });
      })(fsOpts[i]);
    }

    document.addEventListener("click", function () {
      fsPop.classList.add("mf-hidden");
    });

    /* ── ③ 下部タブバー DOM ── */
    var TABS = [
      { id: "home",  label: "ホーム" },
      { id: "menu",  label: "業務メニュー" },
      { id: "shift", label: "シフト" },
      { id: "news",  label: "お知らせ" },
    ];
    var bar = document.createElement("nav");
    bar.id = "mf-tabbar";
    bar.setAttribute("aria-label", "モバイルメニュー");
    bar.innerHTML = TABS.map(function (t) {
      var cls  = t.id === act ? "active" : "";
      var href = encodeURI("モバイル.html?view=mobile#" + t.id);
      return '<a class="' + cls + '" href="' + href + '">' + ICO[t.id] + '<span>' + t.label + '</span></a>';
    }).join("");
    document.body.appendChild(bar);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
