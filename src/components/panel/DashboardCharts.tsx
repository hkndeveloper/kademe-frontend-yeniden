"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#0a0b14", "#FF6B00", "#2563eb", "#059669", "#7c3aed", "#ca8a04", "#db2777", "#0891b2"];

export interface DashboardChartsData {
  period?: { label?: string };
  financial_by_category: Array<{ key: string; label: string; value: number }>;
  financial_by_project: Array<{ name: string; value: number }>;
  communication_by_type: Array<{ type: string; label: string; count: number }>;
  programs_by_status: Array<{ status: string; count: number }>;
}

const statusLabels: Record<string, string> = {
  scheduled: "Planlandi",
  active: "Aktif",
  completed: "Tamamlandi",
  cancelled: "Iptal",
};

interface Props {
  charts: DashboardChartsData;
  showCommunication?: boolean;
  showFinancial?: boolean;
  showPrograms?: boolean;
}

export function DashboardCharts({
  charts,
  showCommunication = true,
  showFinancial = true,
  showPrograms = true,
}: Props) {
  const catData = charts.financial_by_category.filter((r) => r.value > 0).map((r) => ({ name: r.label, value: r.value }));
  const projSpend = charts.financial_by_project.filter((r) => r.value > 0).map((r) => ({
    name: r.name.length > 22 ? `${r.name.slice(0, 22)}…` : r.name,
    value: r.value,
  }));
  const commData = charts.communication_by_type
    .filter((r) => r.type !== "sms" && r.count > 0)
    .map((r) => ({ name: r.label, value: r.count }));
  const progStatus = charts.programs_by_status
    .filter((r) => r.count > 0)
    .map((r) => ({
      name: statusLabels[r.status] ?? r.status,
      count: r.count,
    }));

  const moneyFmt = (v: number) => `${v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;

  if (!showCommunication && !showFinancial && !showPrograms) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-600">Gorsel Analitik</h2>
        {charts.period?.label ? (
          <span className="text-[10px] font-bold uppercase text-slate-400">Donem: {charts.period.label}</span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {showFinancial ? (
          <div className="panel-surface min-h-[280px] p-4 sm:p-6">
          <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Harcama — Kategori (ay)
          </h3>
          {catData.length === 0 ? (
            <p className="text-sm text-slate-500">Bu donem icin kategori verisi yok.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={catData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={88}
                  label={({ name, percent }) => `${String(name ?? "")} ${(((percent ?? 0) as number) * 100).toFixed(0)}%`}
                >
                  {catData.map((_, i) => (
                    <Cell key={`cat-${i}`} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => moneyFmt(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
          </div>
        ) : null}

        {showCommunication ? (
          <div className="panel-surface min-h-[280px] p-4 sm:p-6">
          <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            E-posta logu - Tur (ay)
          </h3>
          {commData.length === 0 ? (
            <p className="text-sm text-slate-500">Bu donem icin e-posta kaydi yok.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={commData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={88}
                  label={({ name, percent }) => `${String(name ?? "")} ${(((percent ?? 0) as number) * 100).toFixed(0)}%`}
                >
                  {commData.map((_, i) => (
                    <Cell key={`comm-${i}`} fill={COLORS[(i + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `${v} kayit`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
          </div>
        ) : null}

        {showFinancial ? (
          <div className="panel-surface min-h-[280px] p-4 sm:p-6 xl:col-span-2">
          <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Harcama — Proje (ust 10, ay)
          </h3>
          {projSpend.length === 0 ? (
            <p className="text-sm text-slate-500">Bu donem icin proje bazli harcama yok.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projSpend} margin={{ top: 8, right: 8, left: 8, bottom: 56 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-22} textAnchor="end" height={72} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => moneyFmt(v)} />
                <Bar dataKey="value" fill="#FF6B00" radius={[6, 6, 0, 0]} name="Tutar" />
              </BarChart>
            </ResponsiveContainer>
          )}
          </div>
        ) : null}

        {showPrograms ? (
          <div className="panel-surface min-h-[260px] p-4 sm:p-6 xl:col-span-2">
          <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Programlar — Durum dagilimi (ay baslangici)
          </h3>
          {progStatus.length === 0 ? (
            <p className="text-sm text-slate-500">Bu donem icin program statu verisi yok.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={progStatus} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0a0b14" radius={[6, 6, 0, 0]} name="Adet" />
              </BarChart>
            </ResponsiveContainer>
          )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
