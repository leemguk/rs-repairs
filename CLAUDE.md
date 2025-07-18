# RS Repairs - Claude Code Project Guide

## Project Overview
**RS Repairs** is a Next.js 15 appliance repair service application providing:
1. **Engineer Booking System** - Multi-step booking with Stripe payments
2. **AI Diagnostic Tool (DiagnoSys)** - Intelligent fault diagnosis with caching
3. **Spare Parts Search** - Real-time inventory search
4. **Warranty Protection** - Coverage plans integration
5. **Widget Support** - Embeddable booking widget for external sites

## Tech Stack & Key Dependencies
- **Framework**: Next.js 15 with React 19, TypeScript
- **UI**: Tailwind CSS + Radix UI components (shadcn/ui)
- **Database**: Supabase (PostgreSQL) with real-time subscriptions
- **Payments**: Stripe integration with webhooks
- **AI**: OpenRouter API (Claude 3.5 Sonnet) for diagnostics
- **Search**: SerpAPI/Brave Search for error code research
- **Address**: Loqate API for UK address autocomplete
- **Email**: SendGrid for notifications and verification

## Key Architecture Patterns

### Component Structure
- **Landing Page**: `appliance-repair-landing.tsx` - Main service selection
- **Booking Modal**: `components/booking-modal.tsx` - Pop-up booking form on main site
- **Booking Widget**: `components/booking-form.tsx` - Embeddable widget for external sites
- **Diagnostics**: `components/diagnostic-form.tsx` - AI-powered fault diagnosis
- **Spare Parts**: `components/spare-parts-search.tsx` - Inventory search
- **Other Modals**: `components/warranty-modal.tsx`

### Server Actions
- **Diagnostics**: `actions/diagnose.ts` - AI diagnosis with caching
- **Booking**: `actions/get-booking-options.ts` - Dynamic appliance/brand data
- **Spare Parts**: `actions/search-spare-parts.ts` - Inventory search

### API Routes
- **Payments**: `/api/create-checkout-session`, `/api/payment-success`
- **Verification**: `/api/send-verification`, `/api/verify-code`

## Database Schema (Supabase)

### Key Tables
- `diagnostics` - AI diagnostic results with caching
- `bookings` - Engineer appointment bookings
- `appliance_types` - Dynamic appliance categories
- `manufacturers` - Brand data per appliance type

### Important Functions
- `search_similar_diagnostics()` - Fuzzy matching for diagnostic cache
- Triggers for auto-timestamps and data validation

## Development Workflow

### 1. Planning Phase
- Read codebase for context and existing patterns
- Update `Task.md` with specific todo items
- Check in with project owner before implementation
- Keep changes simple and focused

### 2. Implementation Guidelines
- **Simplicity First**: Minimal code changes, follow existing patterns
- **Mobile-First**: All features must work on mobile devices
- **Widget Support**: Consider iframe embedding constraints
- **Error Handling**: Robust error boundaries and fallbacks
- **Performance**: Optimize for widget loading times

### 3. Testing Requirements
- Test all booking flows end-to-end
- Verify mobile responsiveness
- Test widget in iframe context
- Validate payment processing
- Check email verification flow

### 4. Code Standards
- Follow existing TypeScript patterns
- Use existing UI components from `components/ui/`
- Maintain consistent error handling
- Add proper loading states
- Include accessibility features

## Critical Files to Understand

### Core Components
- `appliance-repair-landing.tsx:400-450` - Service selection logic
- `booking-modal.tsx:856-1057` - Pop-up modal booking flow (main site)
- `booking-form.tsx:160-280` - Embeddable widget with iframe height management
- `diagnostic-form.tsx:207-221` - AI diagnosis submission
- `diagnose.ts:67-187` - Diagnostic caching system

