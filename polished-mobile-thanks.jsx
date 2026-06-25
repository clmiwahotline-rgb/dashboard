// モバイル版 ─ ありがとうカード（閲覧＋カードコメント）
// PC版と同じ：GAS(フォーム連携シート)から閲覧、コメントは共有クラウドへ

const M_ARIGATOU_GAS = "https://script.google.com/macros/s/AKfycbxCHJ4OB8uYtdEflKyld4h3oitjW2Tr80UihXnVTd_jyUREAWz0qF5ebGzJpUhq2eQh/exec";
const M_COMMENT_SHEET = "ありがとうコメント";
const M_LIKES_SHEET = "ありがとうリアクション";
const mGetDeviceId = () => {
  let id = ''; try { id = localStorage.getItem("miwa.device.id.v1") || ''; } catch(e) {}
  if (!id) { id = "d" + Date.now().toString(36) + Math.random().toString(36).slice(2,6); try { localStorage.setItem("miwa.device.id.v1", id); } catch(e) {} }
  return id;
};

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

// コメント入力ボトムシート（新規・編集 共通）
const MThxCommentSheet = ({ isEdit, initialWho, initialText, onClose, onSave }) => {
  const [who, setWho] = React.useState(initialWho || "");
  const [text, setText] = React.useState(initialText || "");
  const save = () => { const t = text.trim(); if (!t) return; onSave({ who: who.trim(), text: t }); };
  return ReactDOM.createPortal((
    <div className="m-sheet-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="m-sheet">
        <div className="m-sheet-grab"></div>
        <div className="m-sheet-head">
          <div className="m-sheet-title">{isEdit ? "コメントを編集" : "コメントする"}</div>
          <button className="m-sheet-close" onClick={onClose} aria-label="閉じる">×</button>
        </div>
        <div className="m-sheet-body">
          <label className="m-thx-field-label">名前（任意）</label>
          <input className="m-thx-field-name" placeholder="名前" value={who} onChange={(e) => setWho(e.target.value)} />
          <label className="m-thx-field-label" style={{ marginTop: 14 }}>コメント</label>
          <textarea className="m-thx-field-text" placeholder="コメントを入力…（改行できます）" value={text} autoFocus onChange={(e) => setText(e.target.value)} />
        </div>
        <div className="m-sheet-foot">
          <button className="m-btn m-btn-ghost" onClick={onClose}>キャンセル</button>
          <button className="m-btn m-btn-primary" onClick={save} disabled={!text.trim()} style={!text.trim() ? { opacity: .5 } : null}>{isEdit ? "保存" : "投稿"}</button>
        </div>
      </div>
    </div>
  ), document.body);
};

const MThxCard = ({ card, comments, onAdd, onEdit, onDel, liked = false, likeCount = 0, onLike }) => {
  const cfg = mKindCfg(card.kind);
  const [sheet, setSheet] = React.useState(null);
  const [cmtsOpen, setCmtsOpen] = React.useState(false);
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
      <div className="m-thx-actions">
        <button className={`m-thx-like-btn${liked ? " liked" : ""}`} onClick={onLike}>
          いいね 💚{likeCount > 0 && <span className="m-thx-like-count">{likeCount}</span>}
        </button>
      </div>
      {comments.length > 0 && (
        <button className="m-thx-cmts-toggle" onClick={() => setCmtsOpen(v => !v)}>
          💬 コメントを{cmtsOpen ? '閉じる' : '見る'}
          <span className="m-thx-cmts-n">{comments.length}件</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            style={{ transition: "transform .2s", transform: cmtsOpen ? "rotate(180deg)" : "none", flexShrink: 0, marginLeft: "auto" }}>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
      )}
      {cmtsOpen && (
        <div className="m-thx-cmts">
          {comments.map((c) => (
            <div key={c.id} className="m-thx-cmt" onClick={() => setSheet({ id: c.id, who: c.who || "", text: c.text })}>
              <div className="m-thx-cmt-header">
                <span className="m-thx-cmt-who">{c.who || "匿名"}</span>
                <button className="m-thx-cmt-del" onClick={(e) => { e.stopPropagation(); onDel(c.id); }} aria-label="削除">×</button>
              </div>
              <div className="m-thx-cmt-body">{c.text}</div>
            </div>
          ))}
        </div>
      )}
      <button className="m-thx-cmt-open" onClick={() => setSheet({ who: "", text: "" })}>💬 コメントする</button>
      {sheet && (
        <MThxCommentSheet
          isEdit={!!sheet.id}
          initialWho={sheet.who}
          initialText={sheet.text}
          onClose={() => setSheet(null)}
          onSave={(p) => { if (sheet.id) onEdit(sheet.id, p); else onAdd(p); setSheet(null); }}
        />
      )}
    </div>
  );
};

