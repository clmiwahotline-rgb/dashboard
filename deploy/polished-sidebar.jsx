// Shared sidebar — used by both Dashboard.html and 売上レポート.html

// 赤丸バッジ（新着）の集計元：各ページが localStorage に保存する行データ
const BADGE_SOURCES = {
  board:    "miwa.board.v1",
  feedback: "miwa.feedback.v3",
  claim:    "miwa.claim.v1",
  stain:    "miwa.stain.v1",
  thanks:   "miwa.arigatou.v1",
};
const seenKey = (id) => `miwa.${id}.seenCount.v1`;
const readCount = (key) => {
  try { const a = JSON.parse(localStorage.getItem(key)); return Array.isArray(a) ? a.length : 0; }
  catch { return 0; }
};

window.AppSidebar = ({ active = "dashboard" }) => {
  const items = [
    { group: "メイン", items: [
      { id: "dashboard", label: "ダッシュボード", icon: Ico.grid, href: "index.html" },
      { id: "board",     label: "共有ボード",     icon: Ico.board, href: encodeURIComponent("共有ボード.html") },
      { id: "sales",     label: "売上レポート",   icon: Ico.chart, href: encodeURIComponent("売上レポート.html") },
    ]},
    { group: "報告", items: [
      { id: "feedback",  label: "フィードバック",   icon: Ico.feedback, href: "フィードバック.html" },
      { id: "claim",     label: "クレーム・事故品", icon: Ico.alert, href: encodeURIComponent("クレーム・事故品.html") },
      { id: "stain",     label: "シミ抜き報告", icon: Ico.spot,    href: "シミ抜き報告.html" },
      { id: "factory",   label: "工場報告",     icon: Ico.factory, href: encodeURIComponent("工場報告.html") },
      { id: "vehicle",   label: "車両管理",     icon: Ico.truck, href: encodeURIComponent("車両管理.html") },
      { id: "ai-report", label: "AI レポート",  icon: Ico.sparkle, href: "AIレポート.html" },
    ]},
    { group: "社内", items: [
      { id: "price",    label: "料金表",           icon: Ico.price, href: encodeURIComponent("料金表.html") },
      { id: "shift",     label: "シフト",           icon: Ico.store, href: encodeURIComponent("シフト.html") },
      { id: "invoice",   label: "請求書管理",       icon: Ico.invoice, href: encodeURIComponent("請求書管理.html") },
      { id: "thanks",    label: "ありがとうカード", icon: Ico.heart, href: encodeURIComponent("ありがとうカード.html") },
      { id: "notice",    label: "お知らせ",         icon: Ico.bell, href: encodeURIComponent("お知らせ.html") },
      { id: "news",      label: "業界ニュース",     icon: Ico.news, href: encodeURIComponent("業界ニュース.html") },
      { id: "faq",       label: "FAQ管理",          icon: Ico.faq, href: encodeURIComponent("FAQ管理.html") },
    ]},
    { group: "設定", items: [
      { id: "account",   label: "アカウント", icon: Ico.cog },
    ]},
  ];

  const [open, setOpen] = React.useState(false);
  const [logoOk, setLogoOk] = React.useState(true);
  const [logoLoaded, setLogoLoaded] = React.useState(false);

  // ログイン中ユーザー（polished-auth.js）
  const authUser = (window.MiwaAuth && window.MiwaAuth.user && window.MiwaAuth.user()) || null;
  const isAdmin = !!(window.MiwaAuth && window.MiwaAuth.isAdmin && window.MiwaAuth.isAdmin());

  // 「設定」グループ：アカウント管理は管理者のみ表示／リンク
  const visibleItems = items
    .map((g) => {
      if (g.group !== "設定") return g;
      const gi = g.items
        .filter((it) => it.id !== "account" || isAdmin)
        .map((it) => it.id === "account"
          ? { ...it, label: "アカウント管理", href: encodeURIComponent("アカウント管理.html") }
          : it);
      return { ...g, items: gi };
    })
    .filter((g) => g.items.length > 0);

  // スマホ端末判定（device.js と同条件）→ スマホでPC版を見ている時だけ「スマホ版に戻る」を表示
  const isPhone = React.useMemo(() => {
    try {
      const ua = navigator.userAgent || "";
      const phoneUA = /Android.+Mobile|iPhone|iPod|webOS|BlackBerry|IEMobile|Opera Mini|Mobile.+Firefox/i.test(ua);
      const narrowTouch = window.matchMedia("(max-width: 760px)").matches && (navigator.maxTouchPoints || 0) > 1;
      return phoneUA || narrowTouch;
    } catch { return false; }
  }, []);

  // ── 新着バッジ集計（前回そのページを見た時より増えた件数）──
  const [badges, setBadges] = React.useState({});
  React.useEffect(() => {
    const compute = () => {
      const next = {};
      for (const [id, key] of Object.entries(BADGE_SOURCES)) {
        const total = readCount(key);
        if (id === active) {
          // 今そのページを見ている → 全件を既読にしてバッジ 0
          try { localStorage.setItem(seenKey(id), String(total)); } catch {}
          next[id] = 0;
        } else {
          const seen = parseInt(localStorage.getItem(seenKey(id)) || "0", 10);
          next[id] = Math.max(0, total - seen);
        }
      }
      setBadges(next);
    };
    compute();
    // 別ページ／別タブでの更新と、同タブの自動同期に追従
    window.addEventListener("storage", compute);
    const t = setInterval(compute, 4000);
    return () => { window.removeEventListener("storage", compute); clearInterval(t); };
  }, [active]);

  return (
    <>
      <button className="mobile-menu" onClick={() => setOpen(!open)} aria-label="メニュー">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M3 12h18M3 18h18"/>
        </svg>
      </button>

      {open && <div className="mobile-scrim" onClick={() => setOpen(false)}/>}

      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark" style={logoOk ? { background: "transparent", boxShadow: "none", padding: 0 } : null}>
            {logoOk
              ? <img src="logo.png" alt="クリーニングみわ"
                     onError={() => setLogoOk(false)}
                     onLoad={() => setLogoLoaded(true)}
                     style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 10, display: "block",
                              opacity: logoLoaded ? 1 : 0, transition: "opacity 0.45s ease" }} />
              : "M"}
          </div>
          <div>
            <div className="brand-name">クリーニングみわ</div>
            <div className="brand-sub">全店舗・工場・スタッフ 統合管理</div>
          </div>
        </div>

        {visibleItems.map((g, gi) => (
          <div key={gi} className="nav-group">
            <div className="nav-label">{g.group}</div>
            {g.items.map((it) => {
              const isActive = it.id === active;
              const badge = badges[it.id] || 0;
              const inner = (
                <>
                  {it.icon()}
                  <span>{it.label}</span>
                  {badge > 0 && <span className="nav-badge">{badge}</span>}
                </>
              );
              return it.href ? (
                <a key={it.id} href={it.href}
                   className={`nav-item ${isActive ? "active" : ""}`}
                   style={{ textDecoration: "none" }}>
                  {inner}
                </a>
              ) : (
                <div key={it.id} className={`nav-item ${isActive ? "active" : ""}`}>
                  {inner}
                </div>
              );
            })}
          </div>
        ))}

        {isPhone && (
          <a className="sb-to-mobile" href={encodeURIComponent("モバイル.html") + "?view=mobile"}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="2.5" width="12" height="19" rx="2.5"/><line x1="10.5" y1="18.5" x2="13.5" y2="18.5"/>
            </svg>
            <span>スマホ版に戻る</span>
          </a>
        )}

        {authUser && (
          <div className="sb-user">
            <div className="sb-user-av">
              {authUser.picture
                ? <img src={authUser.picture} alt="" referrerPolicy="no-referrer" />
                : (authUser.name || authUser.email || "?").slice(0, 1)}
            </div>
            <div className="sb-user-meta">
              <div className="sb-user-name">{authUser.name || authUser.email}{isAdmin && <span className="sb-user-role">管理者</span>}</div>
              <div className="sb-user-mail">{authUser.email}</div>
            </div>
            <button className="sb-logout" title="ログアウト"
                    onClick={() => { if (window.MiwaAuth) window.MiwaAuth.logout(); }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        )}

      </aside>
    </>
  );
};
