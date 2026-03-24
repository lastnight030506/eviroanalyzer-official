# 🗺️ GIS Spatial Analysis

> Kriging interpolation on geographic environmental data with interactive Leaflet maps.

## Overview

Performs spatial interpolation (Kriging) on environmental measurements at specific geographic coordinates. Renders results on interactive maps using Leaflet.js with color-coded heatmap layers showing pollution distribution.

## Source Files

| File | Location | Description |
|------|----------|-------------|
| `GISMap.tsx` | [`components/GISMap.tsx`](../../components/GISMap.tsx) | Leaflet map component (~16KB) |
| `analytics.ts` | [`services/analytics.ts`](../../services/analytics.ts) | `runKriging()` service function |
| `kriging.R` | [`src-tauri/scripts/kriging.R`](../../src-tauri/scripts/kriging.R) | Kriging via R `gstat` + `sp` packages |

## Data Flow

```
User enters coordinates + values → KrigingInput JSON → R sidecar
R runs variogram fitting + Kriging → KrigingResult JSON
→ Leaflet renders: sample markers + interpolation grid overlay
```

## Key Types

```typescript
interface KrigingPoint {
  lat: number;   // Latitude (Vietnam: 8-24)
  lng: number;   // Longitude (Vietnam: 102-110)
  value: number; // Measured parameter value
}

interface KrigingResult {
  variogram: { model: string; nugget: number; sill: number; range: number };
  statistics: { min: number; max: number; mean: number; sd: number };
  grid: KrigingGridPoint[];  // Interpolated grid for heatmap
}
```

## Dependencies

| Module | What's Used |
|--------|-------------|
| `r-sidecar` | `runRScript()` for R execution |
| `compliance-engine` | `COLORS` constant |

## Requirements

- **R must be installed** with packages: `jsonlite`, `gstat`, `sp`
- Feature is disabled when R is unavailable
