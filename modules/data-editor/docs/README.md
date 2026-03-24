# ✏️ Data Editor

> Interactive spreadsheet-like data matrix for entering environmental sample measurements.

## Overview

A React component that renders an editable grid where users input measured values for each environmental parameter across multiple samples. Changes trigger real-time compliance reassessment.

## Source Files

| File | Location | Description |
|------|----------|-------------|
| `DataEditor.tsx` | [`components/DataEditor.tsx`](../../components/DataEditor.tsx) | Main component (~4.6KB) |

## Props Interface

```typescript
interface Props {
  data: SampleRow[];              // Current data rows
  sampleColumns: string[];        // e.g., ["Sample 1", "Sample 2", "Sample 3"]
  onDataChange: (data: SampleRow[]) => void;  // Callback on edit
}
```

## Features

- Editable numeric cells for each parameter × sample
- Read-only columns for parameter metadata (name, unit, limit, type)
- Dynamic sample column count
- Real-time validation of numeric input

## Dependencies

| Module | What's Used |
|--------|-------------|
| `compliance-engine` | `SampleRow` type |

## Depended On By

- **App.tsx** — renders DataEditor in the "Data" tab
