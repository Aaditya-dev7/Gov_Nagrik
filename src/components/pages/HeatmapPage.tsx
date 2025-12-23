import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, AlertTriangle, Info } from 'lucide-react';

export function HeatmapPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Beta Banner */}
      <Card className="border-warning/50 bg-warning-light">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-warning mb-1">Beta Feature</p>
            <p className="text-sm text-muted-foreground">
              The heatmap visualization is currently in development. This feature will help identify recurring problem zones and hotspots across the city.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder */}
      <Card className="min-h-[500px]">
        <CardContent className="flex flex-col items-center justify-center h-full py-16">
          <div className="w-24 h-24 bg-destructive-light rounded-full flex items-center justify-center mb-6">
            <Flame className="w-12 h-12 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Clustering Heatmap</h2>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            Identify recurring problem zones and hotspots to prioritize resource allocation and preventive measures.
          </p>
          <Badge variant="secondary" className="text-sm">
            Coming Soon
          </Badge>
        </CardContent>
      </Card>

      {/* Feature Preview */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="w-4 h-4 text-info" />
              Density Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Visualize report density across different areas to identify problem hotspots.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="w-4 h-4 text-info" />
              Category Clustering
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Group reports by category to see patterns in infrastructure issues.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="w-4 h-4 text-info" />
              Time-based Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Track how problem areas evolve over time to measure intervention effectiveness.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
