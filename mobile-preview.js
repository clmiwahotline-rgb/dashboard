// mobile-preview.js — 画面内スマホプレビュー
// 任意のページに <script src="mobile-preview.js"></script> を1行足すだけ。
// 押すと現在のページを 390px などの枠(iframe)で開く。iframe は独自ビューポートを
// 持つので、@media（レスポンシブ）が実機どおり正しく切り替わる。
(function () {
  // iframe プレビュー（?mobileframe=1）の中では再帰しないよう何もしない
  if (new URLSearchParams(location.search).has("mobileframe")) return;

  var DEVICES = [
    { id: "se",   label: "SE",        w: 375, h: 667 },
    { id: "i14",  label: "iPhone",    w: 390, h: 844 },
    { id: "max",  label: "Max",       w: 430, h: 932 },
  ];

  var css = ''
    + '#mpv-btn{position:fixed;left:18px;bottom:18px;z-index:9000;display:inline-flex;'
    + 'align-items:center;gap:8px;padding:10px 15px;border:none;border-radius:999px;'
    + 'background:#1f2937;color:#fff;font:600 13px/1 "Plus Jakarta Sans",system-ui,sans-serif;'
    + 'box-shadow:0 6px 20px rgba(0,0,0,.25);cursor:pointer;transition:transform .15s}'
    + '#mpv-btn:hover{transform:translateY(-2px)}'
    + '#mpv-overlay{position:fixed;inset:0;z-index:9001;background:rgba(17,20,24,.72);'
    + 'backdrop-filter:blur(4px);display:none;flex-direction:column;align-items:center;'
    + 'justify-content:center;gap:18px;padding:24px}'
    + '#mpv-overlay.on{display:flex}'
    + '#mpv-bar{display:flex;align-items:center;gap:8px}'
    + '.mpv-seg{display:flex;background:rgba(255,255,255,.12);border-radius:999px;padding:3px}'
    + '.mpv-seg button{border:none;background:transparent;color:#cbd5e1;font:600 12px/1 system-ui,sans-serif;'
    + 'padding:7px 13px;border-radius:999px;cursor:pointer}'
    + '.mpv-seg button.on{background:#fff;color:#111}'
    + '#mpv-close{margin-left:6px;width:34px;height:34px;border:none;border-radius:999px;'
    + 'background:rgba(255,255,255,.14);color:#fff;font-size:18px;cursor:pointer;line-height:1}'
    + '#mpv-phone{position:relative;background:#0b0d10;border-radius:42px;padding:12px;'
    + 'box-shadow:0 24px 60px rgba(0,0,0,.5);max-height:calc(100vh - 120px)}'
    + '#mpv-phone::before{content:"";position:absolute;top:20px;left:50%;transform:translateX(-50%);'
    + 'width:120px;height:26px;background:#0b0d10;border-radius:0 0 16px 16px;z-index:2}'
    + '#mpv-frame{display:block;border:none;border-radius:30px;background:#fff;'
    + 'max-height:calc(100vh - 144px)}'
    + '#mpv-hint{color:#94a3b8;font:500 12px/1.5 system-ui,sans-serif;text-align:center}';

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  var btn = document.createElement("button");
  btn.id = "mpv-btn";
  btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2.5"/><line x1="11" y1="18" x2="13" y2="18"/></svg>スマホ表示';
  document.body.appendChild(btn);

  var overlay = document.createElement("div");
  overlay.id = "mpv-overlay";
  overlay.innerHTML =
      '<div id="mpv-bar"><div class="mpv-seg" id="mpv-seg"></div>'
    + '<button id="mpv-close" title="閉じる (Esc)">&times;</button></div>'
    + '<div id="mpv-phone"><iframe id="mpv-frame"></iframe></div>'
    + '<div id="mpv-hint">この枠は実機と同じ幅で表示しています ・ 背景をクリックで閉じる</div>';
  document.body.appendChild(overlay);

  var seg   = overlay.querySelector("#mpv-seg");
  var phone = overlay.querySelector("#mpv-phone");
  var frame = overlay.querySelector("#mpv-frame");
  var cur = DEVICES[1];

  function frameSrc() {
    var u = new URL(location.href);
    u.searchParams.set("mobileframe", "1");
    return u.toString();
  }
  function applySize() {
    // 高さが画面に収まらない場合は縮尺（ピクセル等倍は保ったままビューポート幅は固定）
    var maxH = window.innerHeight - 144;
    var h = Math.min(cur.h, maxH);
    frame.style.width = cur.w + "px";
    frame.style.height = h + "px";
  }
  function renderSeg() {
    seg.innerHTML = "";
    DEVICES.forEach(function (d) {
      var b = document.createElement("button");
      b.textContent = d.label + " " + d.w;
      if (d.id === cur.id) b.className = "on";
      b.onclick = function () { cur = d; renderSeg(); applySize(); };
      seg.appendChild(b);
    });
  }
  function open() {
    if (!frame.src) frame.src = frameSrc();
    renderSeg();
    applySize();
    overlay.classList.add("on");
  }
  function close() { overlay.classList.remove("on"); }

  btn.onclick = open;
  overlay.querySelector("#mpv-close").onclick = close;
  overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
  window.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  window.addEventListener("resize", function () { if (overlay.classList.contains("on")) applySize(); });
})();
