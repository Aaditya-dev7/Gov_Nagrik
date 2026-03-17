-- ========================================
-- COMPLETE SEED DATA FOR CITIZEN REPORT HUB
-- Run this in Supabase SQL Editor
-- ========================================

-- ========================================
-- 1. ENSURE TABLES EXIST
-- ========================================

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to profiles if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE profiles ADD COLUMN full_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE profiles ADD COLUMN email TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
        ALTER TABLE profiles ADD COLUMN phone TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'citizen';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'department') THEN
        ALTER TABLE profiles ADD COLUMN department TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_nss_volunteer') THEN
        ALTER TABLE profiles ADD COLUMN is_nss_volunteer BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'nss_registration_status') THEN
        ALTER TABLE profiles ADD COLUMN nss_registration_status TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'total_points') THEN
        ALTER TABLE profiles ADD COLUMN total_points INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'reports_to_officer_id') THEN
        ALTER TABLE profiles ADD COLUMN reports_to_officer_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'reports_to_officer_name') THEN
        ALTER TABLE profiles ADD COLUMN reports_to_officer_name TEXT;
    END IF;
END $$;

-- Staff tasks table
CREATE TABLE IF NOT EXISTS staff_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id TEXT NOT NULL,
    staff_user_id UUID NOT NULL,
    assigned_by_officer_id UUID,
    status TEXT DEFAULT 'assigned',
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    documents JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(report_id, staff_user_id)
);

-- Badges table
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'award',
    points INTEGER DEFAULT 0,
    category TEXT DEFAULT 'special',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User badges table
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    badge_id UUID NOT NULL,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- NSS registrations table
CREATE TABLE IF NOT EXISTS nss_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    college TEXT,
    nss_unit TEXT,
    department_preference TEXT,
    status TEXT DEFAULT 'pending',
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID,
    rejection_reason TEXT
);

-- ========================================
-- 2. ENABLE RLS
-- ========================================
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE nss_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_tasks ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 3. CREATE POLICIES (drop existing first)
-- ========================================

-- Departments policies
DROP POLICY IF EXISTS "Departments viewable by all" ON departments;
CREATE POLICY "Departments viewable by all" ON departments FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Admins manage departments" ON departments;
CREATE POLICY "Admins manage departments" ON departments FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
CREATE POLICY "Admins can manage all profiles" ON profiles FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Officers can view profiles" ON profiles;
CREATE POLICY "Officers can view profiles" ON profiles FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'Field Officer'))
);
DROP POLICY IF EXISTS "Public profiles viewable" ON profiles;
CREATE POLICY "Public profiles viewable" ON profiles FOR SELECT TO public USING (true);

-- Badges policies
DROP POLICY IF EXISTS "Public can view badges" ON badges;
CREATE POLICY "Public can view badges" ON badges FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Admins manage badges" ON badges;
CREATE POLICY "Admins manage badges" ON badges FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- User badges policies
DROP POLICY IF EXISTS "Users can view own badges" ON user_badges;
CREATE POLICY "Users can view own badges" ON user_badges FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own badges" ON user_badges;
CREATE POLICY "Users can insert own badges" ON user_badges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage badges" ON user_badges;
CREATE POLICY "Admins can manage badges" ON user_badges FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- NSS registrations policies
DROP POLICY IF EXISTS "Users can view own NSS" ON nss_registrations;
CREATE POLICY "Users can view own NSS" ON nss_registrations FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own NSS" ON nss_registrations;
CREATE POLICY "Users can insert own NSS" ON nss_registrations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Officers can manage NSS" ON nss_registrations;
CREATE POLICY "Officers can manage NSS" ON nss_registrations FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'Field Officer'))
);

-- Staff tasks policies
DROP POLICY IF EXISTS "Staff can view own tasks" ON staff_tasks;
CREATE POLICY "Staff can view own tasks" ON staff_tasks FOR SELECT TO authenticated USING (auth.uid() = staff_user_id);
DROP POLICY IF EXISTS "Officers can manage team tasks" ON staff_tasks;
CREATE POLICY "Officers can manage team tasks" ON staff_tasks FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'Field Officer'))
);
DROP POLICY IF EXISTS "Staff can update own tasks" ON staff_tasks;
CREATE POLICY "Staff can update own tasks" ON staff_tasks FOR UPDATE TO authenticated USING (auth.uid() = staff_user_id);
DROP POLICY IF EXISTS "Officers can insert tasks" ON staff_tasks;
CREATE POLICY "Officers can insert tasks" ON staff_tasks FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'Field Officer'))
);

