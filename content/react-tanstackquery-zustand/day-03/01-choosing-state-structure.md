# 1 — Choosing State Structure

---

## T — TL;DR

Good state structure means storing the **minimal, non-redundant, non-duplicate set of values** that fully describes your UI. Everything else is derived during render. Bad state structure causes bugs where parts of the UI disagree with each other.

---

## K — Key Concepts

```
── Five principles for state structure ──────────────────────────────────────

1. Group related state   → values that always change together go in one object
2. Avoid contradiction   → two state vars that can disagree = bug waiting to happen
3. Avoid redundancy      → if you can compute it from other state, don't store it
4. Avoid duplication     → don't store the same data in two places
5. Avoid deep nesting    → flat structures are easier to update immutably
```

```tsx
// ── Group state that always changes together ──────────────────────────────
// ❌ Two related values that must always change at once
const [x, setX] = useState(0)
const [y, setY] = useState(0)
// If you only call setX and forget setY → inconsistent state

// ✅ One object for related values
const [position, setPosition] = useState({ x: 0, y: 0 })
function handleMove(newX: number, newY: number) {
  setPosition({ x: newX, y: newY })  // atomic update ✅
}
```

```tsx
// ── Avoid contradictory state ─────────────────────────────────────────────
// ❌ isLoading and isError can both be true simultaneously — contradiction
const [isLoading, setIsLoading] = useState(false)
const [isError,   setIsError]   = useState(false)
const [isSuccess, setIsSuccess] = useState(false)
// Bug: if you set isLoading=true and forget to clear isError=true

// ✅ Single status with a union type — only one can be active
type Status = 'idle' | 'loading' | 'error' | 'success'
const [status, setStatus] = useState<Status>('idle')
// Impossible to be in two states simultaneously ✅
```

```tsx
// ── Prefer flat state ─────────────────────────────────────────────────────
// ❌ Deeply nested — every update requires spreading multiple levels
interface DeepState {
  user: {
    profile: {
      address: {
        city: string
        zip:  string
      }
    }
  }
}

// ✅ Flat — easy to update any field
interface FlatState {
  city: string
  zip:  string
  userName: string
}
// Or flatten the relevant parts you actually update
```

---

## W — Why It Matters

- Contradictory state is the root cause of most "why is the UI showing the wrong thing?" bugs — two booleans that disagree produce impossible UI states. A union type makes illegal states unrepresentable.
- Deciding "should this be state?" before writing code is 5 minutes of planning that saves 30 minutes of debugging — the wrong structure forces contortions on every update.
- Grouped vs separate state is a real design decision that affects every downstream `setX` call — wrong choice means either over-spreading or forgetting to update one field.

---

## I — Interview Q&A

### Q: How do you decide whether to group multiple values into one state object or keep them separate?

**A:** Group values when they **always change together** — changing one without the other would leave the state inconsistent. Position `{x, y}`, form fields `{email, password}`, async state as a status union. Keep values separate when they **change independently** — `count`, `isVisible`, `searchQuery` rarely change at the same time and grouping them would mean spreading on every individual update. A secondary signal: if you find yourself always updating both in the same handler, group them. If you update them independently in different handlers, keep them separate.

---

## C — Common Pitfalls + Fix

### ❌ Using two booleans that can contradict each other

```tsx
// ❌ Both can be true — impossible UI state
const [isFetching, setFetching] = useState(false)
const [hasError,   setError]    = useState(false)

async function load() {
  setFetching(true)
  try {
    await fetch('/api/data')
    setFetching(false)
    // Forgot: setError(false) — error might still be true from previous call ❌
  } catch {
    setError(true)
    // Forgot: setFetching(false) — both can be true ❌
  }
}

// ✅ One status — mutually exclusive states
type FetchStatus = 'idle' | 'loading' | 'error' | 'success'
const [status, setStatus] = useState<FetchStatus>('idle')

async function loadFixed() {
  setStatus('loading')
  try {
    await fetch('/api/data')
    setStatus('success')
  } catch {
    setStatus('error')
  }
}
```

---

## K — Coding Challenge + Solution

### Challenge

Redesign this bad state structure for a wizard form: three booleans for step visibility, a `currentStep` number, and a completed boolean. Make illegal states impossible.

### Solution

```tsx
// ❌ Bad: multiple sources of truth that can contradict
const [showStep1, setShowStep1] = useState(true)
const [showStep2, setShowStep2] = useState(false)
const [showStep3, setShowStep3] = useState(false)
const [currentStep, setCurrentStep] = useState(1)
const [isComplete,  setIsComplete]  = useState(false)
// All five can disagree — which is the truth?

// ✅ Good: one source of truth
type WizardStep = 1 | 2 | 3 | 'complete'

interface WizardState {
  step:      WizardStep
  formData:  { name: string; email: string; plan: string }
}

function Wizard() {
  const [wizard, setWizard] = useState<WizardState>({
    step:     1,
    formData: { name: '', email: '', plan: '' },
  })

  const isComplete = wizard.step === 'complete'    // derived ✅
  const isFirstStep = wizard.step === 1            // derived ✅
  const isLastStep  = wizard.step === 3            // derived ✅

  function goNext() {
    setWizard(prev => ({
      ...prev,
      step: prev.step === 3 ? 'complete' : (prev.step as number + 1) as WizardStep,
    }))
  }
  function goBack() {
    setWizard(prev => ({
      ...prev,
      step: typeof prev.step === 'number' && prev.step > 1
        ? (prev.step - 1) as WizardStep
        : prev.step,
    }))
  }

  if (isComplete) return <p>✅ Done!</p>
  return (
    <div>
      <p>Step {wizard.step} of 3</p>
      <button onClick={goBack}  disabled={isFirstStep}>Back</button>
      <button onClick={goNext}>{isLastStep ? 'Submit' : 'Next'}</button>
    </div>
  )
}
```

---

---
