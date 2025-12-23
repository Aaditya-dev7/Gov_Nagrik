import { User, Department, Report, Notification } from './types';

export const mockUsers: User[] = [
  { id: 'user-1', name: 'Rajesh Sharma', email: 'rajesh.sharma@nagarpalika.gov.in', role: 'Super Admin', department: 'Administration', status: 'Active' },
  { id: 'user-2', name: 'Priya Desai', email: 'priya.desai@nagarpalika.gov.in', role: 'Department Admin', department: 'Roads', status: 'Active' },
  { id: 'user-3', name: 'Amit Patil', email: 'amit.patil@nagarpalika.gov.in', role: 'Field Officer', department: 'Sanitation', status: 'Active' },
  { id: 'user-4', name: 'Sneha Kulkarni', email: 'sneha.kulkarni@nagarpalika.gov.in', role: 'Field Officer', department: 'Water Supply', status: 'Active' },
  { id: 'user-5', name: 'Vikram Singh', email: 'vikram.singh@nagarpalika.gov.in', role: 'Viewer', department: 'Audit', status: 'Active' }
];

export const mockDepartments: Department[] = [
  { id: 'dept-1', name: 'Roads', ward: 'Ward 1-5', officerCount: 8, activeReports: 23 },
  { id: 'dept-2', name: 'Sanitation', ward: 'All Wards', officerCount: 15, activeReports: 45 },
  { id: 'dept-3', name: 'Water Supply', ward: 'Ward 1-10', officerCount: 12, activeReports: 18 },
  { id: 'dept-4', name: 'Street Lighting', ward: 'All Wards', officerCount: 6, activeReports: 12 },
  { id: 'dept-5', name: 'Drainage', ward: 'Ward 3-8', officerCount: 10, activeReports: 31 }
];

