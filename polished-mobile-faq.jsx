// モバイル版 ─ FAQ管理（閲覧中心）
// データ: faq-admin.js の localStorage miwa.faq.kb.v1 を共有
//         GAS URL: クラウド "FAQ設定" シートから全端末共有
//   KB: { id, q, a, category, source, addedAt, enabled }
//   UA: { id, question, askedAt, answered, status }
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MFAQ_CHAT_URL  = "../formsite/FAQ.html";
const MFAQ_DEFAULT_GAS = "https://script.google.com/macros/s/AKfycbwgjgqVJNFNnNwNyzc8DsskESrfvoSSTgpK6T2twFPTVyDrhnR2NhNy_CLiajfB1pC_OA/exec";
const MFAQ_LS_KEY    = "miwa.faq.kb.v1";
const MFAQ_CFG_KEY   = "miwa.faq.cloud.v1";
const MFAQ_CFG_SHEET = "FAQ設定";

const mfaqLoadLocal = () => {
  try { const s = localStorage.getItem(MFAQ_LS_KEY); if (s) return JSON.parse(s); } catch (e) {}
  return { knowledgeBase: [], unansweredList: [], statsAnswered: 0 };
};
const mfaqGetGasUrl = () => {
  try { const c = JSON.parse(localStorage.getItem(MFAQ_CFG_KEY)); if (c && c.gasUrl) return c.gasUrl; } catch (e) {}
  return MFAQ_DEFAULT_GAS;
};

// ── データフック ────────────────────────────────────
const useMFaqData = () => {
  const cloudOn = typeof cloudEnabled === "function" && cloudEnabled();
  const [data, setData] = React.useState(mfaqLoadLocal);
  const [gasUrl, setGasUrl] = React.useState(mfaqGetGasUrl);
  const [syncState, setSyncState] = React.useState("idle");

  // クラウドから FAQ GAS URL を取得（共有設定）
  React.useEffect(() => {
    if (!cloudOn) return;
    (async () => {
      const rows = await cloudGet(MFAQ_CFG_SHEET);
      if (rows && rows.length && rows[0].gasUrl) {
        const url = rows[0].gasUrl;
        setGasUrl(url);
        try { localStorage.setItem(MFAQ_CFG_KEY, JSON.stringify({ gasUrl: url, token: rows[0].token || "", enabled: true })); } catch (e) {}
      }
    })();
  }, [cloudOn]);

  // FAQ GAS から知識ベース・未回答リストを取得
  const syncFaq = React.useCallback(async (url) => {
    if (!url) return;
    setSyncState("loading");
    try {
      const [kbData, uaData] = await Promise.all([
        fetch(url + "?action=get_kb").then((r) => r.json()),
        fetch(url + "?action=get_ua").then((r) => r.json()),
      ]);
      const kb = Array.isArray(kbData) ? kbData : data.knowledgeBase;
      const ua = Array.isArray(uaData) ? uaData.map((i) => ({ ...i, answered: i.status === "回答済み" })) : data.unansweredList;
      const next = { knowledgeBase: kb, unansweredList: ua, statsAnswered: data.statsAnswered };
      setData(next);
      try { localStorage.setItem(MFAQ_LS_KEY, JSON.stringify({ ...next, nextId: 100 })); } catch (e) {}
      setSyncState("ok");
    } catch (e) {
      setSyncState("error");
    }
  }, [data]);

  React.useEffect(() => { syncFaq(gasUrl); }, [gasUrl]);

  return { data, syncState, syncFaq: () => syncFaq(gasUrl) };
};

// ── 質問カード ─────────────────────────────────────
const MFaqQuestion = ({ item, showStatus }) => {
  const answered = item.answered || item.status === "回答済み";
  const date = (item.askedAt || "").slice(0, 10);
  return (
    <div className="mfaq-q-card">
      <div className="mfaq-q-head">
        {showStatus && (
          <span className={`mfaq-q-status ${answered ? "ok" : "open"}`}>{answered ? "回答済み" : "未回答"}</span>
        )}
        {date && <span className="mfaq-q-date">{date}</span>}
      </div>
      <div className="mfaq-q-text">{item.question || item.q || "（質問なし）"}</div>
      {answered && item.answer && <div className="mfaq-q-ans">{item.answer}</div>}
    </div>
  );
};

// ── メイン ─────────────────────────────────────────
const MFaq = ({ registerHeader, registerFab }) => {
  const { data, syncState, syncFaq } = useMFaqData();
  const [tab, setTab] = React.useState("unanswered");

  const kb  = data.knowledgeBase  || [];
  const ua  = data.unansweredList || [];
  const statsAnswered = data.statsAnswered || 0;
  const unanswered = ua.filter((i) => !i.answered && i.status !== "回答済み");
  const allQ = [...ua].sort((a, b) => (b.askedAt || "").localeCompare(a.askedAt || ""));

  React.useEffect(() => {
    const sub = syncState === "ok" ? "FAQシステム同期済み"
      : syncState === "loading" ? "🔄 同期中…"
      : syncState === "error" ? "⚠ 接続エラー" : "";
    registerHeader && registerHeader({ title: "FAQ管理", sub });
    registerFab && registerFab(null);
  }, [syncState]);

  return (
    <div>
      {/* スタッフFAQボタン */}
      <a className="mfaq-chat-btn" href={MFAQ_CHAT_URL} target="_blank" rel="noopener noreferrer">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        スタッフFAQを開く
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto" }}><path d="M7 17L17 7M9 7h8v8"/></svg>
      </a>

      {/* KPI */}
      <div className="m-sales-kpis" style={{ marginBottom: 14 }}>
        <div className="m-sales-kpi big">
          <div className="m-sales-kpi-label">登録済み知識</div>
          <div className="m-sales-kpi-val">{kb.length}<span className="u">件</span></div>
          <div className="m-sales-kpi-sub">有効: {kb.filter((k) => k.enabled !== false).length}件</div>
        </div>
        <div className="m-sales-kpi">
          <div className="m-sales-kpi-label">未回答</div>
          <div className="m-sales-kpi-val" style={{ color: unanswered.length > 0 ? "#c5221f" : "#1e8e3e" }}>
            {unanswered.length}<span className="u">件</span>
          </div>
        </div>
        <div className="m-sales-kpi">
          <div className="m-sales-kpi-label">回答済み</div>
          <div className="m-sales-kpi-val">{ua.filter((i) => i.answered || i.status === "回答済み").length}<span className="u">件</span></div>
        </div>
      </div>

      {/* タブ */}
      <div className="m-chips" style={{ marginBottom: 12 }}>
        <button className={`m-chip ${tab === "unanswered" ? "active" : ""}`} onClick={() => setTab("unanswered")}>
          未回答<span className="m-pr-tabn">{unanswered.length}</span>
        </button>
        <button className={`m-chip ${tab === "log" ? "active" : ""}`} onClick={() => setTab("log")}>
          質問ログ<span className="m-pr-tabn">{allQ.length}</span>
        </button>
      </div>

      {/* リスト */}
      {tab === "unanswered" ? (
        unanswered.length === 0
          ? <div className="m-empty" style={{ marginTop: 24 }}>未回答の質問はありません 🎉</div>
          : unanswered.map((item, i) => <MFaqQuestion key={i} item={item} />)
      ) : (
        allQ.length === 0
          ? <div className="m-empty" style={{ marginTop: 24 }}>質問ログがありません</div>
          : allQ.map((item, i) => <MFaqQuestion key={i} item={item} showStatus />)
      )}

      <div style={{ height: 16 }}></div>
    </div>
  );
};

window.MFaq = MFaq;
