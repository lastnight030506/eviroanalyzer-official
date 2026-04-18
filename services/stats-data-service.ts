import { runRScript } from './r-sidecar';
import type { DataLoadResult, VariableInfo, RawDataRow } from '../types/statistics';

export interface DirectDataInput {
  variables: VariableInfo[];
  data: RawDataRow[];
}

export async function loadDirectData(input: DirectDataInput): Promise<DataLoadResult> {
  // Generate a session ID if not present
  let sessionId = localStorage.getItem('stats_session_id');
  if (!sessionId) {
    sessionId = 'stats_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    localStorage.setItem('stats_session_id', sessionId);
  }

  const jsonInput = JSON.stringify({
    session_id: sessionId,
    variables: input.variables,
    data: input.data,
  });

  const result = await runRScript<DataLoadResult>('write_stats_data.R', [jsonInput]);

  // Also store in localStorage for cross-component access
  localStorage.setItem('stats_session_id', sessionId);

  return result;
}
