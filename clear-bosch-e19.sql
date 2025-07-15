-- Clear Bosch Washing Machine E19 error code entries from BOTH diagnostics and error_code_statistics tables
-- This script will help test the improved error code search functionality

-- 1. First, let's see what entries we have in diagnostics table
SELECT 
    id,
    created_at,
    email,
    appliance_type,
    appliance_brand,
    error_code,
    error_code_meaning,
    problem_description,
    was_cached
FROM diagnostics
WHERE 
    LOWER(appliance_brand) = 'bosch' 
    AND LOWER(appliance_type) LIKE '%washing%machine%'
    AND error_code = 'E19'
ORDER BY created_at DESC;

-- 2. Check error_code_statistics table
SELECT 
    appliance_type,
    appliance_brand,
    error_code,
    error_code_meaning,
    total_occurrences,
    booking_conversion_rate,
    most_common_recommendation
FROM error_code_statistics
WHERE 
    LOWER(appliance_brand) = 'bosch' 
    AND LOWER(appliance_type) LIKE '%washing%machine%'
    AND error_code = 'E19';

-- 3. Count entries to be deleted from both tables
SELECT 
    'diagnostics' as table_name,
    COUNT(*) as entries_to_delete
FROM diagnostics
WHERE 
    LOWER(appliance_brand) = 'bosch' 
    AND LOWER(appliance_type) LIKE '%washing%machine%'
    AND error_code = 'E19'
UNION ALL
SELECT 
    'error_code_statistics' as table_name,
    COUNT(*) as entries_to_delete
FROM error_code_statistics
WHERE 
    LOWER(appliance_brand) = 'bosch' 
    AND LOWER(appliance_type) LIKE '%washing%machine%'
    AND error_code = 'E19';

-- 4. Delete from diagnostics table only (uncomment to execute)
-- Note: error_code_statistics is a VIEW that aggregates data from diagnostics table
-- It will automatically update when we delete from diagnostics
/*
DELETE FROM diagnostics
WHERE 
    LOWER(appliance_brand) = 'bosch' 
    AND LOWER(appliance_type) LIKE '%washing%machine%'
    AND error_code = 'E19';
*/

-- 5. After deletion, verify the error_code_statistics view has updated
-- Run this after the DELETE to confirm the view no longer shows E19
/*
SELECT 
    appliance_type,
    appliance_brand,
    error_code,
    total_occurrences
FROM error_code_statistics
WHERE 
    LOWER(appliance_brand) = 'bosch' 
    AND LOWER(appliance_type) LIKE '%washing%machine%'
    AND error_code = 'E19';
*/