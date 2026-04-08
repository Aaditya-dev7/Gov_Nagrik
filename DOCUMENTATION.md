# Citizen Report Hub - Complete Source Code Documentation

## Table of Contents
1. [Core Types & Interfaces](#1-core-types--interfaces)
2. [Citizen Frontend - Home Page](#2-citizen-frontend---home-page)
3. [Citizen Frontend - Report Submission](#3-citizen-frontend---report-submission)
4. [Citizen Frontend - API Integration](#4-citizen-frontend---api-integration)
5. [Citizen Frontend - Geocoding](#5-citizen-frontend---geocoding)
6. [Citizen Frontend - AI Validation](#6-citizen-frontend---ai-validation)
7. [Admin Frontend - Authentication](#7-admin-frontend---authentication)
8. [Admin Frontend - Reports Context](#8-admin-frontend---reports-context)
9. [Admin Frontend - Dashboard](#9-admin-frontend---dashboard)
10. [Admin Frontend - Report Detail Modal](#10-admin-frontend---report-detail-modal)
11. [Admin Frontend - Staff Dashboard](#11-admin-frontend---staff-dashboard)
12. [CSS & Styling - Tailwind Configuration](#12-css--styling---tailwind-configuration)
13. [Utility Functions](#13-utility-functions)
14. [Database Schema (TypeScript)](#14-database-schema-typescript)
15. [Process Flow Integration](#15-process-flow-integration)

---

## 1. Core Types & Interfaces

**File:** `src/lib/types.ts`

```typescript
// NagrikGPT Type Definitions

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Department Admin' | 'Field Officer' | 'Staff' | 'Viewer';
  department: string;
  status: 'Active' | 'Inactive';
  reports_to_officer_id?: string | null;
  reports_to_officer_name?: string | null;
  is_nss_volunteer?: boolean;
  nss_registration_status?: 'pending' | 'approved' | 'rejected' | null;
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
```

---

## 2. Citizen Frontend - Home Page

**File:** `citizen-client/src/pages/Home.tsx`

```typescript
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadReports } from '@/lib/storage'
import { isSupabaseEnabled, subscribeReports, supabaseGetReportCounts } from '@/lib/api'
import { Button } from '@/components/ui/button'
import LoadingOverlay from '@/components/LoadingOverlay'
import { t } from '@/lib/i18n'

export default function HomePage() {
  const nav = useNavigate()
  const [counts, setCounts] = useState({ total: 0, resolved: 0, inProgress: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function refresh() {
      setLoading(true)
      try {
        if (isSupabaseEnabled()) {
          const c = await supabaseGetReportCounts()
          if (mounted && c) { setCounts(c); return }
        }
        if (mounted) {
          const local = loadReports()
          const total = local.length
          const resolved = local.filter(r => r.status === 'Resolved').length
          const inProgress = local.filter(r => r.status === 'In Progress').length
          setCounts({ total, resolved, inProgress })
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    refresh()
    let unsub = () => {}
    if (isSupabaseEnabled()) {
      unsub = subscribeReports(() => { refresh() })
    }
    return () => {
      mounted = false
      unsub()
    }
  }, [])

  const { total, resolved, inProgress } = counts

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-background flex items-center px-4 sm:px-6 lg:px-8">
      <LoadingOverlay show={loading} label={t('home.loading')} />
      <div className="mx-auto flex max-w-5xl flex-col items-center text-center space-y-10 py-10 sm:py-16">
        <section className="space-y-5">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight tracking-tight">
            <span className="block text-foreground">{t('home.title_line1')}</span>
            <span className="mt-1 inline-block bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
              {t('home.title_line2')}
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground">
            {t('home.subtitle')}
          </p>
        </section>

        <section className="flex flex-wrap justify-center gap-4">
          <Button
            className="rounded-full px-6 py-2 text-sm sm:text-base bg-primary hover:bg-primary-hover text-primary-foreground shadow-sm"
            onClick={() => nav('/report')}
          >
            {t('home.cta_report')}
          </Button>
          <Button
            variant="outline"
            className="rounded-full px-6 py-2 text-sm sm:text-base border border-border text-primary hover:bg-primary-light"
            onClick={() => nav('/community')}
          >
            {t('home.cta_feed')}
          </Button>
        </section>

        <section className="mt-4 grid w-full max-w-3xl gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-card/80 border border-border shadow-sm px-8 py-6">
            <div className="text-4xl font-bold text-primary">{total}</div>
            <div className="mt-2 text-sm font-medium text-muted-foreground">{t('home.stats.issues_reported')}</div>
          </div>
          <div className="rounded-2xl bg-card/80 border border-border shadow-sm px-8 py-6">
            <div className="text-4xl font-bold text-primary">{resolved}</div>
            <div className="mt-2 text-sm font-medium text-muted-foreground">{t('home.stats.issues_resolved')}</div>
          </div>
          <div className="rounded-2xl bg-card/80 border border-border shadow-sm px-8 py-6">
            <div className="text-4xl font-bold text-primary">{inProgress}</div>
            <div className="mt-2 text-sm font-medium text-muted-foreground">{t('home.stats.in_progress')}</div>
          </div>
        </section>
      </div>
    </div>
  )
}
```

---

## 3. Citizen Frontend - Report Submission

**File:** `citizen-client/src/pages/Report.tsx` (Core Functions)

```typescript
import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { geocodeAddress, isCoordinateInIndia, reverseGeocode } from '@/lib/geocoding'
import { Report } from '@/lib/types'
import { loadReports, saveReports } from '@/lib/storage'
import { isSupabaseEnabled, supabaseInsertReport, supabaseUploadReportPhoto, checkDuplicateReport } from '@/lib/api'
import { getSupabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select as UISelect } from '@/components/ui/select'
import { Alert } from '@/components/ui/alert'
import { AlertTriangle, Flag, MapPin, FileText, Image as ImageIcon, Clock as ClockIcon, Info, Mic, Camera } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { validateImageMatchesDescription } from '@/lib/ai'
import { t, useLang } from '@/lib/i18n'

function id() {
  return 'CR-' + Math.random().toString(36).slice(2, 8)
}

type FieldErrors = {
  category?: string
  priority?: string
  location?: string
  description?: string
}

export default function ReportPage() {
  const _lang = useLang()
  const { user } = useAuth()
  const loc = useLocation()
  const [category, setCategory] = useState('Pothole')
  const [otherCategory, setOtherCategory] = useState('')
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium')
  const [locationText, setLocationText] = useState('')
  const [description, setDescription] = useState('')
  const [incidentTime, setIncidentTime] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [pickedLat, setPickedLat] = useState<number | null>(null)
  const [pickedLng, setPickedLng] = useState<number | null>(null)

  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [voiceLang, setVoiceLang] = useState<'en-IN' | 'hi-IN' | 'mr-IN'>('en-IN')
  const [voiceGender, setVoiceGender] = useState<'male' | 'female'>('female')
  const [dictating, setDictating] = useState(false)
  const recognitionRef = React.useRef<any>(null)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const lastPlayedKeywordRef = React.useRef<string | null>(null)

  const [aiValidating, setAiValidating] = useState(false)
  const [aiOk, setAiOk] = useState(true)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiScore, setAiScore] = useState<number | null>(null)
  const [duplicateReport, setDuplicateReport] = useState<Report | null>(null)

  const [showCamera, setShowCamera] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)

  // Local score calculation based on all form fields
  const localScore = React.useMemo(() => {
    let score = 0
    if (category && category !== 'Select category') score += 10
    if (priority) score += 10
    if (locationText.trim().length >= 3) score += 10
    if (locationText.trim().length >= 10) score += 5
    if (pickedLat && pickedLng) score += 5
    const words = description.trim().split(/\s+/).filter(Boolean)
    if (words.length >= 3) score += 5
    if (words.length >= 5) score += 5
    if (words.length >= 8) score += 5
    if (words.length >= 12) score += 5
    if (words.length >= 15) score += 5
    if (words.length >= 20) score += 5
    if (description.includes('.')) score += 5
    if (description.includes(',')) score += 3
    if (incidentTime) score += 10
    if (photos.length > 0) score += 10
    return Math.min(score, 100)
  }, [category, priority, locationText, description, incidentTime, photos.length, pickedLat, pickedLng])

  const displayScore = aiScore !== null ? aiScore : localScore

  // Local bad word filter (fallback if backend validation fails)
  const BAD_WORDS = [
    'idiot', 'stupid', 'bloody', 'abuse',
    'harami', 'nalayak', 'chutiya', 'madarchod',
    'fuck', 'fucking', 'fucked', 'fucker', 'fuckers',
    'shit', 'shitty', 'bullshit', 'bull shit',
    'damn', 'dammit', 'goddamn',
    'ass', 'asshole', 'assholes',
    'bastard', 'bastards',
    'bitch', 'bitches', 'bitching',
    'crap', 'crappy',
    'dick', 'dicks', 'dickhead',
    'piss', 'pissed', 'pissing',
    'whore', 'whores',
    'slut', 'sluts',
    'cock', 'cocks',
    'pussy', 'pussies',
    'wanker', 'wankers',
    'suck', 'sucks', 'sucking',
  ]

  function containsBadWords(text: string): boolean {
    const lower = text.toLowerCase()
    return BAD_WORDS.some(word => lower.includes(word))
  }
}
```

---

## 4. Citizen Frontend - API Integration

**File:** `citizen-client/src/lib/api.ts`

```typescript
import { getSupabase, isSupabaseEnabled } from '@/lib/supabase'
import type { Report, TimelineItem, Comment, CommentLike, Notification } from '@/lib/types'

// Normalize text for comparison
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Calculate similarity between two strings (0-1)
function textSimilarity(a: string, b: string): number {
  const normA = normalizeText(a)
  const normB = normalizeText(b)
  if (!normA || !normB) return 0
  
  const wordsA = normA.split(' ').filter(w => w.length > 2)
  const wordsB = normB.split(' ').filter(w => w.length > 2)
  
  if (wordsA.length === 0 || wordsB.length === 0) return 0
  
  if (normA.includes(normB) || normB.includes(normA)) return 0.95
  
  const setA = new Set(wordsA)
  const setB = new Set(wordsB)
  const intersection = [...setA].filter(w => setB.has(w)).length
  const union = Math.max(setA.size, setB.size)
  
  const similarity = union > 0 ? intersection / union : 0
  console.log('Text similarity:', { 
    wordsA: wordsA.slice(0, 5), 
    wordsB: wordsB.slice(0, 5), 
    intersection, 
    union, 
    similarity 
  })
  
  return similarity
}

// Check for duplicate reports
export async function checkDuplicateReport(
  description: string,
  category: string,
  locationText: string,
  lat?: number | null,
  lng?: number | null
): Promise<{ isDuplicate: boolean; existingReport?: Report; similarity?: number }> {
  const sb = getSupabase()
  
  if (sb) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await sb
      .from('reports')
      .select('*')
      .eq('category', category)
      .gte('submitted_at', oneDayAgo)
      .order('submitted_at', { ascending: false })
      .limit(50)
    
    console.log('Duplicate check - found reports:', data?.length, 'error:', error)
    
    if (error || !data || data.length === 0) return { isDuplicate: false }
    
    for (const row of data) {
      const existingReport = mapDbToReport(row)
      const similarity = textSimilarity(description, existingReport.description)
      console.log('Comparing with:', existingReport.description?.slice(0, 50), 'similarity:', similarity)
      
      if (similarity >= 0.5) {
        console.log('Found potential duplicate!')
        if (lat && lng && existingReport.lat && existingReport.lng) {
          const distance = Math.sqrt(
            Math.pow(lat - existingReport.lat, 2) + 
            Math.pow(lng - existingReport.lng, 2)
          )
          if (distance < 0.05) {
            console.log('Location match, distance:', distance)
            return { isDuplicate: true, existingReport, similarity }
          }
        } else {
          if (locationText && existingReport.location_text) {
            const locSimilarity = textSimilarity(locationText, existingReport.location_text)
            if (locSimilarity >= 0.4) {
              console.log('Location text match:', locSimilarity)
              return { isDuplicate: true, existingReport, similarity }
            }
          }
          return { isDuplicate: true, existingReport, similarity }
        }
      }
    }
    
    return { isDuplicate: false }
  }
  
  // Check local storage
  try {
    const raw = localStorage.getItem('cc:reports')
    if (!raw) return { isDuplicate: false }
    const reports: Report[] = JSON.parse(raw)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    
    console.log('Checking local reports:', reports.length)
    
    for (const report of reports) {
      if (report.category !== category) continue
      const submittedTime = new Date(report.submitted_at).getTime()
      if (submittedTime < oneDayAgo) continue
      
      const similarity = textSimilarity(description, report.description)
      console.log('Local similarity:', similarity, 'with:', report.description?.slice(0, 50))
      if (similarity >= 0.5) {
        return { isDuplicate: true, existingReport: report, similarity }
      }
    }
  } catch {}
  
  return { isDuplicate: false }
}

// Map DB row to client Report
function mapDbToReport(row: any): Report {
  return {
    report_id: row.id,
    category: row.category,
    other_category: row.other_category ?? null,
    description: row.description,
    summary: row.summary ?? (row.category + ' issue: ' + (row.description || '').split(' ').slice(0, 12).join(' ') + (((row.description || '').split(' ').length > 12) ? '...' : '')),
    report_score: typeof row.report_score === 'number' ? row.report_score : (row.report_score != null ? Number(row.report_score) : undefined),
    priority: row.priority,
    status: row.status,
    submitted_at: row.submitted_at,
    location_text: row.location_text,
    lat: row.lat,
    lng: row.lng,
    reporter: { name: row.reporter_name || 'Citizen', phone: row.reporter_phone || null, anonymous: !!row.anonymous },
    media: [],
    assigned_department: row.assigned_department ?? null,
    assigned_officer_id: row.assigned_officer_id ?? null,
    assigned_officer_name: row.assigned_officer_name ?? null,
    assigned_officer_phone: row.assigned_officer_phone ?? null,
    assigned_officer_email: row.assigned_officer_email ?? null,
    deadline: row.deadline ?? null,
    overdue_at: row.overdue_at ?? null,
    timeline: [],
    resolution_documents: row.resolution_documents ?? undefined,
    resolution_note: row.resolution_note ?? null,
  }
}

export function mapDbToNotification(row: any): Notification {
  return {
    id: row.id,
    message: row.message,
    timestamp: row.timestamp,
    read: !!row.read,
    report_id: row.report_id,
    recipient_user_id: row.recipient_user_id ?? null,
    recipient_role: row.recipient_role ?? null,
    type: row.type ?? null,
  }
}

export async function supabaseListNotifications(params?: { recipientRole?: 'citizen' | 'officer' | 'admin'; recipientUserId?: string; limit?: number }): Promise<Notification[]> {
  const sb = getSupabase()
  if (!sb) return []
  let q: any = sb.from('notifications').select('*').order('timestamp', { ascending: false })
  if (params?.recipientRole) q = q.eq('recipient_role', params.recipientRole)
  if (params?.recipientUserId) q = q.eq('recipient_user_id', params.recipientUserId)
  if (params?.limit) q = q.limit(params.limit)
  const { data, error } = await q
  if (error) return []
  return (data || []).map(mapDbToNotification)
}

export function subscribeNotifications(onEvent: (e: { type: 'insert' | 'update' | 'delete'; row: any }) => void): () => void {
  const sb = getSupabase()
  if (!sb) return () => {}
  const chan = sb.channel('notifications_citizen')
  chan.on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, payload => {
    if (payload.eventType === 'INSERT') onEvent({ type: 'insert', row: payload.new })
    if (payload.eventType === 'UPDATE') onEvent({ type: 'update', row: payload.new })
    if (payload.eventType === 'DELETE') onEvent({ type: 'delete', row: payload.old })
  })
  chan.subscribe()
  return () => { sb.removeChannel(chan) }
}
```

---

## 5. Citizen Frontend - Geocoding

**File:** `citizen-client/src/lib/geocoding.ts`

```typescript
export async function geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null> {
  const cacheKey = `geo:${query.toLowerCase()}`
  try {
    const raw = localStorage.getItem(cacheKey)
    if (raw) return JSON.parse(raw)
  } catch {}

  const biasLat = 20.5937
  const biasLng = 78.9629

  const cleanQuery = query.trim()
  const enhancedQuery = `${cleanQuery}, India`

  // Try Photon API first with location bias
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(enhancedQuery)}&limit=5&lang=en&lat=${biasLat}&lon=${biasLng}&distance=10000`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (res.ok) {
      const data = await res.json()
      const features = data?.features || []
      
      for (const feat of features) {
        const coords = feat?.geometry?.coordinates
        const props = feat?.properties || {}
        
        if (Array.isArray(coords) && coords.length >= 2) {
          const lat = coords[1]
          const lng = coords[0]
          
          if (lat >= 6 && lat <= 37.1 && lng >= 68 && lng <= 97.5) {
            const value = { lat, lng }
            try { localStorage.setItem(cacheKey, JSON.stringify(value)) } catch {}
            return value
          }
        }
      }
      
      const feat = features[0]
      const coords = feat?.geometry?.coordinates
      if (Array.isArray(coords) && coords.length >= 2) {
        const value = { lat: coords[1], lng: coords[0] }
        try { localStorage.setItem(cacheKey, JSON.stringify(value)) } catch {}
        return value
      }
    }
  } catch {}

  // Try Nominatim with structured search
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=in&addressdetails=1&q=${encodeURIComponent(enhancedQuery)}`
    const res = await fetch(url, { 
      headers: { 
        Accept: 'application/json',
        'User-Agent': 'NagrikGPT-CitizenApp/1.0'
      } 
    })
    if (res.ok) {
      const arr = await res.json()
      
      for (const result of arr) {
        if (result?.lat && result?.lon) {
          const lat = parseFloat(result.lat)
          const lng = parseFloat(result.lon)
          
          if (lat >= 6 && lat <= 37.1 && lng >= 68 && lng <= 97.5) {
            const value = { lat, lng }
            try { localStorage.setItem(cacheKey, JSON.stringify(value)) } catch {}
            return value
          }
        }
      }
      
      const first = arr?.[0]
      if (first?.lat && first?.lon) {
        const value = { lat: parseFloat(first.lat), lng: parseFloat(first.lon) }
        try { localStorage.setItem(cacheKey, JSON.stringify(value)) } catch {}
        return value
      }
    }
  } catch {}

  return null
}

function isWithinIndiaBBox(lat: number, lng: number): boolean {
  return lat >= 6 && lat <= 37.1 && lng >= 68 && lng <= 97.5
}

async function verifyIndiaByReverseGeocode(lat: number, lng: number): Promise<boolean> {
  try {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 5000)
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=3`
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'NagrikGPT-CitizenApp/1.0' }
    })
    clearTimeout(tid)
    if (!res.ok) return false
    const data = await res.json()
    const country = (data?.address?.country || '').toString().toLowerCase()
    return country.includes('india')
  } catch {
    return false
  }
}

export async function isCoordinateInIndia(lat: number, lng: number): Promise<boolean> {
  if (!isWithinIndiaBBox(lat, lng)) return false
  return verifyIndiaByReverseGeocode(lat, lng)
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 5000)
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'NagrikGPT-CitizenApp/1.0' }
    })
    clearTimeout(tid)
    if (!res.ok) return null
    const data = await res.json()
    return data?.display_name || null
  } catch {
    return null
  }
}
```

---

## 6. Citizen Frontend - AI Validation

**File:** `citizen-client/src/lib/ai.ts`

```typescript
export type ImageValidationResult = { ok: true } | { ok: false; reason?: string }

function timeoutFetch(input: RequestInfo | URL, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 10000, ...rest } = init
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(input, { ...rest, signal: controller.signal }).finally(() => clearTimeout(id))
}

export async function validateImageMatchesDescription(file: File, description: string): Promise<ImageValidationResult> {
  const key = import.meta.env.VITE_HF_API_KEY as string | undefined
  if (!key) {
    return { ok: true }
  }

  try {
    const res = await timeoutFetch(
      'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          Accept: 'application/json',
          'Content-Type': 'application/octet-stream',
        },
        body: file,
        timeoutMs: 12000,
      },
    )

    if (!res.ok) {
      return { ok: true }
    }

    const data = (await res.json()) as Array<{ generated_text?: string }>
    const caption = data?.[0]?.generated_text?.toLowerCase() || ''
    if (!caption) return { ok: true }

    const desc = (description || '').toLowerCase()
    const tokens = Array.from(
      new Set(
        desc
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter((t) => t.length >= 4 && !STOPWORDS.has(t)),
      ),
    )

    const capTokens = new Set(
      caption
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length >= 4),
    )

    let overlap = 0
    for (const t of tokens) if (capTokens.has(t)) overlap++

    if (tokens.length >= 4 && overlap === 0) {
      return { ok: false, reason: 'The image may not match the description provided.' }
    }

    return { ok: true }
  } catch {
    return { ok: true }
  }
}

