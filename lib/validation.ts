// Input validation utilities for security

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

// Email validation
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = []
  
  if (!email || typeof email !== 'string') {
    errors.push('Email is required')
    return { isValid: false, errors }
  }
  
  const trimmedEmail = email.trim()
  
  if (trimmedEmail.length === 0) {
    errors.push('Email cannot be empty')
  }
  
  if (trimmedEmail.length > 255) {
    errors.push('Email is too long (max 255 characters)')
  }
  
  // RFC 5322 simplified regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  
  if (!emailRegex.test(trimmedEmail)) {
    errors.push('Invalid email format')
  }
  
  return { isValid: errors.length === 0, errors }
}

// UK mobile number validation
export function validateUKMobile(mobile: string): ValidationResult {
  const errors: string[] = []
  
  if (!mobile || typeof mobile !== 'string') {
    errors.push('Mobile number is required')
    return { isValid: false, errors }
  }
  
  // Remove all non-digits
  const digitsOnly = mobile.replace(/\D/g, '')
  
  if (digitsOnly.length === 0) {
    errors.push('Mobile number cannot be empty')
  }
  
  // UK mobile numbers: 07xxx xxxxxx or +447xxx xxxxxx
  const ukMobileRegex = /^(07\d{9}|447\d{9})$/
  
  if (!ukMobileRegex.test(digitsOnly)) {
    errors.push('Invalid UK mobile number format')
  }
  
  return { isValid: errors.length === 0, errors }
}

// Name validation
export function validateName(name: string, fieldName: string = 'Name'): ValidationResult {
  const errors: string[] = []
  
  if (!name || typeof name !== 'string') {
    errors.push(`${fieldName} is required`)
    return { isValid: false, errors }
  }
  
  const trimmedName = name.trim()
  
  if (trimmedName.length === 0) {
    errors.push(`${fieldName} cannot be empty`)
  }
  
  if (trimmedName.length < 2) {
    errors.push(`${fieldName} is too short (min 2 characters)`)
  }
  
  if (trimmedName.length > 100) {
    errors.push(`${fieldName} is too long (max 100 characters)`)
  }
  
  // Allow letters, spaces, hyphens, apostrophes
  const nameRegex = /^[a-zA-Z\s\-']+$/
  
  if (!nameRegex.test(trimmedName)) {
    errors.push(`${fieldName} contains invalid characters`)
  }
  
  return { isValid: errors.length === 0, errors }
}

// Postcode validation (UK)
export function validateUKPostcode(postcode: string): ValidationResult {
  const errors: string[] = []
  
  if (!postcode || typeof postcode !== 'string') {
    errors.push('Postcode is required')
    return { isValid: false, errors }
  }
  
  const trimmedPostcode = postcode.trim().toUpperCase()
  
  // UK postcode regex
  const postcodeRegex = /^[A-Z]{1,2}[0-9]{1,2}[A-Z]?\s?[0-9][A-Z]{2}$/
  
  if (!postcodeRegex.test(trimmedPostcode)) {
    errors.push('Invalid UK postcode format')
  }
  
  return { isValid: errors.length === 0, errors }
}

// Text field validation with length limits
export function validateTextField(
  text: string, 
  fieldName: string,
  minLength: number = 0,
  maxLength: number = 500
): ValidationResult {
  const errors: string[] = []
  
  if (!text || typeof text !== 'string') {
    if (minLength > 0) {
      errors.push(`${fieldName} is required`)
    }
    return { isValid: errors.length === 0, errors }
  }
  
  const trimmedText = text.trim()
  
  if (trimmedText.length < minLength) {
    errors.push(`${fieldName} is too short (min ${minLength} characters)`)
  }
  
  if (trimmedText.length > maxLength) {
    errors.push(`${fieldName} is too long (max ${maxLength} characters)`)
  }
  
  // Check for potentially malicious content
  const suspiciousPatterns = [
    /<script[\s\S]*?<\/script>/gi,
    /<iframe[\s\S]*?>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers
  ]
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(trimmedText)) {
      errors.push(`${fieldName} contains potentially unsafe content`)
      break
    }
  }
  
  return { isValid: errors.length === 0, errors }
}

