export const hvacSymbols = [
  { id: 'supply-diffuser', name: 'Supply Diffuser', abbreviation: 'SD', color: '#3B82F6' },
  { id: 'return-grille', name: 'Return Grille', abbreviation: 'RG', color: '#8B5CF6' },
  { id: 'exhaust-fan', name: 'Exhaust Fan', abbreviation: 'EF', color: '#F59E0B' },
  { id: 'air-handler', name: 'Air Handler', abbreviation: 'AHU', color: '#10B981' },
  { id: 'fan-coil', name: 'Fan Coil Unit', abbreviation: 'FCU', color: '#06B6D4' },
  { id: 'mini-split', name: 'Mini Split', abbreviation: 'MS', color: '#EC4899' },
  { id: 'condenser', name: 'Condensing Unit', abbreviation: 'CU', color: '#EF4444' },
  { id: 'rooftop-unit', name: 'Rooftop Unit', abbreviation: 'RTU', color: '#F97316' },
  { id: 'vav', name: 'VAV Box', abbreviation: 'VAV', color: '#84CC16' },
  { id: 'thermostat', name: 'Thermostat', abbreviation: 'TSTAT', color: '#64748B' },
  { id: 'duct-supply', name: 'Supply Duct', abbreviation: 'SD', color: '#3B82F6' },
  { id: 'duct-return', name: 'Return Duct', abbreviation: 'RD', color: '#8B5CF6' },
  { id: 'lineset', name: 'Refrigerant Line', abbreviation: 'LS', color: '#F59E0B' },
  { id: 'condensate', name: 'Condensate Line', abbreviation: 'CL', color: '#06B6D4' },
];

export type HvacSymbol = typeof hvacSymbols[0];

export function getSymbolById(id: string): HvacSymbol | undefined {
  return hvacSymbols.find(s => s.id === id);
}
