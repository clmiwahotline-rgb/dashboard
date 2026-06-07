// みわダッシュボード ─ スマホ用フッタータブバー（PC版ページに注入）
// =====================================================================
//  スマホでPC版ページ（?view=pc 等）を開いたとき、モバイルアプリと同じ
//  下部タブ（ホーム/業務メニュー/シフト/お知らせ）を表示してナビ迷子を防ぐ。
//  - スマホ端末のみ表示（device.js と同条件）。PC/タブレットでは何もしない。
//  - モバイル.html 自身（独自タブバーあり）では動かさない。
//  - 各タブはモバイルアプリへ戻る： モバイル.html?view=mobile#home 等
// =====================================================================
(function () {
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
  if (here === "モバイル.html") return;     // モバイルアプリ本体はスキップ
  if (!isPhone()) return;                    // スマホ以外は表示しない

  // どのタブをハイライトするか（PC版ページ→対応するモバイルタブ）
  function activeTab() {
    if (here === "index.html" || here === "") return "home";
    if (here === "シフト.html") return "shift";
    if (here === "お知らせ.html" || here === "業界ニュース.html") return "news";
    return "menu"; // 共有ボード/売上/シミ抜き/工場/フィードバック/車両/請求書/AIレポート 等
  }

  var ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/></svg>',
    shift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="4.5" width="18" height="16" rx="2.2"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/></svg>',
    news: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h10M7 17h6"/></svg>',
  };
  var TABS = [
    { id: "home", label: "ホーム" },
    { id: "menu", label: "業務メニュー" },
    { id: "shift", label: "シフト" },
    { id: "news", label: "お知らせ" },
  ];

  function build() {
    if (document.getElementById("mf-tabbar")) return;
    var act = activeTab();

    var style = document.createElement("style");
    style.id = "mf-style";
    style.textContent = [
      ":root{--mf-sab:env(safe-area-inset-bottom,0px);--mf-h:64px;}",
      "body{padding-bottom:calc(var(--mf-h) + var(--mf-sab) + 4px) !important;}",
      "#mf-tabbar{position:fixed;left:0;right:0;bottom:0;z-index:1200;height:calc(var(--mf-h) + var(--mf-sab));padding-bottom:var(--mf-sab);display:flex;",
      "background:color-mix(in oklch, var(--card,#fff) 92%, transparent);backdrop-filter:saturate(180%) blur(16px);-webkit-backdrop-filter:saturate(180%) blur(16px);",
      "border-top:1px solid var(--line,#e6e8ec);box-shadow:0 -4px 18px rgba(15,23,42,.06);}",
      "#mf-tabbar a{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;text-decoration:none;color:var(--ink-mute,#8a9099);-webkit-tap-highlight-color:transparent;}",
      "#mf-tabbar a svg{width:23px;height:23px;}",
      "#mf-tabbar a span{font-size:10.5px;font-weight:700;white-space:nowrap;}",
      "#mf-tabbar a.active{color:var(--accent-ink,#2a6fdb);}",
      "#mf-tabbar a:active{transform:translateY(1px);}",
      // PC版のサイドバー用ハンバーガーがフッターと被らないよう少し上げる
      "@media print{#mf-tabbar{display:none !important;}body{padding-bottom:0 !important;}}",
    ].join("");
    document.head.appendChild(style);

    var bar = document.createElement("nav");
    bar.id = "mf-tabbar";
    bar.setAttribute("aria-label", "モバイルメニュー");
    bar.innerHTML = TABS.map(function (t) {
      var cls = t.id === act ? "active" : "";
      var href = "モバイル.html?view=mobile#" + t.id;
      return '<a class="' + cls + '" href="' + encodeURI(href) + '">' + ICONS[t.id] + '<span>' + t.label + '</span></a>';
    }).join("");
    document.body.appendChild(bar);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
