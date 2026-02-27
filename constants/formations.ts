// Soccer formation definitions with pitch position coordinates
// Coordinates are percentages (0-100) of the pitch, from bottom (GK) to top (forwards)
// x: 0 = left, 100 = right
// y: 0 = top (opponent goal), 100 = bottom (own goal)

export interface PositionSlot {
  key: string;
  label: string;       // Short label shown on pitch
  fullLabel: string;    // Full position name
  x: number;
  y: number;
}

export interface Formation {
  id: string;
  name: string;
  positions: PositionSlot[];
}

export const FORMATIONS: Formation[] = [
  {
    id: '4-3-3',
    name: '4-3-3',
    positions: [
      { key: 'GK',  label: 'GK',  fullLabel: 'Goalkeeper',         x: 50, y: 90 },
      { key: 'LB',  label: 'LB',  fullLabel: 'Left Back',          x: 15, y: 72 },
      { key: 'CB1', label: 'CB',  fullLabel: 'Center Back',        x: 38, y: 76 },
      { key: 'CB2', label: 'CB',  fullLabel: 'Center Back',        x: 62, y: 76 },
      { key: 'RB',  label: 'RB',  fullLabel: 'Right Back',         x: 85, y: 72 },
      { key: 'CM1', label: 'CM',  fullLabel: 'Center Midfielder',  x: 30, y: 52 },
      { key: 'CM2', label: 'CDM', fullLabel: 'Defensive Mid',      x: 50, y: 58 },
      { key: 'CM3', label: 'CM',  fullLabel: 'Center Midfielder',  x: 70, y: 52 },
      { key: 'LW',  label: 'LW',  fullLabel: 'Left Wing',          x: 18, y: 28 },
      { key: 'ST',  label: 'ST',  fullLabel: 'Striker',            x: 50, y: 22 },
      { key: 'RW',  label: 'RW',  fullLabel: 'Right Wing',         x: 82, y: 28 },
    ],
  },
  {
    id: '4-4-2',
    name: '4-4-2',
    positions: [
      { key: 'GK',  label: 'GK',  fullLabel: 'Goalkeeper',         x: 50, y: 90 },
      { key: 'LB',  label: 'LB',  fullLabel: 'Left Back',          x: 15, y: 72 },
      { key: 'CB1', label: 'CB',  fullLabel: 'Center Back',        x: 38, y: 76 },
      { key: 'CB2', label: 'CB',  fullLabel: 'Center Back',        x: 62, y: 76 },
      { key: 'RB',  label: 'RB',  fullLabel: 'Right Back',         x: 85, y: 72 },
      { key: 'LM',  label: 'LM',  fullLabel: 'Left Midfielder',    x: 15, y: 50 },
      { key: 'CM1', label: 'CM',  fullLabel: 'Center Midfielder',  x: 38, y: 54 },
      { key: 'CM2', label: 'CM',  fullLabel: 'Center Midfielder',  x: 62, y: 54 },
      { key: 'RM',  label: 'RM',  fullLabel: 'Right Midfielder',   x: 85, y: 50 },
      { key: 'ST1', label: 'ST',  fullLabel: 'Striker',            x: 38, y: 25 },
      { key: 'ST2', label: 'ST',  fullLabel: 'Striker',            x: 62, y: 25 },
    ],
  },
  {
    id: '3-5-2',
    name: '3-5-2',
    positions: [
      { key: 'GK',  label: 'GK',  fullLabel: 'Goalkeeper',         x: 50, y: 90 },
      { key: 'CB1', label: 'CB',  fullLabel: 'Center Back',        x: 25, y: 76 },
      { key: 'CB2', label: 'CB',  fullLabel: 'Center Back',        x: 50, y: 78 },
      { key: 'CB3', label: 'CB',  fullLabel: 'Center Back',        x: 75, y: 76 },
      { key: 'LWB', label: 'LWB', fullLabel: 'Left Wing Back',     x: 10, y: 52 },
      { key: 'CM1', label: 'CM',  fullLabel: 'Center Midfielder',  x: 32, y: 54 },
      { key: 'CDM', label: 'CDM', fullLabel: 'Defensive Mid',      x: 50, y: 60 },
      { key: 'CM2', label: 'CM',  fullLabel: 'Center Midfielder',  x: 68, y: 54 },
      { key: 'RWB', label: 'RWB', fullLabel: 'Right Wing Back',    x: 90, y: 52 },
      { key: 'ST1', label: 'ST',  fullLabel: 'Striker',            x: 38, y: 25 },
      { key: 'ST2', label: 'ST',  fullLabel: 'Striker',            x: 62, y: 25 },
    ],
  },
  {
    id: '4-2-3-1',
    name: '4-2-3-1',
    positions: [
      { key: 'GK',  label: 'GK',  fullLabel: 'Goalkeeper',         x: 50, y: 90 },
      { key: 'LB',  label: 'LB',  fullLabel: 'Left Back',          x: 15, y: 72 },
      { key: 'CB1', label: 'CB',  fullLabel: 'Center Back',        x: 38, y: 76 },
      { key: 'CB2', label: 'CB',  fullLabel: 'Center Back',        x: 62, y: 76 },
      { key: 'RB',  label: 'RB',  fullLabel: 'Right Back',         x: 85, y: 72 },
      { key: 'CDM1',label: 'CDM', fullLabel: 'Defensive Mid',      x: 38, y: 58 },
      { key: 'CDM2',label: 'CDM', fullLabel: 'Defensive Mid',      x: 62, y: 58 },
      { key: 'LAM', label: 'LAM', fullLabel: 'Left Att. Mid',      x: 20, y: 38 },
      { key: 'CAM', label: 'CAM', fullLabel: 'Center Att. Mid',    x: 50, y: 36 },
      { key: 'RAM', label: 'RAM', fullLabel: 'Right Att. Mid',     x: 80, y: 38 },
      { key: 'ST',  label: 'ST',  fullLabel: 'Striker',            x: 50, y: 20 },
    ],
  },
  {
    id: '3-4-3',
    name: '3-4-3',
    positions: [
      { key: 'GK',  label: 'GK',  fullLabel: 'Goalkeeper',         x: 50, y: 90 },
      { key: 'CB1', label: 'CB',  fullLabel: 'Center Back',        x: 25, y: 76 },
      { key: 'CB2', label: 'CB',  fullLabel: 'Center Back',        x: 50, y: 78 },
      { key: 'CB3', label: 'CB',  fullLabel: 'Center Back',        x: 75, y: 76 },
      { key: 'LM',  label: 'LM',  fullLabel: 'Left Midfielder',    x: 15, y: 52 },
      { key: 'CM1', label: 'CM',  fullLabel: 'Center Midfielder',  x: 38, y: 55 },
      { key: 'CM2', label: 'CM',  fullLabel: 'Center Midfielder',  x: 62, y: 55 },
      { key: 'RM',  label: 'RM',  fullLabel: 'Right Midfielder',   x: 85, y: 52 },
      { key: 'LW',  label: 'LW',  fullLabel: 'Left Wing',          x: 20, y: 28 },
      { key: 'ST',  label: 'ST',  fullLabel: 'Striker',            x: 50, y: 22 },
      { key: 'RW',  label: 'RW',  fullLabel: 'Right Wing',         x: 80, y: 28 },
    ],
  },
  {
    id: '4-1-4-1',
    name: '4-1-4-1',
    positions: [
      { key: 'GK',  label: 'GK',  fullLabel: 'Goalkeeper',         x: 50, y: 90 },
      { key: 'LB',  label: 'LB',  fullLabel: 'Left Back',          x: 15, y: 72 },
      { key: 'CB1', label: 'CB',  fullLabel: 'Center Back',        x: 38, y: 76 },
      { key: 'CB2', label: 'CB',  fullLabel: 'Center Back',        x: 62, y: 76 },
      { key: 'RB',  label: 'RB',  fullLabel: 'Right Back',         x: 85, y: 72 },
      { key: 'CDM', label: 'CDM', fullLabel: 'Defensive Mid',      x: 50, y: 62 },
      { key: 'LM',  label: 'LM',  fullLabel: 'Left Midfielder',    x: 15, y: 42 },
      { key: 'CM1', label: 'CM',  fullLabel: 'Center Midfielder',  x: 38, y: 46 },
      { key: 'CM2', label: 'CM',  fullLabel: 'Center Midfielder',  x: 62, y: 46 },
      { key: 'RM',  label: 'RM',  fullLabel: 'Right Midfielder',   x: 85, y: 42 },
      { key: 'ST',  label: 'ST',  fullLabel: 'Striker',            x: 50, y: 20 },
    ],
  },
];

export const DEFAULT_FORMATION = '4-3-3';

export function getFormation(id: string): Formation {
  return FORMATIONS.find(f => f.id === id) || FORMATIONS[0];
}
