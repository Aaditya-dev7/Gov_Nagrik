# Seed Users Script for NagrikGPT
# Run this after deploying the create-admin-user Edge Function
# Replace YOUR_SUPABASE_URL and YOUR_BOOTSTRAP_TOKEN before running

$SUPABASE_URL = "YOUR_SUPABASE_URL"  # e.g., "https://xxxxx.supabase.co"
$BOOTSTRAP_TOKEN = "YOUR_BOOTSTRAP_TOKEN"  # Set this in Supabase secrets
$FUNCTION_URL = "$SUPABASE_URL/functions/v1/create-admin-user"

function Create-User {
    param (
        [string]$email,
        [string]$password,
        [string]$fullName,
        [string]$department,
        [string]$role
    )
    
    $body = @{
        token = $BOOTSTRAP_TOKEN
        email = $email
        password = $password
        full_name = $fullName
        department = $department
        role = $role
    } | ConvertTo-Json
    
    Write-Host "Creating $role : $email ($fullName) - $department" -ForegroundColor Cyan
    
    try {
        $response = Invoke-RestMethod -Method POST -Uri $FUNCTION_URL -ContentType "application/json" -Body $body
        if ($response.ok) {
            Write-Host "  ✓ Success - User ID: $($response.user_id)" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Error: $($response.error)" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ✗ Exception: $_" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "  Seeding NagrikGPT Users" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Yellow

# ============================================
# ADMINS (All Departments access)
# ============================================
Write-Host "--- ADMINS ---" -ForegroundColor Magenta

Create-User -email "aditya.kadam_siot23@comp.sce.edu.in" -password "aditya@123" -fullName "Aditya Kadam" -department "All Departments" -role "admin"
Create-User -email "manas.patil_siot23@comp.sce.edu.in" -password "manas@123" -fullName "Manas Patil" -department "All Departments" -role "admin"
Create-User -email "nishant.jadhav_siot23@comp.sce.edu.in" -password "nishi@123" -fullName "Nishant Jadhav" -department "All Departments" -role "admin"

# ============================================
# OFFICERS (Per Department)
# ============================================
Write-Host "`n--- OFFICERS ---" -ForegroundColor Magenta

# Roads Department
Create-User -email "rajesh.sharma@nagarpalika.gov.in" -password "rajesh12345" -fullName "Rajesh Sharma" -department "Roads" -role "officer"
Create-User -email "priya.desai@nagarpalika.gov.in" -password "priya12345" -fullName "Priya Desai" -department "Roads" -role "officer"

# Sanitation Department
Create-User -email "amit.patil@nagarpalika.gov.in" -password "amit12345" -fullName "Amit Patil" -department "Sanitation" -role "officer"
Create-User -email "sunita.more@nagarpalika.gov.in" -password "sunita12345" -fullName "Sunita More" -department "Sanitation" -role "officer"

# Water Supply Department
Create-User -email "sneha.kulkarni@nagarpalika.gov.in" -password "sneha12345" -fullName "Sneha Kulkarni" -department "Water Supply" -role "officer"
Create-User -email "rahul.bhosale@nagarpalika.gov.in" -password "rahul12345" -fullName "Rahul Bhosale" -department "Water Supply" -role "officer"

# Street Lighting Department
Create-User -email "vikram.singh@nagarpalika.gov.in" -password "vikram12345" -fullName "Vikram Singh" -department "Street Lighting" -role "officer"
Create-User -email "meera.joshi@nagarpalika.gov.in" -password "meera12345" -fullName "Meera Joshi" -department "Street Lighting" -role "officer"

# Drainage Department
Create-User -email "suresh.yadav@nagarpalika.gov.in" -password "suresh12345" -fullName "Suresh Yadav" -department "Drainage" -role "officer"
Create-User -email "lakshmi.nair@nagarpalika.gov.in" -password "lakshmi12345" -fullName "Lakshmi Nair" -department "Drainage" -role "officer"

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "  Seeding Complete!" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Yellow

Write-Host "Verify in Supabase SQL Editor:" -ForegroundColor White
Write-Host "  SELECT id, full_name, role, department FROM public.profiles ORDER BY role, department;" -ForegroundColor Gray
