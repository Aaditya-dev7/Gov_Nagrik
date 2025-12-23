export async function geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null> {
  const cacheKey = `geo:${query.toLowerCase()}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as { lat: number; lng: number } | null;
      if (parsed) return parsed;
    }
  } catch {}

  const biasLat = 18.9489;
  const biasLng = 73.2245;

  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1&lang=en&lat=${biasLat}&lon=${biasLng}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      const feat = data?.features?.[0];
      const coords = feat?.geometry?.coordinates;
      if (Array.isArray(coords) && coords.length >= 2) {
        const value = { lat: coords[1], lng: coords[0] } as const;
        try { localStorage.setItem(cacheKey, JSON.stringify(value)); } catch {}
        return value;
      }
    }
  } catch {}

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (res.ok) {
      const arr = await res.json();
      const first = arr?.[0];
      if (first?.lat && first?.lon) {
        const value = { lat: parseFloat(first.lat), lng: parseFloat(first.lon) } as const;
        try { localStorage.setItem(cacheKey, JSON.stringify(value)); } catch {}
        return value;
      }
    }
  } catch {}

  return null;
}