const MThanks = ({ registerHeader, registerFab }) => {
  const [rows, setRows] = React.useState(() => { try { const s = localStorage.getItem("miwa.arigatou.v1"); if (s) return JSON.parse(s); } catch {} return M_THX_SEED; });
  const [comments, setComments] = React.useState(() => { try { return JSON.parse(localStorage.getItem("miwa.arigatou.comments.v1")) || []; } catch { return []; } });
  const [likes, setLikes] = React.useState([]);
  const deviceId = mGetDeviceId();
  const [kind, setKind] = React.useState("all");
  const [month, setMonth] = React.useState("all");
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

  React.useEffect(() => {
    if (!cloudOn) return; let c = false;
    (async () => { const remote = await cloudGet(M_LIKES_SHEET); if (!c && remote != null) setLikes(remote.map((x) => ({ ...x, ts: Number(x.ts) || 0 }))); })();
    return () => { c = true; };
  }, []);

  const likesByKey = React.useMemo(() => { const m = {}; likes.forEach((l) => { (m[l.cardKey] = m[l.cardKey] || []).push(l); }); return m; }, [likes]);
  const toggleLike = (cardKey) => {
    const myLike = (likesByKey[cardKey] || []).find(l => l.deviceId === deviceId);
    if (myLike) { setLikes(p => p.filter(x => x.id !== myLike.id)); if (cloudOn) cloudDelete(M_LIKES_SHEET, myLike.id); }
    else { const l = { id: "lk" + Date.now() + Math.random().toString(36).slice(2,5), cardKey, deviceId, ts: Date.now() }; setLikes(p => [...p, l]); if (cloudOn) cloudAdd(M_LIKES_SHEET, l); }
  };

  const byKey = React.useMemo(() => { const m = {}; comments.forEach((c) => { (m[c.cardKey] = m[c.cardKey] || []).push(c); }); Object.values(m).forEach((a) => a.sort((x, y) => (x.ts || 0) - (y.ts || 0))); return m; }, [comments]);
  const addComment = (cardKey, c) => {
    const note = { id: "ac" + Date.now() + Math.random().toString(36).slice(2, 5), cardKey, who: c.who || "", text: c.text, ts: Date.now() };
    setComments((p) => [...p, note]);
    if (cloudOn) cloudAdd(M_COMMENT_SHEET, note);
  };
  const editComment = (id, patch) => {
    setComments((p) => p.map((x) => x.id === id ? { ...x, ...patch } : x));
    if (cloudOn) cloudUpdate(M_COMMENT_SHEET, id, patch);
  };
  const delComment = (id) => {
    setComments((p) => p.filter((x) => x.id !== id));
    if (cloudOn) cloudDelete(M_COMMENT_SHEET, id);
  };

  const kinds = React.useMemo(() => [...new Set(rows.map(r => r.kind).filter(Boolean))].sort(), [rows]);
  const months = React.useMemo(() => {
    const seen = new Set();
    rows.forEach(r => {
      if (r.date) { const d = new Date(r.date); if (!isNaN(d.getTime())) { seen.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`); } }
    });
    return [...seen].sort().reverse();
  }, [rows]);
  const fmtMonth = (k) => { const [y, m] = k.split('-'); return `${y}年${parseInt(m)}月`; };

  const filtered = rows.filter((r) => {
    if (kind !== "all" && r.kind !== kind) return false;
    if (month !== "all") {
      const d = new Date(r.date);
      if (!isNaN(d.getTime())) {
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        if (key !== month) return false;
      }
    }
    return true;
  });
  const sorted = [...filtered].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  return (
    <div>
      <div className="m-chips">
        <button className={`m-chip ${kind === "all" ? "active" : ""}`} onClick={() => setKind("all")}>すべて {rows.length}</button>
        {kinds.map((k) => {
          const n = rows.filter((r) => r.kind === k).length;
          return <button key={k} className={`m-chip ${kind === k ? "active" : ""}`} onClick={() => setKind(k)}>{mKindCfg(k).e + " " + k.replace("お客様からの", "")} {n}</button>;
        })}
      </div>
      {months.length > 1 && (
        <div className="m-chips" style={{ marginTop: 4 }}>
          <button className={`m-chip ${month === "all" ? "active" : ""}`} onClick={() => setMonth("all")}>📅 すべての月</button>
          {months.map(m => (
            <button key={m} className={`m-chip ${month === m ? "active" : ""}`} onClick={() => setMonth(m)}>{fmtMonth(m)}</button>
          ))}
        </div>
      )}
      {loading && rows.length === 0 ? <div className="m-loading"><div className="m-spinner"></div>読み込み中…</div>
        : sorted.length === 0 ? <div className="m-empty" style={{ marginTop: 30 }}>カードがありません</div>
        : sorted.map((card, i) => { const ck = mCardKey(card); return <MThxCard key={ck + "_" + i} card={card} comments={byKey[ck] || []} onAdd={(c) => addComment(ck, c)} onEdit={editComment} onDel={delComment} liked={!!(likesByKey[ck] || []).find(l => l.deviceId === deviceId)} likeCount={(likesByKey[ck] || []).length} onLike={() => toggleLike(ck)} />; })}
      <div style={{ height: 12 }}></div>
    </div>
  );
};

window.MThanks = MThanks;
