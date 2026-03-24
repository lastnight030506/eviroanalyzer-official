// Regulation Manager — Barrel Re-exports
// Source: components/RegulationManager.tsx, services/regulations.ts

export { default as RegulationManager } from '../../components/RegulationManager';
export {
  loadRegulations,
  saveRegulations,
  addRegulation,
  updateRegulation,
  deleteRegulation,
  resetRegulations,
  exportRegulationsToJson,
  importRegulationsFromJson,
} from '../../services/regulations';
