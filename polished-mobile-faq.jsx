// モバイル版 ─ FAQ管理（3段階完全版）
// ステージ1〜2: KPI・未回答リスト・質問ログ
// ステージ3:    知識ベース閲覧・検索 ＋ 未回答への回答入力
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MFAQ_CHAT_URL    = "../formsite/FAQ.html";
const MFAQ_KB_GAS      = "https://script.google.com/macros/s/AKfycbzWq4dsfENPZuZ9eGGum5Glg2pDcLf10bL8dJNvJgr66cgUOHAFGWPJNmkRUl3CpAml/exec";
const MFAQ_DEFAULT_GAS = "https://script.google.com/macros/s/AKfycbwgjgqVJNFNnNwNyzc8DsskESrfvoSSTgpK6T2twFPTVyDrhnR2NhNy_CLiajfB1pC_OA/exec";
const MFAQ_LS_KEY      = "miwa.faq.kb.v1";
const MFAQ_CFG_KEY     = "miwa.faq.cloud.v1";
const MFAQ_CFG_SHEET   = "FAQ設定";

const mfaqLoadLocal = () => {
  try { const s = localStorage.getItem(MFAQ_LS_KEY); if (s) return JSON.parse(s); } catch (e) {}
  return { knowledgeBase: [], unansweredList: [], statsAnswered: 0 };
};
const mfaqGetCfg = () => {
  try { return JSON.parse(localStorage.getItem(MFAQ_CFG_KEY)) || {}; } catch (e) { return {}; }
};
const mfaqGetKbGas = () => {
  const cfg = mfaqGetCfg();
  return cfg.gasUrl || MFAQ_KB_GAS;
};
const mfaqGetToken = () => mfaqGetCfg().token || "";
const mfaqGetSuppressed = () => {
  try { const s = localStorage.getItem("miwa.faq.ua.suppressed.v1"); return s ? new Set(JSON.parse(s)) : new Set(); } catch(e) { return new Set(); }
};

// ── データフック ────────────────────────────────────
const useMFaqData = () => {
  const cloudOn = typeof cloudEnabled === "function" && cloudEnabled();
  const [data, setData] = React.useState(mfaqLoadLocal);
  const [kbGasUrl, setKbGasUrl] = React.useState(mfaqGetKbGas);
  const [syncState, setSyncState] = React.useState("idle");

  React.useEffect(() => {
    if (!cloudOn) return;
    (async () => {
      const rows = await cloudGet(MFAQ_CFG_SHEET);
      if (rows && rows.length && rows[0].gasUrl) {
        const url = rows[0].gasUrl;
        setKbGasUrl(url);
        try { localStorage.setItem(MFAQ_CFG_KEY, JSON.stringify({ gasUrl: url, token: rows[0].token || "", enabled: true })); } catch (e) {}
      }
    })();
  }, [cloudOn]);

  const syncFaq = React.useCallback(async (url) => {
    if (!url) return;
    setSyncState("loading");
    try {
      const [kbData, uaData] = await Promise.all([
        fetch(url + "?action=get_kb").then((r) => r.json()),
        fetch(url + "?action=get_ua").then((r) => r.json()),
      ]);
      const suppressed = mfaqGetSuppressed();
      const kb = Array.isArray(kbData) ? kbData : data.knowledgeBase;
      const ua = Array.isArray(uaData)
        ? uaData.filter(i => !suppressed.has((i.q || "").trim())).map((i) => ({ ...i, answered: i.status === "回答済み" }))
        : data.unansweredList;
      const next = { knowledgeBase: kb, unansweredList: ua, statsAnswered: data.statsAnswered };
      setData(next);
      try { localStorage.setItem(MFAQ_LS_KEY, JSON.stringify({ ...next, nextId: 100 })); } catch (e) {}
      setSyncState("ok");
    } catch (e) {
      setSyncState("error");
    }
  }, [data]);

  React.useEffect(() => { syncFaq(kbGasUrl); }, [kbGasUrl]);

  return { data, setData, syncState, kbGasUrl, syncFaq: () => syncFaq(kbGasUrl) };
};

