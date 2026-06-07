// AI レポート — separate page for AI-driven analytics across data sources

const totalLotPts = (d) => (d.normalLot || 0) + (d.extraLot || 0) + (d.advance || 0) + (d.storage || 0);

// 各ページ＝データソース（お知らせ・業界ニュースは対象外）
const REPORT_SOURCES = [
  { id: "sales", label: "売上レポート", icon: "💰", storage: "miwa.sales.v8", dateKey: "date",
    fmt: (d) => `【${d.store}】${d.date}/売上¥${d.sales}/昨年¥${d.lastYear || 0}/客数${d.customers || 0}/新規${d.newCustomers || 0}/点数${d.items || 0}` },
  { id: "stain", label: "シミ抜き報告", icon: "📊", storage: "miwa.stain.v1", dateKey: "date",
    fmt: (d) => `【${d.staff}】${d.date}/${d.processed}件(落ち${d.failed || 0})/金額${d.amount}円(返金${d.refund || 0}円)` },
  { id: "feedback", label: "フィードバック", icon: "💬", storage: "miwa.feedback.v3", dateKey: "reportDate",
    fmt: (d) => `【${d.store}・${d.factory || "—"}】${d.reportDate}/${d.item}/区分:${d.type}\n  内容: ${d.content}\n  原因: ${d.cause || "—"}\n  改善: ${d.improvement || "—"}` },
  { id: "factory", label: "工場報告", icon: "🏭", storage: "miwa.factory.v3", dateKey: "date",
    fmt: (d) => `【${d.factory}】${d.date}/通常${d.normalLot || 0}・特急${d.extraLot || 0}・前出し${d.advance || 0}・保管${d.storage || 0}(計${totalLotPts(d)})/工数${d.hours || 0}h/生産性${d.hours > 0 ? (totalLotPts(d) / d.hours).toFixed(1) : "—"}点/h/メンバー:${d.members || "—"}` },
  { id: "claim", label: "クレーム・事故品", icon: "⚠️", storage: "miwa.claim.v1", dateKey: "receivedOn",
    fmt: (d) => `【${d.store}・${d.type}】受付${d.receivedOn || d.occurredOn || "—"}/品目:${d.item}/状況:${d.status}/弁償¥${d.amount || 0}/担当:${d.staff || "—"}/メーカー:${d.maker || "—"}\n  内容: ${d.detail || "—"}` },
  { id: "vehicle", label: "車両管理", icon: "🚚", storage: "miwa.vehicle.v1", dateKey: "",
    fmt: (d) => `【${d.name}・${d.model || ""}】拠点:${d.store || "—"}/担当:${d.staff || "—"}/走行${d.odometer || 0}km/車検${d.inspectionDue || "—"}/点検${d.checkDue || "—"}/保険${d.insuranceDue || "—"}/オイル${d.oilNextDate || "—"}` },
  { id: "thanks", label: "ありがとうカード", icon: "🙏", storage: "miwa.arigatou.v1", dateKey: "date",
    fmt: (d) => `【${d.store}】${(d.date || "").slice(0, 10)}/区分:${d.kind}/${d.content}` },
  { id: "board", label: "共有ボード", icon: "📌", storage: "miwa.board.v1", dateKey: "",
    fmt: (d) => `【${d.who || "匿名"}・${d.badge || "共有"}】${d.ts ? new Date(d.ts).toLocaleDateString("ja-JP") : ""}/${(d.text || "").replace(/\n/g, " ")}` },
  { id: "shift", label: "シフト", icon: "🗓️", storage: "__shift", dateKey: "",
    getRows: () => {
      const S = (typeof window !== "undefined") && window.SHIFT_2026_06;
      if (!S) return [];
      const out = [];
      S.stores.forEach((s) => (s.staff || []).forEach((st) => out.push({ store: s.store, name: st.name, days: st.days, hours: st.hours })));
      return out;
    },
    fmt: (d) => `【${d.store}】${d.name}/出勤${d.days || 0}日/${d.hours || 0}h` },
];

