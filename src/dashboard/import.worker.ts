import Papa from 'papaparse';
import { jsonTable, numericTable } from './data.ts';

self.onmessage = (event: MessageEvent<{ text: string; json: boolean }>) => {
  try {
    const { text, json } = event.data;
    if (json) { self.postMessage({ data: jsonTable(text.replace(/^\uFEFF/, '')) }); return; }
    const result = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), { skipEmptyLines: 'greedy' });
    if (result.errors.length) throw new Error(`CSV: ${result.errors[0].message}`);
    const [headers, ...rows] = result.data;
    if (!headers) throw new Error('The file is empty.');
    self.postMessage({ data: numericTable(headers, rows) });
  } catch (error) { self.postMessage({ error: error instanceof Error ? error.message : 'Could not read the file.' }); }
};
