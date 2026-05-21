# 8 — Display vs Storage — Normalization in Form Workflows

---

## T — TL;DR

Dates flow through three layers: **user input** (string from HTML), **application logic** (`Date` object), **storage** (ISO string). Normalise at each boundary — parse on input, work with `Date` internally, serialise to ISO on storage. Never store display-formatted strings; never display ISO strings raw.

---

## K — Key Concepts

```
DATE FLOW IN A FORM WORKFLOW:

  HTML input           → string    '2025-06-15'         (yyyy-MM-dd)
       ↓ parseISO / z.coerce.date
  RHF + Zod            → Date      new Date(2025,5,15)
       ↓ business logic (addDays, isBefore, etc.)
  handleSubmit data    → Date      validated + transformed Date
       ↓ formatISO
  API payload / DB     → string    '2025-06-15T00:00:00+08:00'  (ISO 8601)
       ↓ parseISO
  Received from API    → Date      hydrated back to Date
       ↓ format
  Display to user      → string    'June 15, 2025'       (locale string)
```

```ts
// ─── Layer 1: HTML input → Date (parse boundary)
// <input type="date"> always gives 'yyyy-MM-dd'
// Use z.coerce.date() or parseISO in a Zod transform

const DateFieldSchema = z.string()
  .min(1, 'Date is required')
  .transform(v => parseISO(v))
  .refine(d => isValid(d), 'Invalid date')
// OR simpler:
const DateFieldSchema = z.coerce.date()
```

```ts
// ─── Layer 2: submitted Date → ISO string (storage boundary)
async function onSubmit(data: BookingForm) {
  const payload = {
    ...data,
    // Convert Date → ISO string for JSON API
    checkIn:  formatISO(data.checkIn,  { representation: 'date' }),
    checkOut: formatISO(data.checkOut, { representation: 'date' }),
    // Preserve full datetime with offset for exact moments
    createdAt: formatISO(new Date())
  }
  await api.post('/bookings', payload)
}
```

```ts
// ─── Layer 3: API response → Date → display (hydration boundary)
interface ApiBooking {
  checkIn:  string  // '2025-06-15'
  checkOut: string  // '2025-06-22'
  createdAt: string // '2025-06-01T09:00:00+08:00'
}

function hydrate(api: ApiBooking) {
  return {
    checkIn:   parseISO(api.checkIn),    // Date
    checkOut:  parseISO(api.checkOut),   // Date
    createdAt: parseISO(api.createdAt)   // Date
  }
}

function display(booking: ReturnType<typeof hydrate>) {
  return {
    checkIn:   format(booking.checkIn,   'MMMM d, yyyy'),
    checkOut:  format(booking.checkOut,  'MMMM d, yyyy'),
    createdAt: formatDistanceToNow(booking.createdAt, { addSuffix: true })
  }
}
```

```ts
// ─── Populating an edit form from existing data (roundtrip)
// Data from API: { checkIn: '2025-06-15', checkOut: '2025-06-22' }
// Form expects: defaultValues with yyyy-MM-dd strings for <input type="date">

function apiToFormDefaults(apiData: ApiBooking) {
  return {
    // <input type="date"> needs yyyy-MM-dd — parseISO → format cycle
    checkIn:  apiData.checkIn,   // already yyyy-MM-dd ✅
    checkOut: apiData.checkOut,  // already yyyy-MM-dd ✅
    // If the API returns datetime: '2025-06-15T14:30:00Z'
    //   format(parseISO(api.startTime), 'yyyy-MM-dd') for date input
    //   format(parseISO(api.startTime), 'HH:mm')       for time input
  }
}
```

---

## W — Why It Matters

- Storing `'June 15, 2025'` in a database instead of `'2025-06-15'` breaks sorting, filtering, and any code that later tries to compare dates — display strings are not sortable.
- `formatISO` with timezone offset (`+08:00`) is critical for scheduling — storing `'2025-06-15'` for a 9 AM meeting means different absolute times for users in different timezones. Store the offset to preserve intent.
- The edit form roundtrip (API ISO → parseISO → Date → format('yyyy-MM-dd') → input value) is the most frequently broken pattern — developers skip one step and the input shows blank or `Invalid Date`.

---

## I — Interview Q&A

### Q: How do you populate an edit form's date input from an API response that returns ISO datetime strings?

**A:** Three steps. Parse the ISO string to a `Date` with `parseISO(apiString)`. Then format it to the HTML input's required format with `format(date, 'yyyy-MM-dd')` for `<input type="date">`, or `format(date, "yyyy-MM-dd'T'HH:mm")` for `<input type="datetime-local">`. Pass the result as the `defaultValues` for that field. Never pass the raw ISO string directly to the input — `datetime-local` inputs reject strings with timezone offsets and seconds, so the field appears blank.

---

## C — Common Pitfalls + Fix

