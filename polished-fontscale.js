/* ============================================================
   みわダッシュボード ─ 文字サイズ切替（全ページ共通）
   ------------------------------------------------------------
   px 固定のデザインでも確実に効くよう、ページ全体を「ズーム」で
   拡大する。標準 / 大 / 特大 の3段階。設定は localStorage に保存し
   全ページ・再訪問で維持される。
   各ページに <script src="polished-fontscale.js"></script> を
   </body> 直前で1行読み込むだけ。
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
    // コントロール自身はズームの影響を打ち消して常に等倍・同位置に保つ
    var w = document.getElementById("miwa-fontscale");
    if (w) { try { w.style.zoom = (z === 1 ? "" : String(1 / z)); } catch (e) {} }
  }

  // ── 早期適用（チラつき防止）──
  function earlyApply() {
    if (document.body) apply(getLevel());
    else document.addEventListener("DOMContentLoaded", function () { apply(getLevel()); });
  }
  earlyApply();

  // ── コントロール（右下のピル）を構築 ──
  function build() {
    if (document.getElementById("miwa-fontscale")) return;

    var style = document.createElement("style");
    style.textContent =
      "#miwa-fontscale{position:fixed;right:16px;bottom:16px;z-index:9000;display:flex;align-items:center;gap:9px;" +
      "background:var(--card,#fff);border:1px solid var(--line-strong,#d8d5e8);border-radius:999px;padding:6px 8px 6px 13px;" +
      "box-shadow:0 8px 28px rgba(20,19,46,.16);font-family:'Plus Jakarta Sans','Zen Kaku Gothic New',-apple-system,sans-serif;}" +
      "#miwa-fontscale .mfs-ic{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:800;color:var(--ink-soft,#4d4f73);letter-spacing:.01em;white-space:nowrap;}" +
      "#miwa-fontscale .mfs-ic svg{width:16px;height:16px;}" +
      "#miwa-fontscale .mfs-seg{display:flex;gap:2px;background:var(--bg-2,#e8eaed);border-radius:999px;padding:3px;}" +
      "#miwa-fontscale .mfs-seg button{border:0;cursor:pointer;font-family:inherit;font-weight:800;color:var(--ink-mute,#8a8db0);" +
      "background:transparent;border-radius:999px;padding:6px 12px;line-height:1;transition:background .14s,color .14s;white-space:nowrap;}" +
      "#miwa-fontscale .mfs-seg button:hover{color:var(--ink-soft,#4d4f73);}" +
      "#miwa-fontscale .mfs-seg button.on{background:var(--card,#fff);color:var(--accent-ink,#1c4f9c);box-shadow:0 1px 3px rgba(20,19,46,.14);}" +
      "#miwa-fontscale .lv-s{font-size:12px;} #miwa-fontscale .lv-l{font-size:14px;} #miwa-fontscale .lv-xl{font-size:16px;}" +
      "@media (max-width:560px){#miwa-fontscale{right:12px;bottom:12px;padding:5px 7px 5px 11px;gap:7px;} #miwa-fontscale .mfs-ic span{display:none;}}" +
      "@media print{#miwa-fontscale{display:none!important;}}";
    document.head.appendChild(style);

    var wrap = document.createElement("div");
    wrap.id = "miwa-fontscale";
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", "文字サイズ");
    wrap.innerHTML =
      '<span class="mfs-ic">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V5h11v2"/><path d="M9.5 5v13"/><path d="M7.5 18h4"/><path d="M15 13v-1.5h6V13"/><path d="M18 11.5V18"/><path d="M16.5 18h3"/></svg>' +
      '<span>文字サイズ</span></span>' +
      '<div class="mfs-seg"></div>';

    var seg = wrap.querySelector(".mfs-seg");
    var cur = getLevel();
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

    document.body.appendChild(wrap);
    apply(getLevel()); // コントロール生成後に逆ズームも反映
  }

  if (document.body) build();
  else document.addEventListener("DOMContentLoaded", build);
})();
