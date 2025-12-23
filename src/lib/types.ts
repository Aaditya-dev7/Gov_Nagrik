// NagrikGPT Type Definitions

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Department Admin' | 'Field Officer' | 'Viewer';
  department: string;
  status: 'Active' | 'Inactive';
}

export interface Department {
  id: string;
  name: string;
  ward: string;
  officerCount: number;
  activeReports: number;
}

export interface Reporter {
  name: string;
  phone: string | null;
  anonymous: boolean;
}

export interface TimelineItem {
  actor: string;
  action: string;
  at: string;
}

export interface Report {
  report_id: string;
  category: string;
  description: string;
  summary: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Pending' | 'In Progress' | 'Resolved' | 'Rejected';
  submitted_at: string;
  location_text: string;
  lat: number;
  lng: number;
  reporter: Reporter;
  media: string[];
  assigned_department: string;
  assigned_officer_id: string | null;
  assigned_officer_name: string;
  timeline: TimelineItem[];
}

export interface Notification {
  id: string;
  message: string;
  timestamp: string;
  read: boolean;
  report_id: string;
}

export interface AppState {
  currentUser: User | null;
  currentPage: string;
  dashboardFilter: string;
  selectedReports: string[];
  currentReport: Report | null;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';
