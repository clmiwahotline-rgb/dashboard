// モバイル版 ─ 業務メニュー（各機能へのリンク／サブ画面遷移）

const M_MENU_ITEMS = [
  // in-app … アプリ内のモバイル画面へ
  { key: "claims", icon: "⚠️", label: "クレーム・事故品", sub: "入力・確認", kind: "view", target: "claims", accent: "#c5221f", bg: "#fde2e2" },
  { key: "thanks", icon: "🙏", label: "ありがとうカード", sub: "閲覧・コメント", kind: "view", target: "thanks", accent: "#1e8e3e", bg: "#e6f4ea" },
  // external … PC版ページへ
  { key: "board", icon: "📌", label: "共有ボード", sub: "投稿・添付", kind: "page", target: "共有ボード.html", accent: "#2a6fdb", bg: "#e7f0fd" },
  { key: "sales", icon: "💰", label: "売上レポート", sub: "店舗別・昨対比", kind: "page", target: "売上レポート.html", accent: "#9a6700", bg: "#fef3cd" },
  { key: "stain", icon: "🧴", label: "シミ抜き報告", sub: "処理・除去率", kind: "page", target: "シミ抜き報告.html", accent: "#1a73e8", bg: "#e3f0fd" },
  { key: "factory", icon: "🏭", label: "工場報告", sub: "生産性・工数", kind: "page", target: "工場報告.html", accent: "#8430ce", bg: "#f3e8fd" },
  { key: "feedback", icon: "💬", label: "フィードバック", sub: "改善・原因", kind: "page", target: "フィードバック.html", accent: "#be3a82", bg: "#fde2ef" },
  { key: "vehicle", icon: "🚚", label: "車両管理", sub: "期限・給油・整備", kind: "page", target: "車両管理.html", accent: "#d9730a", bg: "#fdebcf" },
  { key: "invoice", icon: "🧾", label: "請求書管理", sub: "入金待ち・PDF", kind: "page", target: "請求書管理.html", accent: "#0b8043", bg: "#e6f4ea" },
  { key: "report", icon: "📑", label: "AIレポート", sub: "自動分析・出力", kind: "page", target: "AIレポート.html", accent: "#0f9d8f", bg: "#d9f3ef" },
  { key: "about", icon: "👤", label: "アカウント・その他", sub: "情報・報告・説明書", kind: "view", target: "about", accent: "#5f6368", bg: "#eef0f2" },
];

const MMenu = ({ go, registerHeader, registerFab }) => {
  React.useEffect(() => { registerHeader && registerHeader({ title: "業務メニュー", sub: "各機能を開く" }); registerFab && registerFab(null); }, []);
  const open = (it) => {
    if (it.kind === "view") go(it.target);
    else location.href = encodeURIComponent(it.target) + "?view=pc";
  };
  const pcBadge = <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-mute)", background: "var(--card-2)", borderRadius: 999, padding: "2px 8px", marginTop: 4, display: "inline-block" }}>PCページ</span>;
  // 未解決クレーム数バッジ
  const claimN = (() => { try { return (JSON.parse(localStorage.getItem("miwa.claim.v1")) || []).filter((c) => ["受付", "対応中"].includes(c.status)).length; } catch { return 0; } })();
  const badge = { claims: claimN };

  return (
    <div>
      <div className="m-menu-grid">
        {M_MENU_ITEMS.map((it) => (
          <button key={it.key} className="m-menu-card" onClick={() => open(it)}>
            <div className="m-menu-ic" style={{ background: it.bg }}>{it.icon}{badge[it.key] > 0 && <span className="m-menu-badge">{badge[it.key]}</span>}</div>
            <div className="m-menu-label">{it.label}</div>
            <div className="m-menu-sub">{it.sub}</div>
            {it.kind === "page" && pcBadge}
          </button>
        ))}
      </div>
      <div className="m-menu-note">📌 共有ボード・売上などはPC版ページで開きます。クレーム／ありがとうはスマホ画面で操作できます。</div>
      <div style={{ height: 12 }}></div>
    </div>
  );
};

window.MMenu = MMenu;
