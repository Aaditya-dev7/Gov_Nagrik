-- Staff System Migration
-- Run this in Supabase SQL Editor

-- 1. Add columns to profiles table for staff hierarchy
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS reports_to_officer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reports_to_officer_name TEXT;

-- 2. Add columns to access_requests table for staff hierarchy
ALTER TABLE public.access_requests
ADD COLUMN IF NOT EXISTS reports_to_officer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reports_to_officer_name TEXT;

-- 3. Create staff_tasks table
CREATE TABLE IF NOT EXISTS public.staff_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id TEXT NOT NULL REFERENCES public.reports(report_id) ON DELETE CASCADE,
  staff_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by_officer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  documents JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create indexes for staff_tasks
CREATE INDEX IF NOT EXISTS idx_staff_tasks_staff_user_id ON public.staff_tasks(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_report_id ON public.staff_tasks(report_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_status ON public.staff_tasks(status);

-- 5. Enable RLS on staff_tasks
ALTER TABLE public.staff_tasks ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for staff_tasks

-- Staff can view their own tasks
CREATE POLICY "Staff can view own tasks"
ON public.staff_tasks FOR SELECT
TO authenticated
USING (staff_user_id = auth.uid());

-- Officers can view tasks assigned by them or to staff in their department
CREATE POLICY "Officers can view department staff tasks"
ON public.staff_tasks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'officer'
    AND (
      assigned_by_officer_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles staff
        WHERE staff.id = staff_tasks.staff_user_id
        AND staff.department = p.department
      )
    )
  )
);

-- Admins can view all tasks
CREATE POLICY "Admins can view all tasks"
ON public.staff_tasks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
);

-- Staff can insert their own tasks (when accepting a report)
CREATE POLICY "Staff can insert own tasks"
ON public.staff_tasks FOR INSERT
TO authenticated
WITH CHECK (staff_user_id = auth.uid());

-- Staff can update their own tasks (when completing)
CREATE POLICY "Staff can update own tasks"
ON public.staff_tasks FOR UPDATE
TO authenticated
USING (staff_user_id = auth.uid())
WITH CHECK (staff_user_id = auth.uid());

-- 7. Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_staff_tasks_updated_at
BEFORE UPDATE ON public.staff_tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 8. Notification for staff when new report in their department
CREATE OR REPLACE FUNCTION notify_staff_of_department_report()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notifications for all staff in the department
  INSERT INTO public.notifications (id, message, timestamp, read, report_id, recipient_user_id, recipient_role, type)
  SELECT
    gen_random_uuid(),
    'New report in your department: ' || COALESCE(NEW.category, 'General'),
    NOW(),
    false,
    NEW.report_id,
    p.id,
    'staff',
    'assignment'
  FROM public.profiles p
  WHERE p.role = 'staff'
  AND p.department = NEW.assigned_department
  AND NOT EXISTS (
    SELECT 1 FROM public.staff_tasks st
    WHERE st.report_id = NEW.report_id
    AND st.staff_user_id = p.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS notify_staff_on_new_report ON public.reports;

-- Create trigger
CREATE TRIGGER notify_staff_on_new_report
AFTER INSERT ON public.reports
FOR EACH ROW
EXECUTE FUNCTION notify_staff_of_department_report();

-- 9. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.staff_tasks TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.access_requests TO authenticated;

-- 10. Add unique constraint to prevent duplicate tasks
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_tasks_unique_active
ON public.staff_tasks(report_id, staff_user_id)
WHERE status != 'completed';
