# Tax Page - Developer Quick Reference

## Component Structure

### Tax.js Component
- **Location**: `src/pages/Tax.js`
- **Type**: React Functional Component
- **Dependencies**: 
  - React (useState, useContext)
  - AuthContext
  - ErrorBoundary
  - paystackService
  - api service

### CSS
- **Location**: `src/pages/Tax.css`
- **Size**: 500+ lines
- **Breakpoints**: Mobile (480px), Tablet (768px), Desktop (1200px)

## Configuration Objects

### TAX_TYPES
```javascript
{
  PERSONAL: { id: 'personal', name: 'Personal Tax', icon: '👤', description: '...' },
  CORPORATE: { id: 'corporate', name: 'Corporate Tax', icon: '🏢', description: '...' },
  PROPERTY: { id: 'property', name: 'Property Tax', icon: '🏠', description: '...' },
  CAPITAL_GAINS: { id: 'capital_gains', name: 'Capital Gains Tax', icon: '📈', ... },
}
```

### TAX_AUTHORITIES
```javascript
{
  personal: { FIRS: {...}, STATE: {...} },
  corporate: { FIRS: {...}, FIRS_SPECIAL: {...} },
  property: { LOCAL: {...}, STATE: {...} },
  capital_gains: { FIRS: {...} },
}
```

### AMOUNT_PRESETS
```javascript
[1000, 5000, 10000, 25000, 50000, 100000]
```

## State Variables

| Variable | Type | Purpose |
|----------|------|---------|
| `currentStep` | number | Current form step (1-5) |
| `selectedTaxType` | string | Selected tax type ID |
| `selectedAuthority` | string | Selected authority ID |
| `selectedAmount` | number | Selected preset amount |
| `customAmount` | string | Custom amount input |
| `taxID` | string | Tax identification number |
| `businessName` | string | Business name |
| `address` | string | User address |
| `email` | string | User email |
| `phone` | string | User phone |
| `loading` | boolean | Payment processing state |
| `error` | string | Error message |
| `success` | boolean | Success state |

## Key Functions

### `isCurrentStepValid()`
Validates current step before allowing progression.
```javascript
isCurrentStepValid() => boolean
```

### `handleNext()`
Advances to next step if validation passes.
```javascript
handleNext() => void
```

### `handleBack()`
Returns to previous step.
```javascript
handleBack() => void
```

### `getAmount()`
Returns either selected preset or custom amount.
```javascript
getAmount() => number
```

### `handleSubmit()`
Initiates payment through Paystack.
```javascript
handleSubmit() => Promise<void>
```

### `handleAmountSelect(amount)`
Selects preset amount and clears custom.
```javascript
handleAmountSelect(amount: number) => void
```

### `handleCustomAmountChange(e)`
Updates custom amount and clears preset.
```javascript
handleCustomAmountChange(e: ChangeEvent) => void
```

### `dismissError()`
Clears error message.
```javascript
dismissError() => void
```

## Render Functions

### `renderStep1()` - Tax Type Selection
Displays grid of tax type cards.

### `renderStep2()` - Authority Selection
Shows authorities based on selected tax type.

### `renderStep3()` - Amount Selection
Displays preset amounts and custom input.

### `renderStep4()` - Tax Information
Form for tax ID and business name.

### `renderStep5()` - Contact & Summary
Contact details form and payment summary.

## CSS Classes

### Container Classes
- `.tax-page` - Main container
- `.tax-form` - Form wrapper
- `.tax-step` - Individual step container

### Card Classes
- `.tax-type-card` - Tax type selection cards
- `.authority-card` - Authority selection cards
- `.amount-btn` - Amount selection buttons
- `.summary-card` - Summary display card

### Form Classes
- `.form-group` - Form field group
- `.form-actions` - Button container
- `.custom-amount-section` - Custom amount input wrapper

### State Classes
- `.active` - Active/selected state
- `.error` - Error state
- `.warning` - Warning state

### Info Classes
- `.info-box` - Information box
- `.error-banner` - Error message banner
- `.step-indicator` - Step progress indicator

## Styling Variables

### Colors
- Primary Gradient: `#667eea` to `#764ba2`
- Background: `#f8f9fa`
- Border: `#e1e5e9`
- Text: `#333` (primary), `#666` (secondary), `#999` (tertiary)
- Success: Green
- Warning: Amber
- Error: Red

### Spacing
- Small: 8px
- Medium: 12px
- Large: 16px
- Extra Large: 20px, 30px
- Page Padding: 20px (mobile), 30px (desktop)

### Border Radius
- Cards: 10px
- Buttons: 8px
- Large elements: 12px

### Shadows
- Light: `0 4px 15px rgba(0,0,0,0.1)`
- Medium: `0 4px 20px rgba(0,0,0,0.1)`
- Gradient hover: `0 4px 15px rgba(102, 126, 234, 0.15)`

## Media Query Breakpoints

```css
Mobile:   max-width: 480px
Tablet:   max-width: 768px
Desktop:  min-width: 1200px
```

## Integration Points

### AuthContext
```javascript
const { user } = useContext(AuthContext);
// Access user.email, user.phone
```

### Paystack Service
```javascript
await paystackService.initializePayment({
  email,
  amount,        // in kobo (× 100)
  reference,     // unique ref
  metadata: {}   // payment details
});
```

### Error Boundary
```javascript
<ErrorBoundary>
  {/* Component content */}
</ErrorBoundary>
```

## Validation Rules

### Tax ID
- Minimum 3 characters
- Required

### Amount
- Minimum ₦100
- Either preset or custom
- Must be valid number

### Phone
- Required
- Should be valid format

### Email
- Required
- Valid email format

### Address
- Required
- Non-empty string

## Common Tasks

### Add New Tax Type
1. Update `TAX_TYPES` object with new type
2. Add authorities in `TAX_AUTHORITIES`
3. Update form conditional logic if needed

### Add New Authority
1. Update `TAX_AUTHORITIES` object
2. Select correct tax type category
3. Add icon and description

### Change Amount Presets
Update `AMOUNT_PRESETS` array:
```javascript
const AMOUNT_PRESETS = [1000, 5000, ...];
```

### Modify Styling
Edit `/src/pages/Tax.css` with proper media queries.

## Error Handling

### Display Error
```javascript
setError('Error message');
```

### Clear Error
```javascript
setError('');
// or
dismissError();
```

### Common Errors
- "Please fill in all required fields" - Validation failed
- "Amount must be at least ₦100" - Invalid amount
- "Failed to initialize payment" - Paystack error

## Testing Checklist

- [ ] All steps navigate correctly
- [ ] Validation prevents invalid progression
- [ ] Tax types display correctly
- [ ] Authorities change with tax type
- [ ] Amount selection works
- [ ] Custom amount input works
- [ ] Form fields validate
- [ ] Payment initializes
- [ ] Error messages display
- [ ] Responsive on mobile/tablet/desktop
- [ ] Loading state shows
- [ ] Back button works
- [ ] Summary displays all info

## Performance Tips

1. Avoid unnecessary state updates
2. Use proper key props in maps
3. Memoize heavy computations
4. Optimize CSS animations
5. Lazy load payment gateway

## Browser Compatibility

- Modern browsers (ES6 support required)
- CSS Grid and Flexbox support
- CSS Custom Properties
- Promise/async-await support

## Notes

- All amounts in Naira (₦)
- Payment processing redirects to Paystack
- User context provides email/phone defaults
- Error banner dismissible
- Step navigation prevented by validation

---

**Last Updated**: 2024
**Maintainer**: Development Team
