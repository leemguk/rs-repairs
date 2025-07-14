-- Script to extract unique brands from spare_parts table and insert into appliance_repair_brands
-- This will populate the new appliance_repair_brands table with existing brand data

-- Step 1: Extract unique brands from spare_parts table
-- This query shows what brands will be extracted (run this first to review)
SELECT 
    DISTINCT brand,
    COUNT(*) as spare_parts_count
FROM spare_parts 
WHERE brand IS NOT NULL 
    AND brand != '' 
    AND LENGTH(TRIM(brand)) > 0
GROUP BY brand
ORDER BY brand;

-- Step 2: Insert unique brands into appliance_repair_brands table with default price
INSERT INTO appliance_repair_brands (brand, price, is_active)
SELECT 
    TRIM(brand) as brand,
    169.00 as price,  -- Default price, will be updated with specific brand pricing
    true as is_active
FROM (
    SELECT DISTINCT brand
    FROM spare_parts 
    WHERE brand IS NOT NULL 
        AND brand != '' 
        AND LENGTH(TRIM(brand)) > 0
) unique_brands
WHERE NOT EXISTS (
    -- Avoid duplicates if script is run multiple times
    SELECT 1 FROM appliance_repair_brands 
    WHERE appliance_repair_brands.brand = TRIM(unique_brands.brand)
)
ORDER BY brand;

-- Step 3: Update specific brand prices based on your pricing data
-- This updates the default £169.00 with brand-specific pricing from your Excel file

UPDATE appliance_repair_brands SET price = 159.00 WHERE brand = 'Baumatic';
UPDATE appliance_repair_brands SET price = 149.00 WHERE brand = 'Beko';
UPDATE appliance_repair_brands SET price = 214.99 WHERE brand = 'Belling';
UPDATE appliance_repair_brands SET price = 149.00 WHERE brand = 'Blomberg';
UPDATE appliance_repair_brands SET price = 139.00 WHERE brand = 'Bush';
UPDATE appliance_repair_brands SET price = 149.00 WHERE brand = 'Cannon';
UPDATE appliance_repair_brands SET price = 149.00 WHERE brand = 'Creda';
UPDATE appliance_repair_brands SET price = 159.00 WHERE brand = 'Haier';
UPDATE appliance_repair_brands SET price = 159.00 WHERE brand = 'Hoover';
UPDATE appliance_repair_brands SET price = 159.00 WHERE brand = 'Candy';
UPDATE appliance_repair_brands SET price = 149.00 WHERE brand = 'Hotpoint';
UPDATE appliance_repair_brands SET price = 149.00 WHERE brand = 'Indesit';
UPDATE appliance_repair_brands SET price = 139.00 WHERE brand = 'Kenwood';
UPDATE appliance_repair_brands SET price = 179.00 WHERE brand = 'Lec';
UPDATE appliance_repair_brands SET price = 249.00 WHERE brand = 'Miele';
UPDATE appliance_repair_brands SET price = 179.00 WHERE brand = 'Neff';
UPDATE appliance_repair_brands SET price =  189.00 WHERE brand = 'Rangemaster';
UPDATE appliance_repair_brands SET price = 139.00 WHERE brand = 'Servis';
UPDATE appliance_repair_brands SET price = 139.00 WHERE brand = 'Electra';
UPDATE appliance_repair_brands SET price = 139.00 WHERE brand = 'Sharp';
UPDATE appliance_repair_brands SET price = 189.00 WHERE brand = 'Siemens';
UPDATE appliance_repair_brands SET price = 179.00 WHERE brand = 'Smeg';
UPDATE appliance_repair_brands SET price = 214.99 WHERE brand = 'Stoves';
UPDATE appliance_repair_brands SET price = 139.00 WHERE brand = 'Value range';
UPDATE appliance_repair_brands SET price = 139.00 WHERE brand = 'White Knight';

-- Step 4: Show results
SELECT 
    'Brands extracted and prices updated' as status,
    COUNT(*) as total_brands,
    COUNT(CASE WHEN price != 169.00 THEN 1 END) as brands_with_custom_pricing,
    COUNT(CASE WHEN price = 169.00 THEN 1 END) as brands_with_default_pricing
FROM appliance_repair_brands;

-- Step 5: Show sample of extracted data
SELECT 
    brand,
    price,
    is_active,
    created_at
FROM appliance_repair_brands 
ORDER BY brand 
LIMIT 20;