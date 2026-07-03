// カルテ ── シミ・傷の位置を示すイラスト（クリックでピン留め）
// type: "garment" (前/後ろ切替あり) / "bag" / "shoes"

// 洋服（前身）：供給されたSVGトレース（単一ポリライン）
const GARMENT_FRONT = {
  vb: "-4.5 14.72 168.91 186.84",
  lines: ["79.96 140.1 48.29 196.56 8.84 196.26 43.66 136.37 43.51 105.15 43.81 61.24 19.02 76.48 1.69 50.79 53.07 20.02 107.14 19.72 80.11 55.87 60.09 49.89 65.92 43.62 54.27 43.02 53.07 20.02 80.11 55.87 100.08 48.99 93.62 43.32 106.54 43.32 107.14 19.72 158.81 51.38 139.4 76.48 117.29 61.54 117.29 105.26 43.51 105.15 .5 168.18 159.41 168.48 117.29 104.26 117.29 136.66 150.45 196.56 113.71 196.56 79.96 140.1"],
};
// 洋服（後ろ身）：供給されたSVGトレース（ポリライン2本）
const GARMENT_BACK = {
  vb: "263.62 14.84 168.91 186.84",
  lines: [
    "375.26 19.84 426.94 51.5 407.52 76.6 385.42 61.66 385.42 105.38 311.64 105.27 268.62 168.3 427.53 168.6 385.42 104.38 385.42 136.79 418.57 196.68 381.83 196.68 348.08 140.22",
    "348.08 140.22 316.42 196.68 276.96 196.38 311.79 136.49 311.64 105.27 311.93 61.36 287.14 76.6 269.82 50.91 321.19 20.14 376 19.84",
  ],
};

const KARTE_DIAGRAMS = {
  garment: { front: GARMENT_FRONT, back: GARMENT_BACK },
  bag: {
    main: { vb: "0 0 300 240", path: "M70 90 Q70 40 110 34 Q110 10 150 10 Q190 10 190 34 Q230 40 230 90 L230 190 Q230 220 200 220 L100 220 Q70 220 70 190 Z M110 34 Q110 60 110 90 M190 34 Q190 60 190 90" },
  },
  shoes: {
    main: { vb: "0 0 320 180", path: "M20 140 Q20 110 45 100 L90 78 Q110 68 130 74 L150 84 Q160 120 140 140 Q120 156 70 156 Q30 156 20 140 Z M175 140 Q175 110 200 100 L245 78 Q265 68 285 74 L300 84 Q310 120 290 140 Q270 156 220 156 Q180 156 175 140 Z" },
  },
};

// ピン種別（色分け）
const PIN_KINDS = [
  { key: "stain", label: "シミ", color: "#c17a2e" },
  { key: "scratch", label: "キズ", color: "#2a6fdb" },
];
const pinColor = (kind) => (PIN_KINDS.find((k) => k.key === kind) || PIN_KINDS[0]).color;

const KarteDiagram = ({ type, pins, onAddPin, onRemovePin, onUpdatePinNote, onUpdatePinKind, readOnly }) => {
  const group = KARTE_DIAGRAMS[type] || KARTE_DIAGRAMS.garment;
  const isGarment = type === "garment";
  const views = isGarment ? [["front", "前身"], ["back", "後ろ身"]] : [["main", null]];

  return (
    <div className={`kd-wrap ${isGarment ? "kd-multi" : ""}`}>
      {views.map(([viewKey, viewLabel]) => (
        <KarteDiagramPane key={viewKey} def={group[viewKey]} viewKey={viewKey} viewLabel={viewLabel}
                           pins={pins} onAddPin={onAddPin} onRemovePin={onRemovePin}
                           onUpdatePinNote={onUpdatePinNote} onUpdatePinKind={onUpdatePinKind} readOnly={readOnly} />
      ))}
    </div>
  );
};

const KarteDiagramPane = ({ def, viewKey, viewLabel, pins, onAddPin, onRemovePin, onUpdatePinNote, onUpdatePinKind, readOnly }) => {
  const [vbX, vbY, vbW, vbH] = def.vb.split(" ").map(Number);
  const svgRef = React.useRef(null);
  const scopedPins = (pins || []).filter((p) => p.view === viewKey);

  const handleClick = (e) => {
    if (readOnly) return;
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * vbW + vbX;
    const py = ((e.clientY - rect.top) / rect.height) * vbH + vbY;
    const xPct = ((px - vbX) / vbW) * 100;
    const yPct = ((py - vbY) / vbH) * 100;
    onAddPin({ view: viewKey, x: xPct, y: yPct });
  };

  return (
    <div className="kd-pane">
      {viewLabel && <div className="kd-pane-label">{viewLabel}</div>}
      <div className="kd-canvas">
        <svg ref={svgRef} viewBox={def.vb} className={`kd-svg ${readOnly ? "" : "kd-clickable"}`} onClick={handleClick}>
          {def.lines
            ? def.lines.map((pts, i) => (
                <polyline key={i} points={pts} fill="none" stroke="var(--ink-mute)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
              ))
            : <path d={def.path} fill="none" stroke="var(--ink-mute)" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />}
          {scopedPins.map((p, i) => (
            <g key={p.id} transform={`translate(${vbX + (p.x / 100) * vbW}, ${vbY + (p.y / 100) * vbH})`}>
              <circle r={vbW * 0.028} fill={pinColor(p.kind)} stroke="#fff" strokeWidth={vbW * 0.006} />
              <text y={vbW * 0.01} textAnchor="middle" fontSize={vbW * 0.032} fill="#fff" fontWeight="700">{i + 1}</text>
            </g>
          ))}
        </svg>
        {!readOnly && <div className="kd-hint no-print">図をクリックしてシミ・傷の位置を記録</div>}
      </div>
      {scopedPins.length > 0 && (
        <div className="kd-pin-list">
          {scopedPins.map((p, i) => (
            <div key={p.id} className="kd-pin-row">
              <span className="kd-pin-no" style={{ background: pinColor(p.kind) }}>{i + 1}</span>
              {!readOnly && (
                <div className="kd-kind-btns no-print">
                  {PIN_KINDS.map((k) => (
                    <button key={k.key} type="button"
                            className={`kd-kind-btn ${(p.kind || "stain") === k.key ? "on" : ""}`}
                            style={{ "--kd-kind-color": k.color }}
                            onClick={() => onUpdatePinKind(p.id, k.key)}>{k.label}</button>
                  ))}
                </div>
              )}
              {readOnly && <span className="kd-kind-tag" style={{ background: pinColor(p.kind) }}>{(PIN_KINDS.find((k) => k.key === p.kind) || PIN_KINDS[0]).label}</span>}
              {readOnly ? (
                <span className="kd-pin-note-text">{p.note || "（メモなし）"}</span>
              ) : (
                <input className="input kd-pin-note" value={p.note} placeholder="メモ（例：ワイン染み、擦れ傷 など）"
                       onChange={(e) => onUpdatePinNote(p.id, e.target.value)} />
              )}
              {!readOnly && <button type="button" className="kd-pin-x" onClick={() => onRemovePin(p.id)}>×</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

Object.assign(window, { KARTE_DIAGRAMS, KarteDiagram, PIN_KINDS, pinColor });
