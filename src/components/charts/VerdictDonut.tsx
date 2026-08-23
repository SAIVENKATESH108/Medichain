import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { verdictDistribution } from '../../data/mockData';

export default function VerdictDonut() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 min-w-0">
      <h3 className="text-lg font-semibold text-primary mb-4">Verdict Distribution</h3>
      <div className="h-[300px] flex items-center min-w-0">
        <div className="w-1/2 h-full min-w-0">
          <ResponsiveContainer width="100%" height={280} minWidth={0} minHeight={200}>
            <PieChart>
              <Pie
                data={verdictDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {verdictDistribution.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${value}%`, '']}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-1/2 space-y-4">
          {verdictDistribution.map(item => (
            <div key={item.name} className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700">{item.name}</p>
                <p className="text-xl font-bold text-primary">{item.value}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
