# 4 — Create vs Edit Flows — Schema Variants and API Hydration

---

## T — TL;DR

Create and edit forms share field definitions but differ in defaults and required fields. Derive edit schemas from create schemas (`.partial()` for optional id). Hydrate edit form `defaultValues` from API responses — converting ISO strings to form-compatible formats. Use `reset()` when data loads asynchronously.

---

## K — Key Concepts

```ts
// ─── Schema variants for create vs edit
import { z } from 'zod'

const PostBaseSchema = z.object({
  title:     z.string().min(3, 'Min 3 characters').max(100),
  body:      z.string().min(10, 'Min 10 characters'),
  tags:      z.array(z.string()).max(5).default([]),
  published: z.boolean().default(false)
})

// Create: no id (server generates it)
export const CreatePostSchema = PostBaseSchema

// Edit: same fields + id required for PUT/PATCH route
export const EditPostSchema = PostBaseSchema.extend({
  id: z.string().uuid()
})

// Patch: everything optional except id
export const PatchPostSchema = PostBaseSchema.partial().extend({
  id: z.string().uuid()
})

type CreatePost = z.infer<typeof CreatePostSchema>
type EditPost   = z.infer<typeof EditPostSchema>
```

```ts
// ─── API response → form defaults (hydration)
interface ApiPost {
  id:        string
  title:     string
  body:      string
  tags:      string[]
  published: boolean
  createdAt: string   // ISO — not in form
  updatedAt: string   // ISO — not in form
}

function apiToFormDefaults(post: ApiPost): EditPost {
  return {
    id:        post.id,
    title:     post.title,
    body:      post.body,
    tags:      post.tags,
    published: post.published
    // createdAt/updatedAt NOT included — not form fields
  }
}
```

```tsx
// ─── Edit form: async load + reset
import { useEffect }   from 'react'
import { useForm }     from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

function EditPostForm({ postId }: { postId: string }) {
  const { register, handleSubmit, reset,
          formState: { isDirty, isSubmitting } } = useForm<EditPost>({
    resolver:      zodResolver(EditPostSchema),
    defaultValues: { id: '', title: '', body: '', tags: [], published: false }
  })

  useEffect(() => {
    async function load() {
      const post = await api.get<ApiPost>(`/posts/${postId}`)
      reset(apiToFormDefaults(post))  // ← resets form to loaded values
      // After reset: isDirty = false (no unsaved changes)
    }
    load()
  }, [postId, reset])

  async function onSubmit(data: EditPost) {
    await api.put(`/posts/${data.id}`, data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input type="hidden" {...register('id')} />
      {/* visible fields */}
      <button type="submit" disabled={!isDirty || isSubmitting}>
        {isSubmitting ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}
```

```ts
// ─── Date fields in edit forms — hydration pattern
interface ApiEvent { startDate: string; endDate: string } // ISO

function apiEventToDefaults(e: ApiEvent) {
  return {
    startDate: format(parseISO(e.startDate), 'yyyy-MM-dd'), // for <input type="date">
    endDate:   format(parseISO(e.endDate),   'yyyy-MM-dd')
  }
}
```

---

## W — Why It Matters

- Using `reset(apiToFormDefaults(data))` after load is the only correct way to set loaded data — `setValue` per field doesn't reset `isDirty`, so every field appears dirty even before the user edits anything.
- Deriving the edit schema from the create schema (`PostBaseSchema.extend({ id })`) ensures validation rules stay in sync — update the base schema and both forms benefit automatically.
- `isDirty` is only accurate when `defaultValues` match what was loaded from the API — which is why `reset()` is essential after async hydration.

---

## I — Interview Q&A

### Q: What is the correct way to populate an edit form with data loaded from an API?

**A:** Use `reset(formDefaults)` after the data loads — not `setValue` per field. `reset` sets both the values AND the internal `defaultValues` baseline that RHF uses for `isDirty` comparison. After `reset`, `isDirty` is `false` because the current values match the new defaults. If you use `setValue` instead, `defaultValues` still reflect the initial empty state, so every field is immediately dirty even before the user touches anything. Pass the hydrated data object (with ISO dates converted to input-compatible strings) directly to `reset`.

---

## C — Common Pitfalls + Fix

### ❌ Using `setValue` for each field when loading edit data — `isDirty` is wrong

```tsx
// ❌ Every field is dirty immediately — user hasn't changed anything
useEffect(() => {
  setValue('title', post.title)
  setValue('body',  post.body)
  // isDirty = true for all — "Save" button enabled before any edit ❌
}, [post])
```

**Fix:**

```tsx
// ✅ reset sets both values AND defaultValues baseline
useEffect(() => {
  reset({ title: post.title, body: post.body, published: post.published })
  // isDirty = false ✅
}, [post, reset])
```

---

## K — Coding Challenge + Solution

### Challenge

Build a generic `useEditForm<T>` custom hook that: accepts a `schema`, `fetchFn`, `saveFn`, and `hydrateFn` (API → defaults), loads on mount, calls `reset`, returns `{ methods, onSubmit, isLoading, loadError }`.

### Solution

```ts
import { useEffect, useState }      from 'react'
import { useForm, UseFormReturn }    from 'react-hook-form'
import { zodResolver }               from '@hookform/resolvers/zod'
import { ZodSchema }                 from 'zod'

interface UseEditFormOptions<TApi, TForm extends Record<string, unknown>> {
  schema:     ZodSchema<TForm>
  fetchFn:    () => Promise<TApi>
  saveFn:     (data: TForm) => Promise<void>
  hydrateFn:  (api: TApi) => TForm
  emptyDefaults: TForm
}

interface UseEditFormReturn<TForm extends Record<string, unknown>> {
  methods:    UseFormReturn<TForm>
  onSubmit:   (data: TForm) => Promise<void>
  isLoading:  boolean
  loadError:  string | null
}

export function useEditForm<TApi, TForm extends Record<string, unknown>>({
  schema, fetchFn, saveFn, hydrateFn, emptyDefaults
}: UseEditFormOptions<TApi, TForm>): UseEditFormReturn<TForm> {
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const methods = useForm<TForm>({
    resolver:      zodResolver(schema) as any,
    defaultValues: emptyDefaults as any
  })

  useEffect(() => {
    fetchFn()
      .then(api => { methods.reset(hydrateFn(api) as any) })
      .catch(e  => { setLoadError(e.message ?? 'Failed to load') })
      .finally(() => setIsLoading(false))
  }, [])  // eslint-disable-line

  async function onSubmit(data: TForm) {
    await saveFn(data)
  }

  return { methods, onSubmit, isLoading, loadError }
}

// ─── Usage
const { methods, onSubmit, isLoading } = useEditForm({
  schema:        EditPostSchema,
  fetchFn:       () => api.get(`/posts/${id}`),
  saveFn:        data => api.put(`/posts/${data.id}`, data),
  hydrateFn:     apiToFormDefaults,
  emptyDefaults: { id: '', title: '', body: '', tags: [], published: false }
})
```

---

---