### Key Features
- **AI Caching**: Reduces API costs by reusing similar diagnostics (with exact error code matching)
- **Enhanced Error Code Search**: Appliance-specific filtering prevents cross-contamination (e.g., dishwasher vs washing machine)
- **Booking Modal**: Pop-up modal for main site with step navigation
- **Booking Widget**: Embeddable iframe with automatic height adjustment for mobile
- **Payment Flow**: Stripe integration with booking persistence (both modal and widget)
- **Address Lookup**: UK-specific address validation

## Booking Components Architecture

### Two Separate Booking Flows

**1. Booking Modal (`booking-modal.tsx`)**
- **Purpose**: Pop-up modal on the main landing page
- **Navigation**: Step-by-step wizard with progress bar
- **Layout**: Dialog overlay with left/right column layout
- **Scroll**: Internal scrolling within modal
- **Usage**: Triggered by "Book Appointment" buttons on main site

**2. Booking Widget (`booking-form.tsx`)**
- **Purpose**: Embeddable iframe widget for external sites
- **Navigation**: Accordion-style expandable sections  
- **Layout**: Single column, full-width container
- **Scroll**: Auto-height adjustment via postMessage to parent
- **Usage**: Embedded on external sites like www.ransomspares.co.uk

### Key Differences
- **Modal**: Uses React Dialog, step navigation, side-by-side layout
- **Widget**: Uses Accordion, iframe-optimized, auto-height messaging
- **Both**: Share same pricing options, Stripe integration, and form validation

## Common Issues & Solutions

### Booking Component Issues
- **Modal Problems**: Check `booking-modal.tsx` for step navigation issues
- **Widget iframe height**: Check `booking-form.tsx:160-280` for height adjustment
- **Touch events**: Review event handlers in both booking components
- **Viewport issues**: Use `window.visualViewport` for mobile keyboards (widget only)

### Payment Integration
- Stripe webhook handling in `/api/payment-success`
- Booking status updates in database
- Email confirmations via SendGrid

### AI Diagnostics
- Cache system in `diagnose.ts:67-187` for cost optimization (exact error code matching required)
- Error code detection patterns in `diagnose.ts:29-64`
- Enhanced search with appliance-specific filtering in `diagnose.ts:190-314`
- Scoring system penalizes wrong appliance types (-5 points)
- Fallback responses when AI fails

## Environment Variables Required
```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Payments
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=

# AI & Search
OPENROUTER_API_KEY=
SERP_API_KEY= # or BRAVE_SEARCH_API_KEY

# Address & Email
LOQATE_KEY= # Server-side only (no NEXT_PUBLIC_ prefix)
SENDGRID_API_KEY=

# Feature Flags
NEXT_PUBLIC_ENABLE_SAME_DAY_BOOKING=false # Set to 'true' to enable same-day booking option
NEXT_PUBLIC_ENABLE_NEXT_DAY_BOOKING=false # Set to 'true' to enable next-day booking option

# Site URL (for API calls from server actions)
NEXT_PUBLIC_SITE_URL=https://repairs.ransomspares.co.uk
```

## Widget Integration
For external embedding, use:
```html
<iframe src="https://domain.com/widget/booking" 
        id="rs-repairs-booking" 
        style="width: 100%; border: none;">
</iframe>
<script src="https://domain.com/booking-iframe-height-adjuster.js"></script>
```

## Performance Considerations
- Diagnostic caching reduces AI API calls by ~70%
- Image optimization for landing page
- Lazy loading for non-critical components
- Supabase real-time subscriptions for live updates

## Security Notes
- All API keys in environment variables
- Stripe webhook signature verification
- Email verification for diagnostics
- CORS properly configured for widget embedding

---

## Standard Workflow

1. **Analysis**: Read relevant files and understand existing patterns
2. **Planning**: Update `Task.md` with specific, simple todo items
3. **Approval**: Check in with project owner before implementation
4. **Implementation**: Work through todos, marking complete as you go
5. **Communication**: Provide high-level explanations of changes made
6. **Simplicity**: Keep all changes minimal and focused
7. **Review**: Add summary section to `Task.md` when complete