const REPORT_TYPES = {
  sales: [
    { id: "summary",  label: "📊 月次まとめ", prompt: "今月の売上・昨対比・店舗別ハイライト・コース別構成を箇条書きでまとめてください。" },
    { id: "compare",  label: "🏪 店舗比較",   prompt: "店舗ごとの売上・客数・新規・点数構成を比較し、強み弱みを分析してください。" },
    { id: "insights", label: "💡 インサイト", prompt: "数値の中から経営判断に役立つ気付きを抽出し、来月に向けた打ち手を提案してください。" },
  ],
  stain: [
    { id: "summary",     label: "📊 月次まとめ", prompt: "全体の処理状況・担当者別成績・落ち率と返金率を日本語で箇条書きでまとめてください。" },
    { id: "followup",    label: "⚠️ フォロー",   prompt: "管理者がフォローアップすべき状況や注意が必要な内容を指摘してください。" },
    { id: "performance", label: "🏆 成績",       prompt: "担当者のパフォーマンスを分析し、優秀な成績者と改善が必要な者を指摘してください。" },
  ],
  feedback: [
    { id: "trends",  label: "📈 傾向分析", prompt: "店舗別・対応区分別の傾向を分析し、よく出る問題と原因のパターンをまとめてください。" },
    { id: "improve", label: "💡 改善提案", prompt: "再発防止のために重点的に取り組むべき項目を優先順位付きで提案してください。" },
    { id: "summary", label: "📊 月次まとめ", prompt: "今月のフィードバック総数・対応区分の内訳・主要な事案を箇条書きでまとめてください。" },
  ],
  factory: [
    { id: "summary",      label: "📊 月次まとめ", prompt: "各工場の生産点数（通常・特急・前出し・保管）・工数・生産性を箇条書きでまとめてください。" },
    { id: "productivity", label: "📈 生産性",     prompt: "工場別・日別の生産性（点/時）を分析し、効率の高い日・低い日と改善余地を指摘してください。" },
    { id: "staffing",     label: "👥 人員配置",   prompt: "メンバー構成と処理量の関係を分析し、人員配置の最適化を提案してください。" },
  ],
  claim: [
    { id: "summary", label: "📊 月次まとめ", prompt: "受付件数・種別内訳・対応状況・弁償総額を箇条書きでまとめてください。" },
    { id: "risk",    label: "⚠️ 要対応",    prompt: "未解決（受付・対応中）の案件を優先度付きで整理し、対応の遅れやリスクを指摘してください。" },
    { id: "prevent", label: "💡 再発防止",  prompt: "種別・店舗・品目・メーカーの傾向から再発防止策を具体的に提案してください。" },
  ],
  vehicle: [
    { id: "due",     label: "🔧 期限管理", prompt: "車検・法定点検・保険満了・オイル交換の期限が近い車両を緊急度順（超過→間近）に整理し、必要なアクションを示してください。" },
    { id: "summary", label: "📊 車両一覧", prompt: "保有車両の配備拠点・担当・走行距離・各種期限の状況を箇条書きでまとめてください。" },
    { id: "cost",    label: "💰 コスト見通し", prompt: "走行距離や各期限の時期から、今後必要となる整備・更新とコストの見通しを示してください。" },
  ],
  thanks: [
    { id: "summary",   label: "📊 月次まとめ", prompt: "ありがとうカードの件数・区分・店舗別の傾向を箇条書きでまとめてください。" },
    { id: "highlight", label: "🌟 ハイライト", prompt: "特に良い取り組みや、全社で共有・称賛すべき事例を抽出してください。" },
    { id: "culture",   label: "💡 組織文化",   prompt: "カードの内容から組織の強みと、さらに伸ばすべき点を分析してください。" },
  ],
  board: [
    { id: "summary", label: "📊 まとめ",    prompt: "共有事項の主要トピックを区分別に整理し、要点を箇条書きでまとめてください。" },
    { id: "action",  label: "✅ 対応事項",  prompt: "対応・確認が必要な共有事項を抽出し、担当と優先度の観点で整理してください。" },
  ],
  shift: [
    { id: "summary", label: "📊 まとめ", prompt: "拠点別の出勤日数・労働時間を集計し、人員の配置状況を箇条書きでまとめてください。" },
    { id: "balance", label: "⚖️ 負荷の偏り", prompt: "出勤日数・労働時間の偏りや、負荷の高いスタッフ・手薄な拠点を指摘してください。" },
  ],
};

