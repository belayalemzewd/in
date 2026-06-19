import React, { useState } from 'react';

const MACHINE_TYPES = ['Biorugged', 'Emptech', 'Laxton'];

const DAMAGED_OPTIONS = [
  'Fingerprint Scanner',
  'Face Camera',
  'Iris Scanner',
  'Document Scanner',
  'Iris Cables',
  'Laptop',
  'Kit Charger',
  'Hub',
  'Battery',
  'Doc Scanner Cables',
  'Printer',
  'Printer Cables',
  'Keyboard',
  'Mouse',
  'Power Button',
  'LED Indicators',
  'BMS Board',
  'Second Screens',
  'PC Charger',
  'Other'
];

const PARTNERS = [
  'Ethio Tele',
  'Ethio Post',
  'Safaricom',
  'CBE Bank',
  'O-tech',
  'ABH',
  'Blue Spark'
];

export default function AddDamagedKit({ onClose = () => {}, onSubmit = () => {} }) {
  const [kitNumber, setKitNumber] = useState('');
  const [machineType, setMachineType] = useState('');
  const [damagedComponents, setDamagedComponents] = useState([]);
  const [damagedComponentOther, setDamagedComponentOther] = useState('');
  const [partner, setPartner] = useState('');
  const [errors, setErrors] = useState({});

  const toggleComponent = (name) => {
    setDamagedComponents((prev) => {
      if (prev.includes(name)) return prev.filter((p) => p !== name);
      return [...prev, name];
    });
  };

  const validate = () => {
    const e = {};
    if (!kitNumber.trim()) e.kitNumber = 'Kit Number is required';
    if (!machineType) e.machineType = 'Machine type is required';
    if (damagedComponents.length === 0) e.damagedComponents = 'Select at least one damaged component';
    if (damagedComponents.includes('Other') && !damagedComponentOther.trim()) e.damagedComponentOther = 'Please specify other component';
    if (!partner) e.partner = 'Partner is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      kitNumber: kitNumber.trim(),
      machineType,
      damagedComponents: damagedComponents.filter(Boolean),
      damagedComponentOther: damagedComponents.includes('Other') ? damagedComponentOther.trim() : '',
      partner
    };

    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-lg w-full text-slate-100"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-purple-300">Report Damaged Kit</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-300 mb-2 block">Kit Number</label>
            <input
              type="text"
              value={kitNumber}
              onChange={(e) => setKitNumber(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:border-purple-400"
              placeholder="Enter kit number"
            />
            {errors.kitNumber && <div className="text-xs text-red-400 mt-1">{errors.kitNumber}</div>}
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-300 mb-2 block">Biometric Machine Type</label>
            <select
              value={machineType}
              onChange={(e) => setMachineType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:border-purple-400"
            >
              <option value="">Select Machine Type</option>
              {MACHINE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {errors.machineType && <div className="text-xs text-red-400 mt-1">{errors.machineType}</div>}
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-300 mb-2 block">Damaged Component(s)</label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-800/30 rounded">
              {DAMAGED_OPTIONS.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={damagedComponents.includes(opt)}
                    onChange={() => toggleComponent(opt)}
                    className="w-4 h-4 rounded"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
            {errors.damagedComponents && <div className="text-xs text-red-400 mt-1">{errors.damagedComponents}</div>}
          </div>

          {damagedComponents.includes('Other') && (
            <div>
              <label className="text-sm font-semibold text-slate-300 mb-2 block">Specify Other Component</label>
              <input
                type="text"
                value={damagedComponentOther}
                onChange={(e) => setDamagedComponentOther(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:border-purple-400"
                placeholder="Describe the other damaged component"
              />
              {errors.damagedComponentOther && <div className="text-xs text-red-400 mt-1">{errors.damagedComponentOther}</div>}
            </div>
          )}

          <div>
            <label className="text-sm font-semibold text-slate-300 mb-2 block">Partner</label>
            <select
              value={partner}
              onChange={(e) => setPartner(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:border-purple-400"
            >
              <option value="">Select Partner</option>
              {PARTNERS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {errors.partner && <div className="text-xs text-red-400 mt-1">{errors.partner}</div>}
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors"
            >
              Submit Report
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
