import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { dailyVolumeData } from '../../data/mockData';

export default function VolumeLineChart() {
  const formattedData = dailyVolumeData.map(d => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 min-w-0">
      <h3 className="text-lg font-semibold text-primary mb-4">Verification Volume (Last 30 Days)</h3>
      <div className="h-[300px] w-full min-w-0">
        <ResponsiveContainer width="100%" height={280} minWidth={0} minHeight={200}>
          <AreaChart data={formattedData}>
            <defs>
              <linearGradient id="colorVerifications" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCounterfeits" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} interval={4} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '13px',
              }}
            />
            <Area type="monotone" dataKey="verifications" stroke="#06B6D4" strokeWidth={2} fill="url(#colorVerifications)" name="Verifications" />
            <Area type="monotone" dataKey="counterfeits" stroke="#EF4444" strokeWidth={2} fill="url(#colorCounterfeits)" name="Counterfeits" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