const fmtAIDate = (d) => d ? new Date(d).toLocaleString("ja-JP", { dateStyle: "short", timeStyle: "short" }) : "—";

const loadSource = (key) => {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
};
const getSourceRows = (src) => {
  if (!src) return [];
  if (src.getRows) return src.getRows();
  const v = loadSource(src.storage);
  return Array.isArray(v) ? v : [];
};
const filterByMonth = (src, rows, month) => {
  if (!src.dateKey || !month) return rows;
  return rows.filter((r) => (r[src.dateKey] || "").startsWith(month));
};

const buildPrompt = (source, type, month, rows) => {
  const t = REPORT_TYPES[source.id].find((x) => x.id === type);
  const filtered = filterByMonth(source, rows, month);
  const summary = filtered.map(source.fmt).join("\n");
  const monthLabel = (source.dateKey && month) ? `${month.slice(0, 4)}年${parseInt(month.slice(5, 7))}月` : "全期間";
  return `以下は${monthLabel}の${source.label}データです。
${t.prompt}

見出し・箇条書きを使い、管理者がそのまま共有できる読みやすい日本語レポートにしてください。

=== データ (${filtered.length} 件) ===
${summary}`;
};

// ── 生成結果（Markdown 風）→ 整形 HTML ───────────────────
const mdToHtml = (md) => {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = (md || "").split("\n");
  let html = "", inList = false;
  const closeList = () => { if (inList) { html += "</ul>"; inList = false; } };
  for (const raw of lines) {
    let line = esc(raw).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    if (/^\s*#{1,6}\s/.test(raw)) {
      closeList();
      const lvl = Math.min((raw.match(/^\s*#+/)[0].trim().length) + 1, 4);
      html += `<h${lvl}>${line.replace(/^\s*#{1,6}\s/, "")}</h${lvl}>`;
    } else if (/^\s*[-・*]\s+/.test(raw)) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${line.replace(/^\s*[-・*]\s+/, "")}</li>`;
    } else if (/^\s*\d+[.)]\s+/.test(raw)) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${line.replace(/^\s*\d+[.)]\s+/, "")}</li>`;
    } else if (/^\s*$/.test(raw)) {
      closeList();
    } else {
      closeList();
      html += `<p>${line}</p>`;
    }
  }
  closeList();
  return html;
};

const buildReportHtml = (title, sub, body) => `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"><title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  body { font-family: "Zen Kaku Gothic New", sans-serif; color: #1f2430; background: #fff; line-height: 1.75; max-width: 800px; margin: 0 auto; padding: 48px 40px; }
  .rp-head { border-bottom: 3px solid #2a6fdb; padding-bottom: 16px; margin-bottom: 28px; }
  .rp-brand { font-size: 12px; font-weight: 700; color: #2a6fdb; letter-spacing: .08em; }
  h1 { font-size: 24px; margin: 6px 0 4px; }
  .rp-sub { font-size: 13px; color: #6b7280; }
  h2 { font-size: 18px; margin: 26px 0 10px; padding-left: 10px; border-left: 4px solid #2a6fdb; }
  h3 { font-size: 15px; margin: 18px 0 8px; color: #2a3a5a; }
  h4 { font-size: 13.5px; margin: 14px 0 6px; color: #44506a; }
  p { margin: 8px 0; font-size: 14px; }
  ul { margin: 8px 0; padding-left: 22px; }
  li { font-size: 14px; margin: 4px 0; }
  strong { color: #14306b; }
  .rp-foot { margin-top: 36px; padding-top: 14px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; }
  @media print { body { padding: 24px; } }
</style></head>
<body>
  <div class="rp-head">
    <div class="rp-brand">クリーニングみわ ・ AI レポート</div>
    <h1>${title}</h1>
    <div class="rp-sub">${sub}</div>
  </div>
  <div class="rp-body">${mdToHtml(body)}</div>
  <div class="rp-foot">本レポートは AI により自動生成されました。最終判断は管理者がご確認ください。 ・ 出力日時: ${new Date().toLocaleString("ja-JP")}</div>
</body></html>`;

const useAiState = (key, initial) => {
  const [v, setV] = React.useState(() => {
    try { const s = localStorage.getItem(key); if (s) return JSON.parse(s); } catch {}
    return typeof initial === "function" ? initial() : initial;
  });
  React.useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key, v]);
  return [v, setV];
};

