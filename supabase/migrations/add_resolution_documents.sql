-- Migration: Add resolution_documents and resolution_note to reports table
-- Run this in Supabase SQL Editor

-- Add resolution_documents column (JSONB array to store document metadata)
ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS resolution_documents JSONB DEFAULT '[]'::jsonb;

-- Add resolution_note column (text for officer's resolution note)
ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS resolution_note TEXT;

-- Create resolution_documents table for better document management
CREATE TABLE IF NOT EXISTS resolution_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id TEXT NOT NULL REFERENCES reports(report_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pdf', 'image', 'document')),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_resolution_documents_report_id ON resolution_documents(report_id);

-- Enable RLS on resolution_documents table
ALTER TABLE resolution_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to resolution documents (citizens can view proof)
CREATE POLICY "Allow public read access to resolution documents"
ON resolution_documents FOR SELECT
USING (true);

-- Policy: Allow officers and admins to insert documents
CREATE POLICY "Allow officers and admins to insert resolution documents"
ON resolution_documents FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM officers WHERE officer_id = auth.uid()::text
    OR EXISTS (SELECT 1 FROM admins WHERE email = auth.jwt() ->> 'email')
  )
);

-- Policy: Allow officers and admins to delete documents
CREATE POLICY "Allow officers and admins to delete resolution documents"
ON resolution_documents FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM officers WHERE officer_id = auth.uid()::text
    OR EXISTS (SELECT 1 FROM admins WHERE email = auth.jwt() ->> 'email')
  )
);

-- Create storage bucket for resolution documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('resolution-documents', 'resolution-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow anyone to view resolution documents
CREATE POLICY "Allow public access to resolution documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'resolution-documents');

-- Policy: Allow officers and admins to upload resolution documents
CREATE POLICY "Allow officers and admins to upload resolution documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'resolution-documents'
  AND (
    EXISTS (SELECT 1 FROM officers WHERE officer_id = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM admins WHERE email = auth.jwt() ->> 'email')
  )
);

-- Policy: Allow officers and admins to delete resolution documents
CREATE POLICY "Allow officers and admins to delete resolution documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'resolution-documents'
  AND (
    EXISTS (SELECT 1 FROM officers WHERE officer_id = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM admins WHERE email = auth.jwt() ->> 'email')
  )
);

-- Function to sync resolution_documents from the table to the reports column
CREATE OR REPLACE FUNCTION sync_resolution_documents()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE reports
  SET resolution_documents = (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', id,
        'name', name,
        'url', url,
        'type', type,
        'uploaded_at', uploaded_at,
        'uploaded_by', uploaded_by
      )
    )
    FROM resolution_documents
    WHERE report_id = NEW.report_id
  )
  WHERE report_id = NEW.report_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to sync documents
DROP TRIGGER IF EXISTS sync_resolution_documents_trigger ON resolution_documents;
CREATE TRIGGER sync_resolution_documents_trigger
AFTER INSERT OR DELETE ON resolution_documents
FOR EACH ROW
EXECUTE FUNCTION sync_resolution_documents();

-- Helpful comment
COMMENT ON TABLE resolution_documents IS 'Stores resolution proof documents uploaded by officers when resolving reports';
COMMENT ON COLUMN reports.resolution_documents IS 'JSONB array of resolution document metadata for quick access';
COMMENT ON COLUMN reports.resolution_note IS 'Note added by officer when resolving the report';