-- ========================================
-- 4. INSERT TEST DEPARTMENTS
-- ========================================
INSERT INTO departments (id, name, description) VALUES
    ('dept-roads', 'Roads', 'Road maintenance and infrastructure'),
    ('dept-sanitation', 'Sanitation', 'Waste management and cleanliness'),
    ('dept-water', 'Water Supply', 'Water supply and distribution'),
    ('dept-lighting', 'Street Lighting', 'Street lights and public lighting'),
    ('dept-drainage', 'Drainage', 'Storm water and sewage management'),
    ('dept-parks', 'Parks', 'Public parks and gardens')
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 5. INSERT DEFAULT BADGES
-- ========================================
INSERT INTO badges (name, description, icon, points, category) VALUES
    ('First Reporter', 'Submitted your first report', 'file-plus', 10, 'reporting'),
    ('Active Citizen', 'Submitted 10 reports', 'trophy', 50, 'reporting'),
    ('Community Hero', 'Submitted 50 reports', 'star', 200, 'reporting'),
    ('Problem Solver', 'Had your first report resolved', 'check-circle', 20, 'resolution'),
    ('Change Maker', 'Had 10 reports resolved', 'award', 100, 'resolution'),
    ('NSS Volunteer', 'Registered as NSS volunteer', 'users', 30, 'special')
ON CONFLICT DO NOTHING;

-- ========================================
-- 4. SETUP SUPER ADMINS (Your existing users)
-- ========================================

-- Update existing users as Super Admins
UPDATE profiles SET 
    role = 'admin',
    full_name = COALESCE(full_name, CASE 
        WHEN email LIKE 'aditya%' THEN 'Aditya Kadam'
        WHEN email LIKE 'manas%' THEN 'Manas Patil'
        WHEN email LIKE 'nishant%' THEN 'Nishant Jadhav'
        ELSE SPLIT_PART(email, '@', 1)
    END),
    department = 'All Departments'
WHERE email IN (
    'aditya.kadam_siot23@comp.sce.edu.in',
    'manas.patil_siot23@comp.sce.edu.in',
    'nishant.jadhav_siot23@comp.sce.edu.in'
);

-- ========================================
-- 5. SETUP DEPARTMENT ADMINS
-- ========================================

UPDATE profiles SET role = 'admin', department = 'Roads', full_name = COALESCE(full_name, 'Rajesh Kumar') WHERE email = 'rajesh.kumar@nagrik.gov.in';
UPDATE profiles SET role = 'admin', department = 'Sanitation', full_name = COALESCE(full_name, 'Priya Sharma') WHERE email = 'priya.sharma@nagrik.gov.in';
UPDATE profiles SET role = 'admin', department = 'Water Supply', full_name = COALESCE(full_name, 'Amit Patel') WHERE email = 'amit.patel@nagrik.gov.in';
UPDATE profiles SET role = 'admin', department = 'Electricity', full_name = COALESCE(full_name, 'Suresh Verma') WHERE email = 'suresh.verma@nagrik.gov.in';
UPDATE profiles SET role = 'admin', department = 'Drainage', full_name = COALESCE(full_name, 'Kavita Singh') WHERE email = 'kavita.singh@nagrik.gov.in';
UPDATE profiles SET role = 'admin', department = 'Parks & Gardens', full_name = COALESCE(full_name, 'Ramesh Gupta') WHERE email = 'ramesh.gupta@nagrik.gov.in';
UPDATE profiles SET role = 'admin', department = 'Public Buildings', full_name = COALESCE(full_name, 'Sunita Deshmukh') WHERE email = 'sunita.deshmukh@nagrik.gov.in';
UPDATE profiles SET role = 'admin', department = 'Transport', full_name = COALESCE(full_name, 'Vikram Joshi') WHERE email = 'vikram.joshi@nagrik.gov.in';

