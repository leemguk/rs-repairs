// Brand-specific pricing configuration
// Default price is £169 unless brand is specified below

export interface BrandPricing {
  brand: string
  sameDayPrice: number
  nextDayPrice: number
  standardPrice: number
}

// Brand-specific pricing from Pacifica Chargeable Repair Pricing.xlsx
// Standard price is the base repair price, with premiums added for faster service
export const BRAND_PRICING: BrandPricing[] = [
  { brand: "Baumatic", sameDayPrice: 179, nextDayPrice: 169, standardPrice: 159 },
  { brand: "Beko", sameDayPrice: 169, nextDayPrice: 159, standardPrice: 149 },
  { brand: "Belling", sameDayPrice: 234.99, nextDayPrice: 224.99, standardPrice: 214.99 },
  { brand: "Blomberg", sameDayPrice: 169, nextDayPrice: 159, standardPrice: 149 },
  { brand: "Bush", sameDayPrice: 159, nextDayPrice: 149, standardPrice: 139 },
  { brand: "Cannon", sameDayPrice: 169, nextDayPrice: 159, standardPrice: 149 },
  { brand: "Creda", sameDayPrice: 169, nextDayPrice: 159, standardPrice: 149 },
  { brand: "Haier", sameDayPrice: 179, nextDayPrice: 169, standardPrice: 159 },
  { brand: "Hoover", sameDayPrice: 179, nextDayPrice: 169, standardPrice: 159 },
  { brand: "Candy", sameDayPrice: 179, nextDayPrice: 169, standardPrice: 159 },
  { brand: "Hotpoint", sameDayPrice: 169, nextDayPrice: 159, standardPrice: 149 },
  { brand: "Indesit", sameDayPrice: 169, nextDayPrice: 159, standardPrice: 149 },
  { brand: "Kenwood", sameDayPrice: 159, nextDayPrice: 149, standardPrice: 139 },
  { brand: "Lec", sameDayPrice: 199, nextDayPrice: 189, standardPrice: 179 },
  { brand: "Miele", sameDayPrice: 269, nextDayPrice: 259, standardPrice: 249 },
  { brand: "Neff", sameDayPrice: 199, nextDayPrice: 189, standardPrice: 179 },
  { brand: "Rangemaster", sameDayPrice: 209, nextDayPrice: 199, standardPrice: 189 },
  { brand: "Servis", sameDayPrice: 159, nextDayPrice: 149, standardPrice: 139 },
  { brand: "Electra", sameDayPrice: 159, nextDayPrice: 149, standardPrice: 139 },
  { brand: "Sharp", sameDayPrice: 159, nextDayPrice: 149, standardPrice: 139 },
  { brand: "Siemens", sameDayPrice: 209, nextDayPrice: 199, standardPrice: 189 },
  { brand: "Smeg", sameDayPrice: 199, nextDayPrice: 189, standardPrice: 179 },
  { brand: "Stoves", sameDayPrice: 234.99, nextDayPrice: 224.99, standardPrice: 214.99 },
  { brand: "Value range", sameDayPrice: 159, nextDayPrice: 149, standardPrice: 139 },
  { brand: "White Knight", sameDayPrice: 159, nextDayPrice: 149, standardPrice: 139 },
]

// Default pricing for brands not in the list above
export const DEFAULT_PRICING: Omit<BrandPricing, 'brand'> = {
  sameDayPrice: 189,  // £169 + same day premium
  nextDayPrice: 179,  // £169 + next day premium  
  standardPrice: 169, // Base price £169
}

/**
 * Get pricing for a specific brand
 * @param brand - The appliance brand/manufacturer
 * @returns Pricing object with same day, next day, and standard prices
 */
export function getBrandPricing(brand: string): Omit<BrandPricing, 'brand'> {
  if (!brand) {
    return DEFAULT_PRICING
  }

  // Normalize brand name for comparison (case-insensitive, trim whitespace)
  const normalizedBrand = brand.trim().toLowerCase()
  
  // Find matching brand pricing
  const brandPricing = BRAND_PRICING.find(
    pricing => pricing.brand.toLowerCase() === normalizedBrand
  )

  if (brandPricing) {
    return {
      sameDayPrice: brandPricing.sameDayPrice,
      nextDayPrice: brandPricing.nextDayPrice,
      standardPrice: brandPricing.standardPrice,
    }
  }

  // Return default pricing if brand not found
  return DEFAULT_PRICING
}

/**
 * Get all available brands with special pricing
 * @returns Array of brand names that have special pricing
 */
export function getAvailableBrands(): string[] {
  return BRAND_PRICING.map(pricing => pricing.brand)
}