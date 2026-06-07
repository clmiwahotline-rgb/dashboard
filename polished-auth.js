// みわダッシュボード ─ ログインゲート（全ページ共通・最優先で読み込む）
// =====================================================================
//  ・Google サインイン（GIS）必須。許可された Google アカウントのみ入室可。
//  ・「次回から省略」チェック → localStorage に保存（手動ログアウトまで無期限）。
//    未チェック → sessionStorage（ブラウザ/タブを閉じると次回再ログイン）。
//  ・CLIENT_ID 未設定のときは「設定が必要です」案内を表示（締め出さない）。
//  window.MiwaAuth.user() で現在ユーザー、.logout() でログアウト。
// =====================================================================
(function () {
  var CFG = window.MIWA_AUTH || {};
  var SKEY = "miwa.auth.session.v1";

  // ---- セッション入出力（remember=localStorage / それ以外=sessionStorage）----
  function readSession() {
    try {
      var s = localStorage.getItem(SKEY) || sessionStorage.getItem(SKEY);
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  }
  function writeSession(sess, remember) {
    var str = JSON.stringify(sess);
    try {
      if (remember) { localStorage.setItem(SKEY, str); sessionStorage.removeItem(SKEY); }
      else { sessionStorage.setItem(SKEY, str); localStorage.removeItem(SKEY); }
    } catch (e) {}
  }
  function clearSession() {
    try { localStorage.removeItem(SKEY); sessionStorage.removeItem(SKEY); } catch (e) {}
  }

  var currentUser = readSession();

  // ---- 公開 API ----
  window.MiwaAuth = {
    user: function () { return currentUser; },
    isAdmin: function () { return !!(currentUser && currentUser.role === "admin"); },
    idToken: function () { return currentUser && currentUser.idToken; },
    logout: function () {
      clearSession();
      try { if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect(); } catch (e) {}
      location.reload();
    },
  };

  // ---- GAS 認証呼び出し（text/plain で CORS 回避）----
  function gasVerify(idToken) {
    return fetch(CFG.GAS_URL, {
      method: "POST", redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "verifyLogin", idToken: idToken }),
    }).then(function (r) { return r.json(); }).catch(function (e) { return { ok: false, message: String(e) }; });
  }

  // ===================================================================
  //  画面：オーバーレイ
  // ===================================================================
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  function injectStyles() {
    if (document.getElementById("miwa-auth-style")) return;
    var st = document.createElement("style");
    st.id = "miwa-auth-style";
    st.textContent = [
      "#miwa-auth-gate{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;",
      "background:linear-gradient(160deg,#eef2f8 0%,#e6ebf3 100%);font-family:'Zen Kaku Gothic New','Plus Jakarta Sans',system-ui,sans-serif;}",
      "#miwa-auth-gate *{box-sizing:border-box;}",
      ".ma-card{width:100%;max-width:400px;background:#fff;border-radius:24px;box-shadow:0 18px 50px rgba(20,30,60,.18);padding:38px 34px;text-align:center;}",
      ".ma-logo{width:72px;height:72px;border-radius:18px;margin:0 auto 16px;display:block;object-fit:cover;",
      "box-shadow:0 6px 16px rgba(20,30,60,.18);}",
      ".ma-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:23px;font-weight:800;color:#14132e;letter-spacing:-.01em;}",
      ".ma-sub{font-size:13px;color:#7b8094;margin-top:5px;line-height:1.6;}",
      ".ma-rule{height:1px;background:#eceef4;margin:22px 0;}",
      ".ma-lead{font-size:13.5px;color:#4d4f73;margin-bottom:18px;line-height:1.7;}",
      ".ma-gbtn{display:flex;justify-content:center;min-height:44px;}",
      ".ma-remember{display:flex;align-items:center;justify-content:center;gap:9px;margin-top:20px;font-size:13px;color:#4d4f73;cursor:pointer;user-select:none;}",
      ".ma-remember input{width:18px;height:18px;accent-color:#2a6fdb;cursor:pointer;}",
      ".ma-msg{margin-top:18px;font-size:13px;border-radius:12px;padding:12px 14px;line-height:1.6;display:none;}",
      ".ma-msg.show{display:block;}",
      ".ma-msg.err{background:#fdecea;color:#b5271b;border:1px solid #f6c9c4;}",
      ".ma-msg.info{background:#eaf1fc;color:#1c4f9c;border:1px solid #cfe0f8;}",
      ".ma-spin{width:34px;height:34px;border:4px solid #e7e5f2;border-top-color:#2a6fdb;border-radius:50%;margin:6px auto 0;animation:maSpin .8s linear infinite;}",
      "@keyframes maSpin{to{transform:rotate(360deg)}}",
      ".ma-foot{margin-top:24px;font-size:11px;color:#a7abc0;}",
      ".ma-setup{text-align:left;font-size:12.5px;color:#4d4f73;line-height:1.85;}",
      ".ma-setup ol{margin:10px 0 0;padding-left:20px;}",
      ".ma-setup code{background:#f1f3f8;border-radius:5px;padding:1px 5px;font-size:11.5px;word-break:break-all;}",
      ".ma-signout{margin-top:16px;background:none;border:0;color:#2a6fdb;font-size:12.5px;font-weight:700;cursor:pointer;text-decoration:underline;}",
    ].join("");
    document.head.appendChild(st);
  }

  function hidePage() { document.documentElement.style.overflow = "hidden"; }
  function revealPage() {
    var g = document.getElementById("miwa-auth-gate");
    if (g) g.remove();
    document.documentElement.style.overflow = "";
  }

  function buildGate(inner) {
    injectStyles();
    var old = document.getElementById("miwa-auth-gate"); if (old) old.remove();
    var gate = el("div"); gate.id = "miwa-auth-gate";
    var card = el("div", "ma-card");
    var logo = el("img", "ma-logo");
    logo.src = "favicon.png"; logo.alt = "クリーニングみわ";
    logo.onerror = function () { this.onerror = null; var d = el("div", "ma-logo", "🧺"); d.style.cssText = "background:linear-gradient(150deg,#2a6fdb,#1c4f9c);color:#fff;font-size:34px;display:flex;align-items:center;justify-content:center;"; this.replaceWith(d); };
    card.appendChild(logo);
    card.appendChild(el("div", "ma-title", CFG.BRAND_TITLE || "みわダッシュボード"));
    card.appendChild(el("div", "ma-sub", CFG.BRAND_SUB || ""));
    card.appendChild(el("div", "ma-rule"));
    inner(card);
    gate.appendChild(card);
    (document.body || document.documentElement).appendChild(gate);
    return card;
  }

  // ---- 未設定（CLIENT_ID 空）画面 ----
  function showSetupNeeded() {
    buildGate(function (card) {
      var box = el("div", "ma-setup");
      box.innerHTML =
        "<b>サインインの設定が未完了です。</b><br>管理者の方は、Google の「クライアント ID」を発行して " +
        "<code>auth-config.js</code> に貼り付けてください。<ol>" +
        "<li><a href='" + encodeURIComponent("サインイン設定手順.html") + "' style='color:#2a6fdb;font-weight:700'>サインイン設定手順</a> を開く</li>" +
        "<li>手順どおり クライアント ID を作成</li>" +
        "<li><code>auth-config.js</code> の <code>CLIENT_ID</code> に貼る</li>" +
        "<li>再アップロードすると、全員サインインが必要になります</li></ol>";
      card.appendChild(box);
      card.appendChild(el("div", "ma-foot", "設定が終わるまでは、このまま表示されます。"));
    });
    hidePage();
  }

  // ---- ログイン画面 ----
  function showLogin(prefillMsg) {
    var card = buildGate(function (card) {
      card.appendChild(el("div", "ma-lead", "Google アカウントでサインインしてください。"));
      var btnWrap = el("div", "ma-gbtn"); btnWrap.id = "ma-gbtn"; card.appendChild(btnWrap);

      var rem = el("label", "ma-remember");
      rem.innerHTML = '<input type="checkbox" id="ma-remember-cb" checked> 次回からサインインを省略する';
      card.appendChild(rem);

      var msg = el("div", "ma-msg"); msg.id = "ma-msg"; card.appendChild(msg);

      var alt = el("a", "ma-alt", "うまくサインインできない場合は、別の方法でサインイン");
      alt.id = "ma-alt"; alt.href = "#";
      alt.style.cssText = "display:inline-block;margin-top:14px;font-size:12.5px;color:#2a6fdb;font-weight:700;text-decoration:underline;cursor:pointer;line-height:1.6;";
      alt.onclick = function (e) { e.preventDefault(); beginRedirectSignin(); };
      card.appendChild(alt);

      card.appendChild(el("div", "ma-foot", "許可されたアカウントのみ利用できます。"));
    });
    hidePage();

    if (prefillMsg) setMsg(prefillMsg.text, prefillMsg.kind);

    // GIS 初期化
    function initGis() {
      if (!(window.google && google.accounts && google.accounts.id)) { setTimeout(initGis, 200); return; }
      google.accounts.id.initialize({
        client_id: CFG.CLIENT_ID,
        callback: onCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
        itp_support: true,
        use_fedcm_for_prompt: true,
      });
      var holder = document.getElementById("ma-gbtn");
      if (holder) {
        google.accounts.id.renderButton(holder, {
          type: "standard", theme: "filled_blue", size: "large",
          text: "signin_with", shape: "pill", logo_alignment: "center", width: 300,
        });
      }
    }
    initGis();
  }

  function setMsg(text, kind) {
    var m = document.getElementById("ma-msg"); if (!m) return;
    m.className = "ma-msg show " + (kind || "info");
    m.innerHTML = text;
  }
  function showVerifying() {
    var card = document.querySelector("#miwa-auth-gate .ma-card");
    if (!card) return;
    var holder = document.getElementById("ma-gbtn");
    if (holder) holder.innerHTML = '<div class="ma-spin"></div>';
    setMsg("確認しています…", "info");
  }

  // ---- 認証コールバック ----
  function onCredential(resp) {
    var idToken = resp && resp.credential;
    if (!idToken) { setMsg("サインインに失敗しました。もう一度お試しください。", "err"); return; }
    var remember = !!(document.getElementById("ma-remember-cb") || {}).checked;
    verifyAndEnter(idToken, remember);
  }

  // ---- リダイレクト方式サインイン（ポップアップ/Cookieが効かない端末向け）----
  function beginRedirectSignin() {
    if (!CFG.CLIENT_ID) return;
    var remember = !!(document.getElementById("ma-remember-cb") || {}).checked;
    try { sessionStorage.setItem("miwa.auth.redir", remember ? "1" : "0"); } catch (e) {}
    var nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
    // リダイレクト先は「現在のフォルダ（ルート）」に固定する。
    // ページごとの完全URLにすると Google 側に全ページ分の登録が必要になり redirect_uri_mismatch の原因になる。
    // フォルダのルート（末尾 /）= index.html に統一すれば、登録すべきURIは1つで済む。
    var dir = location.pathname.replace(/[^/]*$/, "");
    if (!dir) dir = "/";
    var redirectUri = location.origin + dir;
    var url = "https://accounts.google.com/o/oauth2/v2/auth"
      + "?client_id=" + encodeURIComponent(CFG.CLIENT_ID)
      + "&redirect_uri=" + encodeURIComponent(redirectUri)
      + "&response_type=id_token"
      + "&scope=" + encodeURIComponent("openid email profile")
      + "&nonce=" + encodeURIComponent(nonce)
      + "&prompt=select_account";
    location.href = url;
  }

  // リダイレクトから戻ってきた時、URLの #id_token=… を処理
  function consumeRedirectResult() {
    var h = location.hash || "";
    if (h.indexOf("id_token=") < 0) return false;
    var params = {};
    h.replace(/^#/, "").split("&").forEach(function (kv) {
      var i = kv.indexOf("="); if (i < 0) return;
      params[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1));
    });
    var idToken = params.id_token;
    if (!idToken) return false;
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    var remember = true;
    try { remember = sessionStorage.getItem("miwa.auth.redir") !== "0"; sessionStorage.removeItem("miwa.auth.redir"); } catch (e) {}
    injectStyles();
    showLogin();
    verifyAndEnter(idToken, remember);
    return true;
  }

  function verifyAndEnter(idToken, remember) {
    showVerifying();
    gasVerify(idToken).then(function (res) {
      if (res && res.ok) {
        currentUser = {
          email: res.email, name: res.name, picture: res.picture || "",
          role: res.role || "staff", idToken: idToken, ts: Date.now(),
        };
        writeSession(currentUser, remember);
        revealPage();
        // 画面にユーザー情報を反映させたいページ向け
        try { window.dispatchEvent(new CustomEvent("miwa-auth", { detail: currentUser })); } catch (e) {}
      } else {
        var reason = (res && res.reason) || "";
        var text = reason === "not_allowed"
          ? (CFG.UNAUTHORIZED_MSG || "このアカウントは許可されていません。")
            + (res.email ? "<br><small>" + res.email + "</small>" : "")
          : (res && res.message) || "サインインできませんでした。";
        // ボタンを戻す
        showLogin();
        setMsg(text, "err");
        try { if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect(); } catch (e) {}
      }
    });
  }

  // ===================================================================
  //  起動
  // ===================================================================
  function loadGisScript() {
    if (document.getElementById("ma-gis-script")) return;
    var s = document.createElement("script");
    s.id = "ma-gis-script"; s.src = "https://accounts.google.com/gsi/client"; s.async = true; s.defer = true;
    document.head.appendChild(s);
  }

  function start() {
    // 設定なし → 案内
    if (!CFG.CLIENT_ID) { showSetupNeeded(); return; }
    // リダイレクト方式サインインから戻ってきた → トークンを処理
    if (consumeRedirectResult()) return;
    // 既にセッションあり → そのまま入室（無期限・手動ログアウトまで）
    if (currentUser && currentUser.email) {
      try { window.dispatchEvent(new CustomEvent("miwa-auth", { detail: currentUser })); } catch (e) {}
      return;
    }
    // 未ログイン → ゲート表示
    loadGisScript();
    showLogin();
  }

  // body 準備前に走っても安全なように
  if (document.readyState === "loading") {
    // ページ本体が描画される前に hide できるよう、即時にも一度試す
    document.addEventListener("DOMContentLoaded", start);
    if (!CFG.CLIENT_ID || !readSession()) { try { hidePage(); } catch (e) {} }
  } else {
    start();
  }
})();
