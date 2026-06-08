/* ============================================================
   みわダッシュボード ─ 共通ヘッダー（全ページ共通）
   ------------------------------------------------------------
   画面右上に固定する共通ヘッダー。
     ・文字サイズ切替（標準 / 大 / 特大）… ページ全体をズーム
     ・アカウント … ログイン中の名前・メール・権限＋ログアウト
                   （未ログインのページではダッシュボードへの導線）
   各ページは </body> 直前で
     <script src="polished-fontscale.js"></script>
   を1行読み込むだけ。設定は localStorage に保存し全ページで維持。
   ============================================================ */
(function () {
  var KEY = "miwa.fontscale.v1";
  var LEVELS = [
    { id: "s",  label: "標準", z: 1 },
    { id: "l",  label: "大",   z: 1.15 },
    { id: "xl", label: "特大", z: 1.30 }
  ];

  function getLevel() {
    try { var v = localStorage.getItem(KEY); return v && LEVELS.some(function (l) { return l.id === v; }) ? v : "s"; }
    catch (e) { return "s"; }
  }
  function zoomFor(id) { for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) return LEVELS[i].z; return 1; }

  function apply(id) {
    var z = zoomFor(id);
    try { document.body.style.zoom = (z === 1 ? "" : String(z)); } catch (e) {}
    // ヘッダー自身はズームの影響を打ち消し、常に等倍で同じ位置に保つ
    var w = document.getElementById("miwa-header");
    if (w) { try { w.style.zoom = (z === 1 ? "" : String(1 / z)); } catch (e) {} }
  }

  // ── 早期適用（チラつき防止）──
  if (document.body) apply(getLevel());
  else document.addEventListener("DOMContentLoaded", function () { apply(getLevel()); });

  // ── 認証ユーザー（polished-auth.js があれば）──
  function getUser() {
    try { return (window.MiwaAuth && window.MiwaAuth.user && window.MiwaAuth.user()) || null; } catch (e) { return null; }
  }
  function isAdmin() {
    try { return !!(window.MiwaAuth && window.MiwaAuth.isAdmin && window.MiwaAuth.isAdmin()); } catch (e) { return false; }
  }
  function logout() { try { if (window.MiwaAuth && window.MiwaAuth.logout) window.MiwaAuth.logout(); } catch (e) {} }

  var EU = function (s) { try { return encodeURIComponent(s); } catch (e) { return s; } };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function injectStyle() {
    if (document.getElementById("miwa-header-style")) return;
    var style = document.createElement("style");
    style.id = "miwa-header-style";
    style.textContent =
      "#miwa-header{position:fixed;top:12px;right:16px;z-index:9000;display:flex;align-items:center;gap:10px;" +
      "font-family:'Plus Jakarta Sans','Zen Kaku Gothic New',-apple-system,sans-serif;}" +
      // 文字サイズ
      "#miwa-header .mh-fs{display:flex;align-items:center;gap:8px;background:var(--card,#fff);border:1px solid var(--line-strong,#d8d5e8);" +
      "border-radius:999px;padding:5px 7px 5px 12px;box-shadow:0 6px 22px rgba(20,19,46,.14);}" +
      "#miwa-header .mh-fs-ic{display:flex;align-items:center;gap:5px;font-size:12px;font-weight:800;color:var(--ink-soft,#4d4f73);white-space:nowrap;}" +
      "#miwa-header .mh-fs-ic svg{width:15px;height:15px;}" +
      "#miwa-header .mh-seg{display:flex;gap:2px;background:var(--bg-2,#e8eaed);border-radius:999px;padding:3px;}" +
      "#miwa-header .mh-seg button{border:0;cursor:pointer;font-family:inherit;font-weight:800;color:var(--ink-mute,#8a8db0);" +
      "background:transparent;border-radius:999px;padding:6px 11px;line-height:1;transition:background .14s,color .14s;white-space:nowrap;}" +
      "#miwa-header .mh-seg button:hover{color:var(--ink-soft,#4d4f73);}" +
      "#miwa-header .mh-seg button.on{background:var(--card,#fff);color:var(--accent-ink,#1c4f9c);box-shadow:0 1px 3px rgba(20,19,46,.14);}" +
      "#miwa-header .lv-s{font-size:11.5px;} #miwa-header .lv-l{font-size:13.5px;} #miwa-header .lv-xl{font-size:15.5px;}" +
      // アカウント
      "#miwa-header .mh-acct{position:relative;}" +
      "#miwa-header .mh-avatar{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:999px;cursor:pointer;" +
      "border:1px solid var(--line-strong,#d8d5e8);background:var(--card,#fff);box-shadow:0 6px 22px rgba(20,19,46,.14);overflow:hidden;padding:0;" +
      "font-weight:800;font-size:15px;color:var(--accent-ink,#1c4f9c);transition:transform .12s;}" +
      "#miwa-header .mh-avatar:hover{transform:translateY(-1px);}" +
      "#miwa-header .mh-avatar img{width:100%;height:100%;object-fit:cover;display:block;}" +
      "#miwa-header .mh-avatar svg{width:20px;height:20px;color:var(--ink-soft,#4d4f73);}" +
      "#miwa-header .mh-menu{position:absolute;top:48px;right:0;width:248px;background:var(--card,#fff);border:1px solid var(--line,#eceaf5);" +
      "border-radius:16px;box-shadow:0 16px 44px rgba(20,19,46,.22);padding:6px;display:none;}" +
      "#miwa-header .mh-acct.open .mh-menu{display:block;}" +
      "#miwa-header .mh-id{display:flex;align-items:center;gap:11px;padding:11px 12px 12px;}" +
      "#miwa-header .mh-id-av{width:42px;height:42px;flex-shrink:0;border-radius:999px;overflow:hidden;background:var(--accent-soft,#e8f0fe);color:var(--accent-ink,#1c4f9c);" +
      "display:flex;align-items:center;justify-content:center;font-weight:800;font-size:17px;}" +
      "#miwa-header .mh-id-av img{width:100%;height:100%;object-fit:cover;display:block;}" +
      "#miwa-header .mh-id-meta{min-width:0;flex:1;}" +
      "#miwa-header .mh-id-name{font-size:13.5px;font-weight:800;color:var(--ink,#14132e);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:6px;}" +
      "#miwa-header .mh-role{font-size:9.5px;font-weight:800;color:#fff;background:var(--accent,#2a6fdb);border-radius:999px;padding:2px 7px;flex-shrink:0;}" +
      "#miwa-header .mh-id-mail{font-size:11px;color:var(--ink-mute,#8a8db0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;}" +
      "#miwa-header .mh-sep{height:1px;background:var(--line,#eceaf5);margin:4px 6px;}" +
      "#miwa-header .mh-link{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:0;background:transparent;cursor:pointer;" +
      "font-family:inherit;font-size:13px;font-weight:700;color:var(--ink-soft,#4d4f73);padding:9px 12px;border-radius:10px;text-decoration:none;transition:background .12s;}" +
      "#miwa-header .mh-link:hover{background:var(--bg-2,#eef0f3);}" +
      "#miwa-header .mh-link svg{width:16px;height:16px;flex-shrink:0;color:var(--ink-mute,#8a8db0);}" +
      "#miwa-header .mh-link.danger{color:#c5221f;} #miwa-header .mh-link.danger svg{color:#c5221f;}" +
      // 各ページ上部ツールバー（.greet）が固定ヘッダーと重ならないよう上に余白を確保
      ".main > .greet{padding-top:46px;}" +
      "@media (max-width:560px){.main > .greet{padding-top:40px;}}" +
      "@media (max-width:560px){#miwa-header{top:10px;right:10px;gap:7px;} #miwa-header .mh-fs-ic span{display:none;} #miwa-header .mh-fs{padding:5px 6px 5px 9px;}}" +
      "@media print{#miwa-header{display:none!important;}}";
    document.head.appendChild(style);
  }

  function build() {
    if (document.getElementById("miwa-header")) return;
    injectStyle();

    var user = getUser();
    var admin = isAdmin();
    var cur = getLevel();

    var wrap = document.createElement("div");
    wrap.id = "miwa-header";

    // ── 文字サイズ ──
    var fs = document.createElement("div");
    fs.className = "mh-fs";
    fs.innerHTML =
      '<span class="mh-fs-ic">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V5h11v2"/><path d="M9.5 5v13"/><path d="M7.5 18h4"/><path d="M15 13v-1.5h6V13"/><path d="M18 11.5V18"/><path d="M16.5 18h3"/></svg>' +
      '<span>文字サイズ</span></span>' +
      '<div class="mh-seg" role="group" aria-label="文字サイズ"></div>';
    var seg = fs.querySelector(".mh-seg");
    LEVELS.forEach(function (l) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "lv-" + l.id + (l.id === cur ? " on" : "");
      b.textContent = l.label;
      b.setAttribute("aria-pressed", l.id === cur ? "true" : "false");
      b.addEventListener("click", function () {
        try { localStorage.setItem(KEY, l.id); } catch (e) {}
        apply(l.id);
        var btns = seg.querySelectorAll("button");
        for (var i = 0; i < btns.length; i++) {
          var on = btns[i] === b;
          btns[i].classList.toggle("on", on);
          btns[i].setAttribute("aria-pressed", on ? "true" : "false");
        }
      });
      seg.appendChild(b);
    });
    wrap.appendChild(fs);

    // ── アカウント ──
    var acct = document.createElement("div");
    acct.className = "mh-acct";
    var initial = (user && (user.name || user.email) ? (user.name || user.email).slice(0, 1) : "");
    var avHtml = user && user.picture
      ? '<img src="' + esc(user.picture) + '" alt="" referrerpolicy="no-referrer">'
      : (initial ? esc(initial)
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>');

    var menuRows = "";
    if (user) {
      var idAv = user.picture
        ? '<img src="' + esc(user.picture) + '" alt="" referrerpolicy="no-referrer">'
        : esc(initial || "?");
      menuRows +=
        '<div class="mh-id"><div class="mh-id-av">' + idAv + '</div>' +
        '<div class="mh-id-meta"><div class="mh-id-name">' + esc(user.name || user.email || "ユーザー") +
        (admin ? '<span class="mh-role">管理者</span>' : '') + '</div>' +
        '<div class="mh-id-mail">' + esc(user.email || "") + '</div></div></div>' +
        '<div class="mh-sep"></div>';
    }
    menuRows += '<a class="mh-link" href="index.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5 12 3l9 6.5"/><path d="M5 10v10h14V10"/></svg>ダッシュボード</a>';
    menuRows += '<a class="mh-link" href="' + EU("機能説明書.html") + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>機能説明書</a>';
    if (admin) {
      menuRows += '<a class="mh-link" href="' + EU("アカウント管理.html") + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/></svg>アカウント管理</a>';
    }
    if (user) {
      menuRows += '<div class="mh-sep"></div>';
      menuRows += '<button type="button" class="mh-link danger" id="mh-logout"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>ログアウト</button>';
    }

    acct.innerHTML =
      '<button type="button" class="mh-avatar" id="mh-avatar" aria-label="アカウント" aria-haspopup="true" aria-expanded="false">' + avHtml + '</button>' +
      '<div class="mh-menu" role="menu">' + menuRows + '</div>';
    wrap.appendChild(acct);

    document.body.appendChild(wrap);
    apply(getLevel()); // 逆ズーム反映

    // ── メニュー開閉 ──
    var avBtn = acct.querySelector("#mh-avatar");
    avBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = acct.classList.toggle("open");
      avBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function (e) {
      if (!acct.contains(e.target)) { acct.classList.remove("open"); avBtn.setAttribute("aria-expanded", "false"); }
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { acct.classList.remove("open"); avBtn.setAttribute("aria-expanded", "false"); } });
    var lo = acct.querySelector("#mh-logout");
    if (lo) lo.addEventListener("click", function () { logout(); });
  }

  if (document.body) build();
  else document.addEventListener("DOMContentLoaded", build);

  // 認証はページ読込後に確定することがあるため、確定したらアバターを更新
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
    if (tries > 40) clearInterval(poll); // 最大 ~20秒
  }, 500);
})();
