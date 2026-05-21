# 4 — Transforms and Preprocessing

---

## T — TL;DR

`.transform(fn)` converts a validated value into something else (trim whitespace, normalize phone, compute totals). `z.preprocess(fn, schema)` runs a function **before** schema validation (handle empty strings, cast booleans, strip characters). Together they clean and shape data before it reaches your submit handler.

---

## K — Key Concepts

```tsx
import { z } from 'zod'

// ─── .transform() — runs AFTER validation passes
// Input type is the schema's input, output type changes to the return type

const SlugSchema = z.string()
  .min(1)
  .transform(s => s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))

SlugSchema.parse('Hello World!')  // → 'hello-world'
type SlugOut = z.infer<typeof SlugSchema>  // string (same — transform to same type)

// ─── Transform that changes the type
const TagsInputSchema = z.string()
  .transform(s => s.split(',').map(t => t.trim()).filter(Boolean))

type TagsOut = z.infer<typeof TagsInputSchema>  // string[]
TagsInputSchema.parse('react, zod, typescript')  // → ['react', 'zod', 'typescript']
```

```tsx
// ─── z.preprocess() — runs BEFORE validation
// fn receives unknown input, returns processed value, THEN schema validates

// 1. Trim whitespace before min-length check
const TrimmedNameSchema = z.preprocess(
  v => typeof v === 'string' ? v.trim() : v,
  z.string().min(2, 'Min 2 characters after trimming')
)
TrimmedNameSchema.parse('  M  ')  // → fails (after trim: 'M', length 1)
TrimmedNameSchema.parse(' Mark ') // → passes, returns 'Mark'

// 2. Parse comma-separated string into array before array validation
const CsvToArraySchema = z.preprocess(
  v => typeof v === 'string' ? v.split(',').map(s => s.trim()).filter(Boolean) : v,
  z.array(z.string().min(1)).min(1, 'At least one value required')
)
CsvToArraySchema.parse('react,zod,typescript')  // → ['react', 'zod', 'typescript']

// 3. Strip non-digits from phone number
const PhoneSchema = z.preprocess(
  v => typeof v === 'string' ? v.replace(/\D/g, '') : v,
  z.string().length(10, 'Phone must be 10 digits')
)
PhoneSchema.parse('+1 (555) 123-4567')  // → '15551234567' ← wait, 11 digits
PhoneSchema.parse('555-123-4567')       // → '5551234567' ✅
```

```tsx
// ─── Transform in RHF context
// The SUBMITTED data (handleSubmit callback) contains the TRANSFORMED values
// The FORM input value (what the user sees) is the raw string

const PriceSchema = z.object({
  // price entered as "29.99" → submitted as { price: 2999 } (cents)
  price: z.coerce.number()
           .positive()
           .transform(dollars => Math.round(dollars * 100))
})

type PriceOut = z.infer<typeof PriceSchema>  // { price: number } (cents)

// In handleSubmit:
function onSubmit(data: PriceOut) {
  console.log(data.price)  // 2999 (cents) — NOT 29.99 ✅
  // Safe to store in database as integer cents
}
```

---

## W — Why It Matters

- `.transform()` puts data cleaning in the schema, not the submit handler — your `onSubmit` receives clean, shaped data rather than raw strings that need post-processing.
- `z.preprocess` solves the "validate what the schema expects, not what the DOM provides" mismatch — empty strings, serialized booleans ("on"), comma-separated values — all handled before schema validation runs.
- The cents pattern (`price * 100`) in transforms is a real production pattern — financial data should never be stored as floats. Transforming at the schema boundary ensures you never accidentally store `29.99` instead of `2999`.

---

## I — Interview Q&A

### Q: When do you use `z.preprocess` vs `.transform()`?

**A:** `z.preprocess(fn, schema)` runs the function **before** type validation — use it when the raw input doesn't match what the schema expects (empty string to undefined, "on" to boolean, comma string to array). The preprocessed value is what the schema validates. `.transform(fn)` runs **after** validation passes — use it to shape or convert already-valid data (lowercase slugs, trim strings, convert dollars to cents, format phone numbers). If the input type is wrong for the schema, use `preprocess`. If the type is right but you want to reshape the output, use `transform`.

---

## C — Common Pitfalls + Fix

### ❌ Using `.transform()` to handle invalid input — it runs after validation

```tsx
// ❌ transform runs AFTER validation — empty string "" fails min(1) before transform
const Schema = z.string().min(1).transform(s => s.trim())
Schema.safeParse('  ')  // ← fails at min(1) with '  ', transform never runs
```

**Fix:** Use `preprocess` to clean BEFORE validation:

```tsx
// ✅ preprocess trims first, THEN min(1) validates the trimmed string
const Schema = z.preprocess(
  v => typeof v === 'string' ? v.trim() : v,
  z.string().min(1, 'Required')
)
Schema.safeParse('  ')  // fails: ''.length < 1 ✅ (correct error)
Schema.safeParse(' Mark ') // passes, output: 'Mark' ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `TagsFieldSchema` that: accepts a comma-separated string from an `<input>`, preprocesses it into an array, trims each tag, filters empty strings, deduplicates, lowercases, validates each tag is 1–20 chars, max 5 tags. Submit logs `string[]`.

### Solution

```tsx
'use client'
import { useForm }     from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z }           from 'zod'

// Schema processes CSV input into a clean string[]
const TagsFieldSchema = z.preprocess(
  v => {
    if (typeof v !== 'string') return []
    return [...new Set(
      v.split(',')
       .map(t => t.trim().toLowerCase())
       .filter(Boolean)
    )]
  },
  z.array(
    z.string().min(1).max(20, 'Each tag max 20 chars')
  ).max(5, 'Maximum 5 tags')
)

const PostSchema = z.object({
  title: z.string().min(3),
  tags:  TagsFieldSchema
})

// For RHF, the form input type is string (CSV), output is string[]
type PostInput  = { title: string; tags: string }         // input
type PostOutput = z.infer<typeof PostSchema>               // output: tags is string[]

export function PostForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<PostInput>({
    resolver:      zodResolver(PostSchema) as any,
    defaultValues: { title: '', tags: '' }
  })

  const cls = 'w-full border rounded-xl px-3 py-2 text-sm'
  const err = 'text-xs text-red-600 mt-1'

  function onSubmit(data: PostOutput) {
    console.log('tags:', data.tags)  // string[] — clean, deduped, lowercased
  }

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4 max-w-sm">
      <div>
        <input {...register('title')} placeholder="Post title" className={cls} />
        {errors.title && <p className={err}>{errors.title.message}</p>}
      </div>
      <div>
        <input {...register('tags')} placeholder="react, zod, typescript" className={cls} />
        <p className="text-xs text-gray-400 mt-1">Comma-separated, max 5</p>
        {errors.tags  && <p className={err}>{(errors.tags as any)?.message}</p>}
      </div>
      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
        Create post
      </button>
    </form>
  )
}
```

---

---
