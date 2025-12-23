import React, { useState } from 'react';
import { useReports } from '@/contexts/ReportsContext';
import { categories } from '@/lib/data';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Send, Camera } from 'lucide-react';

interface CreateReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coordinates: { lat: number; lng: number } | null;
  locationText: string;
}

export function CreateReportModal({ open, onOpenChange, coordinates, locationText }: CreateReportModalProps) {
  const { addReport } = useReports();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    category: '',
    priority: 'Medium',
    description: '',
    reporterName: '',
    reporterPhone: '',
    anonymous: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category) {
      toast({ title: "Error", description: "Please select a category", variant: "destructive" });
      return;
    }
    if (!formData.description.trim()) {
      toast({ title: "Error", description: "Please provide a description", variant: "destructive" });
      return;
    }
    if (!coordinates) {
      toast({ title: "Error", description: "Location not set", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));

    addReport({
      category: formData.category,
      priority: formData.priority as 'Low' | 'Medium' | 'High' | 'Urgent',
      description: formData.description,
      location_text: locationText || `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`,
      lat: coordinates.lat,
      lng: coordinates.lng,
      reporter: {
        name: formData.anonymous ? 'Anonymous' : (formData.reporterName || 'Citizen'),
        phone: formData.anonymous ? null : formData.reporterPhone || null,
        anonymous: formData.anonymous
      }
    });

    toast({
      title: "Report Created",
      description: "New citizen report has been submitted successfully.",
    });

    // Reset form
    setFormData({
      category: '',
      priority: 'Medium',
      description: '',
      reporterName: '',
      reporterPhone: '',
      anonymous: false,
    });
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" aria-describedby="create-report-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Create New Report
          </DialogTitle>
        </DialogHeader>

        <p id="create-report-description" className="sr-only">
          Form to create a new citizen report at the selected location
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Location Display */}
          <div className="bg-primary-light border border-primary/20 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-medium">Location:</span>
              <span className="text-muted-foreground">
                {locationText || (coordinates ? `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}` : 'Not set')}
              </span>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select issue category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select 
              value={formData.priority} 
              onValueChange={(value) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the issue in detail..."
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.description.length}/1000
            </p>
          </div>

          {/* Reporter Info */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="anonymous"
                checked={formData.anonymous}
                onChange={(e) => setFormData({ ...formData, anonymous: e.target.checked })}
                className="rounded border-input"
              />
              <Label htmlFor="anonymous" className="text-sm font-normal cursor-pointer">
                Submit anonymously
              </Label>
            </div>

            {!formData.anonymous && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="reporterName">Reporter Name</Label>
                  <Input
                    id="reporterName"
                    value={formData.reporterName}
                    onChange={(e) => setFormData({ ...formData, reporterName: e.target.value })}
                    placeholder="Enter name"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reporterPhone">Phone Number</Label>
                  <Input
                    id="reporterPhone"
                    value={formData.reporterPhone}
                    onChange={(e) => setFormData({ ...formData, reporterPhone: e.target.value })}
                    placeholder="+91-XXXXXXXXXX"
                    maxLength={15}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Media Upload Placeholder */}
          <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
            <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Photo upload coming soon
            </p>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Report
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