const STOPWORDS = new Set([
  'the', 'and', 'with', 'from', 'near', 'very', 'this', 'that', 'there',
  'issue', 'problem', 'please', 'help', 'have', 'been', 'area', 'city',
  'road', 'street', 'local', 'nearby',
])
```

---

## 7. Admin Frontend - Authentication

**File:** `src/contexts/AuthContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/lib/types';
import { isValidGovEmail } from '@/lib/data';
import { getSupabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
    remember: boolean,
    rolePref?: 'admin' | 'officer'
  ) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const mapProfileToUser = (authUser: any, profile: any): User => {
    const email = String(authUser?.email || '');
    const roleRaw = String(profile?.role || '').toLowerCase();
    const deptFromProfile = String(profile?.department || '');

    const role: User['role'] = roleRaw === 'admin'
      ? (deptFromProfile && deptFromProfile !== 'All Departments' ? 'Department Admin' : 'Super Admin')
      : roleRaw === 'officer'
        ? 'Field Officer'
        : roleRaw === 'staff'
          ? 'Staff'
          : 'Viewer';

    const dept = (roleRaw === 'admin')
      ? (deptFromProfile || 'All Departments')
      : (profile?.department || 'General');

    return {
      id: String(authUser?.id || ''),
      name: String(profile?.full_name || email.split('@')[0] || 'User'),
      email,
      role,
      department: String(dept),
      status: 'Active',
      reports_to_officer_id: profile?.reports_to_officer_id || null,
      reports_to_officer_name: profile?.reports_to_officer_name || null,
    } as User;
  };

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    let initialSessionHandled = false;

    const fetchProfile = async (authUser: any) => {
      try {
        if (!authUser?.id) {
          if (!cancelled) setUser(null);
          return;
        }

        const { data: prof, error: profErr } = await sb
          .from('profiles')
          .select('id, full_name, role, department, reports_to_officer_id, reports_to_officer_name')
          .eq('id', authUser.id)
          .maybeSingle();

        if (profErr || !prof) {
          try { await sb.auth.signOut(); } catch {}
          if (!cancelled) setUser(null);
          return;
        }

        if (!cancelled) setUser(mapProfileToUser(authUser, prof));
      } catch {
        try { await sb.auth.signOut(); } catch {}
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    setIsLoading(true);
    sb.auth.getSession()
      .then(({ data }) => {
        initialSessionHandled = true;
        const au = data?.session?.user;
        if (!au) {
          if (!cancelled) setUser(null);
          return;
        }
        return fetchProfile(au);
      })
      .catch(() => {
        initialSessionHandled = true;
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    const { data: sub } = sb.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;

      if (event === 'TOKEN_REFRESHED') return;
      if (event === 'INITIAL_SESSION') return;

      if (event === 'SIGNED_IN' && !initialSessionHandled) {
        return;
      }

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsLoading(false);
        return;
      }

      if (event !== 'SIGNED_IN') {
        return;
      }

      const au = session?.user;
      if (!au) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      if (user) return;

      setIsLoading(true);
      await fetchProfile(au);
    });

    return () => {
      cancelled = true;
      sub?.subscription.unsubscribe();
    };
  }, []);

  const login = async (
    email: string,
    password: string,
    remember: boolean,
    rolePref?: 'admin' | 'officer'
  ): Promise<{ success: boolean; message: string }> => {
    const sb = getSupabase();
    if (!sb) {
      return { success: false, message: 'Authentication unavailable.' };
    }

    if (!isValidGovEmail(email)) {
      return { 
        success: false, 
        message: 'Only government email addresses are allowed.' 
      };
    }

    setIsLoading(true);
    try {
      const { data, error } = await sb.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        return { 
          success: false, 
          message: error?.message || 'Invalid credentials.' 
        };
      }

      const { data: profile, error: profileError } = await sb
        .from('profiles')
        .select('role, full_name, department, reports_to_officer_id, reports_to_officer_name')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        await sb.auth.signOut();
        return { success: false, message: 'Profile not found.' };
      }

      const userRole = String(profile.role || '').toLowerCase();

      if (rolePref === 'admin' && userRole !== 'admin') {
        await sb.auth.signOut();
        return { success: false, message: 'You do not have admin access.' };
      }

      if (rolePref === 'officer' && userRole !== 'officer' && userRole !== 'admin') {
        await sb.auth.signOut();
        return { success: false, message: 'You do not have officer access.' };
      }

      const mappedUser = mapProfileToUser(data.user, profile);
      setUser(mappedUser);

      return { success: true, message: `Welcome, ${mappedUser.name}!` };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Login failed.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const sb = getSupabase();
    if (sb) {
      await sb.auth.signOut();
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, isAdmin: user?.role?.includes('Admin') || false }}>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : myTasks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tasks assigned</h3>
            <p className="text-muted-foreground">
              You don't have any tasks assigned to you yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {myTasks.map(task => (
            <Card key={task.id} className={task.status === 'completed' ? 'opacity-75' : ''}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Badge variant={task.status === 'completed' ? 'success' : 'default'}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                    <h3 className="text-lg font-semibold mt-2">{task.report?.category}</h3>
                  </div>
                  {task.status === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-blue-500" />
                  )}
                </div>
  return context  );
}

