const ICON_BG = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-600',
  amber: 'bg-amber-50 text-amber-600',
  purple: 'bg-purple-50 text-purple-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  teal: 'bg-teal-50 text-teal-600',
  gray: 'bg-gray-50 text-gray-600',
};

export default function StatCard({ title, value, icon: Icon, color = 'blue', subtitle = null, trend = null }) {
  const iconBg = ICON_BG[color] || ICON_BG.blue;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${iconBg}`}>
            <Icon className="text-xl" />
          </div>
        )}
      </div>
      {trend !== null && trend !== undefined && (
        <div className="mt-3 flex items-center gap-1">
          <span className={`text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
          <span className="text-xs text-gray-400">o'tgan davr bilan solishtirganda</span>
        </div>
      )}
    </div>
  );
}
