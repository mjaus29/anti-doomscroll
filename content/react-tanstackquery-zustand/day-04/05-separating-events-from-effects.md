# 5 — Separating Events from Effects

---

## T — TL;DR

**Events** run in direct response to a specific user action — once. **Effects** run whenever their dependencies change — to keep things in sync. The question is: "should this code run because the user did X, or because some value is Y?" If it's the former, use an event handler. If the latter, use an effect.

---

## K — Key Concepts

```
── Events vs Effects ─────────────────────────────────────────────────────────

Event handler:
  → Triggered by a specific interaction (click, submit, keypress)
  → Runs once per interaction
  → Not reactive to state changes
  → Place: onClick, onSubmit, onChange handlers

Effect:
  → Triggered by a dependency value changing
  → Runs whenever that value is different
  → Reactive — re-runs to stay "in sync"
  → Place: useEffect

Question: "If the user did nothing but a state/prop changed, should this run?"
  Yes → Effect
  No  → Event handler
```

```tsx
// ── Clear event handler: analytics on button click ─────────────────────────
function BuyButton({ productId }: { productId: number }) {
  function handleClick() {
    // ✅ Event handler: fires BECAUSE the user clicked — once, intentionally
    trackAnalytics('purchase_intent', { productId })
    addToCart(productId)
  }
  return <button onClick={handleClick}>Buy now</button>
}

// ❌ Wrong: putting click-specific logic in useEffect
function BuyButtonWrong({ productId }: { productId: number }) {
  const [clicked, setClicked] = useState(false)

  useEffect(() => {
    if (clicked) {
      // Runs whenever 'clicked' becomes true — even if it wasn't a new click ❌
      trackAnalytics('purchase_intent', { productId })
      addToCart(productId)
      setClicked(false)
    }
  }, [clicked, productId])

  return <button onClick={() => setClicked(true)}>Buy now</button>
}
```

```tsx
// ── Clear effect: sync connection when roomId changes ─────────────────────
function ChatRoom({ roomId }: { roomId: string }) {
  useEffect(() => {
    // ✅ Effect: fires because roomId changed — should stay connected to current room
    const conn = connect(roomId)
    return () => conn.disconnect()
  }, [roomId])
  // This is reactive — if roomId changes while sitting on the page,
  // we should automatically reconnect. That's an effect.
}
```

```tsx
// ── The ambiguous case: notification on connect ───────────────────────────
function ChatRoom({ roomId, isVisible }: { roomId: string; isVisible: boolean }) {
  useEffect(() => {
    const conn = connect(roomId)
    // Should this fire every time isVisible changes? Probably not.
    // Showing a notification is an EVENT (connection happened)
    // not a synchronization (should always show notification when isVisible=true)
    if (isVisible) showNotification(`Joined ${roomId}`)  // ← debatable placement
    return () => conn.disconnect()
  }, [roomId, isVisible])  // ← fires too often (on every isVisible change)
}

// ✅ Cleaner: notification triggered by connect event, not by isVisible sync
function ChatRoomFixed({ roomId }: { roomId: string }) {
  const isVisible = useIsVisible()   // separate hook for visibility

  useEffect(() => {
    const conn = connect(roomId)
    conn.onConnect = () => {
      if (isVisible) showNotification(`Joined ${roomId}`)  // at connect time ✅
    }
    return () => conn.disconnect()
  }, [roomId, isVisible])
}
```

---

## W — Why It Matters

- Putting event logic in `useEffect` with a flag state is an over-engineered anti-pattern — it adds an extra render, makes the intent unclear, and creates edge cases (what if the flag was already true?).
- The "event vs effect" distinction shapes your component architecture — misplacing logic in the wrong bucket leads to effects that run at unexpected times.
- A notification sent on every `isVisible` change is a classic effect overcorrection — it feels "safe" to put everything in an effect, but effects re-run on dependency changes, not just on meaningful events.

---

## I — Interview Q&A

### Q: How do you decide whether to put code in an event handler or a `useEffect`?

**A:** Ask: "Should this code run **because a specific user interaction happened**, or because **some value changed** to a certain state?" User interactions (click, submit, keypress) belong in event handlers — they run once, triggered by the user. Reactive synchronization (stay connected to the right room, document title reflects count, localStorage reflects theme) belongs in effects — they run whenever a dependency changes. The key diagnostic: if you removed the user interaction and just changed the state directly in code, should the side effect still run? If yes, it's an effect. If no (it was caused by the specific interaction), it's an event handler.

---

## C — Common Pitfalls + Fix

### ❌ Routing through state to trigger a one-time event

```tsx
// ❌ Using a flag state to trigger a one-time action in useEffect
function SubmitForm() {
  const [formData,   setFormData]   = useState({ name: '', email: '' })
  const [shouldSave, setShouldSave] = useState(false)

  useEffect(() => {
    if (shouldSave) {
      saveToAPI(formData)   // ❌ extra render, confusing flow
      setShouldSave(false)
    }
  }, [shouldSave, formData])

  return (
    <button onClick={() => setShouldSave(true)}>Save</button>
  )
}

// ✅ Just call the function directly in the event handler
function SubmitFormFixed() {
  const [formData, setFormData] = useState({ name: '', email: '' })

  function handleSave() {
    saveToAPI(formData)   // ✅ direct, clear, runs once per click
  }

  return (
    <button onClick={handleSave}>Save</button>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Audit this component: identify what is incorrectly in an effect (should be an event handler) and what is correctly in an effect.

### Solution

```tsx
function ProductPage({ productId }: { productId: number }) {
  const [product,     setProduct]     = useState<Product | null>(null)
  const [addedToCart, setAddedToCart] = useState(false)
  const [cartCount,   setCartCount]   = useState(0)

  // 1: fetch product when productId changes → ✅ CORRECT in effect (reactive sync)
  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/products/${productId}`, { signal: controller.signal })
      .then(r => r.json()).then(setProduct)
    return () => controller.abort()
  }, [productId])

  // 2: track analytics when addedToCart becomes true → ❌ WRONG in effect
  useEffect(() => {
    if (addedToCart) {
      trackEvent('add_to_cart', { productId })  // should be in handler
      setAddedToCart(false)
    }
  }, [addedToCart, productId])

  // 3: document title follows product name → ✅ CORRECT in effect (sync)
  useEffect(() => {
    if (product) document.title = product.name
    return () => { document.title = 'Shop' }
  }, [product])

  // ✅ Fixed: move cart event tracking to the event handler
  function handleAddToCart() {
    setCartCount(c => c + 1)
    trackEvent('add_to_cart', { productId })  // ✅ runs once, on click
  }

  return (
    <div>
      <h1>{product?.name}</h1>
      <button onClick={handleAddToCart}>Add to cart ({cartCount})</button>
    </div>
  )
}
```

---

---