export const mockReports: Report[] = [
  {
    report_id: 'RG-7f4a2b9c',
    category: 'Pothole',
    description: 'Huge pothole near bus stop causing traffic hazard. The pothole is approximately 2 feet wide and 6 inches deep. Multiple vehicles have been damaged.',
    summary: 'Large pothole near bus stop causing traffic hazard and vehicle damage',
    priority: 'High',
    status: 'Pending',
    submitted_at: '2025-12-06T14:32:00+05:30',
    location_text: 'Char Phata, Karjat',
    lat: 18.9453,
    lng: 73.2245,
    reporter: { name: 'S. Kumar', phone: '+91-9XXXXXXXX', anonymous: false },
    media: ['https://images.unsplash.com/photo-1615840287214-7ff58936c4cf?w=400'],
    assigned_department: 'Roads',
    assigned_officer_id: 'user-2',
    assigned_officer_name: 'Priya Desai',
    timeline: [
      { actor: 'System', action: 'Report created', at: '2025-12-06T14:32:00+05:30' },
      { actor: 'Auto-Assignment', action: 'Assigned to Roads department', at: '2025-12-06T14:33:00+05:30' }
    ]
  },
  {
    report_id: 'RG-3k8m4n2p',
    category: 'Garbage Collection',
    description: 'Garbage has not been collected for 5 days. The bins are overflowing and creating health hazards in the residential area.',
    summary: 'Overflowing garbage bins not collected for 5 days creating health hazard',
    priority: 'Urgent',
    status: 'In Progress',
    submitted_at: '2025-12-05T09:15:00+05:30',
    location_text: 'Pulachiwadi, Karjat',
    lat: 18.9512,
    lng: 73.2198,
    reporter: { name: 'Meera Joshi', phone: '+91-9YYYYYYYY', anonymous: false },
    media: [
      'https://images.unsplash.com/photo-1604187351574-c75ca79f5807?w=400',
      'https://images.unsplash.com/photo-1621451537084-482c73073a0f?w=400'
    ],
    assigned_department: 'Sanitation',
    assigned_officer_id: 'user-3',
    assigned_officer_name: 'Amit Patil',
    timeline: [
      { actor: 'System', action: 'Report created', at: '2025-12-05T09:15:00+05:30' },
      { actor: 'Dept Admin', action: 'Assigned to Amit Patil', at: '2025-12-05T10:00:00+05:30' },
      { actor: 'Amit Patil', action: 'Marked as In Progress', at: '2025-12-05T11:30:00+05:30' },
      { actor: 'Amit Patil', action: 'Added progress note - "Team dispatched to location"', at: '2025-12-05T11:32:00+05:30' }
    ]
  },
  {
    report_id: 'RG-9h2j5k7m',
    category: 'Street Light',
    description: 'Street light not working for 2 weeks. This is a busy intersection and lack of lighting is creating safety concerns especially for pedestrians at night.',
    summary: 'Non-functional street light at busy intersection for 2 weeks',
    priority: 'Medium',
    status: 'Pending',
    submitted_at: '2025-12-04T18:45:00+05:30',
    location_text: 'Main Market Road, Karjat',
    lat: 18.9489,
    lng: 73.2267,
    reporter: { name: 'Anonymous', phone: null, anonymous: true },
    media: ['https://images.unsplash.com/photo-1545158535-c3f7168c28b6?w=400'],
    assigned_department: 'Street Lighting',
    assigned_officer_id: null,
    assigned_officer_name: 'Unassigned',
    timeline: [
      { actor: 'System', action: 'Report created', at: '2025-12-04T18:45:00+05:30' },
      { actor: 'Auto-Assignment', action: 'Assigned to Street Lighting department', at: '2025-12-04T18:46:00+05:30' }
    ]
  },
  {
    report_id: 'RG-4p8q2r5t',
    category: 'Water Leakage',
    description: 'Major water leakage from main pipeline. Water is flooding the street and many households are without water supply.',
    summary: 'Major pipeline leakage causing street flooding and water supply disruption',
    priority: 'Urgent',
    status: 'In Progress',
    submitted_at: '2025-12-07T06:20:00+05:30',
    location_text: 'Station Road, Karjat',
    lat: 18.9478,
    lng: 73.2234,
    reporter: { name: 'Rahul Bhosale', phone: '+91-9ZZZZZZZZ', anonymous: false },
    media: ['https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400'],
    assigned_department: 'Water Supply',
    assigned_officer_id: 'user-4',
    assigned_officer_name: 'Sneha Kulkarni',
    timeline: [
      { actor: 'System', action: 'Report created', at: '2025-12-07T06:20:00+05:30' },
      { actor: 'System', action: 'Auto-escalated to Urgent priority', at: '2025-12-07T06:21:00+05:30' },
      { actor: 'Dept Admin', action: 'Assigned to Sneha Kulkarni', at: '2025-12-07T07:00:00+05:30' },
      { actor: 'Sneha Kulkarni', action: 'Marked as In Progress', at: '2025-12-07T07:45:00+05:30' }
    ]
  },
  {
    report_id: 'RG-6t9u3v7w',
    category: 'Road Damage',
    description: 'Road surface damaged due to heavy rains. Multiple cracks and potholes have developed making it difficult for vehicles.',
    summary: 'Rain-damaged road with multiple cracks and potholes',
    priority: 'High',
    status: 'Resolved',
    submitted_at: '2025-11-28T13:10:00+05:30',
    location_text: 'Gandhi Chowk, Karjat',
    lat: 18.9501,
    lng: 73.2256,
    reporter: { name: 'Lakshmi Nair', phone: '+91-9AAAAAAAA', anonymous: false },
    media: ['https://images.unsplash.com/photo-1625787924041-e7e879ac3c31?w=400'],
    assigned_department: 'Roads',
    assigned_officer_id: 'user-2',
    assigned_officer_name: 'Priya Desai',
    timeline: [
      { actor: 'System', action: 'Report created', at: '2025-11-28T13:10:00+05:30' },
      { actor: 'Priya Desai', action: 'Assigned to self', at: '2025-11-28T14:00:00+05:30' },
      { actor: 'Priya Desai', action: 'Marked as In Progress', at: '2025-11-29T09:00:00+05:30' },
      { actor: 'Priya Desai', action: 'Added progress note with before image', at: '2025-12-01T10:30:00+05:30' },
      { actor: 'Priya Desai', action: 'Marked as Resolved with completion photos', at: '2025-12-03T16:00:00+05:30' }
    ]
  },
  {
    report_id: 'RG-2b5c8d1e',
    category: 'Drainage Block',
    description: 'Drainage is completely blocked causing water logging during rains. Bad smell and mosquito breeding.',
    summary: 'Blocked drainage causing waterlogging and mosquito breeding',
    priority: 'Medium',
    status: 'Pending',
    submitted_at: '2025-12-08T11:25:00+05:30',
    location_text: 'Ambedkar Nagar, Karjat',
    lat: 18.9467,
    lng: 73.2289,
    reporter: { name: 'Suresh Yadav', phone: '+91-9BBBBBBBB', anonymous: false },
    media: [],
    assigned_department: 'Drainage',
    assigned_officer_id: null,
    assigned_officer_name: 'Unassigned',
    timeline: [
      { actor: 'System', action: 'Report created', at: '2025-12-08T11:25:00+05:30' }
    ]
  },
  {
    report_id: 'RG-7c3d9e2f',
    category: 'Illegal Dumping',
    description: 'Construction waste dumped illegally on public land. This is creating obstruction and environmental hazard.',
    summary: 'Illegal construction waste dumping on public land',
    priority: 'Low',
    status: 'Rejected',
    submitted_at: '2025-12-02T16:50:00+05:30',
    location_text: 'Old Mumbai Road, Karjat',
    lat: 18.9445,
    lng: 73.2312,
    reporter: { name: 'Anil Gupta', phone: '+91-9CCCCCCCC', anonymous: false },
    media: ['https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=400'],
    assigned_department: 'Sanitation',
    assigned_officer_id: 'user-3',
    assigned_officer_name: 'Amit Patil',
    timeline: [
      { actor: 'System', action: 'Report created', at: '2025-12-02T16:50:00+05:30' },
      { actor: 'Amit Patil', action: 'Assigned to self', at: '2025-12-03T09:00:00+05:30' },
      { actor: 'Amit Patil', action: 'Marked as Rejected - "Duplicate report, already addressed in RG-2b5c8d1e"', at: '2025-12-03T10:15:00+05:30' }
    ]
  },
  {
    report_id: 'RG-5e8f2g4h',
    category: 'Tree Falling Risk',
    description: 'Old tree with dead branches posing risk of falling. Located near school, needs urgent attention.',
    summary: 'Dead tree branches near school pose falling hazard',
    priority: 'High',
    status: 'In Progress',
    submitted_at: '2025-12-07T08:30:00+05:30',
    location_text: 'School Lane, Karjat',
    lat: 18.9523,
    lng: 73.2201,
    reporter: { name: 'Principal - Karjat School', phone: '+91-9DDDDDDDD', anonymous: false },
    media: ['https://images.unsplash.com/photo-1574330913099-19c1ab241b7c?w=400'],
    assigned_department: 'Roads',
    assigned_officer_id: 'user-2',
    assigned_officer_name: 'Priya Desai',
    timeline: [
      { actor: 'System', action: 'Report created', at: '2025-12-07T08:30:00+05:30' },
      { actor: 'Priya Desai', action: 'Marked as In Progress', at: '2025-12-07T09:15:00+05:30' }
    ]
  }
];

export const mockNotifications: Notification[] = [];

export const categories = [
  'Pothole',
  'Road Damage',
  'Garbage Collection',
  'Illegal Dumping',
  'Street Light',
  'Water Leakage',
  'Drainage Block',
  'Tree Falling Risk',
  'Sewage Overflow',
  'Park Maintenance'
];

export const govEmailDomains = [
  'gov.in',
  'nic.in',
  'india.gov.in',
  'nagarpalika.gov.in',
  'maha.gov.in',
  'maharashtra.gov.in'
];

export function isValidGovEmail(email: string): boolean {
  return govEmailDomains.some(domain => 
    email.endsWith(`@${domain}`) || email.endsWith(`.${domain}`)
  );
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
