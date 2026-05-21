# 2 — `append`, `prepend`, `remove`, `insert`, `swap`, `move`

---

## T — TL;DR

`useFieldArray` exposes six mutation methods. `append`/`prepend` add items. `remove` deletes by index. `insert` adds at a specific position. `swap` exchanges two items. `move` repositions one item. All update both the RHF store and trigger re-renders.

---

## K — Key Concepts

```tsx
const { fields, append, prepend, remove, insert, swap, move } = useFieldArray({
  control, name: 'items'
})

type Item = { name: string; qty: number }

// ─── append — add to END
append({ name: '', qty: 1 })
append([{ name: 'A', qty: 1 }, { name: 'B', qty: 2 }]) // multiple at once
append({ name: '' }, { shouldFocus: false })  // don't auto-focus appended input

// ─── prepend — add to BEGINNING
prepend({ name: 'First', qty: 1 })

// ─── remove — delete by index (or array of indexes)
remove(0)           // delete first item
remove(2)           // delete item at index 2
remove([0, 2])      // delete multiple items by index

// ─── insert — add at specific position
insert(1, { name: 'Inserted', qty: 1 })
// Before: [A, B, C] → After: [A, Inserted, B, C]

// ─── swap — exchange two items (by index)
swap(0, 2)
// Before: [A, B, C] → After: [C, B, A]

// ─── move — reposition one item (from index, to index)
move(2, 0)
// Before: [A, B, C] → After: [C, A, B]  (moved index 2 → index 0)
```

```tsx
// ─── Practical: drag-to-reorder (simplified)
function ReorderableList() {
  const { fields, move } = useFieldArray({ control, name: 'tasks' })

  function handleMoveUp(index: number) {
    if (index > 0) move(index, index - 1)
  }
  function handleMoveDown(index: number) {
    if (index < fields.length - 1) move(index, index + 1)
  }

  return fields.map((field, i) => (
    <div key={field.id} className="flex items-center gap-2">
      <input {...register(`tasks.${i}.title`)} className="flex-1 border rounded-xl px-3 py-2 text-sm" />
      <button type="button" onClick={() => handleMoveUp(i)}   disabled={i === 0}
              className="px-2 py-1 border rounded text-xs disabled:opacity-30">↑</button>
      <button type="button" onClick={() => handleMoveDown(i)} disabled={i === fields.length - 1}
              className="px-2 py-1 border rounded text-xs disabled:opacity-30">↓</button>
      <button type="button" onClick={() => remove(i)}
              className="px-2 py-1 border border-red-200 rounded text-xs text-red-500">✕</button>
    </div>
  ))
}
```

---

## W — Why It Matters

- `move` is the correct tool for reordering — it preserves all field values and validation state. Implementing reorder with remove+insert manually causes value-mismatch bugs because RHF's internal refs get out of sync.
- `shouldFocus: false` on `append` is essential for programmatic adds (e.g. loading saved data, "duplicate row") — without it, the browser scrolls to the new input every time.
- `remove([0, 2])` (array of indices) is the correct way to delete multiple items at once — calling `remove` in a loop produces intermediate re-renders and may use stale indices.

---

## I — Interview Q&A

### Q: What is the difference between `swap` and `move` in `useFieldArray`?

**A:** `swap(a, b)` exchanges the items at indices `a` and `b` — both items change position. `move(from, to)` shifts one item to a new position, and all items between the two indices shift to fill the gap. Use `swap` for manual "exchange" actions. Use `move` for drag-to-reorder or up/down arrow reordering where one item slides past others.

---

## C — Common Pitfalls + Fix

### ❌ Calling `remove` in a loop with static indices

```tsx
// ❌ After remove(0), all indices shift — remove(1) now removes the wrong item
selectedIndices.forEach(i => remove(i))
```

**Fix:** Pass all indices at once:

```tsx
// ✅ All removed in one operation — no shifting mid-loop
remove(selectedIndices)
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `PlaylistForm` — an ordered list of tracks (`title` string). Implement: append (add track), remove (delete track), move up/down buttons per row. Show "No tracks" when empty.

### Solution

```tsx
'use client'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver }            from '@hookform/resolvers/zod'
import { z }                      from 'zod'

const PlaylistSchema = z.object({
  playlistName: z.string().min(1, 'Required'),
  tracks:       z.array(z.object({ title: z.string().min(1, 'Required') }))
                 .min(1, 'Add at least one track')
})
type PlaylistForm = z.infer<typeof PlaylistSchema>

export function PlaylistForm() {
  const { register, control, handleSubmit, formState: { errors } } = useForm<PlaylistForm>({
    resolver:      zodResolver(PlaylistSchema),
    defaultValues: { playlistName: '', tracks: [] }
  })

  const { fields, append, remove, move } = useFieldArray({ control, name: 'tracks' })
  const cls = 'border rounded-xl px-3 py-2 text-sm'

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-4 max-w-md">
      <div>
        <input {...register('playlistName')} placeholder="Playlist name" className={`w-full ${cls}`} />
        {errors.playlistName && <p className="text-xs text-red-600 mt-1">{errors.playlistName.message}</p>}
      </div>

      {fields.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-6 border-2 border-dashed rounded-2xl">
          No tracks yet. Add one below.
        </p>
      )}

      <div className="space-y-2">
        {fields.map((field, i) => (
          <div key={field.id} className="flex gap-2 items-center">
            <span className="text-xs text-gray-400 w-5 text-right shrink-0">{i + 1}</span>
            <input {...register(`tracks.${i}.title`)} placeholder="Track title"
                   className={`flex-1 ${cls}`} />
            {errors.tracks?.[i]?.title && (
              <span className="text-xs text-red-500">{errors.tracks[i]?.title?.message}</span>
            )}
            <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0}
                    className="px-2 py-1.5 border rounded-lg text-xs disabled:opacity-30">↑</button>
            <button type="button" onClick={() => move(i, i + 1)} disabled={i === fields.length - 1}
                    className="px-2 py-1.5 border rounded-lg text-xs disabled:opacity-30">↓</button>
            <button type="button" onClick={() => remove(i)}
                    className="px-2 py-1.5 border border-red-200 rounded-lg text-xs text-red-500">✕</button>
          </div>
        ))}
        {errors.tracks?.root && <p className="text-xs text-red-600">{errors.tracks.root.message}</p>}
      </div>

      <button type="button" onClick={() => append({ title: '' }, { shouldFocus: true })}
              className="text-sm text-blue-600 underline">
        + Add track
      </button>

      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
        Save playlist
      </button>
    </form>
  )
}
```

---

---
