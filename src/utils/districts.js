// Kerala Districts configuration with disaster hazard profiles
export const KERALA_DISTRICTS = [
  {
    id: 'Wayanad',
    name: 'Wayanad',
    nameMl: 'വയനാട്',
    tagline: 'Landslide & Hill Slope Flood Zone',
    center: [11.551, 76.128],
    zoom: 13,
    localities: ['Meppadi', 'Chooralmala', 'Mundakkai', 'Kalpetta'],
  },
  {
    id: 'Idukki',
    name: 'Idukki',
    nameMl: 'ഇടുക്കി',
    tagline: 'High-Range Catchment & Slope Hazard',
    center: [9.850, 76.970],
    zoom: 12,
    localities: ['Cheruthoni', 'Munnar', 'Vandiperiyar', 'Adimali'],
  },
  {
    id: 'Alappuzha',
    name: 'Alappuzha',
    nameMl: 'ആലപ്പുഴ',
    tagline: 'Kuttanad Low-Lying Backwater Flood Plains',
    center: [9.498, 76.338],
    zoom: 13,
    localities: ['Kuttanad', 'Champakulam', 'Edathua', 'Pulinkunnu'],
  },
];

export function getDistrictById(id) {
  return KERALA_DISTRICTS.find((d) => d.id === id) || KERALA_DISTRICTS[0];
}