Remember: Everything is about simplicity. Small, focused changes that follow existing patterns.

## Recent Security Implementation (2025-07-16)

### What Was Implemented:

#### Booking Security:
1. **Input Validation** (`/lib/validation.ts`)
   - Email, UK mobile, name, postcode validation
   - Amount validation for payments
   - Booking data validation functions

2. **HTML Sanitization** (`/lib/sanitization.ts`)
   - XSS protection functions
   - HTML escaping utilities
   - Safe input handling

3. **Rate Limiting** (`middleware.ts`)
   - API endpoint protection
   - Different limits for sensitive operations
   - IP-based tracking

4. **Payment Security**
   - Enhanced validation in checkout session
   - Input sanitization for Stripe metadata
   - HTML escaping in payment emails

5. **iframe Security**
   - Fixed postMessage to detect parent origin
   - Fallback to wildcard only when necessary

#### DiagnoSys Security (NEW):
1. **Input Validation** (`actions/diagnose.ts`)
   - Email validation with regex
   - Text field validation (2-500 chars)
   - Malicious content detection
   - Server-safe sanitization function

2. **Rate Limiting** (`actions/diagnose.ts`)
   - In-memory rate limiting (5 requests/hour/email)
   - Automatic cleanup of expired entries
   - No database changes required

3. **XSS Protection** (`components/diagnostic-form.tsx`)
   - Removed manual HTML escaping (React handles it)
   - React automatically escapes text content
   - Security maintained without display issues

4. **SQL Injection Protection**
   - Verified Supabase RPC uses parameter binding
   - No vulnerabilities found

### What Was Reverted:
1. ~~**Loqate API Proxy** - Broke address lookup, reverted to client-side~~ **NOW FIXED (2025-07-19)**
2. ~~**Complex Security Headers** - Caused 403 errors, simplified middleware~~ **NOW FIXED (2025-07-19)**

### Client-Side Validation Implementation (2025-07-19):
1. **HTML5 Validation Attributes**
   - Added to all form inputs in both booking modal and widget
   - Includes: required, minLength, maxLength, pattern, type attributes
   - Mobile keyboards show appropriate input types

2. **Real-Time Validation Feedback**
   - Validation functions imported from `/lib/validation.ts`
   - Validates on blur events
   - Shows inline error messages
   - Red borders on invalid fields
   - Clears errors when user types

3. **Form Submission Protection**
   - Validates all fields before allowing progression
   - Booking modal: validates on Continue button clicks
   - Booking widget: validates before payment processing
   - Expands accordion sections with errors (widget only)

### Loqate API Proxy Implementation (2025-07-19):
1. **Proxy Endpoint Created**
   - `/api/address-lookup/route.ts` handles all Loqate API calls
   - Supports both 'find' and 'retrieve' actions
   - Returns simplified response format

2. **Security Features**
   - API key moved to server-side only (use `LOQATE_KEY` without `NEXT_PUBLIC_` prefix)
   - Rate limiting: 20 requests per minute per IP
   - Input validation and sanitization
   - Proper error handling and logging

3. **Component Updates**
   - Both booking modal and widget updated to use proxy endpoint
   - Removed all direct Loqate API calls
   - Updated response handling for proxy's format
   - Fixed parameter name issue (Text vs SearchTerm)

### Security Headers Implementation (2025-07-19):
1. **Headers Added (Minimal Approach)**
   - X-Content-Type-Options: nosniff
   - Referrer-Policy: strict-origin-when-cross-origin
   - X-Frame-Options: SAMEORIGIN (non-widget paths only)
   - X-DNS-Prefetch-Control: on
   - Permissions-Policy: camera=(), microphone=(), geolocation=()
   - Strict-Transport-Security (production only)