### ❌ Passing a raw ISO datetime string as `defaultValues` for a date input

```tsx
// ❌ '2025-06-15T09:00:00+08:00' → input shows blank
useForm({ defaultValues: { startDate: '2025-06-15T09:00:00+08:00' } })
<input type="date" {...register('startDate')} />
// The browser rejects the full ISO datetime for a date input — shows empty ❌
```

**Fix:** Format to `yyyy-MM-dd` when setting defaultValues:

```tsx
// ✅ Parse then reformat for the input type
import { parseISO, format } from 'date-fns'

const apiDate = '2025-06-15T09:00:00+08:00'
useForm({
  defaultValues: {
    startDate: format(parseISO(apiDate), 'yyyy-MM-dd')  // '2025-06-15' ✅
  }
})
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete date-aware edit booking form: load data from a mock API (`checkIn`, `checkOut` as ISO strings), populate the form, validate with Zod (checkOut after checkIn, both in future), on submit convert back to ISO strings for the API payload. Use the full display-vs-storage pattern.

### Solution

```tsx
'use client'
import { useEffect }              from 'react'
import { useForm }                from 'react-hook-form'
import { zodResolver }            from '@hookform/resolvers/zod'
import { z }                      from 'zod'
import { parseISO, format, formatISO,
         isAfter, isFuture, isValid,
         differenceInDays }       from 'date-fns'

// ─── Schema: dates coerced from yyyy-MM-dd strings
const BookingSchema = z.object({
  guestName: z.string().min(2, 'Required'),
  checkIn:   z.coerce.date({ required_error: 'Check-in required' }),
  checkOut:  z.coerce.date({ required_error: 'Check-out required' })
})
.refine(d => isFuture(d.checkIn), {
  message: 'Check-in must be in the future', path: ['checkIn']
})
.refine(d => isAfter(d.checkOut, d.checkIn), {
  message: 'Check-out must be after check-in', path: ['checkOut']
})

type BookingForm = z.infer<typeof BookingSchema>

// ─── Mock API data (ISO strings from server)
const MOCK_API = {
  guestName: 'Mark Austin',
  checkIn:   '2026-07-10T00:00:00+08:00',
  checkOut:  '2026-07-15T00:00:00+08:00'
}

// ─── Transform: API → form defaults (ISO datetime → yyyy-MM-dd for input)
function apiToDefaults(api: typeof MOCK_API) {
  return {
    guestName: api.guestName,
    checkIn:   format(parseISO(api.checkIn),  'yyyy-MM-dd'),
    checkOut:  format(parseISO(api.checkOut), 'yyyy-MM-dd')
  }
}

// ─── Transform: form data → API payload (Date → ISO string)
function dataToPayload(data: BookingForm) {
  return {
    guestName: data.guestName,
    checkIn:   formatISO(data.checkIn,  { representation: 'date' }),
    checkOut:  formatISO(data.checkOut, { representation: 'date' }),
    updatedAt: formatISO(new Date())
  }
}

