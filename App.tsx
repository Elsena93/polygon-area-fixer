import React, { useState, useEffect } from 'react';
import InteractiveMap from './components/Map';
import { Coordinate } from './types';
import { calculateArea, scalePolygonToArea, formatArea } from './utils/geoUtils';
import { generateShapefileZip } from './utils/shapefileUtils';
import { 
  Map as MapIcon,
  PenTool, 
  Trash2, 
  Download, 
  Maximize2, 
  CheckCircle2, 
  Undo2,
  AlertCircle,
  Info
} from 'lucide-react';
import JSZip from 'jszip';

function App() {
  const [points, setPoints] = useState<Coordinate[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [targetArea, setTargetArea] = useState<string>('');
  const [currentArea, setCurrentArea] = useState<number>(0);
  const [isExporting, setIsExporting] = useState(false);

  // Update area whenever points change
  useEffect(() => {
    if (points.length >= 3) {
      setCurrentArea(calculateArea(points));
    } else {
      setCurrentArea(0);
    }
  }, [points]);

  const toggleDrawing = () => {
    if (isDrawing) {
      // Finishing drawing
      if (points.length > 0 && points.length < 3) {
        // If they barely started and cancelled, maybe clear? 
        // Or just leave the points. Let's leave them for safety.
      }
    } else {
      // Start drawing
    }
    setIsDrawing(!isDrawing);
  };

  const clearMap = () => {
    // Removed confirm dialog as it can be blocking/unresponsive in some environments
    setPoints([]);
    setIsDrawing(false);
    setTargetArea('');
  };

  const removeLastPoint = () => {
    if (points.length > 0) {
      setPoints(points.slice(0, -1));
    }
  };

  const handlePolygonComplete = () => {
    if (points.length >= 3) {
      setIsDrawing(false);
    }
  };

  const handleFixArea = () => {
    const target = parseFloat(targetArea);
    if (isNaN(target) || target <= 0) {
      alert("Harap masukkan angka positif yang valid untuk target luas.");
      return;
    }
    if (points.length < 3) return;

    const newPoints = scalePolygonToArea(points, target);
    setPoints(newPoints);
  };

  const handleExport = async (format: 'shp' | 'geojson' | 'kml') => {
    if (points.length < 3) {
      alert("Silakan gambar poligon yang valid terlebih dahulu.");
      return;
    }

    setIsExporting(true);
    const filename = "polygon_export";

    try {
      if (format === 'geojson') {
        const geojson = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: { area_sqm: currentArea },
              geometry: {
                type: "Polygon",
                coordinates: [[...points.map(p => [p.lng, p.lat]), [points[0].lng, points[0].lat]]]
              }
            }
          ]
        };
        const blob = new Blob([JSON.stringify(geojson)], { type: "application/json" });
        downloadBlob(blob, `${filename}.geojson`);
      } 
      else if (format === 'kml') {
        const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Placemark>
    <name>Target Polygon</name>
    <description>Area: ${currentArea.toFixed(2)} m2</description>
    <Polygon>
      <outerBoundaryIs>
        <LinearRing>
          <coordinates>
            ${points.map(p => `${p.lng},${p.lat},0`).join(' ')} ${points[0].lng},${points[0].lat},0
          </coordinates>
        </LinearRing>
      </outerBoundaryIs>
    </Polygon>
  </Placemark>
</kml>`;
        const blob = new Blob([kml], { type: "application/vnd.google-earth.kml+xml" });
        downloadBlob(blob, `${filename}.kml`);
      } 
      else if (format === 'shp') {
        const zipBlob = await generateShapefileZip(points, filename);
        downloadBlob(zipBlob, `${filename}.zip`);
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan saat membuat file.");
    } finally {
      setIsExporting(false);
    }
  };

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen w-screen bg-gray-900 text-gray-100 overflow-hidden font-sans">
      
      {/* Sidebar Control Panel */}
      <div className="w-96 flex-shrink-0 flex flex-col border-r border-gray-800 bg-gray-900 z-10 shadow-2xl">
        <div className="p-6 border-b border-gray-800 flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/30">
            <MapIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Sena's Polygon Tool</h1>
            <p className="text-xs text-gray-400">Penyesuaian Poligon Presisi</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Status Card */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 backdrop-blur-sm">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Statistik Saat Ini</h2>
            <div className="flex justify-between items-end">
              <div>
                <span className="text-4xl font-mono text-white font-light tracking-tighter">
                  {formatArea(currentArea).split(' ')[0]}
                </span>
                <span className="text-sm text-gray-400 ml-2 font-medium">
                  {formatArea(currentArea).split(' ')[1]}
                </span>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Titik Sudut</div>
                <div className="text-xl font-mono text-blue-400">{points.length}</div>
              </div>
            </div>
            {points.length > 0 && points.length < 3 && (
               <div className="mt-2 flex items-center gap-2 text-yellow-500 text-xs">
                 <AlertCircle className="w-4 h-4" />
                 <span>Tutup bentuk (3+ titik)</span>
               </div>
            )}
          </div>

          {/* Tools */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Alat Digitasi</h2>
            
            <button
              onClick={toggleDrawing}
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                isDrawing 
                  ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                  : 'bg-gray-800 hover:bg-gray-750 border-gray-700 text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <PenTool className="w-5 h-5" />
                <span className="font-medium">{isDrawing ? 'Selesai Menggambar' : 'Mulai Menggambar'}</span>
              </div>
              {isDrawing && <span className="text-xs bg-amber-500/20 px-2 py-1 rounded text-amber-300 animate-pulse">Aktif</span>}
            </button>

            {isDrawing && (
              <div className="flex gap-2">
                 <button 
                  onClick={removeLastPoint}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors"
                 >
                   <Undo2 className="w-4 h-4" /> Hapus Titik
                 </button>
                 <button 
                  onClick={handlePolygonComplete}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors shadow-lg shadow-blue-900/20"
                  disabled={points.length < 3}
                 >
                   <CheckCircle2 className="w-4 h-4" /> Selesai
                 </button>
              </div>
            )}

            <button
              onClick={clearMap}
              disabled={points.length === 0}
              className="w-full bg-gray-800/50 hover:bg-red-900/20 hover:text-red-400 border border-gray-700 hover:border-red-900/50 text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-800/50 disabled:hover:text-gray-400 disabled:hover:border-gray-700 py-3 rounded-lg flex items-center justify-center gap-2 text-sm transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Bersihkan Peta
            </button>
          </div>

          {/* Area Adjustment */}
          <div className="space-y-4 pt-4 border-t border-gray-800">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Maximize2 className="w-4 h-4" /> Koreksi Luas
            </h2>
            <div className="space-y-2">
              <label className="text-xs text-gray-500 block">Target Luas (meter persegi)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={targetArea}
                  onChange={(e) => setTargetArea(e.target.value)}
                  placeholder="cth., 5000"
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                />
                <button
                  onClick={handleFixArea}
                  disabled={!targetArea || points.length < 3}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white px-4 rounded-lg font-medium transition-all"
                >
                  Perbaiki
                </button>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Secara otomatis menskalakan poligon relatif terhadap titik tengahnya untuk mencapai luas target yang tepat.
              </p>
            </div>
          </div>

          {/* Technical Info Block */}
          <div className="mt-4 bg-gray-800/30 p-4 rounded-xl border border-gray-700/50 text-xs text-gray-400 space-y-3">
            <h3 className="font-semibold text-gray-300 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" /> Informasi Teknis
            </h3>
            <ul className="space-y-2 list-disc pl-4 marker:text-gray-600">
              <li>
                <span className="font-medium text-gray-300">Sistem Koordinat:</span> WGS84 (EPSG:4326). Standar GPS global yang digunakan untuk penyimpanan data dan Shapefile.
              </li>
              <li>
                <span className="font-medium text-gray-300">Tampilan Peta:</span> Web Mercator (EPSG:3857). Proyeksi standar Google Maps.
              </li>
              <li>
                <span className="font-medium text-gray-300">Pengukuran Luas:</span> Projected (EPSG:3857). Perhitungan dilakukan pada bidang datar Web Mercator (meter).
              </li>
            </ul>
          </div>

        </div>

        {/* Footer / Export */}
        <div className="p-6 bg-gray-900 border-t border-gray-800 space-y-3">
          <div className="grid grid-cols-2 gap-3">
             <button
              onClick={() => handleExport('shp')}
              disabled={points.length < 3 || isExporting}
              className="col-span-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 disabled:text-gray-600 text-white py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-all shadow-lg shadow-emerald-900/20"
            >
              {isExporting ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <Download className="w-4 h-4" />
              )}
              Unduh Shapefile
            </button>
            <button
              onClick={() => handleExport('geojson')}
              disabled={points.length < 3}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 py-2 rounded-lg text-xs font-medium transition-colors"
            >
              GeoJSON
            </button>
            <button
              onClick={() => handleExport('kml')}
              disabled={points.length < 3}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 py-2 rounded-lg text-xs font-medium transition-colors"
            >
              KML
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Area */}
      <div className="flex-1 relative bg-gray-950">
        <InteractiveMap 
          points={points} 
          setPoints={setPoints} 
          isDrawing={isDrawing} 
          onPolygonComplete={handlePolygonComplete}
        />
        
        {/* Helper Toast */}
        {isDrawing && points.length === 0 && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur text-white px-4 py-2 rounded-full shadow-2xl border border-gray-700 pointer-events-none z-[1000] flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
             <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
             Klik pada peta untuk menempatkan titik pertama
          </div>
        )}
        {isDrawing && points.length > 0 && (
             <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur text-white px-6 py-3 rounded-full shadow-2xl border border-gray-700 pointer-events-none z-[1000] text-sm text-center">
             <p>Klik untuk menambah titik.</p>
             <p className="text-gray-400 text-xs mt-1">Klik kanan atau klik "Selesai" untuk mengakhiri.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;