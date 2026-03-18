import { useState, useCallback, useEffect } from 'react';

export interface WeatherData {
  currentTemp: number;
  maxTemp: number;
  minTemp: number;
  rainProbability: number;
  weatherCode: number;
  condition: string;
}

export interface ForecastDay {
  date: string;
  maxTemp: number;
  minTemp: number;
  rainProbability: number;
  weatherCode: number;
  condition: string;
}

export interface AQIData {
  aqi: number; // 1-5 scale
  label: string;
  labelHi: string;
  pm25: number;
  pm10: number;
}

export interface WeatherResult {
  weather: WeatherData | null;
  forecast: ForecastDay[];
  aqi: AQIData | null;
  loading: boolean;
  lastUpdated: string | null;
  refetch: () => void;
}

// Weather code to condition mapping
function getWeatherCondition(code: number): string {
  const conditions: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  return conditions[code] || 'Unknown';
}

// AQI level labels
function getAQILabel(aqi: number): { label: string; labelHi: string } {
  if (aqi === 1) return { label: 'Good', labelHi: 'अच्छा' };
  if (aqi === 2) return { label: 'Satisfactory', labelHi: 'संतोषजनक' };
  if (aqi === 3) return { label: 'Moderate', labelHi: 'मध्यम' };
  if (aqi === 4) return { label: 'Poor', labelHi: 'खराब' };
  return { label: 'Very Poor', labelHi: 'बहुत खराब' };
}

export function useWeather(lat: number | null, lng: number | null): WeatherResult {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [aqi, setAqi] = useState<AQIData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (lat === null || lng === null) return;

    setLoading(true);
    try {
      // Fetch weather from Open-Meteo (no API key needed)
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&current_weather=true&timezone=Asia/Kolkata`
      );
      
      if (weatherRes.ok) {
        const data = await weatherRes.json();
        const current = data.current_weather || {};
        const daily = data.daily || {};

        setWeather({
          currentTemp: current.temperature || 0,
          maxTemp: daily.temperature_2m_max?.[0] || 0,
          minTemp: daily.temperature_2m_min?.[0] || 0,
          rainProbability: daily.precipitation_probability_max?.[0] || 0,
          weatherCode: current.weathercode || 0,
          condition: getWeatherCondition(current.weathercode || 0),
        });

        // Build 5-day forecast
        const forecastDays: ForecastDay[] = [];
        for (let i = 0; i < Math.min(5, (daily.time?.length || 0)); i++) {
          forecastDays.push({
            date: daily.time?.[i] || '',
            maxTemp: daily.temperature_2m_max?.[i] || 0,
            minTemp: daily.temperature_2m_min?.[i] || 0,
            rainProbability: daily.precipitation_probability_max?.[i] || 0,
            weatherCode: daily.weathercode?.[i] || 0,
            condition: getWeatherCondition(daily.weathercode?.[i] || 0),
          });
        }
        setForecast(forecastDays);
      }

      // Fetch AQI from OpenWeatherMap (API key provided)
      const OWM_KEY = 'b8b67ae666e10685944d4809f1a896fc';
      const aqiRes = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${OWM_KEY}`
      );
      
      if (aqiRes.ok) {
        const aqiData = await aqiRes.json();
        const list = aqiData.list?.[0];
        if (list) {
          const aqiValue = list.main?.aqi || 1;
          const { label, labelHi } = getAQILabel(aqiValue);
          setAqi({
            aqi: aqiValue,
            label,
            labelHi,
            pm25: list.components?.pm2_5 || 0,
            pm10: list.components?.pm10 || 0,
          });
        }
      }

      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    } catch (error) {
      console.error('Weather fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [lat, lng]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    weather,
    forecast,
    aqi,
    loading,
    lastUpdated,
    refetch: fetchData,
  };
}
