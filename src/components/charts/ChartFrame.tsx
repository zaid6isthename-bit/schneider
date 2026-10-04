'use client';

import React, { useState } from 'react';
import { Table, Download, X } from 'lucide-react';

interface ChartFrameProps {
  title: string;
  subtitle?: string;
  data: Record<string, any>[];
  children: React.ReactNode;
  className?: string;
  badge?: string;
  id?: string;
  filename?: string;
  columns?: any[];
}

export function ChartFrame({
  title,
  subtitle,
  data,
  children,
  className = '',
  badge,
}: ChartFrameProps) {
  const [showTable, setShowTable] = useState(false);

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  const handleExportCsv = () => {
    if (data.length === 0) return;
    const header = columns.join(',');
    const rows = data.map((row) =>
      columns
        .map((col) => {
          const val = row[col];
          if (val === null || val === undefined) return '';
          if (typeof val === 'number') return Number.isInteger(val) ? val : val.toFixed(3);
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',')
    );
    const csvContent = [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    link.download = `thermos_${safeTitle}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`relative bg-surface-container-lowest p-space-base sm:p-space-lg rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col justify-between transition-colors ${className}`}
    >
      {/* Top Header & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-sm pb-space-xs border-b border-surface-container-high/50">
        <div>
          <div className="flex items-center gap-space-xs">
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">{title}</h3>
            {badge && (
              <span className="font-label-caps text-label-caps px-space-xs py-space-2xs rounded bg-secondary-container text-on-secondary-container font-bold uppercase">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-space-xs">
          <button
            type="button"
            onClick={() => setShowTable(!showTable)}
            className="flex items-center gap-space-xs px-space-sm py-space-xs rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface transition-colors font-label-caps uppercase text-[11px] font-bold border border-surface-container-high"
            title="View plotted values in tabular view"
          >
            <Table className="w-3.5 h-3.5" />
            <span>{showTable ? 'Hide data' : 'View data'}</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-space-xs px-space-sm py-space-xs rounded-lg bg-primary-container text-on-primary hover:opacity-90 transition-opacity font-label-caps uppercase text-[11px] font-bold shadow-sm"
            title="Download CSV of exact data points"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="w-full flex-1 min-h-[220px]">{children}</div>

      {/* Tabular Overlay Drawer */}
      {showTable && (
        <div className="absolute inset-0 z-30 rounded-xl bg-surface-container-lowest/98 backdrop-blur-xl p-space-base flex flex-col border border-surface-container-high shadow-xl overflow-hidden">
          <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high">
            <div>
              <h4 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                Plotted Series: {title}
              </h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Exact evaluated points across all 96 simulation steps (15-min intervals)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowTable(false)}
              className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-auto mt-space-sm">
            <table className="w-full text-left font-telemetry-sm text-telemetry-sm border-collapse">
              <thead className="sticky top-0 bg-surface-container-low text-on-surface-variant font-label-caps uppercase">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="p-2 border-b border-surface-container-high">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high/40 text-on-surface">
                {data.map((row, idx) => (
                  <tr
                    key={idx}
                    className={idx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low/40'}
                  >
                    {columns.map((col) => {
                      const val = row[col];
                      const isNum = typeof val === 'number';
                      return (
                        <td
                          key={col}
                          className={`p-2 ${isNum ? 'text-right font-mono font-medium' : ''}`}
                        >
                          {val === null || val === undefined
                            ? '-'
                            : isNum
                            ? Number.isInteger(val)
                              ? val
                              : val.toFixed(2)
                            : String(val)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
