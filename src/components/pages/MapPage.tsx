import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet';
import { Icon, LatLngBounds } from 'leaflet';
import { useReports } from '@/contexts/ReportsContext';
import { Report } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, ExternalLink } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { geocodeAddress } from '@/lib/geocoding';

// Fix for default markers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface MapPageProps {
  onOpenReport: (reportId: string) => void;
}

// Separate component for map controller
function MapController({ reports }: { reports: Report[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (reports.length > 0) {
      const bounds = new LatLngBounds(
        reports.map(r => [r.lat, r.lng] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [reports, map]);

  return null;
}


// Separate component for report markers
function ReportMarkers({ reports, onOpenReport }: { reports: Report[]; onOpenReport: (reportId: string) => void }) {
  const getMarkerColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return '#ef4444';
      case 'High': return '#f97316';
      case 'Medium': return '#eab308';
      case 'Low': return '#22c55e';
      default: return '#3b82f6';
    }
  };

  const createCustomIcon = (priority: string) => {
    const color = getMarkerColor(priority);
    return new Icon({
      iconUrl: `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="32" height="32">
          <path d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
        </svg>
      `)}`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-destructive text-destructive-foreground';
      case 'High': return 'bg-priority-high text-foreground';
      case 'Medium': return 'bg-warning text-warning-foreground';
      case 'Low': return 'bg-success text-success-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-warning-light text-warning border-warning/30';
      case 'In Progress': return 'bg-info-light text-info border-info/30';
      case 'Resolved': return 'bg-success-light text-success border-success/30';
      case 'Rejected': return 'bg-destructive-light text-destructive border-destructive/30';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <>
      {reports.map((report) => (
        <Marker
          key={report.report_id}
          position={[report.lat, report.lng]}
          icon={createCustomIcon(report.priority)}
        >
          <Popup>
            <div className="min-w-[200px] p-2">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-mono text-sm font-bold text-primary">
                  {report.report_id}
                </span>
                <Badge className={getPriorityColor(report.priority)}>
                  {report.priority}
                </Badge>
              </div>
              <Badge variant="secondary" className="mb-2">{report.category}</Badge>
              <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {report.location_text}
              </p>
              <Badge variant="outline" className={getStatusColor(report.status)}>
                {report.status}
              </Badge>
              <Button
                size="sm"
                className="w-full mt-3"
                onClick={() => onOpenReport(report.report_id)}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Open Report
              </Button>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}


export function MapPage({ onOpenReport }: MapPageProps) {
  const { reports } = useReports();
  const [geoPositions, setGeoPositions] = useState<Record<string, { lat: number; lng: number }>>({});

  const getMarkerColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return '#ef4444';
      case 'High': return '#f97316';
      case 'Medium': return '#eab308';
      case 'Low': return '#22c55e';
      default: return '#3b82f6';
    }
  };

  // Default center on Karjat, Maharashtra
  const defaultCenter: [number, number] = [18.9489, 73.2245];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        reports.map(async (r) => {
          const pos = await geocodeAddress(r.location_text);
          return [r.report_id, pos] as const;
        })
      );
      if (cancelled) return;
      const next: Record<string, { lat: number; lng: number }> = {};
      for (const [id, pos] of entries) {
        if (pos) next[id] = pos;
      }
      setGeoPositions(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [reports]);

  const mapReports: Report[] = reports.map((r) => ({
    ...r,
    lat: geoPositions[r.report_id]?.lat ?? r.lat,
    lng: geoPositions[r.report_id]?.lng ?? r.lng,
  }));

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Report Locations</h2>
          <p className="text-sm text-muted-foreground">
            {reports.length} reports on map
          </p>
        </div>
      </div>


      <Card className="overflow-hidden">
        <div className="h-[600px] relative">
          <MapContainer
            center={defaultCenter}
            zoom={13}
            className='h-full w-full'
            scrollWheelZoom={true}
          >
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Streets">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Satellite">
                <TileLayer
                  attribution='Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
              </LayersControl.BaseLayer>
            </LayersControl>
            <MapController reports={mapReports} />
            <ReportMarkers reports={mapReports} onOpenReport={onOpenReport} />
          </MapContainer>
        </div>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3">Map Legend</h3>
          <div className="flex flex-wrap gap-4">
            {['Urgent', 'High', 'Medium', 'Low'].map((priority) => (
              <div key={priority} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: getMarkerColor(priority) }}
                />
                <span className="text-sm">{priority}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