-- ========================================
-- 6. SETUP FIELD OFFICERS
-- ========================================

-- Roads Department Officers
UPDATE profiles SET role = 'officer', department = 'Roads', full_name = COALESCE(full_name, 'Deepak Sharma') WHERE email = 'deepak.sharma@nagrik.gov.in';
UPDATE profiles SET role = 'officer', department = 'Roads', full_name = COALESCE(full_name, 'Neha Gupta') WHERE email = 'neha.gupta@nagrik.gov.in';

-- Sanitation Department Officers
UPDATE profiles SET role = 'officer', department = 'Sanitation', full_name = COALESCE(full_name, 'Sanjay Mehta') WHERE email = 'sanjay.mehta@nagrik.gov.in';
UPDATE profiles SET role = 'officer', department = 'Sanitation', full_name = COALESCE(full_name, 'Anita Reddy') WHERE email = 'anita.reddy@nagrik.gov.in';

-- Water Supply Department Officers
UPDATE profiles SET role = 'officer', department = 'Water Supply', full_name = COALESCE(full_name, 'Rahul Singh') WHERE email = 'rahul.singh@nagrik.gov.in';
UPDATE profiles SET role = 'officer', department = 'Water Supply', full_name = COALESCE(full_name, 'Pooja Verma') WHERE email = 'pooja.verma@nagrik.gov.in';

-- Electricity Department Officers
UPDATE profiles SET role = 'officer', department = 'Electricity', full_name = COALESCE(full_name, 'Anil Kumar') WHERE email = 'anil.kumar@nagrik.gov.in';
UPDATE profiles SET role = 'officer', department = 'Electricity', full_name = COALESCE(full_name, 'Meera Iyer') WHERE email = 'meera.iyer@nagrik.gov.in';

-- Drainage Department Officers
UPDATE profiles SET role = 'officer', department = 'Drainage', full_name = COALESCE(full_name, 'Vijay Patil') WHERE email = 'vijay.patil@nagrik.gov.in';
UPDATE profiles SET role = 'officer', department = 'Drainage', full_name = COALESCE(full_name, 'Shweta Rao') WHERE email = 'shweta.rao@nagrik.gov.in';

-- Parks & Gardens Department Officers
UPDATE profiles SET role = 'officer', department = 'Parks & Gardens', full_name = COALESCE(full_name, 'Ganesh Kulkarni') WHERE email = 'ganesh.kulkarni@nagrik.gov.in';
UPDATE profiles SET role = 'officer', department = 'Parks & Gardens', full_name = COALESCE(full_name, 'Divya Nair') WHERE email = 'divya.nair@nagrik.gov.in';

-- Public Buildings Department Officers
UPDATE profiles SET role = 'officer', department = 'Public Buildings', full_name = COALESCE(full_name, 'Prakash Jadhav') WHERE email = 'prakash.jadhav@nagrik.gov.in';
UPDATE profiles SET role = 'officer', department = 'Public Buildings', full_name = COALESCE(full_name, 'Kiran Chavan') WHERE email = 'kiran.chavan@nagrik.gov.in';

-- Transport Department Officers
UPDATE profiles SET role = 'officer', department = 'Transport', full_name = COALESCE(full_name, 'Sunil More') WHERE email = 'sunil.more@nagrik.gov.in';
UPDATE profiles SET role = 'officer', department = 'Transport', full_name = COALESCE(full_name, 'Bhavna Shah') WHERE email = 'bhavna.shah@nagrik.gov.in';

-- ========================================
-- 7. SETUP STAFF (5 per department)
-- ========================================