// ── 未回答カード（回答入力付き） ─────────────────────
const MFaqUnansweredCard = ({ item, gasUrl, onAnswered, onDelete }) => {
  const [open, setOpen] = React.useState(false);
  const [ans, setAns] = React.useState("");
  const [cat, setCat] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState("");
  const date = (item.askedAt || item.addedAt || "").slice(0, 10);

  const handleSubmit = async () => {
    if (!ans.trim()) { setErr("回答を入力してください"); return; }
    const token = mfaqGetToken();
    if (!token) { setErr("トークン未設定です（PC版FAQ管理→クラウド設定で確認）"); return; }
    setSaving(true); setErr("");
    try {
      const res = await fetch(gasUrl, {
        method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "answer_ua",
          token,
          ua_id: item.id,
          item: { q: item.question || item.q || "", a: ans, category: cat, source: "モバイル回答", enabled: true }
        })
      });
      const data = await res.json();
      if (!data || !data.ok) throw new Error(data && data.error || "失敗");
      onAnswered && onAnswered(item.id, ans);
      setOpen(false); setAns(""); setCat("");
    } catch (e) {
      setErr("送信エラー: " + e.message);
    } finally { setSaving(false); }
  };

  const handleDelete = () => {
    if (!window.confirm("この質問を未回答リストから削除しますか？")) return;
    try {
      const key = "miwa.faq.ua.suppressed.v1";
      const set = new Set(JSON.parse(localStorage.getItem(key) || "[]"));
      set.add((item.q || item.question || "").trim());
      localStorage.setItem(key, JSON.stringify([...set]));
    } catch(e) {}
    onDelete && onDelete(item.id);
  };

  return (
    <div style={{ background: "var(--card)", borderRadius: 14, marginBottom: 10, border: "1px solid var(--line)", boxShadow: "0 1px 4px rgba(40,55,80,.07)" }}>
      <div style={{ padding: "12px 14px 10px" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span style={{ background: "#fef2f2", color: "#c5221f", fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 20, flexShrink: 0, marginTop: 2 }}>未回答</span>
          {date && <span style={{ fontSize: 11, color: "var(--text-sub)", flexShrink: 0, marginTop: 3 }}>{date}</span>}
          <button onClick={handleDelete} style={{ marginLeft: "auto", background: "none", border: "none", fontSize: 16, cursor: "pointer", padding: "0 4px", color: "#c5221f" }}>🗑</button>
        </div>
        <div style={{ marginTop: 6, fontSize: 14.5, fontWeight: 600, lineHeight: 1.5, color: "var(--text)", cursor: "pointer" }} onClick={() => setOpen(o => !o)}>{item.question || item.q || "（質問なし）"}</div>
        <div style={{ marginTop: 6, display: "flex", justifyContent: "flex-end", cursor: "pointer" }} onClick={() => setOpen(o => !o)}>
          <span style={{ fontSize: 12, color: "var(--brand)", fontWeight: 700 }}>{open ? "▲ 閉じる" : "✏️ 回答する"}</span>
        </div>
      </div>

      {open && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--line)" }}>
          <div style={{ marginTop: 10, marginBottom: 4, fontSize: 12, fontWeight: 600, color: "var(--text-sub)" }}>カテゴリ（任意）</div>
          <input
            type="text" placeholder="例：料金・受付・クリーニング"
            value={cat} onChange={e => setCat(e.target.value)}
            style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--surface)", color: "var(--text)", boxSizing: "border-box" }}
          />
          <div style={{ marginTop: 10, marginBottom: 4, fontSize: 12, fontWeight: 600, color: "var(--text-sub)" }}>回答 <span style={{ color: "#c5221f" }}>*</span></div>
          <textarea
            rows={4} placeholder="スタッフへの回答を入力…"
            value={ans} onChange={e => { setAns(e.target.value); setErr(""); }}
            style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--surface)", color: "var(--text)", resize: "none", boxSizing: "border-box" }}
          />
          {err && <div style={{ fontSize: 12, color: "#c5221f", marginTop: 4 }}>{err}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={() => setOpen(false)}
              style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "1.5px solid var(--line)", background: "var(--surface)", color: "var(--text-sub)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              キャンセル
            </button>
            <button onClick={handleSubmit} disabled={saving}
              style={{ flex: 2, padding: "9px 0", borderRadius: 10, border: "none", background: saving ? "#a8d5bb" : "var(--brand)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer" }}>
              {saving ? "送信中…" : "✅ 回答して知識に追加"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── 質問ログカード ──────────────────────────────────
const MFaqLogCard = ({ item }) => {
  const answered = item.answered || item.status === "回答済み";
  const date = (item.ts || item.askedAt || item.addedAt || "").slice(0, 10);
  const ansText = item.a || item.answer || "";
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ background: "var(--card)", borderRadius: 14, marginBottom: 8, border: "1px solid var(--line)", overflow: "hidden" }}>
      <div style={{ padding: "11px 14px", cursor: ansText ? "pointer" : "default" }} onClick={() => ansText && setOpen(o => !o)}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 5 }}>
          <span style={{ background: answered ? "#e6f4ea" : "#fef2f2", color: answered ? "#1e8e3e" : "#c5221f", fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>{answered ? "回答済み" : "未回答"}</span>
          {item.store && <span style={{ fontSize: 11, color: "var(--text-sub)", background: "#f1f5f9", padding: "1px 6px", borderRadius: 10 }}>{item.store}</span>}
          {date && <span style={{ fontSize: 11, color: "var(--text-sub)" }}>{date}</span>}
          {ansText && <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--brand)" }}>{open ? "▲" : "▼"}</span>}
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--text)" }}>{item.q || item.question || "（質問なし）"}</div>
      </div>
      {open && ansText && (
        <div style={{ padding: "8px 14px 12px", borderTop: "1px solid var(--line)", fontSize: 13, color: "var(--text-sub)", lineHeight: 1.6 }}>
          {ansText}
        </div>
      )}
    </div>
  );
};

