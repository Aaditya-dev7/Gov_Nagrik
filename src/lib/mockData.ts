// ========================================
// MOCK DATA FOR TESTING - NO DATABASE NEEDED
// ========================================

export const MOCK_USERS = {
  admin: {
    id: 'mock-admin-001',
    name: 'Test Admin',
    email: 'admin@test.com',
    role: 'admin',
    department: null,
    status: 'Active' as const,
  },
  officer: {
    id: 'mock-officer-001',
    name: 'Test Officer',
    email: 'officer@test.com',
    role: 'Field Officer',
    department: 'Roads',
    status: 'Active' as const,
  },
  staff: {
    id: 'mock-staff-001',
    name: 'Test Staff',
    email: 'staff@test.com',
    role: 'Staff',
    department: 'Roads',
    status: 'Active' as const,
    reports_to_officer_id: 'mock-officer-001',
    reports_to_officer_name: 'Test Officer',
  },
  citizen: {
    id: 'mock-citizen-001',
    name: 'Test Citizen',
    email: 'citizen@test.com',
    role: 'citizen',
    department: null,
    status: 'Active' as const,
  },
};

export const MOCK_DEPARTMENTS = [
  { id: 'dept-roads', name: 'Roads', description: 'Road maintenance' },
  { id: 'dept-sanitation', name: 'Sanitation', description: 'Waste management' },
  { id: 'dept-water', name: 'Water Supply', description: 'Water supply' },
  { id: 'dept-lighting', name: 'Street Lighting', description: 'Public lighting' },
];

export const MOCK_REPORTS = [
  {
    report_id: 'RPT-001',
    category: 'Roads',
    description: 'Large pothole on Main Street causing traffic issues',
    priority: 'High',
    status: 'Pending',
    submitted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    reporter: { name: 'Test Citizen', phone: '9876543210', anonymous: false },
    assigned_department: 'Roads',
    assigned_officer_id: 'mock-officer-001',
    assigned_officer_name: 'Test Officer',
    location_text: 'Main Street, Sector 15',
    lat: 28.6139,
    lng: 77.2090,
    media: [],
    timeline: [
      { actor: 'System', action: 'Report created', at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { actor: 'Auto-Assignment', action: 'Assigned to Roads department', at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
    ],
  },
  {
    report_id: 'RPT-002',
    category: 'Sanitation',
    description: 'Garbage not collected for 3 days in Sector 10',
    priority: 'Medium',
    status: 'In Progress',
    submitted_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    reporter: { name: 'Test Citizen', phone: '9876543210', anonymous: false },
    assigned_department: 'Sanitation',
    assigned_officer_id: 'mock-officer-001',
    assigned_officer_name: 'Test Officer',
    location_text: 'Sector 10',
    lat: 28.6140,
    lng: 77.2100,
    media: [],
    timeline: [
      { actor: 'System', action: 'Report created', at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
      { actor: 'Test Officer', action: 'Marked as In Progress', at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
    ],
  },
  {
    report_id: 'RPT-003',
    category: 'Water Supply',
    description: 'No water supply since morning in Block A',
    priority: 'High',
    status: 'Pending',
    submitted_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    reporter: { name: 'Test Citizen', phone: '9876543210', anonymous: false },
    assigned_department: 'Water Supply',
    assigned_officer_id: null,
    assigned_officer_name: null,
    location_text: 'Block A, Sector 20',
    lat: 28.6150,
    lng: 77.2110,
    media: [],
    timeline: [
      { actor: 'System', action: 'Report created', at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
    ],
  },
  {
    report_id: 'RPT-004',
    category: 'Roads',
    description: 'Street light not working near Park Avenue',
    priority: 'Low',
    status: 'Pending',
    submitted_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    reporter: { name: 'Anonymous', phone: '', anonymous: true },
    assigned_department: 'Roads',
    assigned_officer_id: 'mock-officer-001',
    assigned_officer_name: 'Test Officer',
    location_text: 'Park Avenue',
    lat: 28.6160,
    lng: 77.2120,
    media: [],
    timeline: [
      { actor: 'System', action: 'Report created', at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
    ],
  },
  {
    report_id: 'RPT-005',
    category: 'Street Lighting',
    description: 'Multiple street lights broken on Highway 5',
    priority: 'High',
    status: 'Resolved',
    submitted_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    reporter: { name: 'Test Citizen', phone: '9876543210', anonymous: false },
    assigned_department: 'Street Lighting',
    assigned_officer_id: 'mock-officer-001',
    assigned_officer_name: 'Test Officer',
    location_text: 'Highway 5',
    lat: 28.6170,
    lng: 77.2130,
    media: [],
    timeline: [
      { actor: 'System', action: 'Report created', at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
      { actor: 'Test Officer', action: 'Marked as In Progress', at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() },
      { actor: 'Test Staff', action: 'Resolved - Lights repaired', at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
    ],
  },
];

export const MOCK_STAFF_TASKS = [
  {
    id: 'task-001',
    report_id: 'RPT-004',
    staff_user_id: 'mock-staff-001',
    assigned_by_officer_id: 'mock-officer-001',
    status: 'assigned',
    assigned_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    staff_name: 'Test Staff',
    report: {
      category: 'Roads',
      priority: 'Low',
      status: 'Pending',
      description: 'Street light not working near Park Avenue',
    },
  },
];

export const MOCK_BADGES = [
  {
    id: 'badge-001',
    name: 'First Reporter',
    description: 'Submitted your first report',
    icon: 'file-plus',
    points: 10,
    category: 'reporting',
  },
  {
    id: 'badge-002',
    name: 'Active Citizen',
    description: 'Submitted 10 reports',
    icon: 'trophy',
    points: 50,
    category: 'reporting',
  },
  {
    id: 'badge-003',
    name: 'NSS Volunteer',
    description: 'Registered as NSS volunteer',
    icon: 'users',
    points: 30,
    category: 'special',
  },
];

export const MOCK_USER_BADGES = [
  {
    id: 'ub-001',
    user_id: 'mock-citizen-001',
    badge_id: 'badge-001',
    earned_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    badge: MOCK_BADGES[0],
  },
];

export const MOCK_NSS_REGISTRATIONS = [
  {
    id: 'nss-001',
    user_id: 'mock-citizen-001',
    full_name: 'Test Citizen',
    email: 'citizen@test.com',
    phone: '9876543210',
    college: 'Test College',
    nss_unit: 'Unit 1',
    department_preference: 'Roads',
    status: 'pending',
    applied_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const MOCK_NOTIFICATIONS = [
  {
    id: 'notif-001',
    message: 'New report RPT-003 needs assignment',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    read: false,
    report_id: 'RPT-003',
    type: 'assignment',
  },
  {
    id: 'notif-002',
    message: 'Report RPT-002 is overdue',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    read: false,
    report_id: 'RPT-002',
    type: 'alert',
  },
];

// Helper to get user by role
export function getMockUser(role: 'admin' | 'officer' | 'staff' | 'citizen') {
  return MOCK_USERS[role];
}

// Helper to check mock mode
export function isMockMode(): boolean {
  return localStorage.getItem('mockMode') === 'true' || 
         window.location.search.includes('mock=true');
}
