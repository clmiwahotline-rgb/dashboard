// AI レポート ── 構造化データ計算ロジック（売上・シミ抜き・フィードバック・工場・
// クレーム・車両・ありがとう・共有ボード）。JSX を含まない純ロジック。
// window.AiReportData として公開し、polished-ai-report.jsx から利用する。

(function () {
  const COURSE_FIELDS = [
    { key: "regular", label: "レギュラー" },
    { key: "standard", label: "スタンダード" },
    { key: "premium", label: "プレミアム" },
    { key: "delicate", label: "デリケート" },
    { key: "brand", label: "ブランド" },
    { key: "highBrand", label: "ハイブランド" },
  ];

  const yen = (n) => "¥" + Math.round(n || 0).toLocaleString("ja-JP");
  const pct = (n, digits = 1) => (n == null || !isFinite(n)) ? "—" : `${n.toFixed(digits)}%`;

  // ── ① 売上レポート ─────────────────────────────────────
  function computeSales(rows) {
    const byStore = {};
    rows.forEach((r) => {
      const store = r.store || "不明";
      if (!byStore[store]) {
        byStore[store] = {
          store, sales: 0, lastYear: 0, customers: 0, newCustomers: 0, items: 0,
          dateSet: new Set(), courses: { regular: 0, standard: 0, premium: 0, delicate: 0, brand: 0, highBrand: 0 },
        };
      }
      const s = byStore[store];
      s.sales += Number(r.sales) || 0;
      s.lastYear += Number(r.lastYear) || 0;
      s.customers += Number(r.customers) || 0;
      s.newCustomers += Number(r.newCustomers) || 0;
      s.items += Number(r.items) || 0;
      if (r.date) s.dateSet.add(r.date);
      COURSE_FIELDS.forEach((c) => { s.courses[c.key] += Number(r[c.key]) || 0; });
    });

    const stores = Object.values(byStore).map((s) => {
      const days = s.dateSet.size || 1;
      const courseTotal = COURSE_FIELDS.reduce((sum, c) => sum + s.courses[c.key], 0);
      const coursePct = {};
      COURSE_FIELDS.forEach((c) => { coursePct[c.key] = courseTotal > 0 ? (s.courses[c.key] / courseTotal) * 100 : 0; });
      return {
        store: s.store, sales: s.sales, lastYear: s.lastYear,
        customers: s.customers, newCustomers: s.newCustomers, items: s.items,
        days: s.dateSet.size, avgDaily: s.sales / days,
        itemPrice: s.customers > 0 ? s.sales / s.customers : 0,
        yoyPct: s.lastYear > 0 ? (s.sales / s.lastYear) * 100 : null,
        courses: s.courses, courseTotal, coursePct,
      };
    }).sort((a, b) => b.sales - a.sales);

    stores.forEach((s, i) => { s.rank = i + 1; });

    const grand = stores.reduce((acc, s) => {
      acc.sales += s.sales; acc.lastYear += s.lastYear; acc.customers += s.customers;
      acc.newCustomers += s.newCustomers; acc.items += s.items;
      COURSE_FIELDS.forEach((c) => { acc.courses[c.key] += s.courses[c.key]; });
      return acc;
    }, { sales: 0, lastYear: 0, customers: 0, newCustomers: 0, items: 0, courses: { regular: 0, standard: 0, premium: 0, delicate: 0, brand: 0, highBrand: 0 } });
    grand.yoyPct = grand.lastYear > 0 ? (grand.sales / grand.lastYear) * 100 : null;
    grand.itemPrice = grand.customers > 0 ? grand.sales / grand.customers : 0;
    const grandCourseTotal = COURSE_FIELDS.reduce((sum, c) => sum + grand.courses[c.key], 0);
    grand.coursePct = {};
    COURSE_FIELDS.forEach((c) => { grand.coursePct[c.key] = grandCourseTotal > 0 ? (grand.courses[c.key] / grandCourseTotal) * 100 : 0; });

    return { stores, grand, courseFields: COURSE_FIELDS, rawRows: rows };
  }

  function salesMarkdown(data, month, storeFilter) {
    const monthLabel = month ? `${month.slice(0, 4)}年${parseInt(month.slice(5, 7))}月` : "全期間";
    const lines = [`## 売上レポート（${monthLabel}）`];
    const list = storeFilter ? data.stores.filter((s) => s.store === storeFilter) : data.stores;
    if (!storeFilter) {
      lines.push("", "### 全社合計");
      lines.push(`- 売上合計: ${yen(data.grand.sales)}（昨対比 ${pct(data.grand.yoyPct)}）`);
      lines.push(`- 客数合計: ${data.grand.customers}人（新規 ${data.grand.newCustomers}人） ・ 点数合計: ${data.grand.items}点`);
      lines.push(`- 客単価: ${yen(data.grand.itemPrice)}`);
      lines.push("", "### 店舗別 詳細");
      list.forEach((s) => {
        lines.push("", `#### ${s.rank}位 ${s.store}`);
        lines.push(`- 売上: ${yen(s.sales)}（昨対比 ${pct(s.yoyPct)}） ・ 日商平均: ${yen(s.avgDaily)}`);
        lines.push(`- 客数: ${s.customers}人（新規 ${s.newCustomers}人） ・ 点数: ${s.items}点 ・ 客単価: ${yen(s.itemPrice)}`);
      });
    } else {
      list.forEach((s) => {
        lines.push("", `### ${s.store}（全${data.stores.length}店舗中 ${s.rank}位）`);
        lines.push(`- 売上合計: ${yen(s.sales)}（昨対比 ${pct(s.yoyPct)}）`);
        lines.push(`- 日商平均: ${yen(s.avgDaily)}（対象 ${s.days}日）`);
        lines.push(`- 客数: ${s.customers}人（新規 ${s.newCustomers}人） ・ 点数: ${s.items}点 ・ 客単価: ${yen(s.itemPrice)}`);
      });
    }
    return lines.join("\n");
  }

  // ── ② シミ抜き報告 ─────────────────────────────────────
  function computeStain(rows) {
    const totalAmount = rows.reduce((s, r) => s + (parseInt(r.amount) || 0), 0);
    const totalProcessed = rows.reduce((s, r) => s + (parseInt(r.processed) || 0), 0);
    const totalRefund = rows.reduce((s, r) => s + (parseInt(r.refund) || 0), 0);
    // 除去率は処理件数で重み付けした加重平均
    const weightedSum = rows.reduce((s, r) => s + (parseFloat(r.removalRate) || 0) * (parseInt(r.processed) || 0), 0);
    const avgRemoval = totalProcessed > 0 ? weightedSum / totalProcessed : 0;
    const refundRate = totalAmount > 0 ? totalRefund / totalAmount : 0;
    return { totalAmount, totalProcessed, totalRefund, avgRemoval, refundRate };
  }

  function stainMarkdown(data, month) {
    const monthLabel = month ? `${month.slice(0, 4)}年${parseInt(month.slice(5, 7))}月` : "全期間";
    return [
      `## シミ抜き報告（${monthLabel}）`,
      `- 処理件数合計: ${data.totalProcessed}件`,
      `- 金額合計: ${yen(data.totalAmount)}`,
      `- 除去率（平均）: ${pct(data.avgRemoval * 100)}`,
      `- 返金合計: ${yen(data.totalRefund)}（返金率 ${pct(data.refundRate * 100)}）`,
    ].join("\n");
  }

  // ── ③ フィードバック ───────────────────────────────────
  function computeFeedback(rows) {
    const byStore = {};
    rows.forEach((r) => {
      const store = r.store || "不明";
      (byStore[store] = byStore[store] || []).push(r);
    });
    Object.values(byStore).forEach((list) => list.sort((a, b) => (b.reportDate || "").localeCompare(a.reportDate || "")));
    const storesSorted = Object.keys(byStore).sort((a, b) => byStore[b].length - byStore[a].length);
    return { byStore, storesSorted, total: rows.length };
  }

  function feedbackMarkdown(data, month) {
    const monthLabel = month ? `${month.slice(0, 4)}年${parseInt(month.slice(5, 7))}月` : "全期間";
    const lines = [`## フィードバックレポート（${monthLabel}） ・ 合計 ${data.total} 件`];
    data.storesSorted.forEach((store) => {
      lines.push("", `### ${store}（${data.byStore[store].length}件）`);
      data.byStore[store].forEach((r) => {
        lines.push(`- 【${r.reportDate || "—"}】${r.item || "—"} ・ ${r.type || "—"}`);
        lines.push(`  内容: ${r.content || "—"}`);
        if (r.cause) lines.push(`  原因: ${r.cause}`);
        if (r.improvement) lines.push(`  改善: ${r.improvement}`);
      });
    });
    return lines.join("\n");
  }

  // ── ④ 工場報告 ─────────────────────────────────────────
  const totalLotPts = (d) => (d.normalLot || 0) + (d.extraLot || 0) + (d.advance || 0) + (d.storage || 0);
  const WEEKDAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"];
  const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // getDay() 準拠、月曜始まり表示用

  function computeFactory(rows) {
    const byFactory = {};
    rows.forEach((r) => {
      const f = r.factory || "不明";
      if (!byFactory[f]) {
        byFactory[f] = {
          factory: f, normalLot: 0, extraLot: 0, advance: 0, storage: 0, hours: 0,
          days: new Set(), weekday: [0, 0, 0, 0, 0, 0, 0], rows: [],
        };
      }
      const b = byFactory[f];
      b.normalLot += r.normalLot || 0;
      b.extraLot += r.extraLot || 0;
      b.advance += r.advance || 0;
      b.storage += r.storage || 0;
      b.hours += r.hours || 0;
      if (r.date) {
        b.days.add(r.date);
        const dt = new Date(r.date);
        if (!isNaN(dt.getTime())) b.weekday[dt.getDay()] += totalLotPts(r);
      }
      b.rows.push(r);
    });
    const factories = Object.values(byFactory).map((b) => {
      const totalLots = b.normalLot + b.extraLot + b.advance + b.storage;
      const dayCount = b.days.size || 1;
      return {
        factory: b.factory, normalLot: b.normalLot, extraLot: b.extraLot, advance: b.advance,
        storage: b.storage, hours: b.hours, totalLots,
        avgLotsPerDay: totalLots / dayCount, avgHoursPerDay: b.hours / dayCount,
        productivity: b.hours > 0 ? totalLots / b.hours : 0,
        weekday: WEEKDAY_ORDER.map((wd) => ({ label: WEEKDAY_LABELS[WEEKDAY_ORDER.indexOf(wd)], total: b.weekday[wd] })),
        dayCount,
      };
    }).sort((a, b) => b.totalLots - a.totalLots);
    return { factories };
  }

  function factoryMarkdown(data, month) {
    const monthLabel = month ? `${month.slice(0, 4)}年${parseInt(month.slice(5, 7))}月` : "全期間";
    const lines = [`## 工場報告（${monthLabel}）`];
    data.factories.forEach((f) => {
      lines.push("", `### ${f.factory}`);
      lines.push(`- 合計処理点数: ${f.totalLots}点（通常${f.normalLot}・特急${f.extraLot}・前出し${f.advance}・保管${f.storage}）`);
      lines.push(`- 合計工数: ${f.hours}h ・ 生産性 ${f.productivity.toFixed(1)}点/h`);
      lines.push(`- 平均: 日あたり${f.avgLotsPerDay.toFixed(1)}点 ・ ${f.avgHoursPerDay.toFixed(1)}h（対象${f.dayCount}日）`);
      lines.push("- 曜日別 合計処理点数: " + f.weekday.map((w) => `${w.label}${w.total}`).join(" / "));
    });
    return lines.join("\n");
  }

  // ── ⑤ クレーム・事故品 ─────────────────────────────────
  function computeClaim(rows) {
    const byStore = {};
    rows.forEach((r) => {
      const store = r.store || "不明";
      (byStore[store] = byStore[store] || []).push(r);
    });
    Object.values(byStore).forEach((list) => list.sort((a, b) => (b.receivedOn || b.occurredOn || "").localeCompare(a.receivedOn || a.occurredOn || "")));
    const storesSorted = Object.keys(byStore).sort((a, b) => byStore[b].length - byStore[a].length);
    return { byStore, storesSorted, total: rows.length };
  }

  function claimMarkdown(data, month) {
    const monthLabel = month ? `${month.slice(0, 4)}年${parseInt(month.slice(5, 7))}月` : "全期間";
    const lines = [`## クレーム・事故品レポート（${monthLabel}） ・ 合計 ${data.total} 件`];
    data.storesSorted.forEach((store) => {
      lines.push("", `### ${store}（${data.byStore[store].length}件）`);
      data.byStore[store].forEach((r) => {
        lines.push(`- 【${r.receivedOn || r.occurredOn || "—"}】${r.type || "—"} ・ ${r.item || "—"} ・ ${r.status || "—"}${r.amount ? ` ・ ${yen(r.amount)}` : ""}`);
        lines.push(`  内容: ${r.detail || "—"}`);
        if (r.maker) lines.push(`  メーカー: ${r.maker}${r.makerContact ? `（${r.makerContact}）` : ""}`);
        if (r.staff) lines.push(`  担当: ${r.staff}`);
      });
    });
    return lines.join("\n");
  }

  // ── ⑥ 車両管理 ─────────────────────────────────────────
  function computeVehicleEconomy(fuel) {
    const byV = {};
    fuel.forEach((r) => {
      const v = r.vehicle || "—";
      (byV[v] = byV[v] || []).push({ odo: parseFloat(r.odometer) || 0, l: parseFloat(r.liters) || 0, date: r.date });
    });
    const out = {};
    Object.entries(byV).forEach(([v, list]) => {
      const sorted = list.filter((x) => x.odo > 0).sort((a, b) => (a.date || "").localeCompare(b.date || "") || a.odo - b.odo);
      let totalKm = 0, totalL = 0;
      for (let i = 1; i < sorted.length; i++) {
        const dKm = sorted[i].odo - sorted[i - 1].odo;
        if (dKm > 0 && sorted[i].l > 0) { totalKm += dKm; totalL += sorted[i].l; }
      }
      out[v] = totalL > 0 ? totalKm / totalL : null;
    });
    return out;
  }

  function computeVehicle(vehicles, fuel, maint) {
    const economy = computeVehicleEconomy(fuel);
    const names = new Set([
      ...vehicles.map((v) => (v.name || "").trim()).filter(Boolean),
      ...fuel.map((f) => (f.vehicle || "").trim()).filter(Boolean),
      ...maint.map((m) => (m.vehicle || "").trim()).filter(Boolean),
    ]);
    const list = [...names].map((name) => {
      const v = vehicles.find((x) => x.name === name) || {};
      const history = maint.filter((m) => m.vehicle === name).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      return {
        name, model: v.model || "", store: v.store || "", staff: v.staff || "",
        odometer: v.odometer || 0, economy: economy[name] != null ? economy[name] : null,
        history,
      };
    }).sort((a, b) => a.name.localeCompare(b.name, "ja"));
    return { vehicles: list };
  }

  function vehicleMarkdown(data) {
    const lines = ["## 車両管理レポート"];
    data.vehicles.forEach((v) => {
      lines.push("", `### ${v.name}${v.model ? `（${v.model}）` : ""}`);
      lines.push(`- 配備拠点: ${v.store || "—"} ・ 担当: ${v.staff || "—"} ・ 走行距離: ${v.odometer ? v.odometer.toLocaleString("ja-JP") + "km" : "—"}`);
      lines.push(`- 燃費: ${v.economy != null ? v.economy.toFixed(1) + " km/L" : "—"}`);
      if (v.history.length) {
        lines.push("- 整備履歴:");
        v.history.forEach((h) => lines.push(`  - ${h.date || "—"} ${h.type || "整備"}: ${h.detail || "—"}${h.cost ? ` ・ ${yen(h.cost)}` : ""}${h.shop ? ` ・ ${h.shop}` : ""}`));
      } else {
        lines.push("- 整備履歴: なし");
      }
    });
    return lines.join("\n");
  }

  // ── ⑦ ありがとうカード ─────────────────────────────────
  function cardKeyOf(card) {
    const s = `${card.store || ""}|${card.date || ""}|${card.content || ""}`;
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return "k" + (h >>> 0).toString(36);
  }

  function computeThanks(rows, comments) {
    const commentsByKey = {};
    (comments || []).forEach((c) => { (commentsByKey[c.cardKey] = commentsByKey[c.cardKey] || []).push(c); });

    const storeCounts = {};
    const kindCounts = {};
    rows.forEach((d) => {
      if (d.store) storeCounts[d.store] = (storeCounts[d.store] || 0) + 1;
      if (d.kind) kindCounts[d.kind] = (kindCounts[d.kind] || 0) + 1;
    });
    const topStore = Object.entries(storeCounts).sort((a, b) => b[1] - a[1])[0];
    const topKind = Object.entries(kindCounts).sort((a, b) => b[1] - a[1])[0];

    const byStore = {};
    rows.forEach((r) => {
      const store = r.store || "不明";
      (byStore[store] = byStore[store] || []).push(r);
    });
    const storesSorted = Object.keys(byStore).sort((a, b) => byStore[b].length - byStore[a].length);
    // 各店舗内：カテゴリ別グループ → 新しい順
    const grouped = {};
    storesSorted.forEach((store) => {
      const byKind = {};
      byStore[store].forEach((r) => {
        const kind = r.kind || "その他";
        (byKind[kind] = byKind[kind] || []).push(r);
      });
      Object.values(byKind).forEach((list) => list.sort((a, b) => (b.date || "").localeCompare(a.date || "")));
      const kindsSorted = Object.keys(byKind).sort((a, b) => byKind[b].length - byKind[a].length);
      grouped[store] = { kindsSorted, byKind };
    });

    return {
      total: rows.length, topStore, topKind, storesSorted, grouped,
      commentsByKey,
    };
  }

  function thanksMarkdown(data, month) {
    const monthLabel = month ? `${month.slice(0, 4)}年${parseInt(month.slice(5, 7))}月` : "全期間";
    const lines = [`## ありがとうカード レポート（${monthLabel}）`];
    lines.push("", "### 全体総括");
    lines.push(`- 総登録数: ${data.total}件`);
    if (data.topStore) lines.push(`- 投稿最多店舗: ${data.topStore[0]}（${data.topStore[1]}件）`);
    if (data.topKind) lines.push(`- 最多カテゴリ: ${data.topKind[0]}（${data.topKind[1]}件）`);
    data.storesSorted.forEach((store) => {
      const g = data.grouped[store];
      lines.push("", `### ${store}`);
      g.kindsSorted.forEach((kind) => {
        lines.push(`- ${kind}（${g.byKind[kind].length}件）`);
        g.byKind[kind].forEach((r) => {
          const ck = cardKeyOf(r);
          const comments = data.commentsByKey[ck] || [];
          lines.push(`  - 【${(r.date || "").slice(0, 10)}】${r.content || "—"}`);
          comments.forEach((c) => lines.push(`    💬 ${c.who ? c.who + "：" : ""}${c.text}`));
        });
      });
    });
    return lines.join("\n");
  }

  // ── ⑧ 共有ボード ───────────────────────────────────────
  function computeBoard(rows) {
    const sorted = [...rows].sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return { sorted, total: rows.length };
  }

  function boardMarkdown(data) {
    const lines = [`## 共有ボード（合計 ${data.total} 件）`];
    data.sorted.forEach((p) => {
      const d = p.ts ? new Date(p.ts).toLocaleString("ja-JP", { dateStyle: "short", timeStyle: "short" }) : "";
      lines.push(`- 【${p.who || "匿名"}${p.badge ? " ・ " + p.badge : ""}】${d}`);
      if (p.text) lines.push(`  ${p.text}`);
    });
    return lines.join("\n");
  }

  window.AiReportData = {
    COURSE_FIELDS, cardKeyOf,
    computeSales, salesMarkdown,
    computeStain, stainMarkdown,
    computeFeedback, feedbackMarkdown,
    computeFactory, factoryMarkdown,
    computeClaim, claimMarkdown,
    computeVehicle, vehicleMarkdown,
    computeThanks, thanksMarkdown,
    computeBoard, boardMarkdown,
    yen, pct,
  };
})();