// ── 知識ベースカード ────────────────────────────────
const MFaqKbCard = ({ item, gasUrl, onApprove }) => {
  const [open, setOpen] = React.useState(false);
  const [approving, setApproving] = React.useState(false);

  const handleApprove = async () => {
    const token = mfaqGetToken();
    if (!token) { alert("トークン未設定（PC版FAQ管理→クラウド設定）"); return; }
    const newApproved = !item.approved;
    setApproving(true);
    try {
      await fetch(gasUrl, {
        method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "update_kb", token, item: { ...item, approved: newApproved, approvedAt: newApproved ? new Date().toISOString().slice(0,10) : "" } })
      }).then(r => r.json());
      onApprove && onApprove(item.id, newApproved);
    } catch(e) { alert("エラー: " + e.message); }
    finally { setApproving(false); }
  };

  return (
    <div style={{ background: "var(--card)", borderRadius: 14, marginBottom: 8, border: "1px solid var(--line)", overflow: "hidden" }}>
      <div style={{ padding: "11px 14px", cursor: "pointer" }} onClick={() => setOpen(o => !o)}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 5, flexWrap: "wrap" }}>
          {item.category && (
            <span style={{ background: "#e8f5e9", color: "#1a7a47", fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 20 }}>{item.category}</span>
          )}
          {item.approved && (
            <span style={{ background: "#dcfce7", color: "#166534", fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>✅ 承認済み</span>
          )}
          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--brand)" }}>{open ? "▲" : "▼"}</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.5, color: "var(--text)" }}>Q: {item.q || "（質問なし）"}</div>
        {!open && <div style={{ fontSize: 12.5, color: "var(--text-sub)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>A: {item.a || "―"}</div>}
      </div>
      {open && (
        <div style={{ padding: "8px 14px 12px", borderTop: "1px solid var(--line)" }}>
          <div style={{ fontSize: 13.5, color: "var(--text)", lineHeight: 1.7 }}>{item.a}</div>
          {item.source && <div style={{ fontSize: 11, color: "var(--text-sub)", marginTop: 6 }}>出典: {item.source}</div>}
          <div style={{ marginTop: 12 }}>
            <button onClick={handleApprove} disabled={approving} style={{ padding: "8px 16px", borderRadius: 10, border: item.approved ? "1.5px solid #a7f3d0" : "1.5px solid var(--line)", background: item.approved ? "#dcfce7" : "#f3f4f6", color: item.approved ? "#166534" : "var(--text-sub)", fontSize: 13, fontWeight: 700, cursor: approving ? "default" : "pointer" }}>
              {approving ? "処理中…" : item.approved ? "✅ 承認済み（取消）" : "　承認する　"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── メイン ─────────────────────────────────────────
const MFaq = ({ registerHeader, registerFab }) => {
  const { data, setData, syncState, kbGasUrl, syncFaq } = useMFaqData();
  const [tab, setTab] = React.useState("unanswered");
  const [kbSearch, setKbSearch] = React.useState("");
  const [kbCat, setKbCat] = React.useState("");
  const [faqLog, setFaqLog] = React.useState([]);
  const [logLoading, setLogLoading] = React.useState(false);

  const fetchLog = React.useCallback(async () => {
    if (!kbGasUrl) return;
    setLogLoading(true);
    try {
      const res = await fetch(kbGasUrl, {
        method: "POST", redirect: "follow",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "getFaqLog" })
      }).then(r => r.json());
      if (res && res.ok && Array.isArray(res.logs)) {
        setFaqLog(res.logs);
        try { localStorage.setItem("miwa.faq.log.cache.v1", JSON.stringify(res.logs)); } catch(e) {}
      } else {
        try { const c = localStorage.getItem("miwa.faq.log.cache.v1"); if (c) setFaqLog(JSON.parse(c)); } catch(e) {}
      }
    } catch(e) {
      try { const c = localStorage.getItem("miwa.faq.log.cache.v1"); if (c) setFaqLog(JSON.parse(c)); } catch(e2) {}
    } finally { setLogLoading(false); }
  }, [kbGasUrl]);

  React.useEffect(() => { fetchLog(); }, [kbGasUrl]);
  React.useEffect(() => { if (tab === "log") fetchLog(); }, [tab]);

  const kb  = (data.knowledgeBase  || []).filter(k => k.enabled !== false);
  const ua  = data.unansweredList || [];
  const unanswered = ua.filter((i) => !i.answered && i.status !== "回答済み");
  const logRows = [...faqLog].sort((a, b) => (b.ts || "").localeCompare(a.ts || ""));

  // 知識ベース絞り込み
  const cats = [...new Set(kb.map(k => k.category).filter(Boolean))];
  const kbFiltered = kb.filter(k => {
    const matchCat = !kbCat || k.category === kbCat;
    const q = kbSearch.trim().toLowerCase();
    const matchSearch = !q || (k.q||"").toLowerCase().includes(q) || (k.a||"").toLowerCase().includes(q) || (k.category||"").toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  React.useEffect(() => {
    const sub = syncState === "ok" ? "FAQシステム同期済み"
      : syncState === "loading" ? "🔄 同期中…"
      : syncState === "error" ? "⚠ 接続エラー" : "";
    registerHeader && registerHeader({ title: "FAQ管理", sub });
    registerFab && registerFab(null);
  }, [syncState]);

  const handleAnswered = (id, ans) => {
    setData(prev => ({ ...prev, unansweredList: (prev.unansweredList || []).map(i => i.id === id ? { ...i, answered: true, status: "回答済み", answer: ans } : i) }));
  };
  const handleDelete = (id) => {
    setData(prev => ({ ...prev, unansweredList: (prev.unansweredList || []).filter(i => i.id !== id) }));
  };
  const handleApprove = (id, approved) => {
    setData(prev => ({ ...prev, knowledgeBase: (prev.knowledgeBase || []).map(k => k.id === id ? { ...k, approved, approvedAt: approved ? new Date().toISOString().slice(0,10) : "" } : k) }));
  };

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
          <div className="m-sales-kpi-sub">全体: {(data.knowledgeBase||[]).length}件</div>
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
          未回答{unanswered.length > 0 && <span className="m-pr-tabn">{unanswered.length}</span>}
        </button>
        <button className={`m-chip ${tab === "log" ? "active" : ""}`} onClick={() => setTab("log")}>
          質問ログ
        </button>
        <button className={`m-chip ${tab === "kb" ? "active" : ""}`} onClick={() => setTab("kb")}>
          知識ベース{kb.length > 0 && <span className="m-pr-tabn">{kb.length}</span>}
        </button>
      </div>

      {/* 未回答タブ */}
      {tab === "unanswered" && (
        unanswered.length === 0
          ? <div className="m-empty" style={{ marginTop: 24 }}>未回答の質問はありません 🎉</div>
          : unanswered.map((item) => (
              <MFaqUnansweredCard key={item.id} item={item} gasUrl={kbGasUrl} onAnswered={handleAnswered} onDelete={handleDelete} />
            ))
      )}

      {/* 質問ログタブ */}
      {tab === "log" && (
        logLoading
          ? <div className="m-empty" style={{ marginTop: 24 }}>🔄 ログを取得中…</div>
          : logRows.length === 0
            ? <div className="m-empty" style={{ marginTop: 24 }}>質問ログがありません</div>
            : logRows.map((item, i) => <MFaqLogCard key={i} item={item} />)
      )}

      {/* 知識ベースタブ */}
      {tab === "kb" && (
        <div>
          {/* 検索 */}
          <div style={{ position: "relative", marginBottom: 10 }}>
            <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "var(--text-sub)", pointerEvents: "none" }}>🔍</span>
            <input
              type="search" placeholder="キーワードで検索…"
              value={kbSearch} onChange={e => setKbSearch(e.target.value)}
              style={{ width: "100%", padding: "9px 10px 9px 32px", border: "1.5px solid var(--line)", borderRadius: 10, fontSize: 14, background: "var(--surface)", color: "var(--text)", boxSizing: "border-box" }}
            />
          </div>
          {/* カテゴリチップ */}
          {cats.length > 0 && (
            <div className="m-chips" style={{ marginBottom: 12, flexWrap: "wrap" }}>
              <button className={`m-chip ${kbCat === "" ? "active" : ""}`} onClick={() => setKbCat("")}>すべて</button>
              {cats.map(c => (
                <button key={c} className={`m-chip ${kbCat === c ? "active" : ""}`} onClick={() => setKbCat(c)}>{c}</button>
              ))}
            </div>
          )}
          {/* 件数 */}
          <div style={{ fontSize: 12, color: "var(--text-sub)", marginBottom: 8 }}>
            {kbFiltered.length}件 {kbSearch || kbCat ? "（絞り込み中）" : ""}
          </div>
          {kbFiltered.length === 0
            ? <div className="m-empty" style={{ marginTop: 16 }}>{kbSearch || kbCat ? "一致する知識がありません" : "知識ベースが空です"}</div>
            : kbFiltered.map((item) => <MFaqKbCard key={item.id} item={item} gasUrl={kbGasUrl} onApprove={handleApprove} />)
          }
        </div>
      )}

      <div style={{ height: 16 }}></div>
    </div>
  );
};

window.MFaq = MFaq;
