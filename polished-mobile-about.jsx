// モバイル版 ─ アカウント・その他（アカウント情報／バージョン／報告フォーム／機能説明書）

const M_APP_VERSION = (typeof window !== "undefined" && window.APP_VERSION) || "2.14";
const M_REPORT_FORM_URL = "https://clmiwahotline-rgb.github.io/formsite/";

const mAboutHue = (s) => { let h = 0; for (let i = 0; i < (s || "").length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; };

const MAbout = ({ registerHeader, registerFab }) => {
  React.useEffect(() => { registerHeader && registerHeader({ title: "アカウント・その他", sub: "" }); registerFab && registerFab(null); }, []);

  const user = (window.MiwaAuth && window.MiwaAuth.user && window.MiwaAuth.user()) || null;
  const isAdmin = !!(window.MiwaAuth && window.MiwaAuth.isAdmin && window.MiwaAuth.isAdmin());
  const name = (user && (user.name || user.email)) || "ゲスト";
  const email = (user && user.email) || "";
  const pic = user && user.picture;
  const hue = mAboutHue(email || name);

  const logout = () => { if (window.MiwaAuth && window.MiwaAuth.logout) window.MiwaAuth.logout(); };

  return (
    <div>
      {/* アカウント情報 */}
      <div className="m-sec-title">👤 アカウント情報</div>
      <div className="m-card">
        <div className="m-card-body">
          <div className="m-acct">
            {pic
              ? <img className="m-acct-av" src={pic} alt="" referrerPolicy="no-referrer" />
              : <div className="m-acct-av m-acct-av-ph" style={{ background: `linear-gradient(135deg, oklch(0.66 0.13 ${hue}), oklch(0.55 0.15 ${(hue + 40) % 360}))` }}>{(name || "?").trim()[0]}</div>}
            <div className="m-acct-info">
              <div className="m-acct-name">{name}</div>
              {email && <div className="m-acct-mail">{email}</div>}
              <span className={`m-acct-role ${isAdmin ? "admin" : ""}`}>{isAdmin ? "管理者" : "スタッフ"}</span>
            </div>
          </div>
          {user
            ? <button className="m-acct-logout" onClick={logout}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                ログアウト
              </button>
            : <div className="m-empty">サインイン情報を取得できませんでした</div>}
        </div>
      </div>

      {/* メニュー：報告フォーム・機能説明書・バージョン */}
      <div className="m-sec-title">🛠 サポート・情報</div>
      <div className="m-card">
        <div className="m-about-list">
          <a className="m-about-row" href={M_REPORT_FORM_URL} target="_blank" rel="noopener noreferrer">
            <span className="m-about-ic" style={{ background: "#fde2ef", color: "#be3a82" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6M9 16h4" /></svg>
            </span>
            <div className="m-about-main"><div className="m-about-label">報告フォーム</div><div className="m-about-sub">不具合・改善の報告を送る</div></div>
            <span className="m-about-ext">↗</span>
          </a>

          <a className="m-about-row" href="機能説明書.html" target="_blank" rel="noopener noreferrer">
            <span className="m-about-ic" style={{ background: "#e3f0fd", color: "#1a73e8" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
            </span>
            <div className="m-about-main"><div className="m-about-label">機能説明書</div><div className="m-about-sub">操作マニュアルを開く</div></div>
            <span className="m-about-ext">↗</span>
          </a>

          <a className="m-about-row" href="更新レポート.html">
            <span className="m-about-ic" style={{ background: "#e6f4ea", color: "#1e8e3e" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" /></svg>
            </span>
            <div className="m-about-main"><div className="m-about-label">バージョン</div><div className="m-about-sub">更新レポート（変更履歴）を見る</div></div>
            <span className="m-about-ver">v{M_APP_VERSION}</span>
          </a>
        </div>
      </div>

      <div className="m-about-foot">クリーニングみわ 管理ダッシュボード ・ v{M_APP_VERSION}</div>
      <div style={{ height: 12 }}></div>
    </div>
  );
};

window.MAbout = MAbout;
