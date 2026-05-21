# 5 — Shallow Merge Behavior + Immutable Flat Updates

---

## T — TL;DR

`set(partial)` in Zustand **shallow-merges** — it only replaces the top-level keys you provide, leaving everything else untouched. For nested objects, you must spread manually to maintain immutability — Zustand will NOT deep-merge.

---

## K — Key Concepts

```tsx
// ── Shallow merge: set only updates what you provide ─────────────────────
const useStore = create<{ a: number; b: number; c: number }>(set => ({
  a: 1, b: 2, c: 3,
  update: () => set({ a: 10 }),   // b and c are untouched ✅
}))
// After update(): { a: 10, b: 2, c: 3 }  ← b and c preserved

// ── Flat state: straightforward updates ──────────────────────────────────
interface UIStore {
  isDrawerOpen: boolean
  activeTab:    string
  searchQuery:  string
  toggleDrawer: () => void
  setTab:       (tab: string) => void
  setSearch:    (q: string) => void
}

const useUIStore = create<UIStore>(set => ({
  isDrawerOpen: false,
  activeTab:    'overview',
  searchQuery:  '',

  toggleDrawer: () => set(s => ({ isDrawerOpen: !s.isDrawerOpen })),
  setTab:       (activeTab)    => set({ activeTab }),
  setSearch:    (searchQuery)  => set({ searchQuery }),
}))
// All primitives — set({ field }) is safe, clean, immutable ✅
```

```tsx
// ── Shallow merge does NOT deep-merge nested objects ─────────────────────
interface BadStore {
  user: { name: string; age: number }
  updateName: (name: string) => void
}

const useBadStore = create<BadStore>(set => ({
  user: { name: 'Alice', age: 30 },

  updateName: (name) => set({ user: { name } }),
  // ❌ set shallow-merges at the TOP level
  // user key gets fully replaced with { name } → age is GONE
  // Result: { user: { name: 'Bob' } }  — age: 30 lost ❌
}))

// ✅ Spread the nested object to preserve sibling keys
const useGoodStore = create<BadStore>(set => ({
  user: { name: 'Alice', age: 30 },
  updateName: (name) => set(state => ({ user: { ...state.user, name } })),
  // Result: { user: { name: 'Bob', age: 30 } } ✅
}))
```

```tsx
// ── Flat state design: prefer flat over nested where possible ─────────────
// ❌ Nested — more spread boilerplate, harder to update
interface NestedStore {
  user:     { name: string; role: string }
  settings: { theme: string; notifications: boolean }
}

// ✅ Flat — simple set() calls
interface FlatStore {
  userName:              string
  userRole:              string
  settingsTheme:         string
  settingsNotifications: boolean
}
// Each field updated independently with set({ fieldName: value })
// No spread chains needed ✅
```

---

## W — Why It Matters

- Shallow merge is the source of the most common Zustand bug: `set({ user: { name } })` feels like "update user.name" but actually **replaces the entire user object**. Every nested update needs an explicit spread.
- Flat state design sidesteps the problem entirely — if each piece of data is a top-level key, `set({ theme: 'dark' })` is always safe.
- Understanding merge behavior is critical for TypeScript — the type system won't warn you about replacing `user: { name, age }` with `user: { name }` if `age` is optional; the bug is silent at compile time.

---

## I — Interview Q&A

### Q: How does Zustand's `set` work and what are the implications for nested state?

**A:** `set(partial)` performs a **shallow merge** at the top level of the store — it calls `Object.assign(currentState, partial)` internally. For top-level primitive fields, this is safe: `set({ count: 5 })` updates `count` and leaves everything else. For nested objects, it replaces the entire nested object — `set({ user: { name: 'Bob' } })` deletes every other field inside `user`. The fix is manual spreading: `set(s => ({ user: { ...s.user, name: 'Bob' } }))`. The pragmatic solution is to keep state flat where possible, and for deeply nested structures use the Immer middleware to avoid spread chains.

---

## C — Common Pitfalls + Fix

### ❌ Replacing nested object silently — fields disappear

```tsx
interface ProfileStore {
  profile: { name: string; email: string; avatar: string }
  updateEmail: (email: string) => void
}

const useProfileStore = create<ProfileStore>(set => ({
  profile: { name: 'Alice', email: 'alice@old.com', avatar: '/alice.png' },

  // ❌ Replaces entire profile — name and avatar are gone after update
  updateEmail: (email) => set({ profile: { email } }),
  // Result: { profile: { email: 'alice@new.com' } }  name and avatar: GONE ❌
}))

// ✅ Spread to preserve sibling fields
const useProfileStoreFixed = create<ProfileStore>(set => ({
  profile: { name: 'Alice', email: 'alice@old.com', avatar: '/alice.png' },

  updateEmail: (email) =>
    set(state => ({ profile: { ...state.profile, email } })),   // ✅ safe
}))
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `useFormStore` with flat state for a signup form: `firstName`, `lastName`, `email`, `password`, `errors`. Actions: `setField`, `setErrors`, `resetForm`. Demonstrate that every update is immutable.

### Solution

```tsx
interface SignupErrors {
  firstName?: string
  lastName?:  string
  email?:     string
  password?:  string
}
interface FormStore {
  firstName:  string
  lastName:   string
  email:      string
  password:   string
  errors:     SignupErrors
  setField:   <K extends 'firstName' | 'lastName' | 'email' | 'password'>(
                key: K, value: string
              ) => void
  setErrors:  (errors: SignupErrors) => void
  resetForm:  () => void
}

const INITIAL_FORM = { firstName: '', lastName: '', email: '', password: '', errors: {} }

const useFormStore = create<FormStore>(set => ({
  ...INITIAL_FORM,

  // Flat fields → direct set — zero nested spreading needed ✅
  setField: (key, value) => set({ [key]: value, errors: {} }),

  // errors is a nested object → spread to merge, not replace
  setErrors: (newErrors) =>
    set(state => ({ errors: { ...state.errors, ...newErrors } })),

  resetForm: () => set(INITIAL_FORM),
}))

// Usage
function SignupForm() {
  const { firstName, lastName, email, errors, setField, resetForm } = useFormStore(
    useShallow(s => ({
      firstName: s.firstName,
      lastName:  s.lastName,
      email:     s.email,
      errors:    s.errors,
      setField:  s.setField,
      resetForm: s.resetForm,
    }))
  )
  return (
    <form onReset={resetForm}>
      <input value={firstName} onChange={e => setField('firstName', e.target.value)} />
      {errors.firstName && <p role="alert">{errors.firstName}</p>}
      <input value={email} onChange={e => setField('email', e.target.value)} />
      {errors.email && <p role="alert">{errors.email}</p>}
    </form>
  )
}
```

---

---
