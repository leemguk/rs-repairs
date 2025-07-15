// HTML sanitization utilities for preventing XSS attacks

// Basic HTML escape function for display
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') return ''
  
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }
  
  return text.replace(/[&<>"'/]/g, (char) => map[char] || char)
}

// Remove all HTML tags and return plain text
export function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return ''
  
  // Remove script and style tags with their content
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
  
  // Remove all other tags
  cleaned = cleaned.replace(/<[^>]+>/g, '')
  
  // Decode HTML entities
  const textarea = document.createElement('textarea')
  textarea.innerHTML = cleaned
  cleaned = textarea.value
  
  return cleaned.trim()
}

// Sanitize user input for safe storage and display
export function sanitizeUserInput(input: string, options?: {
  maxLength?: number
  allowNewlines?: boolean
  allowBasicFormatting?: boolean
}): string {
  if (!input || typeof input !== 'string') return ''
  
  const {
    maxLength = 1000,
    allowNewlines = true,
    allowBasicFormatting = false
  } = options || {}
  
  let sanitized = input.trim()
  
  // Remove dangerous patterns
  sanitized = sanitized
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?>/gi, '')
    .replace(/<object[\s\S]*?>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
  
  if (!allowBasicFormatting) {
    // Remove all HTML tags
    sanitized = stripHtml(sanitized)
  } else {
    // Allow only specific safe tags
    const allowedTags = ['b', 'i', 'u', 'strong', 'em', 'br']
    const tagRegex = /<\/?([\w]+)(?:\s[^>]*)?>/g
    
    sanitized = sanitized.replace(tagRegex, (match, tag) => {
      if (allowedTags.includes(tag.toLowerCase())) {
        return match
      }
      return ''
    })
  }
  
  if (!allowNewlines) {
    sanitized = sanitized.replace(/[\r\n]+/g, ' ')
  }
  
  // Enforce max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength)
  }
  
  return sanitized
}

// Sanitize for use in HTML attributes
export function sanitizeAttribute(value: string): string {
  if (!value || typeof value !== 'string') return ''
  
  return value
    .replace(/['"]/g, '')
    .replace(/[<>]/g, '')
    .trim()
}

// Sanitize URL to prevent javascript: and data: URLs
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') return '#'
  
  const trimmed = url.trim().toLowerCase()
  
  // Dangerous URL schemes
  const dangerousSchemes = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:'
  ]
  
  for (const scheme of dangerousSchemes) {
    if (trimmed.startsWith(scheme)) {
      return '#'
    }
  }
  
  // Allow only http, https, mailto, and relative URLs
  if (!trimmed.match(/^(https?:\/\/|mailto:|\/|#)/)) {
    return '#'
  }
  
  return url
}

// Sanitize data for safe JSON stringification
export function sanitizeForJson(data: any): any {
  if (data === null || data === undefined) return null
  
  if (typeof data === 'string') {
    return sanitizeUserInput(data, { allowNewlines: true })
  }
  
  if (typeof data === 'number' || typeof data === 'boolean') {
    return data
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForJson(item))
  }
  
  if (typeof data === 'object') {
    const sanitized: any = {}
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        // Sanitize both key and value
        const sanitizedKey = sanitizeAttribute(key)
        sanitized[sanitizedKey] = sanitizeForJson(data[key])
      }
    }
    return sanitized
  }
  
  return null
}

// Create safe HTML from user content
export function createSafeHtml(content: string): { __html: string } {
  const sanitized = sanitizeUserInput(content, {
    allowNewlines: true,
    allowBasicFormatting: true
  })
  
  // Convert newlines to <br> tags
  const html = sanitized.replace(/\n/g, '<br>')
  
  return { __html: html }
}

// Validate and sanitize email for display
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return ''
  
  const trimmed = email.trim().toLowerCase()
  
  // Basic email validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  
  if (!emailRegex.test(trimmed)) {
    return ''
  }
  
  return trimmed
}

// Sanitize phone numbers
export function sanitizePhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') return ''
  
  // Remove all non-digits and common separators
  return phone.replace(/[^\d+\s()-]/g, '').trim()
}