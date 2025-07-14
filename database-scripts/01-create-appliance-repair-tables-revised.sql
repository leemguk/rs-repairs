-- Revised database design for repair booking system
-- Separate tables for categories and brands (no relationship between them)

-- Drop existing table if it exists (from previous version)
DROP TABLE IF EXISTS appliance_repairs;

-- Create appliance_repair_categories table
CREATE TABLE IF NOT EXISTS appliance_repair_categories (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL UNIQUE,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create appliance_repair_brands table
CREATE TABLE IF NOT EXISTS appliance_repair_brands (
    id SERIAL PRIMARY KEY,
    brand VARCHAR(100) NOT NULL UNIQUE,
    price DECIMAL(6,2) DEFAULT 169.00, -- Default £169.00, can be overridden for specific brands
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appliance_repair_categories_active ON appliance_repair_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_appliance_repair_categories_order ON appliance_repair_categories(display_order);
CREATE INDEX IF NOT EXISTS idx_appliance_repair_brands_active ON appliance_repair_brands(is_active);
CREATE INDEX IF NOT EXISTS idx_appliance_repair_brands_name ON appliance_repair_brands(brand);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_appliance_repair_categories_updated_at 
    BEFORE UPDATE ON appliance_repair_categories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appliance_repair_brands_updated_at 
    BEFORE UPDATE ON appliance_repair_brands 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE appliance_repair_categories IS 'Stores appliance categories/types available for repair bookings';
COMMENT ON COLUMN appliance_repair_categories.category IS 'Appliance category/type (e.g., Washing Machine, Dishwasher)';
COMMENT ON COLUMN appliance_repair_categories.display_order IS 'Order for dropdown display (lower numbers first)';
COMMENT ON COLUMN appliance_repair_categories.is_active IS 'Whether this category is available for booking';

COMMENT ON TABLE appliance_repair_brands IS 'Stores appliance brands with their repair pricing';
COMMENT ON COLUMN appliance_repair_brands.brand IS 'Appliance brand/manufacturer (e.g., Bosch, Miele)';
COMMENT ON COLUMN appliance_repair_brands.price IS 'Base repair price for this brand (defaults to £169.00)';
COMMENT ON COLUMN appliance_repair_brands.is_active IS 'Whether this brand is available for booking';