// ── Main page ─────────────────────────────────────────
const AiReportPage = () => {
  const [source, setSource] = useAiState("miwa.ai.source", "stain");
  const [type, setType] = useAiState("miwa.ai.type", "summary");
  const [month, setMonth] = React.useState(() => new Date().toISOString().slice(0, 7));
  const [history, setHistory] = useAiState("miwa.ai.history.v1", []);
  const [toast, setToast] = React.useState("");
  const [dark, setDark] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [generated, setGenerated] = React.useState("");

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  const currentSource = REPORT_SOURCES.find((s) => s.id === source);
  const sourceRows = React.useMemo(() => getSourceRows(currentSource), [source]);
  const availableMonths = React.useMemo(() => {
    if (!currentSource.dateKey) return [];
    const set = new Set(sourceRows.map((r) => (r[currentSource.dateKey] || "").slice(0, 7)).filter(Boolean));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [sourceRows]);

  React.useEffect(() => {
    // Reset type when source changes if current type isn't valid
    if (!REPORT_TYPES[source].find((t) => t.id === type)) {
      setType(REPORT_TYPES[source][0].id);
    }
    // 日付を持たないソース（車両・共有ボード・シフト）は全期間に固定
    const src = REPORT_SOURCES.find((s) => s.id === source);
    if (!src.dateKey) { setMonth(""); return; }
    // 選択月にデータが無ければ、データのある最新月（無ければ全期間）へ自動で合わせる
    setMonth((m) => (availableMonths.includes(m) ? m : (availableMonths[0] || "")));
  }, [source]);

  const monthRows = filterByMonth(currentSource, sourceRows, month);

  const generate = async () => {
    if (!monthRows.length) {
      setToast("対象期間のデータがありません");
      return;
    }
    setGenerating(true);
    setGenerated("");
    const prompt = buildPrompt(currentSource, type, month, sourceRows);

    try {
      // Use window.claude if available, else fall back to clipboard
      if (window.claude && typeof window.claude.complete === "function") {
        const result = await window.claude.complete(prompt);
        setGenerated(result);
        setHistory([
          { id: Date.now(), source, type, month, result, prompt, created: Date.now() },
          ...history.slice(0, 19),
        ]);
        setToast("レポートを作成しました");
      } else {
        await navigator.clipboard.writeText(prompt);
        setGenerated(`プロンプトをコピーしました。\n\nClaude.ai を開いて貼り付けてください。\n\n--- プロンプト内容 ---\n${prompt}`);
        setToast("プロンプトをコピーしました");
      }
    } catch (e) {
      setGenerated(`エラー: ${e.message || e}\n\n--- プロンプト ---\n${prompt}`);
      setToast("生成に失敗しました");
    } finally {
      setGenerating(false);
    }
  };

  const copyPrompt = async () => {
    const prompt = buildPrompt(currentSource, type, month, sourceRows);
    await navigator.clipboard.writeText(prompt);
    setToast("プロンプトをコピーしました");
  };

  const copyResult = async () => {
    if (!generated) return;
    await navigator.clipboard.writeText(generated);
    setToast("結果をコピーしました");
  };

  const reportTitle = () => {
    const t = REPORT_TYPES[source].find((x) => x.id === type);
    return `${currentSource.label} ・ ${t ? t.label.replace(/^\S+\s/, "") : ""}`;
  };
  const reportSub = () => `${(currentSource.dateKey && month) ? `${month.slice(0, 4)}年${parseInt(month.slice(5, 7))}月` : "全期間"} ・ 対象 ${monthRows.length} 件`;
  const exportPdf = () => {
    if (!generated) return;
    const w = window.open("", "_blank");
    if (!w) { setToast("ポップアップを許可してください"); return; }
    w.document.write(buildReportHtml(reportTitle(), reportSub(), generated));
    w.document.close(); w.focus();
    setTimeout(() => { try { w.print(); } catch {} }, 600);
  };
  const exportHtml = () => {
    if (!generated) return;
    const blob = new Blob([buildReportHtml(reportTitle(), reportSub(), generated)], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AIレポート_${currentSource.label}_${(currentSource.dateKey && month) ? month : "全期間"}.html`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast("HTMLを保存しました");
  };

  const deleteHistory = (id) => {
    setHistory(history.filter((h) => h.id !== id));
  };

  return (
    <div className="app">
      <div className="shell">
        <AppSidebar active="ai-report" />
        <main className="main">
          {/* Greeting */}
          <div className="greet">
            <div>
              <h1>✨ AI レポート</h1>
              <div className="sub">各データソースを Claude で分析し、レポートを自動生成します</div>
            </div>
            <div className="right">
            </div>
          </div>

          {/* Source picker */}
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">1. データソース</h3>
              <span className="card-sub">SOURCE</span>
            </div>
            <div className="ai-source-grid">
              {REPORT_SOURCES.map((s) => {
                const count = getSourceRows(s).length;
                return (
                  <button key={s.id}
                          className={`ai-source-card ${source === s.id ? "active" : ""}`}
                          onClick={() => setSource(s.id)}>
                    <span className="ai-source-icon">{s.icon}</span>
                    <span className="ai-source-label">{s.label}</span>
                    <span className="ai-source-count">{count} 件</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Report type + month */}
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">2. レポートの種類</h3>
              <span className="card-sub">TEMPLATE</span>
            </div>
            <div className="ai-type-pills">
              {REPORT_TYPES[source].map((t) => (
                <button key={t.id}
                        className={`ai-type-pill ${type === t.id ? "active" : ""}`}
                        onClick={() => setType(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="filter-bar" style={{ marginTop: 16 }}>
              <div className="field">
                <label className="field-label">対象月</label>
                <select className="select" style={{ width: 180 }} value={month} onChange={(e) => setMonth(e.target.value)}>
                  <option value="">全期間</option>
                  {availableMonths.map((m) => {
                    const [y, mo] = m.split("-");
                    return <option key={m} value={m}>{y}年{parseInt(mo)}月</option>;
                  })}
                </select>
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label className="field-label">対象データ件数</label>
                <div style={{ padding: "10px 0", fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
                  {monthRows.length} 件 / 全 {sourceRows.length} 件
                </div>
              </div>
              <div className="actions">
                <button className="btn btn-ghost" onClick={copyPrompt}>
                  📋 プロンプトのみコピー
                </button>
                <button className="btn btn-primary" onClick={generate} disabled={generating || !monthRows.length}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                       style={generating ? { animation: "spin 1s linear infinite" } : null}>
                    {generating
                      ? <><polyline points="23 4 23 10 17 10"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/></>
                      : <><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3"/></>}
                  </svg>
                  {generating ? "生成中..." : "✨ レポート作成"}
                </button>
              </div>
            </div>
          </div>

          {/* Output */}
          {generated && (
            <div className="card">
              <div className="card-head">
                <h3 className="card-title">3. 生成結果</h3>
                <div className="right" style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost" onClick={exportPdf} title="PDF（印刷ダイアログ）で保存">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    PDF保存
                  </button>
                  <button className="btn btn-ghost" onClick={exportHtml} title="HTMLファイルでダウンロード">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
                    HTML保存
                  </button>
                  <button className="btn btn-ghost" onClick={copyResult}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    コピー
                  </button>
                </div>
              </div>
              <div className="ai-output">{generated}</div>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="card">
              <div className="card-head">
                <h3 className="card-title">📚 履歴</h3>
                <span className="card-sub">最新 {history.length} 件</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {history.map((h) => {
                  const s = REPORT_SOURCES.find((x) => x.id === h.source);
                  const t = REPORT_TYPES[h.source]?.find((x) => x.id === h.type);
                  return (
                    <div key={h.id} className="ai-history-item">
                      <button className="ai-history-main" onClick={() => setGenerated(h.result)}>
                        <span className="ai-history-icon">{s?.icon}</span>
                        <span className="ai-history-meta">
                          <span className="ai-history-title">{s?.label} ・ {t?.label}</span>
                          <span className="ai-history-sub">{h.month || "全期間"} ・ {fmtAIDate(h.created)}</span>
                        </span>
                      </button>
                      <button className="row-action danger" onClick={() => deleteHistory(h.id)} title="削除">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

// auto-clear toast
window.AiReportPage = AiReportPage;
