import { useState, useEffect, useCallback } from 'react';

export interface LocationData {
  lat: number;
  lng: number;
}

export interface LocationResult {
  location: LocationData | null;
  placeName: string;
  denied: boolean;
  loading: boolean;
  refresh: () => void;
  pincode: string;
  setPincode: (pincode: string) => void;
}

const STORAGE_KEY = 'nagrik_coords';

// Reverse geocode using Nominatim (free, no API key)
async function reverseGeocodePlace(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!res.ok) return '';
    const data = await res.json();
    
    const address = data.address || {};
    // Try to get suburb/neighbourhood + city
    const suburb = address.suburb || address.neighbourhood || address.quarter || address.town || '';
    const city = address.city || address.town || address.district || address.state_district || '';
    
    if (suburb && city) {
      return `${suburb}, ${city}`;
    } else if (city) {
      return city;
    } else if (suburb) {
      return suburb;
    }
    return data.display_name?.split(',').slice(0, 2).join(', ') || '';
  } catch {
    return '';
  }
}

export function useLocation(): LocationResult {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [placeName, setPlaceName] = useState('');
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pincode, setPincode] = useState('');

  const fetchLocation = useCallback(async () => {
    setLoading(true);
    setDenied(false);

    // Check localStorage first
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as LocationData;
        if (parsed.lat && parsed.lng) {
          setLocation(parsed);
          const name = await reverseGeocodePlace(parsed.lat, parsed.lng);
          setPlaceName(name);
          setLoading(false);
          return;
        }
      }
    } catch {}

    // Request GPS permission
    if (!navigator.geolocation) {
      setDenied(true);
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(loc);
        // Save to localStorage
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
        } catch {}
        const name = await reverseGeocodePlace(loc.lat, loc.lng);
        setPlaceName(name);
        setLoading(false);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setDenied(true);
        }
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  return {
    location,
    placeName,
    denied,
    loading,
    refresh: fetchLocation,
    pincode,
    setPincode,
  };
}
