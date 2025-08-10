import React, { useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from "react-leaflet";
import L from "leaflet";

function svgToDivIcon(svg, { scale = 1, rotate = 0 } = {}) {
  const size = 64 * scale;
  const html = `
    <div style="width:${size}px;height:${size}px;transform:rotate(${rotate}deg);transform-origin:center;">
      ${svg}
    </div>`;
  return L.divIcon({ html, className: "", iconSize: [size, size] });
}

const SIGN_LIBRARY = [
  { id: "W20-1", name: "ROAD WORK AHEAD (W20-1)", svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><polygon points="50,3 97,50 50,97 3,50" fill="#ff7f27" stroke="#111" stroke-width="4"/><text x="50" y="42" text-anchor="middle" font-size="14" font-family="Arial" fill="#111" font-weight="700">ROAD</text><text x="50" y="60" text-anchor="middle" font-size="14" font-family="Arial" fill="#111" font-weight="700">WORK</text><text x="50" y="78" text-anchor="middle" font-size="14" font-family="Arial" fill="#111" font-weight="700">AHEAD</text></svg>` },
  { id: "W20-7a", name: "FLAGGER AHEAD (W20-7a)", svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><polygon points="50,3 97,50 50,97 3,50" fill="#ff7f27" stroke="#111" stroke-width="4"/><circle cx="35" cy="52" r="6" fill="#111"/><rect x="33" y="58" width="4" height="18" fill="#111"/><line x1="35" y1="65" x2="45" y2="75" stroke="#111" stroke-width="4"/><line x1="35" y1="65" x2="25" y2="75" stroke="#111" stroke-width="4"/><rect x="58" y="40" width="22" height="10" fill="#111"/><line x1="35" y1="58" x2="45" y2="48" stroke="#111" stroke-width="4"/></svg>` },
  { id: "R2-1-45", name: "SPEED LIMIT 45 (R2-1)", svg: `<svg viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="96" height="126" rx="8" ry="8" fill="#fff" stroke="#111" stroke-width="4"/><text x="50" y="38" text-anchor="middle" font-size="18" font-family="Arial" fill="#111" font-weight="700">SPEED</text><text x="50" y="58" text-anchor="middle" font-size="18" font-family="Arial" fill="#111" font-weight="700">LIMIT</text><text x="50" y="100" text-anchor="middle" font-size="46" font-family="Arial" fill="#111" font-weight="800">45</text></svg>` },
  { id: "G20-2", name: "END ROAD WORK (G20-2)", svg: `<svg viewBox="0 0 160 70" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="154" height="64" rx="6" ry="6" fill="#ff7f27" stroke="#111" stroke-width="4"/><text x="80" y="45" text-anchor="middle" font-size="28" font-family="Arial" fill="#111" font-weight="800">END ROAD WORK</text></svg>` },
  { id: "W1-2", name: "CURVE AHEAD (W1-2)", svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><polygon points="50,3 97,50 50,97 3,50" fill="#ffd31a" stroke="#111" stroke-width="4"/><path d="M40 80 C55 65, 55 55, 60 45 C65 35, 72 30, 82 28" stroke="#111" stroke-width="6" fill="none"/><polygon points="80,20 92,28 80,36" fill="#111"/></svg>` },
  { id: "W8-7", name: "ROUGH ROAD (W8-7)", svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><polygon points="50,3 97,50 50,97 3,50" fill="#ffd31a" stroke="#111" stroke-width="4"/><path d="M18 62 Q28 52 38 62 T58 62 T78 62" stroke="#111" stroke-width="6" fill="none"/></svg>` },
  { id: "channelizer", name: "Channelizing Cone", svg: `<svg viewBox="0 0 60 120" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="100" width="30" height="8" fill="#444"/><polygon points="30,10 45,100 15,100" fill="#ff7f27" stroke="#111" stroke-width="3"/><rect x="22" y="55" width="16" height="7" fill="#fff"/><rect x="21" y="70" width="18" height="7" fill="#fff"/></svg>` },
];

function useNewId() {
  const [n, setN] = useState(0);
  return () => { setN(v => v + 1); return `${Date.now()}_${n}`; };
}

function PlacementClickLayer({ placing, onPlace }) {
  useMapEvents({ click(e) { if (placing) onPlace(e.latlng); } });
  return null;
}

export default function TCPPlanner() {
  const [selectedSign, setSelectedSign] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [objects, setObjects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [polyline, setPolyline] = useState([]);
  const makeId = useNewId();
  const mapRef = useRef(null);

  const selectedObj = useMemo(() => objects.find(o => o.id === selectedId) || null, [objects, selectedId]);

  const markers = useMemo(() => objects.map(o => {
    const lib = SIGN_LIBRARY.find(s => s.id === o.type);
    const icon = svgToDivIcon(lib?.svg || "<div/>", { scale: o.scale, rotate: o.rotate });
    return (
      <Marker key={o.id} position={[o.lat, o.lng]} icon={icon} draggable
        eventHandlers={{
          click: () => setSelectedId(o.id),
          dragend: (e) => {
            const { lat, lng } = e.target.getLatLng();
            setObjects(prev => prev.map(x => x.id === o.id ? { ...x, lat, lng } : x));
          }
        }}>
        <Popup minWidth={220}>
          <div className="space-y-2">
            <div className="text-sm font-semibold">{SIGN_LIBRARY.find(s => s.id === o.type)?.name}</div>
            <div className="flex items-center gap-2">
              <label className="text-xs w-16">Rotate</label>
              <input type="range" min={0} max={360} value={o.rotate}
                     onChange={e => setObjects(p => p.map(x => x.id === o.id ? { ...x, rotate: +e.target.value } : x))}/>
              <span className="text-xs tabular-nums w-10">{o.rotate}°</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs w-16">Scale</label>
              <input type="range" min={0.5} max={2} step={0.1} value={o.scale}
                     onChange={e => setObjects(p => p.map(x => x.id === o.id ? { ...x, scale: +e.target.value } : x))}/>
              <span className="text-xs tabular-nums w-10">{o.scale.toFixed(1)}×</span>
            </div>
            <button className="text-red-600 text-xs underline"
              onClick={() => { setObjects(p => p.filter(x => x.id !== o.id)); setSelectedId(null); }}>
              Delete
            </button>
          </div>
        </Popup>
      </Marker>
    );
  }), [objects]);

  function handlePlace(latlng) {
    if (!selectedSign) return;
    const id = makeId();
    setObjects(p => [...p, { id, type: selectedSign.id, lat: latlng.lat, lng: latlng.lng, rotate: 0, scale: 1 }]);
    setSelectedId(id);
    setPlacing(false);
  }

  function addVertex(latlng) { setPolyline(p => [...p, [latlng.lat, latlng.lng]]); }

  function exportJSON() {
    const payload = { version: 1, objects, polyline };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `tcp_plan_${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
  }

  function importJSON(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { const d = JSON.parse(reader.result);
      if (d.objects && d.polyline) { setObjects(d.objects); setPolyline(d.polyline); } } catch {} };
    reader.readAsText(file);
  }

  return (
    <div className="w-full h-screen grid grid-cols-12">
      <aside className="col-span-3 border-r p-3 space-y-3 overflow-y-auto">
        <h1 className="text-xl font-bold">Work Zone TCP Planner</h1>
        <p className="text-sm text-gray-600">Select a sign, click “Place,” then tap the map.</p>

        <div className="flex gap-2">
          <button className={`px-3 py-1 rounded-xl shadow ${placing ? "bg-blue-600 text-white" : "bg-gray-100"}`}
                  onClick={() => setPlacing(v => !v)}>
            {placing ? "Placing: ON" : "Place on Map"}
          </button>
          <button className="px-3 py-1 rounded-xl shadow bg-gray-100" onClick={exportJSON}>Export JSON</button>
          <label className="px-3 py-1 rounded-xl shadow bg-gray-100 cursor-pointer">
            Import JSON
            <input type="file" className="hidden" accept="application/json" onChange={importJSON}/>
          </label>
        </div>

        <div className="mt-2">
          <h2 className="text-sm font-semibold mb-2">Signs & Devices</h2>
          <div className="grid grid-cols-2 gap-2">
            {SIGN_LIBRARY.map(s => (
              <button key={s.id} onClick={() => setSelectedSign(s)}
                      className={`border rounded-xl p-2 hover:shadow ${selectedSign?.id === s.id ? "ring-2 ring-blue-500" : ""}`}
                      title={s.name}>
                <div className="w-full flex justify-center">
                  <div dangerouslySetInnerHTML={{ __html: s.svg }} style={{ width: 64, height: 64 }} />
                </div>
                <div className="text-[10px] text-center mt-1">{s.id}</div>
              </button>
            ))}
          </div>
          {selectedSign && <div className="mt-2 text-xs text-gray-700">Selected: {selectedSign.name}</div>}
        </div>

        <div className="mt-4 space-y-2">
          <h2 className="text-sm font-semibold">Sketch Lane Closure</h2>
          <p className="text-xs text-gray-600">Hold Shift and click to add red polyline vertices.</p>
        </div>
      </aside>

      <main className="col-span-9">
        <MapShell mapRef={mapRef} placing={placing}
