// ============================================================
// FARG'ONA VILOYATI TUMANLARI
// ============================================================

export const VILOYATLAR = [
  {
    id: 'v01',
    name: "Farg'ona viloyati",
    code: 'FER',
    center: "Farg'ona",
    lat: 40.3864,
    lng: 71.7864,
    tumanlar: [
      { id: 't0101', name: "Bag'dod tumani" },
      { id: 't0102', name: "Beshariq tumani" },
      { id: 't0103', name: "Buvayda tumani" },
      { id: 't0104', name: "Dang'ara tumani" },
      { id: 't0105', name: "Farg'ona tumani" },
      { id: 't0106', name: "Furqat tumani" },
      { id: 't0107', name: "Qo'shtepa tumani" },
      { id: 't0108', name: "Quva tumani" },
      { id: 't0109', name: "Rishton tumani" },
      { id: 't0110', name: "So'x tumani" },
      { id: 't0111', name: "Toshloq tumani" },
      { id: 't0112', name: "Uchko'prik tumani" },
      { id: 't0113', name: "O'zbekiston tumani" },
      { id: 't0114', name: "Yo'lwotan tumani" },
      { id: 't0115', name: "Oltiariq tumani" },
      { id: 't0116', name: "Farg'ona shahri" },
      { id: 't0117', name: "Marg'ilon shahri" },
      { id: 't0118', name: "Qo'qon shahri" },
      { id: 't0119', name: "Quvasoy shahri" },
    ],
  },
];

// Helper functions
export function getViloyatById(id) {
  return VILOYATLAR.find(v => v.id === id);
}

export function getViloyatName(id) {
  const v = getViloyatById(id);
  return v ? v.name : '';
}

export function getTumanById(viloyatId, tumanId) {
  const v = getViloyatById(viloyatId);
  if (!v) return null;
  return v.tumanlar.find(t => t.id === tumanId);
}

export function getTumanName(viloyatId, tumanId) {
  const t = getTumanById(viloyatId, tumanId);
  return t ? t.name : '';
}

export function getAllTumanlar() {
  return VILOYATLAR.flatMap(v => v.tumanlar.map(t => ({ ...t, viloyatId: v.id, viloyatName: v.name })));
}
