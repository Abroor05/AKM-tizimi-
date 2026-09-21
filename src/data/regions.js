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
      { id: 't0101', name: "Bag'dod tumani", lat: 40.5212, lng: 71.7113 },
      { id: 't0102', name: "Beshariq tumani", lat: 40.4047, lng: 71.0808 },
      { id: 't0103', name: "Buvayda tumani", lat: 40.6195, lng: 71.2036 },
      { id: 't0104', name: "Dang'ara tumani", lat: 40.2832, lng: 71.9604 },
      { id: 't0105', name: "Farg'ona tumani", lat: 40.3532, lng: 71.7641 },
      { id: 't0106', name: "Furqat tumani", lat: 40.5504, lng: 71.4969 },
      { id: 't0107', name: "Qo'shtepa tumani", lat: 40.3942, lng: 71.4217 },
      { id: 't0108', name: "Quva tumani", lat: 40.5161, lng: 72.0804 },
      { id: 't0109', name: "Rishton tumani", lat: 40.6727, lng: 71.2633 },
      { id: 't0110', name: "So'x tumani", lat: 40.1974, lng: 71.6446 },
      { id: 't0111', name: "Toshloq tumani", lat: 40.6834, lng: 71.4784 },
      { id: 't0112', name: "Uchko'prik tumani", lat: 40.2492, lng: 71.8362 },
      { id: 't0113', name: "O'zbekiston tumani", lat: 40.5718, lng: 71.6237 },
      { id: 't0114', name: "Yo'lwotan tumani", lat: 40.3315, lng: 71.4389 },
      { id: 't0115', name: "Oltiariq tumani", lat: 40.8724, lng: 71.9147 },
      { id: 't0116', name: "Farg'ona shahri", lat: 40.3864, lng: 71.7864 },
      { id: 't0117', name: "Marg'ilon shahri", lat: 40.4709, lng: 71.7286 },
      { id: 't0118', name: "Qo'qon shahri", lat: 40.5225, lng: 70.9434 },
      { id: 't0119', name: "Quvasoy shahri", lat: 40.7245, lng: 72.0821 },
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

export function getTumanCoordinates(viloyatId, tumanId) {
  const t = getTumanById(viloyatId, tumanId);
  if (!t || t.lat == null || t.lng == null) return null;
  return { lat: Number(t.lat), lng: Number(t.lng) };
}

export function getAllTumanlar() {
  return VILOYATLAR.flatMap(v => v.tumanlar.map(t => ({ ...t, viloyatId: v.id, viloyatName: v.name })));
}