---

## 10. Admin Frontend - Report Detail Modal

**File:** `src/components/reports/ReportDetailModal.tsx`

```typescript
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Report, Notification } from '@/lib/types';
import { loadEmailAlertSettings } from '@/lib/userSettings';
import { getSupabase } from '@/lib/supabase';

interface NewReportData {
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  description: string;
  location_text: string;
  lat: number;
  lng: number;
  reporter: {
    name: string;
    phone: string | null;
    anonymous: boolean;
  };
}

function notifToDbRow(n: any): Record<string, any> {
  return {
    id: n.id,
    message: n.message,
    timestamp: n.timestamp,
    read: n.read,
    report_id: n.report_id,
    type: n?.meta?.type ?? null,
    actor: n?.meta?.actor ?? null,
    recipient_user_id: n?.recipient_user_id ?? null,
    recipient_role: n?.recipient_role ?? null,
  };
}

function mapDbToNotif(row: any): any {
  return {
    id: row.id,
    message: row.message,
    timestamp: row.timestamp,
    read: !!row.read,
    report_id: row.report_id,
    recipient_user_id: row.recipient_user_id ?? null,
    recipient_role: row.recipient_role ?? null,
    ...(row.type || row.actor ? { meta: { type: row.type ?? undefined, actor: row.actor ?? undefined } } : {}),
  };
}

function reportToDbRow(r: Report): Record<string, any> {
  return {
    id: r.report_id,
    category: r.category,
    other_category: r.other_category ?? null,
    description: r.description,
    summary: r.summary,
    report_score: typeof r.report_score === 'number' ? r.report_score : null,
    priority: r.priority,
    status: r.status,
    submitted_at: r.submitted_at,
    deadline: r.deadline ?? null,
    location_text: r.location_text,
    lat: r.lat,
    lng: r.lng,
    reporter_name: r.reporter.name,
    reporter_phone: r.reporter.phone,
    anonymous: r.reporter.anonymous,
    assigned_department: r.assigned_department,
    assigned_officer_id: r.assigned_officer_id,
    assigned_officer_name: r.assigned_officer_name,
    resolution_documents: r.resolution_documents ?? null,
    resolution_note: r.resolution_note ?? null,
  } as Record<string, any>;
}

interface ReportsContextType {
  reports: Report[];
  notifications: Notification[];
  isLoading: boolean;
  updateReportStatus: (reportId: string, status: Report['status'], actor: string, reason?: string) => void;
  addProgressNote: (reportId: string, note: string, actor: string) => void;
  addReport: (data: NewReportData) => void;
  markNotificationRead: (notificationId: string) => void;
  unreadCount: number;
  updateAssignment: (reportId: string, params: { department?: string; officerId?: string | null; officerName?: string | null; actor?: string }) => void;
  deleteReport: (reportId: string) => void;
  requestAssignment: (reportId: string, actor: string) => void;
}

const ReportsContext = createContext<ReportsContextType | undefined>(undefined);

const REPORTS_STORAGE_KEY = 'gov_reports_v1';
const NOTIFS_STORAGE_KEY = 'gov_notifications_v1';

function generateReportId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `RG-${id}`;
}

function normalizeLocationText(s?: string | null): string {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim();
}

function mergeLocationIntoSummary(params: { summary: string; description: string; locationText: string }): string {
  const summary = String(params.summary || '').trim();
  const description = String(params.description || '');
  const locationText = normalizeLocationText(params.locationText);

  if (!summary) return locationText ? `Location: ${locationText}.` : '';
  if (!locationText) return summary;

  const lower = (s: string) => s.toLowerCase();
  const hasLocInDesc = lower(description).includes(lower(locationText));
  const hasLocInSummary = lower(summary).includes(lower(locationText));
  if (hasLocInDesc || hasLocInSummary) return summary;

  const parts = locationText.split(',').map(p => p.trim()).filter(Boolean);
  if (!parts.length) return summary;

  const sumLower = lower(summary);
  const uniqParts = parts.filter(p => !sumLower.includes(lower(p)));
  if (!uniqParts.length) return summary;

  return `${summary}${summary.endsWith('.') ? '' : '.'} Location: ${uniqParts.join(', ')}.`;
}

async function generateAiSummary(params: { description: string; category: string; locationText: string }): Promise<string> {
  const description = String(params.description || '');
  const category = String(params.category || 'Issue');
  const locationText = normalizeLocationText(params.locationText);

  const sb = getSupabase();
  if (!sb) {
    const base = `${category} issue: ${description.split(' ').slice(0, 15).join(' ')}${description.split(' ').length > 15 ? '...' : ''}`;
    return mergeLocationIntoSummary({ summary: base, description, locationText });
  }

  try {
    const res = await sb.functions.invoke('summarize', { body: { text: description } });
    const raw = (res as any)?.data?.summary;
    const upstreamSummary = typeof raw === 'string' ? raw.trim() : '';
    const base = upstreamSummary || `${category} issue: ${description.split(' ').slice(0, 15).join(' ')}${description.split(' ').length > 15 ? '...' : ''}`;
    return mergeLocationIntoSummary({ summary: base, description, locationText });
  } catch {
    const base = `${category} issue: ${description.split(' ').slice(0, 15).join(' ')}${description.split(' ').length > 15 ? '...' : ''}`;
    return mergeLocationIntoSummary({ summary: base, description, locationText });
  }
}

function getDeadline(priority: string): string | undefined {
  const days = priority === 'Urgent' ? 3 : priority === 'High' ? 7 : priority === 'Medium' ? 10 : 15;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// Update Assignment Function with Debug Logging
const updateAssignment = (reportId: string, params: { department?: string; officerId?: string | null; officerName?: string | null; actor?: string }) => {
  const at = new Date().toISOString();
  const { department, officerId, officerName, actor } = params;
  
  console.log('updateAssignment called:', { reportId, department, officerId, officerName, actor });
  
  setReports(prev => prev.map(r => {
    if (r.report_id !== reportId) return r;
    const next = { ...r } as Report;
    if (typeof department !== 'undefined') next.assigned_department = department;
    if (typeof officerId !== 'undefined') next.assigned_officer_id = officerId;
    if (typeof officerName !== 'undefined') next.assigned_officer_name = officerName || 'Unassigned';
    const actions: string[] = [];
    if (typeof department !== 'undefined') actions.push(`Assigned to ${department} department`);
    if (typeof officerName !== 'undefined') actions.push(`Officer set to ${officerName || 'Unassigned'}`);
    if (actions.length) {
      next.timeline = [...next.timeline, { actor: actor || 'System', action: actions.join(' • '), at }];
    }
    return next;
  }));
  
  const sb = getSupabase();
  if (sb) {
    const update: Record<string, any> = {};
    if (typeof department !== 'undefined') update.assigned_department = department;
    if (typeof officerId !== 'undefined') update.assigned_officer_id = officerId;
    if (typeof officerName !== 'undefined') update.assigned_officer_name = officerName;
    
    (async () => {
      if (Object.keys(update).length) {
        console.log('Updating Supabase report:', { reportId, update });
        const { data, error } = await sb.from('reports').update(update).eq('id', reportId).select('id');
        if (error) { console.error('Supabase update reports failed', error); }
        if (!data || data.length === 0) {
          console.log('No rows updated, attempting upsert...');
          const current = reports.find(r => r.report_id === reportId) || null;
          if (current) {
            await sb.from('reports').upsert(reportToDbRow(current));
          }
        }
      }
      
      const actions: string[] = [];
      if (typeof department !== 'undefined') actions.push(`Assigned to ${department} department`);
      if (typeof officerName !== 'undefined') actions.push(`Officer set to ${officerName || 'Unassigned'}`);
      if (actions.length) {
        await sb.from('report_timeline').insert({ report_id: reportId, actor: actor || 'System', action: actions.join(' • '), at });
      }
    })();
  }
};

---

## 9. Admin Frontend - Dashboard

**File:** `src/components/pages/DashboardPage.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useReports } from '@/contexts/ReportsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/data';
import { t, useLang } from '@/lib/i18n';
import { getSupabase } from '@/lib/supabase';
import { 
  FileText, 
  Clock, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  MapPin,
  ExternalLink,
  Calendar,
  FileCheck,
  User,
  Building2
} from 'lucide-react';

