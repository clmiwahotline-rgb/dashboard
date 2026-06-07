// モバイル版 ─ アプリシェル（下部タブ：ホーム/業務メニュー/シフト/お知らせ）
// 業務メニューから クレーム・ありがとう などのサブ画面／各ページへ遷移

const M_ICONS = {
  home: (a) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.3 : 1.9}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>,
  menu: (a) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.3 : 1.9}><rect x="3" y="3" width="7" height="7" rx="1.6" /><rect x="14" y="3" width="7" height="7" rx="1.6" /><rect x="3" y="14" width="7" height="7" rx="1.6" /><rect x="14" y="14" width="7" height="7" rx="1.6" /></svg>,
  shift: (a) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.3 : 1.9}><rect x="3" y="4.5" width="18" height="16" rx="2.2" /><path d="M3 9h18M8 2.5v4M16 2.5v4" /></svg>,
  news: (a) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.3 : 1.9}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9h10M7 13h10M7 17h6" /></svg>,
};
const M_TABS = [
  { id: "home", label: "ホーム", comp: "MHome" },
  { id: "menu", label: "業務メニュー", comp: "MMenu" },
  { id: "shift", label: "シフト", comp: "MShift" },
  { id: "news", label: "お知らせ", comp: "MNews" },
];
// サブ画面（タブバーには出さず、業務メニュー等から遷移）
const M_SUBVIEWS = { claims: "MClaims", thanks: "MThanks", about: "MAbout" };
const M_TAB_TITLE = { home: "みわダッシュボード", menu: "業務メニュー", shift: "シフト", news: "お知らせ・ニュース", claims: "クレーム・事故品", thanks: "ありがとうカード", about: "アカウント・その他" };
// サブ画面で押されたとき、下部タブのどれをハイライトするか
const M_PARENT_TAB = { claims: "menu", thanks: "menu", about: "menu" };

const MApp = () => {
  const initial = (() => {
    const h = (location.hash || "").replace("#", "");
    if (M_TABS.some((t) => t.id === h) || M_SUBVIEWS[h]) return h;
    return "home";
  })();
  const [view, setView] = React.useState(initial);
  const [header, setHeader] = React.useState(null); // {title, sub}
  const [fab, setFab] = React.useState(null);        // fn | null
  const scrollRef = React.useRef(null);

  const go = React.useCallback((v) => { setHeader(null); setFab(null); setView(v); }, []);

  React.useEffect(() => {
    if (location.hash !== "#" + view) history.replaceState(null, "", "#" + view);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [view]);

  // ブラウザ戻る → ホームへ
  React.useEffect(() => {
    const onPop = () => { const h = (location.hash || "").replace("#", ""); setHeader(null); setFab(null); setView(M_TABS.some((t) => t.id === h) || M_SUBVIEWS[h] ? h : "home"); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const registerHeader = React.useCallback((info) => {
    setHeader((prev) => (JSON.stringify(prev) === JSON.stringify(info) ? prev : info));
  }, []);
  const registerFab = React.useCallback((fn) => { setFab(() => fn || null); }, []);

  const claimUnresolved = (() => { try { const v = JSON.parse(localStorage.getItem("miwa.claim.v1")) || []; return v.filter((c) => ["受付", "対応中"].includes(c.status)).length; } catch { return 0; } })();
  const badges = { menu: claimUnresolved };

  const isSub = !!M_SUBVIEWS[view];
  const activeTab = isSub ? (M_PARENT_TAB[view] || "menu") : view;
  const title = (header && header.title) || M_TAB_TITLE[view];
  const sub = header && header.sub;
  const Comp = window[isSub ? M_SUBVIEWS[view] : M_TABS.find((t) => t.id === view).comp];

  return (
    <div className="m-app">
      <div className="m-header">
        {isSub && (
          <button className="m-header-icon" onClick={() => go(M_PARENT_TAB[view] || "home")} aria-label="戻る" style={{ marginRight: -2 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
        )}
        <div style={{ minWidth: 0 }}>
          <div className="m-header-title">{view === "home" ? "🧺 みわ" : title}</div>
          {(sub || view === "home") && <div className="m-header-sub">{sub || "クリーニングみわ 管理ダッシュボード"}</div>}
        </div>
        <div className="m-header-spacer"></div>
        <button className="m-header-icon" onClick={() => go("about")} title="アカウント・その他" aria-label="アカウント・その他">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="8" r="3.4" /><path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" /></svg>
        </button>
        <a className="m-header-icon" href="index.html?view=pc" title="PC版を見る" style={{ textDecoration: "none", fontSize: 11, fontWeight: 800 }}>PC</a>
      </div>

      <div className="m-scroll" ref={scrollRef}>
        {Comp ? <Comp go={go} registerHeader={registerHeader} registerFab={registerFab} /> : <div className="m-loading">読み込みエラー</div>}
      </div>

      {fab && <button className="m-fab" onClick={() => fab()} aria-label="新規追加"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M12 5v14M5 12h14" /></svg></button>}

      <div className="m-tabbar">
        {M_TABS.map((t) => {
          const active = activeTab === t.id;
          return (
            <button key={t.id} className={`m-tab ${active ? "active" : ""}`} onClick={() => go(t.id)}>
              {M_ICONS[t.id](active)}
              <span className="m-tab-label">{t.label}</span>
              {badges[t.id] > 0 && <span className="m-tab-dot">{badges[t.id] > 9 ? "9+" : badges[t.id]}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// 画面が真っ白で止まらないように：どこか1タブがエラーでも復帰画面を出す
class MErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err: err }; }
  componentDidCatch(err, info) { try { console.error("MApp error:", err, info); } catch (e) {} }
  render() {
    if (this.state.err) {
      return (
        <div className="m-app">
          <div className="m-fatal">
            <div className="m-fatal-emoji">🧺</div>
            <div className="m-fatal-title">表示の読み込みに失敗しました</div>
            <div className="m-fatal-sub">通信状況により一部の読み込みに失敗した可能性があります。<br />下のボタンでもう一度お試しください。</div>
            <button className="m-fatal-btn" onClick={() => location.reload()}>再読み込み</button>
            <a className="m-fatal-link" href="index.html?view=pc">PC版を開く</a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// マウント完了を外側のローダー（モバイル.html）へ通知し、白画面タイムアウトを解除
try {
  ReactDOM.createRoot(document.getElementById("m-root")).render(
    <MErrorBoundary><MApp /></MErrorBoundary>
  );
  try { window.__mAppMounted = true; document.dispatchEvent(new Event("m-app-mounted")); } catch (e) {}
} catch (err) {
  try { console.error("mount failed:", err); } catch (e) {}
  var r = document.getElementById("m-root");
  if (r) r.innerHTML = '<div class="m-app"><div class="m-fatal"><div class="m-fatal-emoji">🧺</div><div class="m-fatal-title">表示の読み込みに失敗しました</div><div class="m-fatal-sub">通信状況により読み込みに失敗した可能性があります。もう一度お試しください。</div><button class="m-fatal-btn" onclick="location.reload()">再読み込み</button><a class="m-fatal-link" href="index.html?view=pc">PC版を開く</a></div></div>';
}