-- ROADS DEPARTMENT STAFF (5 staff)
UPDATE profiles SET role = 'staff', department = 'Roads', full_name = COALESCE(full_name, 'Rohit Yadav'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'deepak.sharma@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Deepak Sharma' WHERE email = 'rohit.yadav@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Roads', full_name = COALESCE(full_name, 'Sachin Pawar'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'deepak.sharma@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Deepak Sharma' WHERE email = 'sachin.pawar@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Roads', full_name = COALESCE(full_name, 'Mangesh Gaikwad'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'deepak.sharma@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Deepak Sharma' WHERE email = 'mangesh.gaikwad@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Roads', full_name = COALESCE(full_name, 'Pratik Kadam'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'neha.gupta@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Neha Gupta' WHERE email = 'pratik.kadam@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Roads', full_name = COALESCE(full_name, 'Akshay Shinde'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'neha.gupta@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Neha Gupta' WHERE email = 'akshay.shinde@nagrik.gov.in';

-- SANITATION DEPARTMENT STAFF (5 staff)
UPDATE profiles SET role = 'staff', department = 'Sanitation', full_name = COALESCE(full_name, 'Babu Rao'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'sanjay.mehta@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Sanjay Mehta' WHERE email = 'babu.rao@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Sanitation', full_name = COALESCE(full_name, 'Kishor Mane'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'sanjay.mehta@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Sanjay Mehta' WHERE email = 'kishor.mane@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Sanitation', full_name = COALESCE(full_name, 'Laxmi Devi'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'sanjay.mehta@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Sanjay Mehta' WHERE email = 'laxmi.devi@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Sanitation', full_name = COALESCE(full_name, 'Raju Singh'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'anita.reddy@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Anita Reddy' WHERE email = 'raju.singh@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Sanitation', full_name = COALESCE(full_name, 'Sunita Kumari'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'anita.reddy@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Anita Reddy' WHERE email = 'sunita.kumari@nagrik.gov.in';

-- WATER SUPPLY DEPARTMENT STAFF (5 staff)
UPDATE profiles SET role = 'staff', department = 'Water Supply', full_name = COALESCE(full_name, 'Ramesh Thakur'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'rahul.singh@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Rahul Singh' WHERE email = 'ramesh.thakur@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Water Supply', full_name = COALESCE(full_name, 'Dinesh Kumar'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'rahul.singh@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Rahul Singh' WHERE email = 'dinesh.kumar@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Water Supply', full_name = COALESCE(full_name, 'Gopal Swami'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'rahul.singh@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Rahul Singh' WHERE email = 'gopal.swami@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Water Supply', full_name = COALESCE(full_name, 'Nitin Kale'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'pooja.verma@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Pooja Verma' WHERE email = 'nitin.kale@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Water Supply', full_name = COALESCE(full_name, 'Asha Rani'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'pooja.verma@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Pooja Verma' WHERE email = 'asha.rani@nagrik.gov.in';

-- ELECTRICITY DEPARTMENT STAFF (5 staff)
UPDATE profiles SET role = 'staff', department = 'Electricity', full_name = COALESCE(full_name, 'Suresh Kamble'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'anil.kumar@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Anil Kumar' WHERE email = 'suresh.kamble@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Electricity', full_name = COALESCE(full_name, 'Prakash Nemade'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'anil.kumar@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Anil Kumar' WHERE email = 'prakash.nemade@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Electricity', full_name = COALESCE(full_name, 'Vinod Lokhande'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'anil.kumar@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Anil Kumar' WHERE email = 'vinod.lokhande@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Electricity', full_name = COALESCE(full_name, 'Usha Patil'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'meera.iyer@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Meera Iyer' WHERE email = 'usha.patil@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Electricity', full_name = COALESCE(full_name, 'Deepak Jadhav'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'meera.iyer@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Meera Iyer' WHERE email = 'deepak.jadhav@nagrik.gov.in';

-- DRAINAGE DEPARTMENT STAFF (5 staff)
UPDATE profiles SET role = 'staff', department = 'Drainage', full_name = COALESCE(full_name, 'Rajendra Patil'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'vijay.patil@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Vijay Patil' WHERE email = 'rajendra.patil@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Drainage', full_name = COALESCE(full_name, 'Anand Sawant'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'vijay.patil@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Vijay Patil' WHERE email = 'anand.sawant@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Drainage', full_name = COALESCE(full_name, 'Mohan Sharma'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'vijay.patil@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Vijay Patil' WHERE email = 'mohan.sharma@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Drainage', full_name = COALESCE(full_name, 'Kavita Desai'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'shweta.rao@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Shweta Rao' WHERE email = 'kavita.desai@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Drainage', full_name = COALESCE(full_name, 'Sunil Naik'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'shweta.rao@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Shweta Rao' WHERE email = 'sunil.naik@nagrik.gov.in';

-- PARKS & GARDENS DEPARTMENT STAFF (5 staff)
UPDATE profiles SET role = 'staff', department = 'Parks & Gardens', full_name = COALESCE(full_name, 'Ganpat More'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'ganesh.kulkarni@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Ganesh Kulkarni' WHERE email = 'ganpat.more@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Parks & Gardens', full_name = COALESCE(full_name, 'Lata Joshi'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'ganesh.kulkarni@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Ganesh Kulkarni' WHERE email = 'lata.joshi@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Parks & Gardens', full_name = COALESCE(full_name, 'Raju Patre'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'ganesh.kulkarni@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Ganesh Kulkarni' WHERE email = 'raju.patre@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Parks & Gardens', full_name = COALESCE(full_name, 'Sneha Kulkarni'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'divya.nair@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Divya Nair' WHERE email = 'sneha.kulkarni@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Parks & Gardens', full_name = COALESCE(full_name, 'Arun Bhoir'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'divya.nair@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Divya Nair' WHERE email = 'arun.bhoir@nagrik.gov.in';

-- PUBLIC BUILDINGS DEPARTMENT STAFF (5 staff)
UPDATE profiles SET role = 'staff', department = 'Public Buildings', full_name = COALESCE(full_name, 'Nandkumar Gaikwad'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'prakash.jadhav@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Prakash Jadhav' WHERE email = 'nandkumar.gaikwad@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Public Buildings', full_name = COALESCE(full_name, 'Shila Devi'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'prakash.jadhav@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Prakash Jadhav' WHERE email = 'shila.devi@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Public Buildings', full_name = COALESCE(full_name, 'Bhagwan Salve'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'prakash.jadhav@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Prakash Jadhav' WHERE email = 'bhagwan.salve@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Public Buildings', full_name = COALESCE(full_name, 'Meena Chavan'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'kiran.chavan@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Kiran Chavan' WHERE email = 'meena.chavan@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Public Buildings', full_name = COALESCE(full_name, 'Datta Pawar'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'kiran.chavan@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Kiran Chavan' WHERE email = 'datta.pawar@nagrik.gov.in';

-- TRANSPORT DEPARTMENT STAFF (5 staff)
UPDATE profiles SET role = 'staff', department = 'Transport', full_name = COALESCE(full_name, 'Yogesh Thakur'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'sunil.more@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Sunil More' WHERE email = 'yogesh.thakur@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Transport', full_name = COALESCE(full_name, 'Pankaj Verma'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'sunil.more@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Sunil More' WHERE email = 'pankaj.verma@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Transport', full_name = COALESCE(full_name, 'Rashmi Singh'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'sunil.more@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Sunil More' WHERE email = 'rashmi.singh@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Transport', full_name = COALESCE(full_name, 'Hemant Shah'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'bhavna.shah@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Bhavna Shah' WHERE email = 'hemant.shah@nagrik.gov.in';
UPDATE profiles SET role = 'staff', department = 'Transport', full_name = COALESCE(full_name, 'Nisha Kapoor'), reports_to_officer_id = (SELECT id FROM profiles WHERE email = 'bhavna.shah@nagrik.gov.in' LIMIT 1), reports_to_officer_name = 'Bhavna Shah' WHERE email = 'nisha.kapoor@nagrik.gov.in';

-- ========================================
-- 8. VERIFY SETUP
-- ========================================
SELECT 'Super Admins' as role_type, count(*) as count FROM profiles WHERE role = 'admin' AND department = 'All Departments'
UNION ALL SELECT 'Department Admins', count(*) FROM profiles WHERE role = 'admin' AND department != 'All Departments'
UNION ALL SELECT 'Field Officers', count(*) FROM profiles WHERE role = 'officer'
UNION ALL SELECT 'Staff', count(*) FROM profiles WHERE role = 'staff'
UNION ALL SELECT 'Badges', count(*) FROM badges;
