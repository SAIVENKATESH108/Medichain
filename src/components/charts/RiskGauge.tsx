interface RiskGaugeProps {
  value: number;
  size?: number;
  label?: string;
}

export default function RiskGauge({ value, size = 120, label = 'Risk Score' }: RiskGaugeProps) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 100) * circumference;
  const color = value > 70 ? '#EF4444' : value > 40 ? '#F59E0B' : '#10B981';

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="8"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="relative -mt-[calc(50%+12px)] flex flex-col items-center justify-center" style={{ height: size }}>
        <span className="text-2xl font-bold" style={{ color }}>{value}</span>
        <span className="text-xs text-slate-500">{label}</span>
      </div>
    </div>
  );
}