export function EditBookingForm() {
  const { register, handleSubmit, reset, watch,
          formState: { errors, isDirty, isSubmitting } } = useForm<BookingForm>({
    resolver:      zodResolver(BookingSchema),
    defaultValues: { guestName: '', checkIn: undefined, checkOut: undefined }
  })

  // Simulate loading from API
  useEffect(() => {
    const defaults = apiToDefaults(MOCK_API)
    reset(defaults)
  }, [reset])

  // Live night count display
  const checkIn  = watch('checkIn')
  const checkOut = watch('checkOut')
  const nights   = (checkIn && checkOut && isValid(checkIn) && isValid(checkOut) && isAfter(checkOut, checkIn))
    ? differenceInDays(checkOut, checkIn)
    : null

  async function onSubmit(data: BookingForm) {
    const payload = dataToPayload(data)
    await new Promise(r => setTimeout(r, 800))  // mock API call
    console.log('Saved payload:', payload)
    // payload.checkIn  → '2026-07-10'  (ISO date string for DB)
    // payload.checkOut → '2026-07-15'
    // payload.updatedAt → '2026-06-15T...' (full ISO with offset)
    reset(apiToDefaults({
      guestName: data.guestName,
      checkIn:   payload.checkIn  + 'T00:00:00+08:00',
      checkOut:  payload.checkOut + 'T00:00:00+08:00'
    }))
  }

  const cls = 'w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const err = 'text-xs text-red-600 mt-1'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Guest name</label>
        <input {...register('guestName')} className={cls} />
        {errors.guestName && <p className={err}>{errors.guestName.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Check-in</label>
          <input {...register('checkIn')} type="date" className={cls} />
          {errors.checkIn  && <p className={err}>{errors.checkIn.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Check-out</label>
          <input {...register('checkOut')} type="date" className={cls} />
          {errors.checkOut && <p className={err}>{errors.checkOut.message}</p>}
        </div>
      </div>

      {nights !== null && (
        <p className="text-sm text-blue-600 font-medium">
          {nights} night{nights !== 1 ? 's' : ''}
        </p>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={() => reset(apiToDefaults(MOCK_API))} disabled={!isDirty}
                className="flex-1 py-2.5 border rounded-xl text-sm font-semibold disabled:opacity-40">
          Discard
        </button>
        <button type="submit" disabled={!isDirty || isSubmitting}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm
                            font-semibold disabled:opacity-40">
          {isSubmitting ? 'Saving…' : 'Save booking'}
        </button>
      </div>
    </form>
  )
}
```

---

## ✅ Day 7 Complete — date-fns for Form Workflows

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Fundamentals — Pure Functions and Immutability | ☐ |
| 2 | `format` and `formatISO` | ☐ |
| 3 | `parse` and `parseISO` | ☐ |
| 4 | Add/Subtract Helpers | ☐ |
| 5 | Date Comparisons | ☐ |
| 6 | Intervals and Duration | ☐ |
| 7 | `formatDistance` and `formatRelative` | ☐ |
| 8 | Display vs Storage — Normalization | ☐ |

---

## 🗺️ One-Page Mental Model — Day 7

```
CORE PRINCIPLE
  date-fns = pure functions, immutable, tree-shaken, typed
  Always: import { fn } from 'date-fns'  — never default import

FORMAT (Date → string)
  format(d, 'yyyy-MM-dd')           → '2025-06-15'
  format(d, 'MMMM d, yyyy')         → 'June 15, 2025'
  format(d, 'HH:mm')                → '14:30'
  format(d, "yyyy-MM-dd'T'HH:mm")   → '2025-06-15T14:30'  (datetime-local)
  formatISO(d)                       → '2025-06-15T14:30:00+08:00'
  formatISO(d, { representation: 'date' }) → '2025-06-15'
  Tokens: yyyy MM dd HH mm ss MMMM MMM EEEE EEE h a  (lowercase dd for day!)

PARSE (string → Date)
  parseISO('2025-06-15')              → Date (local midnight)
  parse('15/06/2025', 'dd/MM/yyyy', new Date()) → Date
  ALWAYS: isValid(result) after parsing
  new Date('2025-06-15')    ← avoid (UTC midnight bug)

ADD/SUBTRACT
  addDays(d, 7)   subDays(d, 7)
  addMonths(d, 1) → handles month-end clipping (Jan31+1mo = Feb28)
  add(d, { years: 1, months: 2, days: 3 })  → multi-unit
  min([d1,d2])  max([d1,d2])

COMPARISONS
  isBefore(a, b)    isAfter(a, b)    isEqual(a, b)
  isFuture(d)       isPast(d)        isToday(d)
  isValid(d)        ← always check after parse
  differenceInDays(end, start)       → number (truncated)
  compareAsc / compareDesc           → for array.sort()

INTERVALS
  intervalToDuration({ start, end })  → { years, months, days, hours... }
  formatDuration(duration, { format: ['months','days'], zero: false })
  eachDayOfInterval({ start, end })   → Date[]  (all days in range)
  isWithinInterval(date, interval)    → boolean
  areIntervalsOverlapping(a, b)       → boolean  (booking conflicts)

RELATIVE
  formatDistanceToNow(d, { addSuffix: true })  → '3 days ago' / 'in 2 hours'
  formatDistance(d, base, { addSuffix: true })
  formatRelative(d, base)                      → 'yesterday at 2 PM'
  Use 'use client' — avoids SSR hydration mismatch

DISPLAY vs STORAGE PATTERN
  HTML input       → string   'yyyy-MM-dd'
       ↓ parseISO / z.coerce.date()
  App logic        → Date
       ↓ isBefore, addDays, isValid, etc.
  handleSubmit     → Date (validated)
       ↓ formatISO(d) or formatISO(d, { representation: 'date' })
  API/DB           → ISO string '2025-06-15T00:00:00+08:00'
       ↓ parseISO
  Edit form default → format(parseISO(api.date), 'yyyy-MM-dd')

COMMON BUGS
  format(d, 'DD') → Day of year, not day of month (use dd)
  format(d, 'YYYY') → Week year, not calendar year (use yyyy)
  new Date('2025-06-15') → UTC midnight bug (use parseISO)
  Raw ISO datetime as input defaultValue → blank field (format first)
  eachDayOfInterval end < start → RangeError (guard order)
  compareDate === → always false on Date objects (use isEqual)
  formatDistanceToNow in SSR → hydration mismatch (use 'use client')
```

> **Your next action:** Find any `new Date(someString)` in your codebase. Replace it with `parseISO(someString)` and add an `isValid()` check. That's all — one safe swap.
>
> *Doing one small thing beats opening a feed.*
