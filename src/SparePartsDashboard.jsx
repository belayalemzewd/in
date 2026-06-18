import { useMemo } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const colorPalette = [
  '#10B981', '#6366F1', '#F97316', '#06B6D4', '#EF4444', '#8B5CF6', '#F59E0B', '#84CC16', '#EC4899', '#14B8A6'
];

const SparePartsDashboard = ({ spareParts = [], movements = [] }) => {
  // Aggregate available spares by (Component Type, Kit Type)
  const availableByCombo = useMemo(() => {
    const map = new Map();
    spareParts.forEach(sp => {
      const comp = sp.type || 'Unknown';
      const kitType = sp.kitType || 'Unknown';
      const key = `${comp} — ${kitType}`;
      const qty = Number(sp.quantity || 0);
      map.set(key, (map.get(key) || 0) + qty);
    });
    return map;
  }, [spareParts]);

  // Aggregate spare usage by partner (from movements)
  const partnerAllocations = useMemo(() => {
    const alloc = {};
    movements.forEach(m => {
      if (m.type === 'spare-usage' && m.partner) {
        const q = parseInt(m.quantity || 0, 10) || 0;
        alloc[m.partner] = (alloc[m.partner] || 0) + q;
      }
    });
    return alloc;
  }, [movements]);

  const availableLabels = Array.from(availableByCombo.keys());
  const availableValues = Array.from(availableByCombo.values());

  const partnerLabels = Object.keys(partnerAllocations);
  const partnerValues = Object.values(partnerAllocations);

  const availableData = useMemo(() => ({
    labels: availableLabels,
    datasets: [
      {
        data: availableValues,
        backgroundColor: colorPalette.slice(0, availableValues.length),
        hoverOffset: 6
      }
    ]
  }), [availableLabels, availableValues]);

  const partnerData = useMemo(() => ({
    labels: partnerLabels,
    datasets: [
      {
        data: partnerValues,
        backgroundColor: colorPalette.slice(0, partnerValues.length),
        hoverOffset: 6
      }
    ]
  }), [partnerLabels, partnerValues]);

  const totalAvailable = availableValues.reduce((s, v) => s + v, 0);

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-slate-900/30 border border-slate-700 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-purple-300 mb-3">Available Spares by Component • Kit</h3>
        {availableValues.length === 0 ? (
          <div className="text-slate-400">No spare parts found</div>
        ) : (
          <Pie data={availableData} />
        )}
        <div className="mt-3 text-sm text-slate-300">
          <div><strong>Total Available:</strong> {totalAvailable} units</div>
        </div>
      </div>

      <div className="bg-slate-900/30 border border-slate-700 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-purple-300 mb-3">Allocated Spares by Partner</h3>
        {partnerValues.length === 0 ? (
          <div className="text-slate-400">No allocations recorded</div>
        ) : (
          <Pie data={partnerData} />
        )}
        <div className="mt-3 text-sm text-slate-300">
          {partnerLabels.length === 0 ? null : partnerLabels.map((p, i) => (
            <div key={p}><strong>{p}:</strong> {partnerValues[i]} units</div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SparePartsDashboard;
