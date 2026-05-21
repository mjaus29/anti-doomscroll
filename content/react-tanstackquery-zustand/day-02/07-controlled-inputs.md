# 7 — Controlled Inputs

---

## T — TL;DR

A **controlled input** has its value driven by React state — `value={state}` plus `onChange` to update it. React owns the source of truth. An **uncontrolled input** manages its own DOM value (accessed via `ref`). Controlled is the default for forms in React.

---

## K — Key Concepts

```tsx
// ── Controlled input: React owns the value ────────────────────────────────
function EmailInput() {
  const [email, setEmail] = useState('')

  return (
    <input
      type="email"
      value={email}                             // ← React controls the value
      onChange={e => setEmail(e.target.value)}  // ← update state on change
      placeholder="Enter email"
    />
  )
  // State → input value (display)
  // User types → onChange → setEmail → re-render → input shows new value
}
```

```tsx
// ── Full controlled form ──────────────────────────────────────────────────
interface LoginFormValues {
  email:    string
  password: string
}

function LoginForm({ onSubmit }: { onSubmit: (values: LoginFormValues) => void }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    onSubmit({ email, password })
  }

  function handleReset() {
    setEmail('')
    setPassword('')
  }

  return (
    <form onSubmit={handleSubmit} onReset={handleReset}>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>
      <button type="reset">Clear</button>
      <button type="submit">Log in</button>
    </form>
  )
}
```

```tsx
// ── Controlled checkbox, select, textarea ─────────────────────────────────
// Checkbox: uses 'checked' not 'value'
const [agreed, setAgreed] = useState(false)
<input
  type="checkbox"
  checked={agreed}
  onChange={e => setAgreed(e.target.checked)}   // .checked not .value
/>

// Select
const [country, setCountry] = useState('PH')
<select value={country} onChange={e => setCountry(e.target.value)}>
  <option value="PH">Philippines</option>
  <option value="US">United States</option>
  <option value="JP">Japan</option>
</select>

// Textarea: same as input
const [bio, setBio] = useState('')
<textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} />
```

```tsx
// ── Generic change handler for multi-field form ───────────────────────────
interface ProfileForm {
  name:     string
  email:    string
  website:  string
}

function ProfileEditor() {
  const [form, setForm] = useState<ProfileForm>({ name: '', email: '', website: '' })

  // One handler for all text inputs — uses input 'name' attribute as key
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))   // [name] = computed property key
  }

  return (
    <form>
      <input name="name"    value={form.name}    onChange={handleChange} />
      <input name="email"   value={form.email}   onChange={handleChange} />
      <input name="website" value={form.website} onChange={handleChange} />
    </form>
  )
}
```

---

## W — Why It Matters

- Controlled inputs give React complete ownership of form state — you can validate on every keystroke, compute derived values (character count, validation message), enable/disable buttons based on input, and reset forms programmatically.
- The generic `handleChange` using `e.target.name` as a key is the standard multi-field form pattern — it scales to 20 fields without 20 separate handlers.
- The most common controlled input bug: setting `value` without an `onChange` makes the input read-only (React warns you). If you want uncontrolled with a default, use `defaultValue` instead of `value`.

---

## I — Interview Q&A

### Q: What is the difference between a controlled and uncontrolled input in React?

**A:** A **controlled input** has its value managed by React state — `value={state}` binds the display value, and `onChange` updates the state when the user types. React is the single source of truth. A **uncontrolled input** manages its own value in the DOM — you access it via a `ref` (`inputRef.current.value`) when you need it (typically on submit). Controlled inputs enable real-time validation, conditional rendering, and computed values from the input. Uncontrolled inputs are simpler for file inputs and cases where you only need the value on submit. React Hook Form (Day 5 group) uses uncontrolled inputs under the hood for performance.

---

## C — Common Pitfalls + Fix

### ❌ `value` without `onChange` — read-only input

```tsx
// ❌ value set but no onChange — React makes the input read-only
// React warns: "You provided a `value` prop without an `onChange` handler"
function BrokenInput() {
  const [name, setName] = useState('Mark')
  return <input value={name} />   // user can't type ❌
}

// ✅ Always pair value with onChange
function WorkingInput() {
  const [name, setName] = useState('Mark')
  return (
    <input
      value={name}
      onChange={e => setName(e.target.value)}   // ✅
    />
  )
}

// ✅ If you want a pre-filled but uncontrolled input: use defaultValue
function UncontrolledInput() {
  return <input defaultValue="Mark" />   // user can edit, DOM owns the value
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `SearchInput` controlled component with: live character count, disable submit when empty, clear button that resets state, and a minimum length validation message.

### Solution

```tsx
interface SearchInputProps {
  onSearch: (query: string) => void
  minLength?: number
  maxLength?: number
}

function SearchInput({ onSearch, minLength = 3, maxLength = 100 }: SearchInputProps) {
  const [query, setQuery] = useState('')

  const charCount   = query.length
  const isTooShort  = charCount > 0 && charCount < minLength
  const isEmpty     = charCount === 0
  const isValid     = charCount >= minLength && charCount <= maxLength

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isValid) onSearch(query)
  }

  function handleClear() {
    setQuery('')
  }

  return (
    <form onSubmit={handleSubmit} className="search-form">
      <div className="input-wrapper">
        <input
          type="search"
          value={query}
          onChange={handleChange}
          placeholder={`Search (min ${minLength} chars)…`}
          maxLength={maxLength}
          aria-describedby="search-hint"
        />
        {charCount > 0 && (
          <button type="button" onClick={handleClear} aria-label="Clear search">
            ✕
          </button>
        )}
      </div>

      <div id="search-hint" className="search-meta">
        <span className={charCount > maxLength * 0.9 ? 'count warn' : 'count'}>
          {charCount}/{maxLength}
        </span>
        {isTooShort && (
          <span className="validation-msg">
            At least {minLength} characters required
          </span>
        )}
      </div>

      <button type="submit" disabled={!isValid}>Search</button>
    </form>
  )
}
```

---

---
