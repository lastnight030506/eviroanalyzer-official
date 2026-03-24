// GIS Spatial — Barrel Re-exports
// Source: components/GISMap.tsx, services/analytics.ts

export { default as GISMap } from '../../components/GISMap';
export { runKriging } from '../../services/analytics';

export type {
  KrigingPoint,
  KrigingInput,
  KrigingGridPoint,
  KrigingResult,
} from '../../services/analytics';
