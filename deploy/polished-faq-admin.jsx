// FAQ管理 — ダッシュボードのShell（サイドバー＋ヘッダ）の中に
// 既存の管理画面UI（faq-admin.js）をマウントする。
// ログインできる人は全員アクセス可（管理者限定にはしない）。

// ▼ スタッフ用FAQチャット（鍵なし・別入口）のURL
//   本番では GitHub Pages の公開URLに差し替える。
//   未設定/差し替え前は、プロジェクト内のFAQデモを開く。
const FAQ_CHAT_URL = "formsite/FAQ.html";

const FaqAdminPage = () => {
  const mountRef = React.useRef(null);

  React.useEffect(() => {
    // dangerouslySetInnerHTML で挿入したマークアップに対し、
    // 既存ロジックの初期化を実行（renderKB / renderUnanswered など）
    if (window.initFaqAdmin) window.initFaqAdmin();
  }, []);

  return (
    <div className="app">
      <div className="shell">
        <AppSidebar active="faq" />
        <main className="main">
          <div className="greet">
            <div>
              <h1>💬 FAQ管理</h1>
              <div className="sub">社内FAQ AIの知識ベース・未回答対応・資料の一括取り込みを管理します</div>
            </div>
            <div className="right">
              <a className="btn btn-primary" href={FAQ_CHAT_URL} target="_blank" rel="noopener"
                 style={{ textDecoration: "none" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
                スタッフFAQを開く
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2 }}>
                  <path d="M7 17L17 7M9 7h8v8"/>
                </svg>
              </a>
            </div>
          </div>

          <div className="faq-note">
            <b>このページについて：</b> ここで登録した知識は、スタッフ用FAQ（LINE風チャット）の回答に使われます。
            スタッフ用FAQは<b>ログイン不要の別入口</b>、この管理画面は<b>ダッシュボードのログインの内側</b>に置いています。
            <br />
            <span style={{ color: "var(--text-muted)" }}>
              ※ 現在の知識データはこの端末に保存されます。全店共有（Googleスプレッドシート化）と書き込みの認証制限は次の段階で対応予定です。
            </span>
          </div>

          <div className="faq-admin">
            <div
              className="faq-inner"
              ref={mountRef}
              dangerouslySetInnerHTML={{ __html: window.FAQ_ADMIN_MARKUP || "" }}
            />
          </div>
        </main>
      </div>
    </div>
  );
};
