import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Rectangle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { runKriging, KrigingPoint, KrigingResult } from '../services/analytics';
import { COLORS } from '../constants';

interface GISMapProps {
  isDarkMode: boolean;
}

// Color scale for interpolated values
const getColorForValue = (value: number, min: number, max: number): string => {
  const ratio = (value - min) / (max - min);
  
  if (ratio < 0.33) {
    // Green to Yellow
    const r = Math.round(16 + (245 - 16) * (ratio / 0.33));
    const g = Math.round(185 + (158 - 185) * (ratio / 0.33));
    const b = Math.round(129 + (11 - 129) * (ratio / 0.33));
    return `rgb(${r}, ${g}, ${b})`;
  } else if (ratio < 0.66) {
    // Yellow to Orange
    const adjustedRatio = (ratio - 0.33) / 0.33;
    const r = Math.round(245 + (239 - 245) * adjustedRatio);
    const g = Math.round(158 + (68 - 158) * adjustedRatio);
    const b = Math.round(11 + (68 - 11) * adjustedRatio);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Orange to Red
    const adjustedRatio = (ratio - 0.66) / 0.34;
    const r = Math.round(239 + (220 - 239) * adjustedRatio);
    const g = Math.round(68 + (38 - 68) * adjustedRatio);
    const b = Math.round(68 + (38 - 68) * adjustedRatio);
    return `rgb(${r}, ${g}, ${b})`;
  }
};

// Map bounds updater component
const MapBoundsUpdater: React.FC<{ bounds: [[number, number], [number, number]] | null }> = ({ bounds }) => {
  const map = useMap();
  
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [bounds, map]);
  
  return null;
};

// Sample data for Vietnam environmental monitoring
const DEFAULT_SAMPLE_POINTS: KrigingPoint[] = [
  { lat: 10.7769, lng: 106.7009, value: 25.5 }, // Ho Chi Minh City
  { lat: 10.8231, lng: 106.6297, value: 32.1 }, // Cu Chi
  { lat: 10.9577, lng: 106.8426, value: 18.3 }, // Bien Hoa
  { lat: 10.3625, lng: 107.0843, value: 12.8 }, // Vung Tau
  { lat: 10.4114, lng: 106.4581, value: 28.7 }, // Long An
  { lat: 11.0524, lng: 106.6686, value: 22.4 }, // Binh Duong
  { lat: 10.5356, lng: 107.1512, value: 15.6 }, // Ba Ria
];