interface DashboardPageProps {
  filter: string;
  onFilterChange: (filter: string) => void;
  onOpenReport: (reportId: string) => void;
  onViewAllAssigned: () => void;
  onNavigateToReportsFiltered: (filter: 'all' | 'Pending' | 'In Progress' | 'Resolved' | 'Urgent') => void;
}

const statCards = [
  { id: 'total', label: 'dashboard.total_reports', icon: FileText, color: 'text-primary' },
  { id: 'pending', label: 'dashboard.pending', icon: Clock, color: 'text-warning' },
  { id: 'inProgress', label: 'dashboard.in_progress', icon: RefreshCw, color: 'text-info' },
  { id: 'resolved', label: 'dashboard.resolved', icon: CheckCircle2, color: 'text-success' },
  { id: 'urgent', label: 'dashboard.urgent', icon: AlertTriangle, color: 'text-destructive', highlight: true },
];

const filterChips = ['all', 'Pending', 'In Progress', 'Resolved', 'Urgent'];

const getDeadlineDays = (priority: string): number => {
  switch (priority) {
    case 'Low': return 15;
    case 'Medium': return 10;
    case 'High': return 7;
    case 'Urgent': return 3;
    default: return 10;
  }
};

export function DashboardPage({ filter, onFilterChange, onOpenReport, onViewAllAssigned, onNavigateToReportsFiltered }: DashboardPageProps) {
  const { user, isAdmin } = useAuth();
  const { reports, notifications, requestAssignment } = useReports();
  const _lang = useLang();
  
  const [dbStats, setDbStats] = useState<{ total: number; pending: number; inProgress: number; resolved: number; urgent: number } | null>(null);
  const [recentlyResolved, setRecentlyResolved] = useState<any[]>([]);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !isAdmin) return;
    
    async function fetchRecentlyResolved() {
      try {
        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        
        const { data, error } = await sb
          .from('reports')
          .select('id, report_id, category, priority, submitted_at, resolved_at, resolved_by, resolution_note, resolution_documents, assigned_department')
          .eq('status', 'Resolved')
          .gte('resolved_at', cutoff)
          .order('resolved_at', { ascending: false })
          .limit(10);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const resolvedByIds = data.map(r => r.resolved_by).filter(Boolean);
          if (resolvedByIds.length > 0) {
            const { data: profiles } = await sb
              .from('profiles')
              .select('id, full_name, role')
              .in('id', resolvedByIds);
            
            const profileMap = new Map((profiles || []).map(p => [p.id, p]));
            
            const resolvedWithStaff = data.map(r => ({
              ...r,
              resolved_by_name: profileMap.get(r.resolved_by)?.full_name || 'Unknown',
              resolved_by_role: profileMap.get(r.resolved_by)?.role || 'Unknown',
            }));
            
            setRecentlyResolved(resolvedWithStaff);
          } else {
            setRecentlyResolved(data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch recently resolved:', err);
      }
    }
    
    fetchRecentlyResolved();
    const interval = setInterval(fetchRecentlyResolved, 60000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    
    async function fetchStats() {
      try {
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        
        const [
          totalRes,
          pendingRes,
          inProgressRes,
          resolvedRecentRes,
          resolvedOldRes,
          urgentRes
        ] = await Promise.all([
          sb.from('reports').select('*', { count: 'exact', head: true }),
          sb.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
          sb.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'In Progress'),
          sb.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'Resolved').gte('submitted_at', cutoff),
          sb.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'Resolved').lt('submitted_at', cutoff),
          sb.from('reports').select('*', { count: 'exact', head: true }).eq('priority', 'Urgent'),
        ]);
        
        const totalAll = totalRes.count || 0;
        const oldResolved = resolvedOldRes.count || 0;
        
        setDbStats({
          total: Math.max(0, totalAll - oldResolved),
          pending: pendingRes.count || 0,
          inProgress: inProgressRes.count || 0,
          resolved: resolvedRecentRes.count || 0,
          urgent: urgentRes.count || 0,
        });
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    }
    
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const stats = dbStats || {
    total: reports.length,
    pending: reports.filter(r => r.status === 'Pending').length,
    inProgress: reports.filter(r => r.status === 'In Progress').length,
    resolved: reports.filter(r => r.status === 'Resolved').length,
    urgent: reports.filter(r => r.priority === 'Urgent').length,
  };

  const recentReports = reports
    .filter(r => {
      if (filter === 'all') return true;
      if (filter === 'Urgent') return r.priority === 'Urgent';
      return r.status === filter;
    })
    .slice(0, 5);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-destructive text-destructive-foreground';
      case 'High': return 'bg-priority-high text-foreground';
      case 'Medium': return 'bg-warning text-warning-foreground';
      case 'Low': return 'bg-success text-success-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          const value = stats[card.id as keyof typeof stats] || 0;
          return (
            <Card key={card.id} className={card.highlight ? 'border-destructive' : ''}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t(card.label)}</CardTitle>
                <Icon className={cn("h-4 w-4", card.color)} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
