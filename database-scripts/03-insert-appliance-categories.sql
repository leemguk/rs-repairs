-- Insert appliance categories from screenshots into appliance_repair_categories table
-- Categories are ordered logically with most common appliances first

INSERT INTO appliance_repair_categories (category, display_order, is_active) 
VALUES 
    -- Most common household appliances (lower numbers = higher in dropdown)
    ('Washing Machine', 10, true),
    ('Dishwasher', 20, true),
    ('Fridge', 30, true),
    ('Freezer', 40, true),
    ('Fridge Freezer', 50, true),
    
    -- Cooking appliances
    ('Electric Oven', 60, true),
    ('Gas Cooker', 70, true),
    ('Electric Cooker', 80, true),
    ('Dual Fuel Cooker', 90, true),
    ('Dual Fuel Range Cooker', 100, true),
    ('Electric Range Cooker', 110, true),
    ('Gas Range Cooker', 120, true),
    ('Ovens', 130, true),
    
    -- Built-in cooking appliances
    ('Built in Gas Cooker', 140, true),
    ('Built in Electric Cooker', 150, true),
    ('Built in Dual Fuel Cooker', 160, true),
    ('Built in Gas Hob', 170, true),
    ('Built in Electric Hob', 180, true),
    ('Built in Electric Hood/Extract', 190, true),
    
    -- Built-in cooling appliances
    ('Built in Fridge', 200, true),
    ('Built in Freezer', 210, true),
    ('Built in Fridge Freezer', 220, true),
    
    -- Built-in cleaning appliances
    ('Built in Dishwasher', 230, true),
    ('Built in Washing Machine', 240, true),
    ('Built in Washer Dryer', 250, true),
    
    -- Drying appliances
    ('Washer Dryer', 260, true),
    ('Built in Tumble Dryer', 270, true),
    ('Built in Gas Tumble Dryer', 280, true),
    
    -- Specialty appliances
    ('American Style Fridge', 290, true),
    ('Chest Freezer', 300, true),
    ('Built in Electric Warming Draw', 310, true),
    ('Electric Fire', 320, true),
    ('Electric Double Oven', 330, true),
    ('Wine Cooler', 340, true)

ON CONFLICT (category) DO NOTHING; -- Prevent duplicates if script is run multiple times

-- Show inserted categories
SELECT 
    'Categories inserted successfully' as status,
    COUNT(*) as total_categories
FROM appliance_repair_categories;

-- Display all categories in order
SELECT 
    category,
    display_order,
    is_active,
    created_at
FROM appliance_repair_categories 
ORDER BY display_order;