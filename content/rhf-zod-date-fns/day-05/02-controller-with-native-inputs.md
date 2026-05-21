# 2 — `Controller` with Native Inputs

---

## T — TL;DR

`Controller` works with native inputs too — use it when you need `field.value` in JSX (for visual feedback, character counts, or formatting). The trade-off: controlled mode causes a re-render per keystroke. Use `register` by default; reach for `Controller` on native inputs only when you genuinely need the value in render.

---

## K — Key Concepts

```tsx
// ─── Controller on <input> — when you need the value in render
<Controller
  name="username"
  control={control}
  render={({ field, fieldState }) => (
    <div className="relative">
      <input
        {...field}                   // spread: name, value, onChange, onBlur, ref
        placeholder="Username"
        maxLength={20}
        className="w-full border rounded-xl px-3 py-2 text-sm pr-14"
      />
      {/* Live char count — only possible with Controller (has field.value) */}
      <span className="absolute right-3 top-2.5 text-xs text-gray-400">
        {field.value.length}/20
      </span>
      {fieldState.error && (
        <p className="text-xs text-red-600 mt-1">{fieldState.error.message}</p>
      )}
    </div>
  )}
/>
```

```tsx
// ─── Controller on <textarea> with character count
<Controller
  name="bio"
  control={control}
  render={({ field, fieldState }) => (
    <div className="space-y-1">
      <textarea
        {...field}
        rows={3}
        maxLength={160}
        placeholder="Short bio"
        className="w-full border rounded-xl px-3 py-2 text-sm resize-none"
      />
      <div className="flex justify-between items-center">
        <span className={`text-xs ${fieldState.error ? 'text-red-600' : 'text-gray-400'}`}>
          {fieldState.error?.message ?? `${field.value?.length ?? 0}/160`}
        </span>
        {/* Progress bar */}
        <div className="w-24 h-1 rounded-full bg-gray-200">
          <div className="h-1 rounded-full bg-blue-500 transition-all"
               style={{ width: `${((field.value?.length ?? 0) / 160) * 100}%` }} />
        </div>
      </div>
    </div>
  )}
/>
```

```tsx
// ─── Spreading field object onto native elements
// field contains: { name, value, onChange, onBlur, ref }
// Spreading {...field} works directly on <input>, <select>, <textarea>

// For <input type="checkbox">: value is boolean, but HTML wants checked
<Controller
  name="active"
  control={control}
  render={({ field }) => (
    <input
      type="checkbox"
      name={field.name}
      checked={field.value}          // boolean → checked prop
      onChange={e => field.onChange(e.target.checked)}  // extract .checked
      onBlur={field.onBlur}
      ref={field.ref}
    />
  )}
/>
```

---

## W — Why It Matters

- Live character counts and progress indicators are the clearest use case for `Controller` on native inputs — they require `field.value` in JSX, which `register` (uncontrolled) can't provide without `watch`.
- Using `Controller` instead of `register + watch` for this pattern is slightly cleaner — `watch` creates a separate subscription, `Controller` gives you the value directly in the render prop.
- Knowing when NOT to use `Controller` on native inputs is equally important — if you don't need `field.value` in render, `register` is faster and simpler.

---

## I — Interview Q&A

### Q: When is it appropriate to use `Controller` on a native `<input>` instead of `register`?

**A:** When you need `field.value` rendered in JSX — live character counts, formatted previews, conditional styling based on current value, or length-based progress bars. `register` is uncontrolled, so the value isn't available in render without calling `watch`. `Controller` gives you `field.value` directly in the render prop. The trade-off is one re-render per keystroke for that field. If the only thing you need is the value in a sibling component (not in the label or UI wrapping the input itself), use `useWatch` in the sibling instead — it isolates the re-render to just that sibling.

---

## C — Common Pitfalls + Fix

### ❌ Spreading `{...field}` on `<input type="checkbox">` — sets `value` not `checked`

```tsx
// ❌ Checkbox needs checked={bool}, not value={bool}
<input type="checkbox" {...field} />
// → <input type="checkbox" value="true" /> — visually never checked ❌
```

**Fix:** Map `field.value` to `checked` and extract `.checked` from the event:

```tsx
// ✅
<input
  type="checkbox"
  name={field.name}
  checked={!!field.value}
  onChange={e => field.onChange(e.target.checked)}
  onBlur={field.onBlur}
  ref={field.ref}
/>
```

---

## K — Coding Challenge + Solution

### Challenge

Build a profile form with: `username` using `Controller` showing live `x/20` character count, `bio` using `Controller` showing a progress bar (max 160 chars), `active` checkbox using `Controller` with proper `checked` handling.

### Solution

```tsx
'use client'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver }         from '@hookform/resolvers/zod'
import { z }                   from 'zod'

const Schema = z.object({
  username: z.string().min(3, 'Min 3 chars').max(20),
  bio:      z.string().max(160).optional(),
  active:   z.boolean().default(true)
})
type F = z.infer<typeof Schema>

export function ProfileForm() {
  const { control, handleSubmit } = useForm<F>({
    resolver:      zodResolver(Schema),
    defaultValues: { username: '', bio: '', active: true }
  })

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-5 max-w-sm">

      {/* username with char count */}
      <Controller name="username" control={control} render={({ field, fieldState }) => (
        <div className="space-y-1">
          <div className="relative">
            <input {...field} maxLength={20} placeholder="Username"
                   className="w-full border rounded-xl px-3 py-2 text-sm pr-14
                                focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <span className="absolute right-3 top-2.5 text-xs text-gray-400">
              {field.value.length}/20
            </span>
          </div>
          {fieldState.error && <p className="text-xs text-red-600">{fieldState.error.message}</p>}
        </div>
      )} />

      {/* bio with progress bar */}
      <Controller name="bio" control={control} render={({ field }) => (
        <div className="space-y-1">
          <textarea {...field} rows={3} maxLength={160} placeholder="Short bio"
                    className="w-full border rounded-xl px-3 py-2 text-sm resize-none
                                 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 h-1 rounded-full bg-gray-200">
              <div className="h-1 rounded-full bg-blue-500 transition-all"
                   style={{ width: `${(((field.value?.length ?? 0)) / 160) * 100}%` }} />
            </div>
            <span className="text-xs text-gray-400 shrink-0">
              {field.value?.length ?? 0}/160
            </span>
          </div>
        </div>
      )} />

      {/* checkbox — correct controlled mapping */}
      <Controller name="active" control={control} render={({ field }) => (
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            name={field.name}
            checked={!!field.value}
            onChange={e => field.onChange(e.target.checked)}
            onBlur={field.onBlur}
            ref={field.ref}
            className="size-4 rounded border-gray-300"
          />
          Active account
        </label>
      )} />

      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
        Save profile
      </button>
    </form>
  )
}
```

---

---
