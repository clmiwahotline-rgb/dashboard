// みわダッシュボード ─ サインイン設定（全ページ共通）
// =====================================================================
//  ★★★ ここに Google の「クライアント ID」を貼ってください ★★★
//  作成手順は サインイン設定手順.html を参照（管理者が1回だけ）。
//
//  CLIENT_ID が空の間は、ログイン画面の代わりに「設定が必要です」案内が
//  表示されます（誰も締め出されません）。ID を貼るとログイン必須になります。
// =====================================================================
window.MIWA_AUTH = {
  // 例: "1234567890-abcdefg.apps.googleusercontent.com"
  CLIENT_ID: "223508622692-klja6oqiameuuk767bpgef1i2dkp74lv.apps.googleusercontent.com",

  // 共有API（GAS）の URL。polished-cloud.jsx の CLOUD_API_URL と同じもの。
  GAS_URL: "https://script.google.com/macros/s/AKfycbyvBTM4ZijS0hDjKBVjczQywjXYOZJnszLqgqfTZhsNdfd-GSPQp-LYlRxfCMedkg8/exec",

  // ログイン画面の表記
  BRAND_TITLE: "みわダッシュボード",
  BRAND_SUB: "クリーニングみわ 社内管理システム",

  // 未許可アカウントがログインしたときのメッセージ
  UNAUTHORIZED_MSG: "このアカウントは許可されていません。管理者にご連絡ください。",
};