// Amount validation for payments
export function validateAmount(amount: any, min: number = 1, max: number = 100000): ValidationResult {
  const errors: string[] = []
  
  if (amount === undefined || amount === null) {
    errors.push('Amount is required')
    return { isValid: false, errors }
  }
  
  const numAmount = Number(amount)
  
  if (isNaN(numAmount)) {
    errors.push('Amount must be a number')
  }
  
  if (numAmount < min) {
    errors.push(`Amount must be at least £${(min / 100).toFixed(2)}`)
  }
  
  if (numAmount > max) {
    errors.push(`Amount cannot exceed £${(max / 100).toFixed(2)}`)
  }
  
  if (!Number.isInteger(numAmount)) {
    errors.push('Amount must be in pence (whole number)')
  }
  
  return { isValid: errors.length === 0, errors }
}

// Date validation
export function validateFutureDate(date: string): ValidationResult {
  const errors: string[] = []
  
  if (!date) {
    errors.push('Date is required')
    return { isValid: false, errors }
  }
  
  const parsedDate = new Date(date)
  
  if (isNaN(parsedDate.getTime())) {
    errors.push('Invalid date format')
  }
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  if (parsedDate < today) {
    errors.push('Date cannot be in the past')
  }
  
  // Max 1 year in future
  const maxDate = new Date()
  maxDate.setFullYear(maxDate.getFullYear() + 1)
  
  if (parsedDate > maxDate) {
    errors.push('Date cannot be more than 1 year in the future')
  }
  
  return { isValid: errors.length === 0, errors }
}

// Booking data validation
export interface BookingData {
  fullName: string
  email: string
  mobile: string
  address: string
  postcode: string
  applianceType: string
  manufacturer: string
  model?: string
  faultDescription: string
  serviceType: string
  appointmentDate?: string
  appointmentTime?: string
  marketingConsent?: boolean
}

export function validateBookingData(data: Partial<BookingData>): ValidationResult {
  const errors: string[] = []
  
  // Required field validations
  const nameValidation = validateName(data.fullName || '', 'Full name')
  if (!nameValidation.isValid) errors.push(...nameValidation.errors)
  
  const emailValidation = validateEmail(data.email || '')
  if (!emailValidation.isValid) errors.push(...emailValidation.errors)
  
  const mobileValidation = validateUKMobile(data.mobile || '')
  if (!mobileValidation.isValid) errors.push(...mobileValidation.errors)
  
  const addressValidation = validateTextField(data.address || '', 'Address', 10, 500)
  if (!addressValidation.isValid) errors.push(...addressValidation.errors)
  
  const postcodeValidation = validateUKPostcode(data.postcode || '')
  if (!postcodeValidation.isValid) errors.push(...postcodeValidation.errors)
  
  const applianceValidation = validateTextField(data.applianceType || '', 'Appliance type', 2, 50)
  if (!applianceValidation.isValid) errors.push(...applianceValidation.errors)
  
  const manufacturerValidation = validateTextField(data.manufacturer || '', 'Manufacturer', 2, 50)
  if (!manufacturerValidation.isValid) errors.push(...manufacturerValidation.errors)
  
  const faultValidation = validateTextField(data.faultDescription || '', 'Fault description', 10, 500)
  if (!faultValidation.isValid) errors.push(...faultValidation.errors)
  
  // Service type validation
  const validServiceTypes = ['same_day', 'next_day', 'standard']
  if (!data.serviceType || !validServiceTypes.includes(data.serviceType)) {
    errors.push('Invalid service type')
  }
  
  // Date validation for standard service
  if (data.serviceType === 'standard' && data.appointmentDate) {
    const dateValidation = validateFutureDate(data.appointmentDate)
    if (!dateValidation.isValid) errors.push(...dateValidation.errors)
  }
  
  // Time validation
  if (data.appointmentTime && !['AM', 'PM'].includes(data.appointmentTime)) {
    errors.push('Invalid appointment time')
  }
  
  return { isValid: errors.length === 0, errors }
}

