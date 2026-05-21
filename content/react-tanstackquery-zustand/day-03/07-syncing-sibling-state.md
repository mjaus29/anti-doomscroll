# 7 — Syncing Sibling State

---

## T — TL;DR

Two sibling components **cannot share state directly** — they have no way to communicate. The only correct solution is to lift the state to their common parent, which then passes it down to both. This is lifting state up applied to the sibling relationship.

---

## K — Key Concepts

```tsx
// ── Siblings can't see each other's state ────────────────────────────────
function App() {
  return (
    <>
      <TemperatureInput />   {/* Celsius — own state */}
      <TemperatureInput />   {/* Fahrenheit — own state */}
      {/* They have no way to stay in sync ❌ */}
    </>
  )
}
```

```tsx
// ── Lift to parent — parent owns the single source of truth ──────────────
type Scale = 'c' | 'f'
interface TemperatureInputProps {
  value:    string
  scale:    Scale
  onChange: (value: string) => void
}

function TemperatureInput({ value, scale, onChange }: TemperatureInputProps) {
  const label = scale === 'c' ? 'Celsius' : 'Fahrenheit'
  return (
    <label>
      {label}:
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </label>
  )
}

function toCelsius(f: number)    { return (f - 32) * 5 / 9 }
function toFahrenheit(c: number) { return c * 9 / 5 + 32 }

function TemperatureCalculator() {
  const [celsius, setCelsius] = useState('')   // ← single source of truth

  const fahrenheit = celsius !== ''
    ? toFahrenheit(parseFloat(celsius)).toFixed(2)
    : ''

  function handleCelsiusChange(value: string) {
    setCelsius(value)
  }
  function handleFahrenheitChange(value: string) {
    const c = value !== '' ? toCelsius(parseFloat(value)).toFixed(2) : ''
    setCelsius(c)   // always convert back to Celsius ✅
  }

  return (
    <div>
      <TemperatureInput scale="c" value={celsius}     onChange={handleCelsiusChange} />
      <TemperatureInput scale="f" value={fahrenheit}  onChange={handleFahrenheitChange} />
    </div>
  )
}
// Both inputs stay in sync because they both derive from one 'celsius' state ✅
```

```tsx
// ── Syncing via shared ID (both read from the same source) ─────────────────
// Parent owns selectedId → passes to both siblings
function ProductPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null)

  return (
    <div>
      <ProductList
        selectedId={selectedId}
        onSelect={setSelectedId}   // sibling A writes
      />
      <ProductDetail
        productId={selectedId}     // sibling B reads
      />
    </div>
  )
}
// ProductList and ProductDetail stay in sync through parent ✅
```

---

## W — Why It Matters

- The temperature calculator is the canonical React example of synced siblings — it clearly shows why lifting is necessary and what the pattern looks like in a real scenario.
- "Siblings can't communicate directly" is a strict rule in React's architecture — understanding this early prevents the instinct to try `ref`-passing between siblings, which is an anti-pattern.
- The "store one value, derive the other" approach for synced siblings (store Celsius, derive Fahrenheit) is important — storing both leads to duplication and the risk of both being valid sources of truth simultaneously.

---

## I — Interview Q&A

### Q: How do you synchronise state between two sibling components in React?

**A:** You can't directly — siblings have no access to each other's state. The solution is to lift the state to their nearest common parent. The parent owns a single source of truth and passes the current value and an update callback to each sibling as props. When one sibling calls the callback, the parent updates the state, which re-renders both siblings with the new value. If both siblings represent the same data in different units or formats (like Celsius/Fahrenheit), store one canonical form in state and derive the other during render — never store both.

---

## C — Common Pitfalls + Fix

### ❌ Using useEffect to sync one sibling's state when the other changes

```tsx
// ❌ Effect-based sync — two states, two effects, eventual consistency
function TemperatureCalcBad() {
  const [celsius,     setCelsius]     = useState(0)
  const [fahrenheit,  setFahrenheit]  = useState(32)

  useEffect(() => {
    setFahrenheit(celsius * 9/5 + 32)    // ❌ extra render, potential loop
  }, [celsius])

  useEffect(() => {
    setCelsius((fahrenheit - 32) * 5/9)  // ❌ can loop if both effects fire
  }, [fahrenheit])
}

// ✅ Store one, derive the other inline
function TemperatureCalcGood() {
  const [celsius, setCelsius] = useState(0)
  const fahrenheit = celsius * 9/5 + 32   // always in sync, no effects needed ✅

  return (
    <>
      <input type="number" value={celsius}     onChange={e => setCelsius(+e.target.value)} />
      <input type="number" value={fahrenheit}
        onChange={e => setCelsius((+e.target.value - 32) * 5/9)} />
    </>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a currency converter: two inputs (USD and EUR) that stay in sync. Typing in one updates the other. Store only USD, derive EUR.

### Solution

```tsx
const USD_TO_EUR = 0.92

interface CurrencyInputProps {
  label:    string
  value:    string
  onChange: (value: string) => void
}

function CurrencyInput({ label, value, onChange }: CurrencyInputProps) {
  return (
    <label>
      {label}
      <input
        type="number"
        value={value}
        min="0"
        step="0.01"
        onChange={e => onChange(e.target.value)}
      />
    </label>
  )
}

function CurrencyConverter() {
  const [usd, setUsd] = useState('')   // single source of truth

  // Derive EUR from USD — always in sync
  const eur = usd !== '' ? (parseFloat(usd) * USD_TO_EUR).toFixed(2) : ''

  function handleUsdChange(value: string) {
    setUsd(value)
  }

  function handleEurChange(value: string) {
    // Convert EUR back to USD — store canonical USD
    const usdVal = value !== '' ? (parseFloat(value) / USD_TO_EUR).toFixed(2) : ''
    setUsd(usdVal)
  }

  return (
    <div>
      <CurrencyInput label="USD $" value={usd} onChange={handleUsdChange} />
      <CurrencyInput label="EUR €" value={eur} onChange={handleEurChange} />
      {usd !== '' && (
        <p>${parseFloat(usd).toFixed(2)} = €{eur}</p>
      )}
    </div>
  )
}
```

---

---
