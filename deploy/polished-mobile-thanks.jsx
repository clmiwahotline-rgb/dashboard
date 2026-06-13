// モバイル版 ─ ありがとうカード（閲覧＋カードコメント）
// PC版と同じ：GAS(フォーム連携シート)から閲覧、コメントは共有クラウドへ

const M_ARIGATOU_GAS = "https://script.google.com/macros/s/AKfycbxCHJ4OB8uYtdEflKyld4h3oitjW2Tr80UihXnVTd_jyUREAWz0qF5ebGzJpUhq2eQh/exec";
const M_COMMENT_SHEET = "ありがとうコメント";

const M_KIND = {
  "お客様からのありがとう": { e: "🙏", c: "#2a6fdb", b: "#e7f0fd" },
  "接客対応": { e: "😊", c: "#2a6fdb", b: "#e7f0fd" },
  "お客様からの苦情・不満": { e: "⚠️", c: "#c5221f", b: "#fde2e2" },
  "チームワーク": { e: "🤝", c: "#9a6700", b: "#fef3cd" },
  "業務改善": { e: "💡", c: "#1a73e8", b: "#e3f0fd" },
  "サポート": { e: "🙌", c: "#1e8e3e", b: "#e6f4ea" },
};
const mKindCfg = (k) => M_KIND[k] || { e: "📌", c: "#5f6368", b: "#eef0f2" };
const mCardKey = (card) => {
  const s = `${card.store || ""}|${card.date || ""}|${card.content || ""}`;
  let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return "k" + (h >>> 0).toString(36);
};
const mFmtJst = (d) => {
  if (!d) return ""; const dt = new Date(d); if (isNaN(dt.getTime())) return String(d).slice(0, 16).replace("T", " ");
  return dt.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
};

const M_THX_SEED = [];

const MThxCard = ({ card, comments, onAdd }) => {
  const cfg = mKindCfg(card.kind);
  const [who, setWho] = React.useState("");
  const [text, setText] = React.useState("");
  const submit = () => { if (!text.trim()) return; onAdd({ who: who.trim(), text: text.trim() }); setText(""); };
  return (
    <div className="m-thx">
      <div className="m-thx-head">
        <div className="m-thx-emoji" style={{ background: cfg.b }}>{cfg.e}</div>
        <div className="m-thx-meta">
          <div className="m-thx-kind" style={{ color: cfg.c }}>{card.kind}</div>
          <div className="m-thx-time">{mFmtJst(card.date)}</div>
        </div>
        <StoreTag name={card.store} />
      </div>
      <div className="m-thx-text">{card.content}</div>
      {comments.length > 0 && (
        <div className="m-thx-cmts">
          {comments.map((c) => <div key={c.id} className="m-thx-cmt"><b>{c.who || "匿名"}</b>　{c.text}</div>)}
        </div>
      )}
      <div className="m-thx-cmtform">
        <input style={{ flex: "0 0 78px" }} placeholder="名前" value={who} onChange={(e) => setWho(e.target.value)} />
        <input placeholder="コメントを追加…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
        <button onClick={submit} disabled={!text.trim()}>追加</button>
      </div>
    </div>
  );
};

const MThanks = ({ registerHeader, registerFab }) => {
  const [rows, setRows] = React.useState(() => { try { const s = localStorage.getItem("miwa.arigatou.v1"); if (s) return JSON.parse(s); } catch {} return M_THX_SEED; });
  const [comments, setComments] = React.useState(() => { try { return JSON.parse(localStorage.getItem("miwa.arigatou.comments.v1")) || []; } catch { return []; } });
  const [kind, setKind] = React.useState("all");
  const [loading, setLoading] = React.useState(true);
  const cloudOn = React.useRef(typeof cloudEnabled === "function" && cloudEnabled()).current;

  React.useEffect(() => { registerHeader && registerHeader({ title: "ありがとうカード", sub: "全店の良い取り組み" }); registerFab && registerFab(null); }, []);

  // GASからカード同期
  React.useEffect(() => {
    let c = false;
    fetch(M_ARIGATOU_GAS, { redirect: "follow" }).then((r) => r.json()).then((data) => {
      if (c || !Array.isArray(data)) return;
      setRows(data); try { localStorage.setItem("miwa.arigatou.v1", JSON.stringify(data)); } catch {}
    }).catch(() => {}).finally(() => { if (!c) setLoading(false); });
    return () => { c = true; };
  }, []);

  // コメント同期（共有クラウド）
  React.useEffect(() => {
    try { localStorage.setItem("miwa.arigatou.comments.v1", JSON.stringify(comments)); } catch {}
  }, [comments]);
  React.useEffect(() => {
    if (!cloudOn) return; let c = false;
    (async () => { const remote = await cloudGet(M_COMMENT_SHEET); if (!c && remote != null) setComments(remote.map((x) => ({ ...x, ts: Number(x.ts) || 0 }))); })();
    return () => { c = true; };
  }, []);

  const byKey = React.useMemo(() => { const m = {}; comments.forEach((c) => { (m[c.cardKey] = m[c.cardKey] || []).push(c); }); Object.values(m).forEach((a) => a.sort((x, y) => (x.ts || 0) - (y.ts || 0))); return m; }, [comments]);
  const addComment = (cardKey, c) => {
    const note = { id: "ac" + Date.now() + Math.random().toString(36).slice(2, 5), cardKey, who: c.who || "", text: c.text, ts: Date.now() };
    setComments((p) => [...p, note]);
    if (cloudOn) cloudAdd(M_COMMENT_SHEET, note);
  };

  const kinds = ["all", ...Object.keys(M_KIND)];
  const filtered = rows.filter((r) => kind === "all" ? true : r.kind === kind);
  const sorted = [...filtered].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  return (
    <div>
      <div className="m-chips">
        {kinds.map((k) => {
          const n = k === "all" ? rows.length : rows.filter((r) => r.kind === k).length;
          return <button key={k} className={`m-chip ${kind === k ? "active" : ""}`} onClick={() => setKind(k)}>{k === "all" ? "すべて" : (mKindCfg(k).e + " " + k.replace("お客様からの", ""))} {n}</button>;
        })}
      </div>
      {loading && rows.length === 0 ? <div className="m-loading"><div className="m-spinner"></div>読み込み中…</div>
        : sorted.length === 0 ? <div className="m-empty" style={{ marginTop: 30 }}>カードがありません</div>
        : sorted.map((card, i) => { const ck = mCardKey(card); return <MThxCard key={ck + "_" + i} card={card} comments={byKey[ck] || []} onAdd={(c) => addComment(ck, c)} />; })}
      <div style={{ height: 12 }}></div>
    </div>
  );
};

window.MThanks = MThanks;
