// カルテ（ハイブランドコース）── お客様お渡し用 印刷シート（A5・両面）
// 表：お客様情報・ご要望・洗い方カスタマイズ・カスタマイズ補足・採寸・シミ・傷の位置
// 裏：了解確認事項・事前の検品時に気になった点・
//     クリーニング後のお客様へのアドバイス・商品情報・料金

// 印刷用の簡易ダイアグラム（インタラクション無し・小型表示）
const KartePrintDiagram = ({ type, view, pins }) => {
  const group = window.KARTE_DIAGRAMS[type] || window.KARTE_DIAGRAMS.garment;
  const def = group[view] || group.front || group.main;
  const [vbX, vbY, vbW, vbH] = def.vb.split(" ").map(Number);
  const scoped = (pins || []).filter((p) => p.view === view);
  return (
    <svg viewBox={def.vb} className="kp-diagram-svg">
      {def.lines
        ? def.lines.map((pts, i) => <polyline key={i} points={pts} fill="none" stroke="#555" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />)
        : <path d={def.path} fill="none" stroke="#555" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />}
      {scoped.map((p, i) => (
        <g key={p.id} transform={`translate(${vbX + (p.x / 100) * vbW}, ${vbY + (p.y / 100) * vbH})`}>
          <circle r={vbW * 0.03} fill={window.pinColor(p.kind)} stroke="#fff" strokeWidth={vbW * 0.006} />
          <text y={vbW * 0.011} textAnchor="middle" fontSize={vbW * 0.036} fill="#fff" fontWeight="700">{i + 1}</text>
        </g>
      ))}
    </svg>
  );
};

const KpField = ({ label, value }) => (
  <div className="kp-field">
    <span className="kp-field-label">{label}</span>
    <span className="kp-field-value">{value || "—"}</span>
  </div>
);

// 下4ケタ以外を * でマスク（ハイフンは保持）
const maskPhone = (raw) => {
  if (!raw) return "";
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length <= 4) return raw;
  const last4 = digits.slice(-4);
  const maskedDigits = "*".repeat(digits.length - 4) + last4;
  if (digits.length === 11) return `${maskedDigits.slice(0, 3)}-${maskedDigits.slice(3, 7)}-${maskedDigits.slice(7)}`;
  if (digits.length === 10) return `${maskedDigits.slice(0, 3)}-${maskedDigits.slice(3, 6)}-${maskedDigits.slice(6)}`;
  return maskedDigits;
};

