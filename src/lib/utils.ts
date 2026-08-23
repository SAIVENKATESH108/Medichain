export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}

export function generateReportId(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getVerdictColor(verdict: string): string {
  switch (verdict.toUpperCase()) {
    case 'VERIFIED': return 'text-accent bg-emerald-50 border-accent';
    case 'SUSPICIOUS': return 'text-warning bg-amber-50 border-warning';
    case 'COUNTERFEIT': return 'text-danger bg-red-50 border-danger';
    default: return 'text-slate-500 bg-slate-50 border-slate-300';
  }
}

export function getVerdictBg(verdict: string): string {
  switch (verdict.toUpperCase()) {
    case 'VERIFIED': return 'bg-emerald-500';
    case 'SUSPICIOUS': return 'bg-amber-500';
    case 'COUNTERFEIT': return 'bg-red-500';
    default: return 'bg-slate-500';
  }
}

export function getRiskColor(level: string): string {
  switch (level.toLowerCase()) {
    case 'high': return 'text-red-600 bg-red-50';
    case 'medium': return 'text-amber-600 bg-amber-50';
    case 'low': return 'text-emerald-600 bg-emerald-50';
    default: return 'text-slate-600 bg-slate-50';
  }
}

function escapeCsvField(value: string | number | boolean | null | undefined): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadCsv(
  rows: Record<string, unknown>[],
  headers: { key: string; label: string }[],
  filename: string
) {
  const headerLine = headers.map(h => escapeCsvField(h.label)).join(',');
  const dataLines = rows.map(row =>
    headers.map(h => escapeCsvField(row[h.key] as string)).join(',')
  );
  const csv = [headerLine, ...dataLines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
