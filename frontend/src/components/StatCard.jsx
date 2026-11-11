import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'purple', trend }) {
  const colorMap = {
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20'
  };

  return (
    <div className="bg-navy-850 border border-navy-700/80 p-5 rounded-2xl tilt-card transition-all">
      <div className="flex items-center justify-between text-gray-400 text-xs font-medium">
        <span>{title}</span>
        {Icon && (
          <div className={`p-2 rounded-xl border ${colorMap[color] || colorMap.purple}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-white mt-2">{value}</p>
      {subtitle && <p className="text-[11px] text-gray-400 font-medium mt-1">{subtitle}</p>}
      {trend && <div className="mt-2 text-xs font-semibold">{trend}</div>}
    </div>
  );
}

