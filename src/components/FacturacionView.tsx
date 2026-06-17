import React, { useMemo, useState } from 'react';
import { Appointment, ClientProfile } from '../types';

interface FacturacionViewProps {
  appointments: Appointment[];
  clients: ClientProfile[];
  onToastMessage: (msg: string) => void;
}

function getQuarter(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1;
}

function getMonthKey(dateStr: string): string {
  return dateStr.substring(0, 7); // YYYY-MM
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
}

export default function FacturacionView({ appointments, clients, onToastMessage }: FacturacionViewProps) {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState(getQuarter(today));

  const paid = useMemo(() => appointments.filter(a => a.status === 'Pagado'), [appointments]);

  // ─── Current quarter data ─────────────────────────────────────────────────
  const currentQData = useMemo(() => {
    const startMonth = (selectedQuarter - 1) * 3;
    return paid.filter(a => {
      const d = new Date(a.date);
      return d.getFullYear() === selectedYear && d.getMonth() >= startMonth && d.getMonth() < startMonth + 3;
    });
  }, [paid, selectedYear, selectedQuarter]);

  // ─── Same quarter last year ───────────────────────────────────────────────
  const prevYearQData = useMemo(() => {
    const startMonth = (selectedQuarter - 1) * 3;
    return paid.filter(a => {
      const d = new Date(a.date);
      return d.getFullYear() === selectedYear - 1 && d.getMonth() >= startMonth && d.getMonth() < startMonth + 3;
    });
  }, [paid, selectedYear, selectedQuarter]);

  const currentQRevenue = useMemo(() => currentQData.reduce((s, a) => s + (a.price || 0), 0), [currentQData]);
  const prevYearQRevenue = useMemo(() => prevYearQData.reduce((s, a) => s + (a.price || 0), 0), [prevYearQData]);
  const variationPct = prevYearQRevenue > 0 ? ((currentQRevenue - prevYearQRevenue) / prevYearQRevenue) * 100 : null;
  const avgTicket = currentQData.length > 0 ? currentQRevenue / currentQData.length : 0;

  // ─── Monthly breakdown (last 12 months) ──────────────────────────────────
  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    paid.forEach(a => {
      const key = getMonthKey(a.date);
      map[key] = (map[key] || 0) + (a.price || 0);
    });
    // Last 12 months sorted
    const months = Object.keys(map).sort().slice(-12);
    const maxVal = Math.max(...months.map(m => map[m]), 1);
    return months.map(m => ({ key: m, label: formatMonth(m), value: map[m], pct: (map[m] / maxVal) * 100 }));
  }, [paid]);

  // ─── Top services by revenue ──────────────────────────────────────────────
  const topServices = useMemo(() => {
    const map: Record<string, { revenue: number; count: number }> = {};
    currentQData.forEach(a => {
      if (!map[a.serviceName]) map[a.serviceName] = { revenue: 0, count: 0 };
      map[a.serviceName].revenue += a.price || 0;
      map[a.serviceName].count += 1;
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [currentQData]);

  // ─── New vs recurring clients this quarter ────────────────────────────────
  const clientRetention = useMemo(() => {
    const clientsThisQ = new Set(currentQData.map(a => a.clientId));
    const clientsPrevQ = new Set(prevYearQData.map(a => a.clientId));
    const recurring = [...clientsThisQ].filter(id => clientsPrevQ.has(id)).length;
    const newClients = clientsThisQ.size - recurring;
    return { total: clientsThisQ.size, recurring, newClients };
  }, [currentQData, prevYearQData]);

  const quarterLabel = `T${selectedQuarter} ${selectedYear}`;
  const quarters = [1, 2, 3, 4];
  const years = [today.getFullYear(), today.getFullYear() - 1, today.getFullYear() - 2].filter(Boolean);

  // ─── Export CSV ───────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (currentQData.length === 0) {
      onToastMessage('No hay datos de facturación en este período.');
      return;
    }
    const headers = ['Fecha', 'Clienta', 'Servicio', 'Estilista', 'Importe (€)'];
    const rows = currentQData
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(a => [a.date, a.clientName, a.serviceName, a.staffName, a.price?.toFixed(2) || '0.00']);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `facturacion-${quarterLabel.replace(' ', '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onToastMessage(`CSV de ${quarterLabel} exportado correctamente.`);
  };

  return (
    <div className="flex-1 pb-16">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-semibold text-primary">Facturación</h2>
          <p className="text-sm text-on-surface-variant font-medium">Análisis trimestral de ingresos y comparativa anual.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Quarter selector */}
          <div className="flex gap-1.5 bg-surface-container-low border border-border rounded-xl p-1">
            {quarters.map(q => (
              <button
                key={q}
                onClick={() => setSelectedQuarter(q)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedQuarter === q ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                T{q}
              </button>
            ))}
          </div>
          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 bg-white border border-border rounded-xl text-sm font-bold text-primary outline-none focus:border-primary cursor-pointer"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-white border border-border text-primary px-4 py-2 rounded-xl text-xs font-bold hover:bg-surface-container transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Exportar CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {/* Revenue */}
        <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-[#4A2C40] to-[#2E1927] text-white rounded-2xl p-6 shadow-md">
          <p className="text-[10px] uppercase font-bold text-primary-fixed-dim mb-2">Ingresos {quarterLabel}</p>
          <p className="font-serif text-4xl font-bold">{currentQRevenue.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€</p>
          {variationPct !== null && (
            <div className={`mt-3 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
              variationPct >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
            }`}>
              <span className="material-symbols-outlined text-sm">
                {variationPct >= 0 ? 'trending_up' : 'trending_down'}
              </span>
              {variationPct >= 0 ? '+' : ''}{variationPct.toFixed(1)}% vs T{selectedQuarter} {selectedYear - 1}
            </div>
          )}
          {variationPct === null && prevYearQRevenue === 0 && (
            <p className="text-[10px] text-primary-fixed-dim mt-2">Sin datos del año anterior</p>
          )}
        </div>

        <div className="bg-white border border-muted rounded-2xl p-6">
          <p className="text-[10px] uppercase font-bold text-on-surface-variant mb-2">Citas registradas</p>
          <p className="font-serif text-3xl font-bold text-primary">{currentQData.length}</p>
          {prevYearQData.length > 0 && (
            <p className="text-xs text-on-surface-variant mt-1">vs {prevYearQData.length} en {selectedYear - 1}</p>
          )}
        </div>

        <div className="bg-white border border-muted rounded-2xl p-6">
          <p className="text-[10px] uppercase font-bold text-on-surface-variant mb-2">Ticket medio</p>
          <p className="font-serif text-3xl font-bold text-primary">{avgTicket.toFixed(2)}€</p>
          <p className="text-xs text-on-surface-variant mt-1">{quarterLabel}</p>
        </div>

        <div className="bg-white border border-muted rounded-2xl p-6">
          <p className="text-[10px] uppercase font-bold text-on-surface-variant mb-2">Clientas activas</p>
          <p className="font-serif text-3xl font-bold text-primary">{clientRetention.total}</p>
          {clientRetention.recurring > 0 && (
            <p className="text-xs text-emerald-600 font-semibold mt-1">{clientRetention.recurring} recurrentes</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
        {/* Monthly bar chart */}
        <div className="lg:col-span-8 bg-white border border-muted rounded-2xl p-6">
          <h3 className="font-serif text-lg font-bold text-primary mb-6">Evolución mensual de ingresos</h3>
          {monthlyData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-on-surface-variant text-sm">Sin datos de facturación aún.</div>
          ) : (
            <div className="flex items-end gap-2 h-44 overflow-x-auto pb-2">
              {monthlyData.map(m => (
                <div key={m.key} className="flex flex-col items-center gap-1 min-w-[40px] flex-1 group relative">
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap pointer-events-none transition-opacity z-10">
                    {m.value.toFixed(0)}€
                  </div>
                  <div
                    className="w-full rounded-t-lg transition-all duration-500 group-hover:opacity-90"
                    style={{
                      height: `${Math.max(m.pct * 0.85, 4)}%`,
                      background: m.key.startsWith(String(selectedYear))
                        ? 'linear-gradient(to top, hsl(335 30% 35%), hsl(335 30% 55%))'
                        : 'hsl(340 35% 85%)',
                      minHeight: '4px'
                    }}
                  />
                  <span className="text-[9px] text-on-surface-variant font-medium rotate-45 mt-1 origin-left whitespace-nowrap">
                    {m.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top services */}
        <div className="lg:col-span-4 bg-white border border-muted rounded-2xl p-6">
          <h3 className="font-serif text-lg font-bold text-primary mb-4">Top servicios ({quarterLabel})</h3>
          {topServices.length === 0 ? (
            <div className="text-sm text-on-surface-variant text-center py-8">Sin datos en este período.</div>
          ) : (
            <div className="space-y-3">
              {topServices.map((s, i) => {
                const maxRev = topServices[0].revenue;
                return (
                  <div key={s.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-on-surface-variant w-4">#{i + 1}</span>
                        <span className="text-xs font-semibold text-primary truncate max-w-[130px]">{s.name}</span>
                      </div>
                      <span className="text-xs font-bold text-primary">{s.revenue.toFixed(0)}€</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
                        style={{ width: `${(s.revenue / maxRev) * 100}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-on-surface-variant mt-0.5">{s.count} citas</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Año anterior comparison */}
      {prevYearQRevenue > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6">
          <h3 className="font-serif text-lg font-bold text-primary mb-4">
            Comparativa T{selectedQuarter}: {selectedYear} vs {selectedYear - 1}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-[10px] uppercase font-bold text-on-surface-variant mb-1">{selectedYear}</p>
              <p className="font-serif text-2xl font-bold text-primary">{currentQRevenue.toFixed(0)}€</p>
              <p className="text-xs text-on-surface-variant">{currentQData.length} citas</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-on-surface-variant mb-1">{selectedYear - 1}</p>
              <p className="font-serif text-2xl font-bold text-on-surface-variant">{prevYearQRevenue.toFixed(0)}€</p>
              <p className="text-xs text-on-surface-variant">{prevYearQData.length} citas</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Diferencia ingresos</p>
              <p className={`font-serif text-2xl font-bold ${currentQRevenue >= prevYearQRevenue ? 'text-emerald-600' : 'text-red-600'}`}>
                {currentQRevenue >= prevYearQRevenue ? '+' : ''}{(currentQRevenue - prevYearQRevenue).toFixed(0)}€
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Variación %</p>
              <p className={`font-serif text-2xl font-bold ${(variationPct || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {(variationPct || 0) >= 0 ? '+' : ''}{(variationPct || 0).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