const GISMap: React.FC<GISMapProps> = ({ isDarkMode }) => {
  const [samplePoints, setSamplePoints] = useState<KrigingPoint[]>(DEFAULT_SAMPLE_POINTS);
  const [gridSize, setGridSize] = useState<number>(30);
  const [parameterName, setParameterName] = useState<string>('BOD5');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [krigingResult, setKrigingResult] = useState<KrigingResult | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showPoints, setShowPoints] = useState(true);

  // Editing state
  const [editingPoint, setEditingPoint] = useState<number | null>(null);
  const [newPoint, setNewPoint] = useState<KrigingPoint>({ lat: 10.8, lng: 106.7, value: 20 });

  // Map center (Vietnam - Southern region)
  const mapCenter: [number, number] = [10.7, 106.8];

  // Run Kriging interpolation
  const handleRunKriging = async () => {
    if (samplePoints.length < 4) {
      setError('Need at least 4 sample points for Kriging interpolation');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await runKriging({
        points: samplePoints,
        grid_size: gridSize,
        parameter: parameterName,
      });

      if (result.success) {
        setKrigingResult(result);
      } else {
        setError(result.error || 'Kriging interpolation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run Kriging. Is R installed with gstat package?');
    } finally {
      setIsLoading(false);
    }
  };

  // Add new sample point
  const handleAddPoint = () => {
    setSamplePoints([...samplePoints, { ...newPoint }]);
    setNewPoint({ lat: 10.8, lng: 106.7, value: 20 });
  };

  // Remove sample point
  const handleRemovePoint = (index: number) => {
    setSamplePoints(samplePoints.filter((_, i) => i !== index));
  };

  // Update sample point
  const handleUpdatePoint = (index: number, field: keyof KrigingPoint, value: number) => {
    const updated = [...samplePoints];
    updated[index] = { ...updated[index], [field]: value };
    setSamplePoints(updated);
  };

  // Calculate bounds for fitting
  const mapBounds = useMemo((): [[number, number], [number, number]] | null => {
    if (samplePoints.length === 0) return null;
    
    const lats = samplePoints.map(p => p.lat);
    const lngs = samplePoints.map(p => p.lng);
    
    return [
      [Math.min(...lats) - 0.1, Math.min(...lngs) - 0.1],
      [Math.max(...lats) + 0.1, Math.max(...lngs) + 0.1],
    ];
  }, [samplePoints]);

  // Render grid cells
  const gridCells = useMemo(() => {
    if (!krigingResult || !showGrid) return null;

    const { grid, bounds, statistics } = krigingResult;
    const cellWidth = (bounds.lng_max - bounds.lng_min) / Math.sqrt(grid.length);
    const cellHeight = (bounds.lat_max - bounds.lat_min) / Math.sqrt(grid.length);

    return grid.map((cell, i) => (
      <Rectangle
        key={i}
        bounds={[
          [cell.lat - cellHeight / 2, cell.lng - cellWidth / 2],
          [cell.lat + cellHeight / 2, cell.lng + cellWidth / 2],
        ]}
        pathOptions={{
          color: 'transparent',
          fillColor: getColorForValue(cell.value, statistics.min, statistics.max),
          fillOpacity: 0.6,
        }}
      >
        <Popup>
          <div className="text-sm">
            <div className="font-semibold">{parameterName}</div>
            <div>Value: {cell.value.toFixed(2)}</div>
            <div>Variance: {cell.variance.toFixed(4)}</div>
          </div>
        </Popup>
      </Rectangle>
    ));
  }, [krigingResult, showGrid, parameterName]);

  const styles = {
    card: `bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4`,
    label: `text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-2`,
    input: `w-full p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-sm`,
    button: `px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 text-white rounded text-sm font-medium transition-colors`,
    buttonSecondary: `px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded text-sm font-medium transition-colors`,
  };

  return (
    <div className="h-full flex gap-4">
      {/* Sidebar Controls */}
      <div className="w-80 flex flex-col gap-4 overflow-auto">
        {/* Run Kriging */}
        <div className={styles.card}>
          <h3 className="text-lg font-semibold mb-3 dark:text-white">Kriging Interpolation</h3>
          
          <div className="space-y-3">
            <div>
              <label className={styles.label}>Parameter Name</label>
              <input
                type="text"
                value={parameterName}
                onChange={(e) => setParameterName(e.target.value)}
                className={styles.input}
              />
            </div>

            <div>
              <label className={styles.label}>Grid Resolution</label>
              <input
                type="number"
                min={10}
                max={100}
                value={gridSize}
                onChange={(e) => setGridSize(parseInt(e.target.value) || 30)}
                className={styles.input}
              />
            </div>

            <button
              onClick={handleRunKriging}
              disabled={isLoading || samplePoints.length < 4}
              className={`${styles.button} w-full`}
            >
              {isLoading ? 'Processing...' : 'Run Interpolation'}
            </button>
          </div>

          {error && (
            <div className="mt-3 p-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded text-rose-600 dark:text-rose-400 text-xs">
              {error}
            </div>
          )}
        </div>

        {/* Display Options */}
        <div className={styles.card}>
          <h4 className="text-sm font-semibold mb-3 dark:text-white">Display Options</h4>
          
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm dark:text-slate-300">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                className="rounded border-slate-300"
              />
              Show Interpolation Grid
            </label>
            
            <label className="flex items-center gap-2 text-sm dark:text-slate-300">
              <input
                type="checkbox"
                checked={showPoints}
                onChange={(e) => setShowPoints(e.target.checked)}
                className="rounded border-slate-300"
              />
              Show Sample Points
            </label>
          </div>
        </div>

        {/* Sample Points */}
        <div className={styles.card}>
          <h4 className="text-sm font-semibold mb-3 dark:text-white">Sample Points ({samplePoints.length})</h4>
          
          <div className="space-y-2 max-h-48 overflow-auto">
            {samplePoints.map((point, i) => (
              <div key={i} className="flex items-center gap-2 text-xs bg-slate-50 dark:bg-slate-900 p-2 rounded">
                <span className="font-mono flex-1">
                  ({point.lat.toFixed(3)}, {point.lng.toFixed(3)}): {point.value}
                </span>
                <button
                  onClick={() => handleRemovePoint(i)}
                  className="text-rose-500 hover:text-rose-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Add new point */}
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-3 gap-2 mb-2">
              <input
                type="number"
                step="0.001"
                placeholder="Lat"
                value={newPoint.lat}
                onChange={(e) => setNewPoint({ ...newPoint, lat: parseFloat(e.target.value) || 0 })}
                className={`${styles.input} text-xs`}
              />
              <input
                type="number"
                step="0.001"
                placeholder="Lng"
                value={newPoint.lng}
                onChange={(e) => setNewPoint({ ...newPoint, lng: parseFloat(e.target.value) || 0 })}
                className={`${styles.input} text-xs`}
              />
              <input
                type="number"
                step="0.1"
                placeholder="Value"
                value={newPoint.value}
                onChange={(e) => setNewPoint({ ...newPoint, value: parseFloat(e.target.value) || 0 })}
                className={`${styles.input} text-xs`}
              />
            </div>
            <button onClick={handleAddPoint} className={`${styles.buttonSecondary} w-full text-xs`}>
              Add Point
            </button>
          </div>
        </div>

        {/* Results */}
        {krigingResult && (
          <div className={styles.card}>
            <h4 className="text-sm font-semibold mb-3 dark:text-white">Interpolation Results</h4>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Model:</span>
                <span className="font-mono dark:text-slate-300">{krigingResult.variogram.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sill:</span>
                <span className="font-mono dark:text-slate-300">{krigingResult.variogram.sill}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Range:</span>
                <span className="font-mono dark:text-slate-300">{krigingResult.variogram.range}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Min:</span>
                <span className="font-mono dark:text-slate-300">{krigingResult.statistics.min}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Max:</span>
                <span className="font-mono dark:text-slate-300">{krigingResult.statistics.max}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mean:</span>
                <span className="font-mono dark:text-slate-300">{krigingResult.statistics.mean}</span>
              </div>
            </div>

            {/* Color Legend */}
            <div className="mt-4">
              <div className="text-xs text-slate-500 mb-1">Color Scale</div>
              <div className="h-4 rounded overflow-hidden flex">
                <div className="flex-1" style={{ backgroundColor: COLORS.success }}></div>
                <div className="flex-1" style={{ backgroundColor: COLORS.warning }}></div>
                <div className="flex-1" style={{ backgroundColor: COLORS.danger }}></div>
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>{krigingResult.statistics.min.toFixed(1)}</span>
                <span>{krigingResult.statistics.max.toFixed(1)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map */}
      <div className={`${styles.card} flex-1 overflow-hidden`}>
        <MapContainer
          center={mapCenter}
          zoom={9}
          style={{ height: '100%', width: '100%', borderRadius: '8px' }}
          className={isDarkMode ? '' : ''}
        >
          {/* Use CartoDB Voyager (works well in both modes) or Dark Matter for dark mode */}
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url={isDarkMode 
              ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
              : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
            }
          />
          
          <MapBoundsUpdater bounds={mapBounds} />

          {/* Kriging Grid */}
          {gridCells}

          {/* Sample Points */}
          {showPoints && samplePoints.map((point, i) => (
            <CircleMarker
              key={i}
              center={[point.lat, point.lng]}
              radius={8}
              pathOptions={{
                color: isDarkMode ? '#fff' : '#000',
                weight: 2,
                fillColor: COLORS.primary,
                fillOpacity: 0.8,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">Sample Point {i + 1}</div>
                  <div>Lat: {point.lat.toFixed(4)}</div>
                  <div>Lng: {point.lng.toFixed(4)}</div>
                  <div className="font-bold mt-1">{parameterName}: {point.value}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default GISMap;