2. **Content Security Policy**
   - Implemented in report-only mode first
   - Allows necessary resources (Stripe, inline scripts/styles)
   - Frame-ancestors for widget: ransomspares.co.uk, ransomdev.co.uk
   - Includes Vercel development features
   - CSP violation reporting endpoint at `/api/csp-report`

3. **Testing Approach**
   - Started with minimal headers
   - Tested both booking modal and widget
   - No functionality breakage
   - Ready for production use

4. **CSP Reporting Endpoint** (Added 2025-07-19)
   - `/api/csp-report/route.ts` collects CSP violations
   - Logs to Vercel Functions logs
   - Excluded from rate limiting
   - Safe implementation (always returns 204)

### Security Improvements Completed (2025-07-16):

1. **✅ Server-side validation implemented (Bookings)**
   - Created secure `/actions/create-booking.ts` server action
   - Uses validation library for all user inputs
   - Sanitizes data before database insertion
   - Both booking modal and widget updated to use secure action

2. **✅ DiagnoSys security enhanced**
   - Input validation prevents malicious inputs
   - Rate limiting prevents API abuse
   - XSS protection via React's built-in escaping
   - SQL injection not possible (parameterized queries)

3. **✅ Client-side validation implemented (Bookings)**
   - HTML5 validation attributes on all inputs
   - Real-time validation feedback
   - Prevents invalid form submission
   - Better mobile experience with proper input types

4. **✅ Loqate API proxy implemented**
   - API key moved to server-side only
   - Rate limiting (20 requests/minute per IP)
   - Input validation and sanitization
   - Both booking components updated to use proxy

3. **✅ Loqate monitoring added**
   - Console logging for API usage tracking
   - Logs timestamp and source (modal vs widget)
   - Privacy-conscious - only logs partial queries

### Remaining Security TODO:

**Medium Priority:**
1. ~~**Add Security Headers** (Defense in Depth)~~ **✅ COMPLETED (2025-07-19)**
   - ✅ Implemented CSP in report-only mode
   - ✅ Added X-Frame-Options for non-widget paths
   - ✅ Tested thoroughly - no functionality broken
   - Consider switching CSP to enforcing mode after monitoring

**Low Priority:**
1. **Add persistent rate limiting**
   - Current in-memory solution works but resets on restart
   - Database-backed solution for production scale

2. **Add audit logging**
   - Track diagnostic requests for analysis
   - Monitor for abuse patterns

3. **Add CSRF protection** 
   - Low risk - no user accounts to compromise
   - Rate limiting already helps
   - Only if adding user authentication

### Security Assessment Summary:
**Current Risk Level: Low**
- Payment security is solid (Stripe)
- DiagnoSys protected against common attacks
- Spare Parts Search secured against XSS, API abuse, and malicious inputs
- No sensitive data exposure
- Rate limiting prevents API abuse
- **Production-ready with current security measures**

### Spare Parts Search Security (2025-07-16):

#### What Was Implemented:
1. **Input Validation** (`lib/validation.ts`)
   - `validateSparePartsCategory()` - Validates appliance types
   - `validateSparePartsBrand()` - Validates brand names  
   - `validateSparePartsModel()` - Validates model numbers
   - `validateSparePartsSearchTerm()` - Validates search terms
   - Length limits, character validation, malicious pattern detection

2. **Server-Side Rate Limiting**
   - `search-spare-parts.ts`: 20 searches/minute limit
   - `get-spare-parts-options.ts`: 100 lookups/minute (autocomplete)
   - In-memory tracking with proper retry-after responses

3. **Input Sanitization**
   - All inputs sanitized before database calls
   - Removes dangerous characters
   - Enforces length limits

4. **URL Validation**
   - Database URLs sanitized with `sanitizeUrl()`
   - Prevents javascript:, data: and other dangerous schemes

5. **Secure Error Handling**
   - Production-safe logging (no sensitive details)
   - Generic error messages to users
   - Console logs only in development mode