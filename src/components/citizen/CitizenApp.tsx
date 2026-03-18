import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { categories } from '@/lib/data';
import { classify, buildLocationLine, guidanceSteps, complaintSubject, complaintBody, rtiBody, followUpEmail, escalationEmail, IssueDetails } from '@/lib/civic_client';
import { geocodeAddress } from '@/lib/geocoding';
import { useReports } from '@/contexts/ReportsContext';
import { getSupabase, isSupabaseEnabled } from '@/lib/supabase';
import { checkProfanity, getProfanityErrorMessage } from '@/lib/profanity';
import { useLocation } from '@/hooks/use-location';
import { useWeather } from '@/hooks/use-weather';
import { didYouKnowCards, categoryLabels, DidYouKnowCard } from '@/lib/didYouKnow';
import { getLang } from '@/lib/i18n';
import { 
  MapPin, Thermometer, Droplets, RefreshCw, X, ChevronLeft, ChevronRight,
  CloudRain, Sun, Cloud, CloudSun, CloudDrizzle, CloudLightning, AlertTriangle
} from 'lucide-react';

// Weather icon mapping
function getWeatherIcon(code: number, size: 'sm' | 'lg' = 'sm') {
  const sizeClass = size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';
  if (code === 0 || code === 1) return <Sun className={`${sizeClass} text-yellow-500`} />;
  if (code === 2) return <CloudSun className={`${sizeClass} text-gray-500`} />;
  if (code === 3) return <Cloud className={`${sizeClass} text-gray-500`} />;
  if (code >= 45 && code <= 48) return <Cloud className={`${sizeClass} text-gray-400`} />;
  if (code >= 51 && code <= 67) return <CloudDrizzle className={`${sizeClass} text-blue-500`} />;
  if (code >= 71 && code <= 77) return <Cloud className={`${sizeClass} text-blue-300`} />;
  if (code >= 80 && code <= 82) return <CloudRain className={`${sizeClass} text-blue-500`} />;
  if (code >= 95) return <CloudLightning className={`${sizeClass} text-yellow-600`} />;
  return <Sun className={`${sizeClass} text-yellow-500`} />;
}

// AQI color mapping
function getAQIColor(aqi: number): string {
  if (aqi === 1) return 'text-green-500';
  if (aqi === 2) return 'text-lime-500';
  if (aqi === 3) return 'text-yellow-500';
  if (aqi === 4) return 'text-orange-500';
  return 'text-red-500';
}

