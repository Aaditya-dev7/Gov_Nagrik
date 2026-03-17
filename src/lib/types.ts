// NagrikGPT Type Definitions

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Department Admin' | 'Field Officer' | 'Staff' | 'Viewer';
  department: string;
  status: 'Active' | 'Inactive';
  // For staff: which officer they report to
  reports_to_officer_id?: string | null;
  reports_to_officer_name?: string | null;
  // NSS volunteer info
  is_nss_volunteer?: boolean;
  nss_registration_status?: 'pending' | 'approved' | 'rejected' | null;
  // Badge info
  badges?: Badge[];
  total_points?: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at?: string;
  points: number;
  category: 'reporting' | 'resolution' | 'community' | 'special';
}

export interface NSSRegistration {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  college: string;
  nss_unit: string;
  department_preference: string;
  status: 'pending' | 'approved' | 'rejected';
  applied_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
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

export interface ResolutionDocument {
  id: string;
  name: string;
  url: string;
  type: 'pdf' | 'image' | 'document';
  uploaded_at: string;
  uploaded_by: string;
}

export interface Report {
  report_id: string;
  category: string;
  other_category?: string;
  description: string;
  summary: string;
  report_score?: number;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Pending' | 'In Progress' | 'Resolved' | 'Rejected';
  submitted_at: string;
  deadline?: string;
  overdue_at?: string;
  location_text: string;
  lat: number;
  lng: number;
  reporter: Reporter;
  media: string[];
  assigned_department: string;
  assigned_officer_id: string | null;
  assigned_officer_name: string;
  assigned_officer_phone?: string | null;
  assigned_officer_email?: string | null;
  timeline: TimelineItem[];
  resolution_documents?: ResolutionDocument[];
  resolution_note?: string;
}

export interface Notification {
  id: string;
  message: string;
  timestamp: string;
  read: boolean;
  report_id: string;
  recipient_user_id?: string | null;
  recipient_role?: 'citizen' | 'officer' | 'admin' | 'staff' | null;
  type?: 'status' | 'overdue' | 'assignment' | 'progress_note' | 'system' | string;
}

export interface AppState {
  currentUser: User | null;
  currentPage: string;
  dashboardFilter: string;
  selectedReports: string[];
  currentReport: Report | null;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';
