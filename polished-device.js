// みわダッシュボード ─ 端末自動判定 & 振り分け（全ページ共通・最優先で読み込む）
// =====================================================================
//  スマホ → モバイル版（モバイル.html）／ PC・タブレット → PC版 へ自動誘導。
//  - 端末が変わらなければ往復しない（ループしない）安全設計
//  - 一時的な手動切替: URL に ?view=pc / ?view=mobile を付けるとその表示で固定
//  - 端末ごとに常に最適表示（手動選択は記憶しない＝ユーザー設定どおり）
// =====================================================================
(function () {
  var MOBILE_PAGE = "モバイル.html";

  function isMobile() {
    var ua = navigator.userAgent || "";
    var phoneUA = /Android.+Mobile|iPhone|iPod|webOS|BlackBerry|IEMobile|Opera Mini|Mobile.+Firefox/i.test(ua);
    // iPad（タブレット）はPC版。狭い画面＋タッチも携帯とみなす
    var narrowTouch = window.matchMedia("(max-width: 760px)").matches
      && (navigator.maxTouchPoints || 0) > 1;
    return phoneUA || narrowTouch;
  }

  // 認証処理(polished-auth.js)がログイン後に端末振り分けを行えるよう公開
  window.MiwaDevice = { isMobile: isMobile, MOBILE_PAGE: MOBILE_PAGE };

  try {
    // リダイレクト方式サインインで #id_token=… を載せて戻ってきた時は、
    // 認証処理がトークンを消費するまで振り分けない。ここで飛ばすと URL の
    // #id_token が消えてしまい、スマホで永久にログインできなくなる。
    if (/[#&]id_token=/.test(window.location.hash || "")) return;

    var params = new URLSearchParams(window.location.search);
    var view = params.get("view"); // "pc" | "mobile" | null
    var here = decodeURIComponent((window.location.pathname.split("/").pop() || ""));
    var onMobilePage = here === MOBILE_PAGE;
    var mobile = isMobile();

    // 手動固定が指定されていればリダイレクトしない
    if (view === "pc" || view === "mobile") return;

    if (mobile && !onMobilePage) {
      // スマホがPC版を開いた → モバイル版へ
      window.location.replace(MOBILE_PAGE);
    } else if (!mobile && onMobilePage) {
      // PCがモバイル版を開いた → PC版（トップ）へ
      window.location.replace("index.html");
    }
  } catch (e) {
    /* 失敗しても通常表示を妨げない */
  }
})();