// Calculate distance between two coordinates in km
function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function CitizenApp() {
  const { addReport } = useReports();
  const { toast } = useToast();
  const lang = getLang();
  
  // Location and weather hooks
  const { location, placeName, denied, loading: locationLoading, refresh: refreshLocation, pincode, setPincode } = useLocation();
  const { weather, forecast, aqi, loading: weatherLoading, lastUpdated, refetch: refetchWeather } = useWeather(location?.lat ?? null, location?.lng ?? null);
  
  // Alert banner state
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [nearbyAlerts, setNearbyAlerts] = useState<{ count: number; category: string } | null>(null);
  
  // Did You Know carousel state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<'all' | DidYouKnowCard['category']>('all');
  
  // Form state
  const [issueType, setIssueType] = useState('');
  const [sinceWhen, setSinceWhen] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [landmark, setLandmark] = useState('');
  const [ward, setWard] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [prevPlatform, setPrevPlatform] = useState('');
  const [prevId, setPrevId] = useState('');
  const [prevDate, setPrevDate] = useState('');

  // Filter cards by category
  const filteredCards = useMemo(() => {
    if (selectedCategory === 'all') return didYouKnowCards;
    return didYouKnowCards.filter(c => c.category === selectedCategory);
  }, [selectedCategory]);

  // Check for nearby alerts (waterlogging, road_collapse, power_outage within 2km in last 3 hours)
  useEffect(() => {
    if (!location) return;
    
    const sb = getSupabase();
    if (!sb) return;
    
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const alertCategories = ['Waterlogging', 'Road Damage', 'Power Outage'];
    
    sb.from('reports')
      .select('category, lat, lng, submitted_at')
      .in('category', alertCategories)
      .gte('submitted_at', threeHoursAgo)
      .then(({ data, error }) => {
        if (error || !data) return;
        
        const nearby = data.filter(r => {
          if (!r.lat || !r.lng) return false;
          const dist = getDistanceKm(location.lat, location.lng, r.lat, r.lng);
          return dist <= 2;
        });
        
        if (nearby.length >= 3) {
          const counts: Record<string, number> = {};
          nearby.forEach(r => {
            counts[r.category] = (counts[r.category] || 0) + 1;
          });
          const topCategory = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
          setNearbyAlerts({ count: nearby.length, category: topCategory[0] });
        } else {
          setNearbyAlerts(null);
        }
      });
  }, [location]);

  // Show alert if rain probability > 75% OR nearby reports
  const showAlert = !alertDismissed && (
    (weather && weather.rainProbability > 75) || 
    (nearbyAlerts && nearbyAlerts.count >= 3)
  );

  // Refresh handler
  const handleRefresh = async () => {
    refreshLocation();
    refetchWeather();
  };

  // Carousel navigation
  const nextCard = () => setCurrentCardIndex((i) => (i + 1) % filteredCards.length);
  const prevCard = () => setCurrentCardIndex((i) => (i - 1 + filteredCards.length) % filteredCards.length);
  
  // Reset index when category changes
  useEffect(() => {
    setCurrentCardIndex(0);
  }, [selectedCategory]);

  const currentCard = filteredCards[currentCardIndex];

  const details: IssueDetails = useMemo(() => ({
    city: city || undefined,
    area: area || undefined,
    landmark: landmark || undefined,
    ward: ward || undefined,
    issueType: issueType || 'Civic Issue',
    sinceWhen: sinceWhen || undefined,
    description: description || '',
    previousComplaint: prevPlatform || prevId || prevDate ? { platform: prevPlatform || undefined, id: prevId || undefined, date: prevDate || undefined } : null,
    evidence: undefined,
    name: anonymous ? undefined : (name || undefined),
    email: anonymous ? undefined : (email || undefined),
    phone: anonymous ? undefined : (phone || undefined),
    anonymous,
  }), [city, area, landmark, ward, issueType, sinceWhen, description, prevPlatform, prevId, prevDate, name, email, phone, anonymous]);

  const cls = React.useMemo(() => classify(details), [details]);
  const locLine = React.useMemo(() => buildLocationLine(details), [details]);
  const steps = React.useMemo(() => guidanceSteps(details, cls), [details, cls]);
  const subject = React.useMemo(() => complaintSubject(details), [details]);
  const body = React.useMemo(() => complaintBody(details, cls), [details, cls]);
  const rti = React.useMemo(() => rtiBody(details, cls, details.previousComplaint?.id || undefined), [details, cls]);
  const followUp = React.useMemo(() => followUpEmail(details, details.previousComplaint?.id || '[Complaint ID]'), [details]);
  const escalate = React.useMemo(() => escalationEmail(details, details.previousComplaint?.id || '[Complaint ID]'), [details]);

  const catOptions = React.useMemo(() => categories, []);
  const chosenCategory = React.useMemo(() => {
    const match = catOptions.find(c => c.toLowerCase() === issueType.toLowerCase());
    return match || issueType || 'Other';
  }, [catOptions, issueType]);

  const [submitting, setSubmitting] = React.useState(false);
  const [aiValidating, setAiValidating] = React.useState(false);
  const [aiOk, setAiOk] = React.useState(true);
  const [aiError, setAiError] = React.useState<string | null>(null);

  const imageUrl = React.useMemo(() => {
    // citizen-side currently doesn't support upload; future: pass Supabase public URL
    return '';
  }, []);

  const validateTextWithAi = React.useCallback(async (inputText: string) => {
    const text = String(inputText || '').trim();
    if (!text) {
      setAiOk(false);
      setAiError('Description required');
      return { ok: false, error: 'Description required' } as const;
    }
    if (!isSupabaseEnabled()) {
      setAiOk(true);
      setAiError(null);
      return { ok: true } as const;
    }
    const sb = getSupabase();
    if (!sb) {
      setAiOk(true);
      setAiError(null);
      return { ok: true } as const;
    }
    setAiValidating(true);
    try {
      const res = await sb.functions.invoke('summarize', { body: { text, image_url: imageUrl } });
      const data = (res as any)?.data as any;
      const ok = Boolean(data?.ok);
      const error = typeof data?.error === 'string' ? data.error : null;
      const status = typeof data?.status === 'string' ? data.status : null;
      const score = typeof data?.report_score === 'number' ? data.report_score : null;
      const scoreOk = typeof score === 'number' ? score >= 90 : true;
      const accepted = ok && (!status || status === 'accepted') && scoreOk;
      if (!accepted) {
        const msg = error || (!scoreOk ? 'Report score must be 90+ to submit.' : (status === 'flagged' ? 'Report flagged as suspicious. Please add more details.' : 'Invalid complaint text.'));
        setAiOk(false);
        setAiError(msg);
        return { ok: false, error: msg } as const;
      }
      setAiOk(true);
      setAiError(null);
      return { ok: true } as const;
    } catch {
      setAiOk(true);
      setAiError(null);
      return { ok: true } as const;
    } finally {
      setAiValidating(false);
    }
  }, []);

  React.useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      if (!alive) return;
      validateTextWithAi(description);
    }, 450);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [description, validateTextWithAi]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied', description: 'Text copied to clipboard.' });
    } catch {}
  };

  const handleSubmitReport = async () => {
    if (!locLine) {
      toast({ title: 'Location required', description: 'Please enter city/area/landmark.', variant: 'destructive' });
      return;
    }
    if (!description.trim()) {
      toast({ title: 'Description required', description: 'Please describe the issue.', variant: 'destructive' });
      return;
    }
    
    // Check for profanity in description
    const profanityResult = checkProfanity(description);
    if (profanityResult.hasProfanity) {
      const errorMsg = getProfanityErrorMessage(profanityResult);
      toast({ title: 'Inappropriate Language Detected', description: errorMsg || 'Please remove inappropriate words.', variant: 'destructive' });
      return;
    }
    
    const v = await validateTextWithAi(description);
    if (!v.ok) {
      toast({ title: 'Cannot submit', description: v.error || 'Invalid complaint text.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const coords = await geocodeAddress(locLine);
      const lat = coords?.lat ?? 18.9489;
      const lng = coords?.lng ?? 73.2245;
      const result = await addReport({
        category: chosenCategory,
        priority,
        description,
        location_text: locLine,
        lat,
        lng,
        reporter: {
          name: anonymous ? 'Anonymous' : (name || 'Citizen'),
          phone: anonymous ? null : (phone || null),
          anonymous,
        },
      });
      
      if (result.syncFailed) {
        toast({ 
          title: lang === 'hi' ? 'रिपोर्ट स्थानीय रूप से जमा हुई' : 'Report submitted locally', 
          description: lang === 'hi' 
            ? 'सिंक विफल; कनेक्शन उपलब्ध होने पर सरकारी पोर्टल पर दिखाई देगी।' 
            : 'Sync failed; will appear on government portal once connection is available.' 
        });
      } else {
        toast({ 
          title: lang === 'hi' ? 'जमा हो गया' : 'Submitted', 
          description: lang === 'hi' 
            ? 'आपकी रिपोर्ट बन गई है। जनरेट किए गए शिकायत पाठ की कॉपी सहेजें।' 
            : 'Your report has been created. Save a copy of the generated complaint text.' 
        });
      }
    } catch {
      toast({ title: lang === 'hi' ? 'विफल' : 'Failed', description: lang === 'hi' ? 'रिपोर्ट जमा नहीं हो सकी। बाद में प्रयास करें।' : 'Could not submit report. Try again later.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 sm:p-6">
      {/* ALERT BANNER */}
      {showAlert && (
        <div className="rounded-lg border-2 p-3 sm:p-4 flex items-start gap-3" style={{ backgroundColor: '#FFF5E8', borderColor: '#FBBF7A' }}>
          <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-orange-800">
              {lang === 'hi' ? '🚧 स्थानीय अलर्ट' : '🚧 Local Alert'}
            </p>
            <p className="text-xs sm:text-sm text-orange-700 mt-1">
              {nearbyAlerts ? (
                lang === 'hi' 
                  ? `${nearbyAlerts.category} · ${placeName || 'आपके क्षेत्र'} के पास रिपोर्ट किया गया — ${nearbyAlerts.count} रिपोर्ट्स पिछले 3 घंटों में · सावधान रहें`
                  : `${nearbyAlerts.category} reported near ${placeName || 'your area'} — ${nearbyAlerts.count} reports in last 3 hrs · Stay alert`
              ) : weather && weather.rainProbability > 75 ? (
                lang === 'hi'
                  ? `भारी बारिश की संभावना (${weather.rainProbability}%) · ${placeName || 'आपके क्षेत्र'} में · सावधान रहें`
                  : `Heavy rain expected (${weather.rainProbability}%) in ${placeName || 'your area'} · Stay alert`
              ) : null}
            </p>
          </div>
          <button 
            onClick={() => setAlertDismissed(true)} 
            className="text-orange-500 hover:text-orange-700 p-1 flex-shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HERO SECTION */}
      <div className="text-center py-4 sm:py-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2">
          {lang === 'hi' ? 'नागरिक समस्याएं दर्ज करें' : 'Report Civic Issues'}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {lang === 'hi' ? 'अपने इलाके की समस्याओं को रिपोर्ट करें और समाधान तक पहुंचें' : 'Report issues in your area and track resolution'}
        </p>
      </div>

      {/* WEATHER & DID YOU KNOW - Side by Side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* WEATHER CARD */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-primary" />
                {lang === 'hi' ? 'मौसम' : 'Weather'}
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRefresh}
                disabled={weatherLoading || locationLoading}
                className="min-w-[36px] min-h-[36px]"
              >
                <RefreshCw className={`w-4 h-4 ${(weatherLoading || locationLoading) ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {locationLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : denied ? (
              <div className="text-center py-4">
                <MapPin className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-3">
                  {lang === 'hi' ? 'स्थान की अनुमति नहीं मिली' : 'Location permission denied'}
                </p>
                <Input
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder={lang === 'hi' ? 'पिनकोड डालें' : 'Enter pincode'}
                  className="max-w-[200px] mx-auto"
                />
              </div>
            ) : weather ? (
              <>
                {/* Place name */}
                {placeName && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                    <MapPin className="w-4 h-4" />
                    <span className="font-medium">{placeName}</span>
                  </div>
                )}
                
                {/* Current weather */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getWeatherIcon(weather.weatherCode, 'lg')}
                    <div>
                      <div className="text-3xl font-bold">{Math.round(weather.currentTemp)}°C</div>
                      <div className="text-sm text-muted-foreground">{weather.condition}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm">
                      <Droplets className="w-4 h-4 text-blue-500" />
                      <span>{weather.rainProbability}%</span>
                      <span className="text-muted-foreground text-xs ml-1">
                        {lang === 'hi' ? 'बारिश' : 'rain'}
                      </span>
                    </div>
                    {aqi && (
                      <div className={`text-sm font-medium ${getAQIColor(aqi.aqi)}`}>
                        AQI: {aqi.label} ({aqi.aqi})
                      </div>
                    )}
                  </div>
                </div>

                {/* Rain warning */}
                {weather.rainProbability > 70 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-2 mb-3 text-sm text-blue-700">
                    {lang === 'hi' ? '☔ भारी बारिश की संभावना है' : '☔ Heavy rain expected'}
                  </div>
                )}

                {/* 5-day forecast */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {forecast.map((day, i) => (
                    <div key={day.date} className="flex-shrink-0 text-center p-2 rounded-lg bg-muted/50 min-w-[60px]">
                      <div className="text-xs text-muted-foreground">
                        {i === 0 ? (lang === 'hi' ? 'आज' : 'Today') : new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short' })}
                      </div>
                      {getWeatherIcon(day.weatherCode)}
                      <div className="text-sm font-medium">{Math.round(day.maxTemp)}°</div>
                    </div>
                  ))}
                </div>

                {/* Last updated */}
                {lastUpdated && (
                  <div className="text-xs text-muted-foreground mt-2 text-right">
                    {lang === 'hi' ? 'अंतिम अपडेट:' : 'Last updated:'} {lastUpdated}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {lang === 'hi' ? 'मौसम डेटा लोड हो रहा है...' : 'Loading weather data...'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* DID YOU KNOW CARD */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                💡 {lang === 'hi' ? 'क्या आप जानते हैं?' : 'Did You Know?'}
              </CardTitle>
            </div>
            {/* Category filter */}
            <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
              <SelectTrigger className="mt-2 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(categoryLabels).map(([key, labels]) => (
                  <SelectItem key={key} value={key}>
                    {lang === 'hi' ? `${labels.hi} (${labels.en})` : `${labels.en} (${labels.hi})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {currentCard ? (
              <>
                {/* Card content */}
                <div className="min-h-[180px]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{currentCard.icon}</span>
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                      {lang === 'hi' ? categoryLabels[currentCard.category].hi : categoryLabels[currentCard.category].en}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm sm:text-base mb-2">
                    {lang === 'hi' ? currentCard.titleHi : currentCard.titleEn}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                    {lang === 'hi' ? currentCard.bodyHi : currentCard.bodyEn}
                  </p>
                  <div className="bg-primary/5 rounded-md p-2 mb-2">
                    <p className="text-xs font-medium text-primary">
                      {lang === 'hi' ? `मुख्य बिंदु: ${currentCard.keyPointHi}` : `Key point: ${currentCard.keyPointHi}`}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {lang === 'hi' ? 'स्रोत:' : 'Source:'} {currentCard.source}
                  </p>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-4">
                  <Button variant="ghost" size="sm" onClick={prevCard} className="min-w-[36px] min-h-[36px]">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex gap-1">
                    {filteredCards.slice(0, 5).map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-2 h-2 rounded-full ${i === currentCardIndex % 5 ? 'bg-primary' : 'bg-muted'}`} 
                      />
                    ))}
                    {filteredCards.length > 5 && (
                      <span className="text-xs text-muted-foreground ml-1">+{filteredCards.length - 5}</span>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={nextCard} className="min-w-[36px] min-h-[36px]">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {lang === 'hi' ? 'कोई कार्ड उपलब्ध नहीं' : 'No cards available'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* REPORT FORM */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {lang === 'hi' ? 'समस्या रिपोर्ट करें' : 'Report a Civic Issue'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>{lang === 'hi' ? 'शहर' : 'City'}</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder={lang === 'hi' ? 'शहर' : 'City'} />
            </div>
            <div className="space-y-2">
              <Label>{lang === 'hi' ? 'इलाका' : 'Area/Locality'}</Label>
              <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder={lang === 'hi' ? 'इलाका' : 'Area / Locality'} />
            </div>
            <div className="space-y-2">
              <Label>{lang === 'hi' ? 'लैंडमार्क' : 'Landmark'}</Label>
              <Input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder={lang === 'hi' ? 'पास का लैंडमार्क' : 'Nearby landmark'} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>{lang === 'hi' ? 'वार्ड (वैकल्पिक)' : 'Ward (optional)'}</Label>
              <Input value={ward} onChange={(e) => setWard(e.target.value)} placeholder="e.g., 12" />
            </div>
            <div className="space-y-2">
              <Label>{lang === 'hi' ? 'समस्या का प्रकार' : 'Issue Type'}</Label>
              <Select value={issueType} onValueChange={setIssueType}>
                <SelectTrigger>
                  <SelectValue placeholder={lang === 'hi' ? 'समस्या चुनें' : 'Select issue'} />
                </SelectTrigger>
                <SelectContent>
                  {catOptions.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                  <SelectItem value="Other">{lang === 'hi' ? 'अन्य' : 'Other'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{lang === 'hi' ? 'प्राथमिकता' : 'Priority'}</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">{lang === 'hi' ? 'कम' : 'Low'}</SelectItem>
                  <SelectItem value="Medium">{lang === 'hi' ? 'मध्यम' : 'Medium'}</SelectItem>
                  <SelectItem value="High">{lang === 'hi' ? 'उच्च' : 'High'}</SelectItem>
                  <SelectItem value="Urgent">{lang === 'hi' ? 'अति-आवश्यक' : 'Urgent'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{lang === 'hi' ? 'कब से' : 'Since when'}</Label>
              <Input value={sinceWhen} onChange={(e) => setSinceWhen(e.target.value)} placeholder={lang === 'hi' ? 'जैसे: 2 हफ्ते' : 'e.g., 2 weeks'} />
            </div>
            <div className="space-y-2">
              <Label>{lang === 'hi' ? 'पिछली शिकायत (प्लेटफॉर्म)' : 'Previous Complaint (Platform)'}</Label>
              <Input value={prevPlatform} onChange={(e) => setPrevPlatform(e.target.value)} placeholder={lang === 'hi' ? 'पोर्टल/ऐप/ऑफिस' : 'Portal/App/Office'} />
            </div>
            <div className="space-y-2">
              <Label>{lang === 'hi' ? 'पिछली शिकायत ID' : 'Previous Complaint ID'}</Label>
              <Input value={prevId} onChange={(e) => setPrevId(e.target.value)} placeholder={lang === 'hi' ? 'ID (अगर है)' : 'ID (if any)'} />
            </div>
            <div className="space-y-2">
              <Label>{lang === 'hi' ? 'पिछली शिकायत तारीख' : 'Previous Complaint Date'}</Label>
              <Input value={prevDate} onChange={(e) => setPrevDate(e.target.value)} placeholder="dd/mm/yyyy" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{lang === 'hi' ? 'विवरण' : 'Description'}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder={lang === 'hi' ? 'समस्या का विवरण दें' : 'Describe the issue, impact, and exact spot.'} />
          </div>
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center gap-2">
              <Switch id="anon" checked={anonymous} onCheckedChange={(v) => setAnonymous(!!v)} />
              <Label htmlFor="anon" className="text-sm font-normal">
                {lang === 'hi' ? 'गुमनाम रूप से जमा करें' : 'Submit anonymously'}
              </Label>
            </div>
            {!anonymous && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>{lang === 'hi' ? 'आपका नाम' : 'Your Name'}</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={lang === 'hi' ? 'पूरा नाम' : 'Full name'} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>{lang === 'hi' ? 'फोन' : 'Phone'}</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={lang === 'hi' ? 'वैकल्पिक' : 'Optional'} />
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleSubmitReport} disabled={submitting || aiValidating || !aiOk} className="w-full sm:w-auto">
              {submitting ? (lang === 'hi' ? 'जमा हो रहा है...' : 'Submitting...') : (aiValidating ? (lang === 'hi' ? 'जांच हो रही है...' : 'Checking...') : (lang === 'hi' ? 'पोर्टल पर रिपोर्ट जमा करें' : 'Submit report to portal'))}
            </Button>
            <Button variant="outline" onClick={() => handleCopy(body)} className="w-full sm:w-auto">
              {lang === 'hi' ? 'शिकायत पाठ कॉपी करें' : 'Copy complaint text'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* GUIDANCE AND DRAFTS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {lang === 'hi' ? 'मार्गदर्शन और ड्राफ्ट' : 'Guidance and Drafts'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">{lang === 'hi' ? 'अधिकारी' : 'Authority'}</div>
              <div className="font-medium">{cls.authority}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">{lang === 'hi' ? 'विभाग' : 'Department'}</div>
              <div className="font-medium">{cls.department}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">{lang === 'hi' ? 'स्थान' : 'Location'}</div>
              <div className="font-medium">{locLine || '—'}</div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">{lang === 'hi' ? 'चरण' : 'Steps'}</div>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              {steps.map((s, i) => (<li key={i}>{s}</li>))}
            </ul>
          </div>
          <Tabs defaultValue="complaint">
            <TabsList className="flex flex-wrap">
              <TabsTrigger value="complaint">{lang === 'hi' ? 'शिकायत' : 'Complaint'}</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="rti">RTI</TabsTrigger>
              <TabsTrigger value="followup">{lang === 'hi' ? 'फॉलो-अप' : 'Follow-up'}</TabsTrigger>
              <TabsTrigger value="escalation">{lang === 'hi' ? 'एस्केलेशन' : 'Escalation'}</TabsTrigger>
            </TabsList>
            <TabsContent value="complaint" className="space-y-2">
              <div className="text-sm text-muted-foreground">{lang === 'hi' ? 'विषय' : 'Subject'}</div>
              <div className="p-3 rounded-md bg-muted text-sm whitespace-pre-wrap">{subject}</div>
              <div className="text-sm text-muted-foreground">{lang === 'hi' ? 'मुख्य भाग' : 'Body'}</div>
              <div className="p-3 rounded-md bg-muted text-sm whitespace-pre-wrap">{body}</div>
              <div className="flex gap-2"><Button size="sm" onClick={() => handleCopy(subject + '\n\n' + body)}>{lang === 'hi' ? 'कॉपी करें' : 'Copy'}</Button></div>
            </TabsContent>
            <TabsContent value="email" className="space-y-2">
              <div className="text-sm text-muted-foreground">Email</div>
              <div className="p-3 rounded-md bg-muted text-sm whitespace-pre-wrap">{subject + '\n\n' + body}</div>
              <div className="flex gap-2"><Button size="sm" onClick={() => handleCopy(subject + '\n\n' + body)}>{lang === 'hi' ? 'कॉपी करें' : 'Copy'}</Button></div>
            </TabsContent>
            <TabsContent value="rti" className="space-y-2">
              <div className="p-3 rounded-md bg-muted text-sm whitespace-pre-wrap">{rti}</div>
              <div className="flex gap-2"><Button size="sm" onClick={() => handleCopy(rti)}>{lang === 'hi' ? 'कॉपी करें' : 'Copy'}</Button></div>
            </TabsContent>
            <TabsContent value="followup" className="space-y-2">
              <div className="p-3 rounded-md bg-muted text-sm whitespace-pre-wrap">{followUp}</div>
              <div className="flex gap-2"><Button size="sm" onClick={() => handleCopy(followUp)}>{lang === 'hi' ? 'कॉपी करें' : 'Copy'}</Button></div>
            </TabsContent>
            <TabsContent value="escalation" className="space-y-2">
              <div className="p-3 rounded-md bg-muted text-sm whitespace-pre-wrap">{escalate}</div>
              <div className="flex gap-2"><Button size="sm" onClick={() => handleCopy(escalate)}>{lang === 'hi' ? 'कॉपी करें' : 'Copy'}</Button></div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