// 日付＋曜日（例：2026/7/3(金)）
const dateSlashWdK = (s) => {
  if (!s) return "";
  const base = window.dateSlashK(s);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return base;
  const wd = "日月火水木金土"[new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`).getDay()];
  return `${base}(${wd})`;
};

const KartePrintSheet = ({ karte, onBack }) => {
  const total = window.karteTotal(karte);
  const custom = karte.custom || {};
  const customParts = [];
  window.CUSTOMIZE_GROUPS.forEach((g) => { if (custom[g.key]) customParts.push({ label: g.label, value: custom[g.key] }); });
  const optionParts = (custom.options || []).map((o) =>
    o === "シミ抜き" && custom.stainLimit ? `シミ抜き（${window.yenK(custom.stainLimit)}まで）` : o
  );
  const hasBack = karte.diagramType === "garment";

  return (
    <div className="kp-outer">
      <div className="kp-toolbar no-print">
        <button className="btn btn-ghost" onClick={onBack}>← 詳細へ戻る</button>
        <button className="btn btn-primary" onClick={() => window.print()}>🖨 このシートを印刷（A5・両面）</button>
        <span className="kp-toolbar-hint">プリンター設定で「両面印刷」「用紙：A5」を選択してください</span>
      </div>

      <div className="kp-root">
        {/* ══════════ PAGE 1（表）══════════ */}
        <div className="kp-page">
          <div className="kp-head">
            <div className="kp-head-brand">クリーニングみわ ハイブランドコース専用カルテ</div>
          </div>
          <div className="kp-title-row">
            <span className="kp-page-label">受付情報</span>
            <span className="kp-page-no">1 / 2</span>
          </div>

          {/* お客様情報 */}
          <div className="kp-section">
            <div className="kp-section-title">お客様情報</div>
            <div className="kp-grid2 kp-cust">
              <KpField label="店舗" value={karte.store} />
              <KpField label="カルテNo." value={karte.no} />
              <KpField label="タグ番号" value={karte.tagNo} />
              <KpField label="お名前" value={karte.customerName ? `${karte.customerName}${/様$/.test(karte.customerName.trim()) ? "" : " 様"}` : ""} />
              <KpField label="顧客番号" value={karte.customerNo} />
              <KpField label="ご連絡先" value={maskPhone(karte.contactPhone)} />
              <KpField label="連絡希望" value={karte.contactPrefDay} />
              <KpField label="お預かり日" value={dateSlashWdK(karte.receivedDate)} />
              <div className="kp-field kp-field-emph">
                <span className="kp-field-label">お渡し日</span>
                <span className="kp-field-value kp-field-value-emph">{karte.deliveryDate ? `${dateSlashWdK(karte.deliveryDate)} 17時お渡し` : "—"}</span>
              </div>
            </div>
          </div>

          {/* ご要望 */}
          <div className="kp-section">
            <div className="kp-section-title">ご要望</div>
            {(karte.requestChecks || []).length > 0 && (
              <div className="kp-chips">
                {karte.requestChecks.map((r) => <span key={r} className="kp-chip">{r}</span>)}
              </div>
            )}
            {karte.request && <div className="kp-note kp-note-cust">{karte.request}</div>}
            {!(karte.requestChecks || []).length && !karte.request && <div className="kp-empty">特になし</div>}
          </div>

          {/* 洗い方カスタマイズ */}
          <div className="kp-section">
            <div className="kp-section-title">洗い方カスタマイズ</div>
            {(customParts.length > 0 || optionParts.length > 0) ? (
              <>
                <div className="kp-chips">
                  {customParts.map((c) => <span key={c.label} className="kp-chip"><b>{c.label}</b>{c.value}</span>)}
                  {optionParts.map((o, i) => <span key={i} className="kp-chip kp-chip-accent">{o}</span>)}
                </div>
                <div className="kp-hint7">※ {window.CUSTOMIZE_STANDARD_NOTE}</div>
              </>
            ) : <div className="kp-empty">指定なし（標準仕上げ）</div>}
          </div>

          {/* カスタマイズ補足 */}
          {karte.customization && (
            <div className="kp-section">
              <div className="kp-section-title">カスタマイズ補足</div>
              <div className="kp-note kp-note-cust">{karte.customization}</div>
            </div>
          )}

          {/* 採寸 */}
          <div className="kp-group-title">【お品物情報】</div>
          <div className="kp-section">
            <div className="kp-section-title">採寸</div>
            {karte.measurements.length > 0 ? (
              <div className="kp-measure-table">
                {karte.measurements.map((m) => (
                  <div key={m.id} className="kp-measure-cell"><span>{m.label}</span><b>前{m.before || "—"} / 後{m.after || "—"} cm</b></div>
                ))}
              </div>
            ) : <div className="kp-empty">未計測</div>}
            <div className="kp-hint7">※伸縮２％までは許容範囲とさせて頂きます</div>
          </div>

          {/* シミ・傷の位置 */}
          <div className="kp-section">
            <div className="kp-section-title">シミ・傷の位置</div>
            <div className="kp-diagram-row">
              <div className="kp-diagram-col">
                <div className="kp-diagram-cap">{hasBack ? "前身" : ""}</div>
                <KartePrintDiagram type={karte.diagramType} view={hasBack ? "front" : "main"} pins={karte.pins} />
              </div>
              {hasBack && (
                <div className="kp-diagram-col">
                  <div className="kp-diagram-cap">後ろ身</div>
                  <KartePrintDiagram type="garment" view="back" pins={karte.pins} />
                </div>
              )}
              <div className="kp-pin-legend">
                {karte.pins.length > 0 ? karte.pins.map((p, i) => (
                  <div key={p.id} className="kp-pin-item">
                    <span className="kp-pin-dot" style={{ background: window.pinColor(p.kind) }}>{i + 1}</span>
                    <span>{p.note || (p.kind === "scratch" ? "キズ" : "シミ")}</span>
                  </div>
                )) : <div className="kp-empty">記録なし</div>}
              </div>
            </div>
          </div>

          <div className="kp-foot">お問い合わせ：ご来店の際は本票をお持ちください</div>
        </div>
        <div className="kp-page">
          <div className="kp-head">
            <div className="kp-head-brand">クリーニングみわ ハイブランドコース専用カルテ</div>
            <div className="kp-head-dates">
              <span>{karte.store} ／ タグ{karte.tagNo || "—"} ／ {karte.item.brand || karte.item.category}</span>
            </div>
          </div>
          <div className="kp-page-no-only">2 / 2</div>

          {/* 了解確認事項 */}
          <div className="kp-section">
            <div className="kp-section-title">了解確認事項</div>
            {(karte.confirmations.checks || []).length > 0 ? (
              <div className="kp-note">{karte.confirmations.checks.join("、")}</div>
            ) : <div className="kp-empty">該当項目なし</div>}
          </div>

          {/* 事前の検品時に気になった点 */}
          {karte.confirmations.note && (
            <div className="kp-section">
              <div className="kp-section-title">事前の検品時に気になった点</div>
              <div className="kp-note">{karte.confirmations.note}</div>
            </div>
          )}

          {/* クリーニング後のお客様へのアドバイス（お客様が読む＝9pt） */}
          {karte.confirmations.advice && (
            <div className="kp-section kp-advice">
              <div className="kp-section-title">クリーニング後のお客様へのアドバイス</div>
              <div className="kp-note kp-note-cust">{karte.confirmations.advice}</div>
            </div>
          )}

          {/* 商品情報 */}
          <div className="kp-section">
            <div className="kp-section-title">商品情報</div>
            <div className="kp-grid2">
              <KpField label="種別" value={karte.item.category} />
              <KpField label="ブランド" value={karte.item.brand} />
              <KpField label="製造番号" value={karte.item.serialNo} />
              <KpField label="色" value={karte.item.color} />
              {karte.item.showPurchasePrice !== false && (
                <KpField label="参考購入価格" value={karte.item.purchasePrice ? window.yenK(karte.item.purchasePrice) : ""} />
              )}
              <KpField label="購入時期" value={karte.item.purchaseTime} />
            </div>
          </div>

          {/* 料金（お客様が読む＝9pt） */}
          <div className="kp-group-title">【お支払い明細】</div>
          <div className="kp-section kp-price">
            <div className="kp-section-title">料金</div>
            <div className="kp-price-rows">
              <div className="kp-price-row"><span>クリーニング料金</span><span>{window.yenK(karte.pricing.cleaningFee)}</span></div>
              <div className="kp-price-row"><span>オプション料金</span><span>{window.yenK(karte.pricing.optionFee)}</span></div>
              <div className="kp-price-row"><span>追加補償</span><span>{karte.pricing.hasCompensation ? window.yenK(karte.pricing.compensationFee) : "なし"}</span></div>
              <div className="kp-price-total"><span>合計金額</span><span>{window.yenK(total)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.KartePrintSheet = KartePrintSheet;