// Spare parts category validation
export function validateSparePartsCategory(category: string): ValidationResult {
  const errors: string[] = []
  
  if (!category || typeof category !== 'string') {
    errors.push('Appliance type is required')
    return { isValid: false, errors }
  }
  
  const trimmedCategory = category.trim()
  
  if (trimmedCategory.length === 0) {
    errors.push('Appliance type cannot be empty')
  }
  
  if (trimmedCategory.length < 2) {
    errors.push('Appliance type is too short (min 2 characters)')
  }
  
  if (trimmedCategory.length > 100) {
    errors.push('Appliance type is too long (max 100 characters)')
  }
  
  // Allow letters, numbers, spaces, hyphens, ampersands
  const categoryRegex = /^[a-zA-Z0-9\s\-&]+$/
  
  if (!categoryRegex.test(trimmedCategory)) {
    errors.push('Appliance type contains invalid characters')
  }
  
  return { isValid: errors.length === 0, errors }
}

// Spare parts brand validation
export function validateSparePartsBrand(brand: string): ValidationResult {
  const errors: string[] = []
  
  if (!brand || typeof brand !== 'string') {
    errors.push('Brand is required')
    return { isValid: false, errors }
  }
  
  const trimmedBrand = brand.trim()
  
  if (trimmedBrand.length === 0) {
    errors.push('Brand cannot be empty')
  }
  
  if (trimmedBrand.length < 2) {
    errors.push('Brand is too short (min 2 characters)')
  }
  
  if (trimmedBrand.length > 100) {
    errors.push('Brand is too long (max 100 characters)')
  }
  
  // Allow letters, numbers, spaces, hyphens, periods, ampersands
  const brandRegex = /^[a-zA-Z0-9\s\-\.&]+$/
  
  if (!brandRegex.test(trimmedBrand)) {
    errors.push('Brand contains invalid characters')
  }
  
  return { isValid: errors.length === 0, errors }
}

// Spare parts model validation
export function validateSparePartsModel(model: string): ValidationResult {
  const errors: string[] = []
  
  if (!model || typeof model !== 'string') {
    errors.push('Model number is required')
    return { isValid: false, errors }
  }
  
  const trimmedModel = model.trim()
  
  if (trimmedModel.length === 0) {
    errors.push('Model number cannot be empty')
  }
  
  if (trimmedModel.length < 1) {
    errors.push('Model number is too short')
  }
  
  if (trimmedModel.length > 100) {
    errors.push('Model number is too long (max 100 characters)')
  }
  
  // Allow alphanumeric, spaces, hyphens, periods, forward slashes, parentheses
  const modelRegex = /^[a-zA-Z0-9\s\-\.\/\(\)]+$/
  
  if (!modelRegex.test(trimmedModel)) {
    errors.push('Model number contains invalid characters')
  }
  
  return { isValid: errors.length === 0, errors }
}

// Spare parts search term validation (for model search)
export function validateSparePartsSearchTerm(searchTerm: string): ValidationResult {
  const errors: string[] = []
  
  if (!searchTerm || typeof searchTerm !== 'string') {
    return { isValid: true, errors } // Search term can be empty
  }
  
  const trimmedSearch = searchTerm.trim()
  
  if (trimmedSearch.length > 100) {
    errors.push('Search term is too long (max 100 characters)')
  }
  
  // Check for potentially malicious patterns
  const suspiciousPatterns = [
    /<script[\s\S]*?<\/script>/gi,
    /<iframe[\s\S]*?>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
  ]
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(trimmedSearch)) {
      errors.push('Search term contains potentially unsafe content')
      break
    }
  }
  
  return { isValid: errors.length === 0, errors }
}

// Sanitize input for safe storage
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .slice(0, 1000) // Enforce max length
}