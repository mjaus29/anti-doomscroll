# RHF / Zod / date-fns Cheat Sheet

The React Hook Form + Zod 4 + @hookform/resolvers 5+ + date-fns (v4) facts worth memorizing, on one page: quick review after a lesson or a refresh before an interview.

## useForm, register, handleSubmit

RHF is **uncontrolled by default**: values live in refs plus an internal store, not React state, so typing does not re-render the form.

| Concept | Syntax / example | Note |
|---|---|---|
| Create form | `useForm<FormValues>({ defaultValues, mode, resolver })` | Always pass `defaultValues` |
| Connect input | `<input {...register('email')} />` | Returns `{ name, ref, onChange, onBlur }` |
| Built-in rules | `register('age', { required: 'Required', min: 18 })` | Also `minLength`, `maxLength`, `pattern`, `validate` |
| Number input | `register('age', { valueAsNumber: true })` | Without it you get a string (or use `z.coerce`) |
| Submit | `<form onSubmit={handleSubmit(onValid, onInvalid)}>` | Calls `preventDefault`, validates, then `onValid(data)` |
| Async submit | `async (data) => { await save(data) }` | `formState.isSubmitting` is true while it runs |
| Async defaults | `defaultValues: async () => fetchUser()` | Or `reset(data)` once data arrives |

```tsx
const { register, handleSubmit, formState: { errors, isSubmitting } } =
  useForm<FormValues>({ defaultValues: { email: '' }, mode: 'onTouched' })

<form onSubmit={handleSubmit(async (data) => { await save(data) })}>
  <input {...register('email')} />
  {errors.email?.message}
  <button disabled={isSubmitting}>Save</button>
</form>
```

### Validation modes

| Option | When validation runs |
|---|---|
| `mode: 'onSubmit'` (default) | First on submit, then per `reValidateMode` |
| `mode: 'onBlur'` | When a field loses focus |
| `mode: 'onChange'` | Every change (most re-renders) |
| `mode: 'onTouched'` | First on blur, then on every change (good UX default) |
| `mode: 'all'` | Both blur and change |
| `reValidateMode` | After a field has errored; default `'onChange'` |

Lessons: [useForm](/group/rhf-zod-date-fns/day/01/03-useform-setup-options-return-values) · [register](/group/rhf-zod-date-fns/day/01/04-register-registering-inputs-and-options) · [handleSubmit](/group/rhf-zod-date-fns/day/01/05-handlesubmit-submit-lifecycle-and-async) · [Validation modes](/group/rhf-zod-date-fns/day/01/06-validation-modes-onchange-onblur-onsubmit)

## formState and the form API

`formState` is a **Proxy**: the component only re-renders for the properties it actually reads. Destructure what you need; never spread or copy it.

| Property | Meaning |
|---|---|
| `errors` | Nested object mirroring fields: `errors.address?.city?.message` |
| `errors.root.serverError` | Non-field errors set with `setError('root.serverError', ...)` |
| `isDirty` / `dirtyFields` | Value differs from `defaultValues` (needs `defaultValues`) |
| `touchedFields` | Field was focused and then blurred |
| `isValid` | Whole form valid (live only with a non-submit mode or resolver) |
| `isSubmitting` / `isSubmitSuccessful` / `submitCount` | Submit lifecycle |

| Method | Re-renders? | Use for |
|---|---|---|
| `watch('field')` | Yes, the whole form component | Conditional UI in the form component |
| `useWatch({ control, name })` | Only the child that calls it | Isolated live previews, totals |
| `getValues('field')` | No | Reading inside handlers / callbacks |
| `setValue(name, v, opts)` | Only if subscribed | Programmatic updates |
| `trigger(name?)` | Updates errors | Wizard step checks; returns `Promise<boolean>` |
| `setError` / `clearErrors` | Updates errors | Server-side errors |
| `reset(values?)` / `resetField(name)` | Yes | Load edit data, clear form |

```ts
setValue('city', 'Manila', {
  shouldDirty: true,     // update isDirty / dirtyFields
  shouldTouch: true,
  shouldValidate: true,  // run validation now
})
const ok = await trigger(['email', 'password'])   // await it!
if (ok) nextStep()
setError('root.serverError', { type: 'server', message: 'Try again' })
```

**Decision rule:** does the UI need to update live as the value changes? Yes = subscribe (`useWatch` in the smallest component, else `watch`). No = read on demand (`getValues`).

Lessons: [formState Proxy](/group/rhf-zod-date-fns/day/02/01-formstate-the-proxy-and-what-it-tracks) · [errors](/group/rhf-zod-date-fns/day/02/02-errors-field-nested-and-root-errors) · [useWatch](/group/rhf-zod-date-fns/day/02/05-usewatch-isolated-component-re-renders) · [Subscribe vs read](/group/rhf-zod-date-fns/day/02/11-subscribe-vs-read-on-demand-the-decision-model)

## Zod schemas

Define the shape once: runtime validation and the TypeScript type both come from it.

| Concept | Syntax | Note |
|---|---|---|
| Primitives | `z.string()`, `z.number()`, `z.boolean()`, `z.date()` | Chain rules: `.min()`, `.max()`, `.int()`, `.positive()` |
| String formats | `z.email()`, `z.url()`, `z.uuid()`, `z.string().regex(re)` | Zod 3 was `z.string().email()`. Second arg / `{ error }` = custom text (v3: `{ message }`) |
| Required message | `z.string({ error: iss => iss.input === undefined ? 'Required' : undefined })` | Zod 3: `required_error`. `.min(1)` only catches `''`, not missing |
| Object | `z.object({ ... })` | Strips unknown keys by default |
| Unknown keys | `z.strictObject({...})` rejects, `z.looseObject({...})` keeps, `.catchall(s)` | Zod 3: `.strict()` / `.passthrough()` |
| Array | `z.array(item).min(1).max(10)`, `.nonempty()` | `.element` = item schema. `.nonempty()` = `.min(1)` (type stays `T[]`; use `z.tuple([T], T)` for `[T, ...T[]]`) |
| Enum | `z.enum(['admin', 'user'])` | `.options` lists values; `z.enum(TsEnum)` for a TS enum (Zod 3: `z.nativeEnum`) |
| Literal | `z.literal('business')` | One exact value |
| Optional / null | `.optional()`, `.nullable()`, `.nullish()` | Changes the inferred type |
| Default | `.default(value)` | Used when input is `undefined`; must match the OUTPUT type (use `.prefault()` to parse the default) |
| Type | `type User = z.infer<typeof UserSchema>` | Output type |
| Input type | `z.input<typeof S>` | Before transforms/defaults |

### parse vs safeParse

```ts
const user = UserSchema.parse(data)        // throws ZodError

const result = UserSchema.safeParse(data)  // never throws
if (!result.success) {
  return { errors: z.flattenError(result.error).fieldErrors }   // Zod 3: error.flatten()
}
result.data   // typed
// async refinements need parseAsync / safeParseAsync
```

### Composition

| Method | Effect |
|---|---|
| `Base.extend({ age: z.number() })` | Add fields (overwriting keys on a refined schema needs `.safeExtend()`) |
| `A.extend(B.shape)` | Combine two object schemas (Zod 3: `A.merge(B)`, now deprecated) |
| `S.pick({ email: true })` / `S.omit({ id: true })` | Subset of keys |
| `S.partial()` / `S.required()` | All optional / all required |

Rule: compose **before** `.refine()`. In Zod 4 `.pick()`, `.omit()`, `.partial()` and key-overwriting `.extend()` throw on a refined object (in Zod 3 they were missing entirely). A refined object is still fine as a discriminated-union member in Zod 4.

Lessons: [Primitives](/group/rhf-zod-date-fns/day/03/02-primitive-schemas-string-number-boolean-date) · [Objects](/group/rhf-zod-date-fns/day/03/03-objects-z-object-shape-strict-passthrough) · [parse vs safeParse](/group/rhf-zod-date-fns/day/03/07-parse-vs-safeparse) · [Composition](/group/rhf-zod-date-fns/day/03/08-schema-composition-extend-merge-pick-omit-partial)

## Zod + RHF: zodResolver

```ts
import { zodResolver } from '@hookform/resolvers/zod'

const Schema = z.object({
  email: z.email('Invalid email'),
  age: z.coerce.number().int().min(18, 'Must be 18+'),
})
type FormInput  = z.input<typeof Schema>    // age: unknown (coerce input)
type FormOutput = z.output<typeof Schema>   // age: number — same as z.infer

const form = useForm<FormInput, unknown, FormOutput>({
  resolver: zodResolver(Schema),
  defaultValues: { email: '', age: 18 },
})
```

| Concept | Rule |
|---|---|
| Resolver replaces rules | Remove `required`/`min` from `register` when using a resolver |
| Coercion | HTML inputs give strings: `z.coerce.number()`, `z.coerce.date()` |
| Transform | `.transform(fn)` runs **after** validation (trim, normalize) |
| Preprocess | `z.preprocess(fn, schema)` runs **before** validation (`'' -> undefined`) |
| Transforms + types | With coerce/default/transform, input ≠ output: `useForm<z.input<S>, unknown, z.output<S>>` (or omit the generic) |
| Error paths | Issue `path: ['address', 'city']` maps to `errors.address.city` |
| Array item paths | `path: ['items', 0, 'name']` maps to `errors.items[0].name` |
| Array-level rule | `.min(1)` on the array maps to `errors.items.root` |

### Cross-field: refine and superRefine

```ts
const Signup = z.object({
  password: z.string().min(8),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  error: 'Passwords do not match',
  path: ['confirm'],   // without path, the error lands under errors[''] (not errors.root, not a field)
})
```

```ts
.superRefine((d, ctx) => {
  if (!isBefore(d.start, d.end)) {
    ctx.addIssue({
      code: 'custom',
      message: 'End must be after start',
      path: ['end'],
    })
  }
})
```

| Use | Pick |
|---|---|
| One rule, one message | `.refine(fn, { error, path })` |
| Several issues, several paths, conditional logic | `.superRefine((val, ctx) => ...)` |
| Stop after a critical issue (inside superRefine) | `return` ends your callback; `ctx.addIssue({ ..., fatal: true })` also stops later chained checks (`z.NEVER` alone does not abort) |

**Single source of truth:** the same schema validates the form (`zodResolver`), the API body (`safeParse`), and types the submit handler.

Lessons: [zodResolver](/group/rhf-zod-date-fns/day/04/01-zodresolver-connecting-zod-to-rhf) · [Coercion](/group/rhf-zod-date-fns/day/04/03-input-coercion-handling-html-string-inputs) · [Error path mapping](/group/rhf-zod-date-fns/day/04/06-error-path-mapping-how-zod-errors-become-rhf-errors) · [refine / superRefine](/group/rhf-zod-date-fns/day/04/07-cross-field-validation-with-refine-and-superrefine)

## Controller, FormProvider, composition

Use `register` by default. Use `Controller` when a component has no native input ref and exposes `value`/`onChange` (Radix, Base UI, date pickers).

```tsx
<Controller
  name="country"
  control={control}
  render={({ field, fieldState }) => (
    <Select
      value={field.value}
      onValueChange={field.onChange}
      onBlur={field.onBlur}        // needed for touched state
    />
  )}
/>
// fieldState.error?.message for the field error
```

| Concept | Syntax | Note |
|---|---|---|
| Checkbox via Controller | `checked={field.value}` + `onCheckedChange={field.onChange}` | Spreading `{...field}` sets `value`, not `checked` |
| Share form | `<FormProvider {...methods}>` | Wraps the form tree |
| Read form in child | `useFormContext<FormValues>()` | Throws/undefined outside the provider |
| Typed name prop | `name: Path<T>` + `control: Control<T>` | Not `string` |
| Nested path | `register('address.city')` | `defaultValues` nested objects, not dotted keys |

Scalable form module: one folder with `schema.ts` (entry point), `types.ts`, field components, section components, and the form. Sections own UI; the parent owns schema, submit, routing.

Lessons: [Controller](/group/rhf-zod-date-fns/day/05/01-controller-when-and-why) · [Third-party components](/group/rhf-zod-date-fns/day/05/03-controller-with-third-party-components) · [Reusable fields](/group/rhf-zod-date-fns/day/05/04-reusable-field-wrapper-components) · [FormProvider](/group/rhf-zod-date-fns/day/05/05-formprovider-and-useformcontext)

## useFieldArray and dynamic forms

```tsx
const { fields, append, remove } = useFieldArray({ control, name: 'items' })

{fields.map((field, index) => (
  <div key={field.id}>                       {/* never key={index} */}
    <input {...register(`items.${index}.name`)} />
    <button type="button" onClick={() => remove(index)}>x</button>
  </div>
))}
<button type="button" onClick={() => append({ name: '' })}>Add</button>
```

| Method | Effect |
|---|---|
| `append(obj)` / `prepend(obj)` | Add at end / start (pass a full object) |
| `insert(i, obj)` | Add at index |
| `remove(i)` / `remove([i, j])` / `remove()` | Delete one, several, all |
| `swap(a, b)` / `move(from, to)` | Reorder |
| `update(i, obj)` | Replace one item (remounts its inputs) |
| `replace(array)` | Replace the whole array |

| Topic | Rule |
|---|---|
| `fields` | For rendering only (has stable `.id`); read live values with `getValues`/`useWatch` |
| Nested arrays | Child calls `` useFieldArray({ name: `groups.${index}.items` }) `` with the real outer index |
| Item errors | `errors.items?.[i]?.name?.message` |
| Array errors | `errors.items?.root?.message` |
| Conditional fields | `watch`/`useWatch` the controller field; `shouldUnregister: true` drops hidden values |
| Branching | `z.discriminatedUnion('type', [PersonalSchema, BusinessSchema])` |
| Switch branch | Reset branch-specific fields when the discriminator changes |
| Alignment | Every schema branch/array has matching UI; never require a hidden field |

Lessons: [useFieldArray](/group/rhf-zod-date-fns/day/06/01-usefieldarray-setup-and-core-concepts) · [Field array methods](/group/rhf-zod-date-fns/day/06/02-append-prepend-remove-insert-swap-move) · [Field array validation](/group/rhf-zod-date-fns/day/06/05-field-array-validation-with-zod) · [Discriminated unions](/group/rhf-zod-date-fns/day/06/07-discriminated-unions-schema-branching)

## date-fns v4

Pure functions, never mutate the input `Date`, import only what you use: `import { format, addDays } from 'date-fns'`.

| Task | Function | Example result |
|---|---|---|
| Display | `format(d, 'MMMM d, yyyy')` | `June 15, 2025` |
| Date input value | `format(d, 'yyyy-MM-dd')` | `2025-06-15` |
| datetime-local value | `format(d, "yyyy-MM-dd'T'HH:mm")` | `2025-06-15T14:30` |
| Storage / API | `formatISO(d)` | `2025-06-15T14:30:00+08:00` |
| Date only ISO | `formatISO(d, { representation: 'date' })` | `2025-06-15` |
| ISO string to Date | `parseISO('2025-06-15')` | Local midnight |
| Custom string to Date | `parse('15/06/2025', 'dd/MM/yyyy', new Date())` | 3rd arg = reference date |
| Validate | `isValid(d)` | Parsers return Invalid Date, never throw |
| Add / subtract | `addDays`, `addMonths`, `subWeeks`, `add(d, { months: 1, days: 3 })` | `addMonths(Jan 31, 1)` = Feb 28 |
| Compare | `isBefore`, `isAfter`, `isEqual`, `isPast`, `isFuture`, `isToday` | Never `===` on Dates |
| Difference | `differenceInDays(end, start)` | |
| Interval | `{ start, end }` + `eachDayOfInterval`, `intervalToDuration` | `start > end` returns days in reverse order (no throw); `intervalToDuration` omits zero units |
| Relative | `formatDistance(d, base, { addSuffix: true })` | `3 days ago` |
| Contextual | `formatRelative(d, base)` | `yesterday at 2:30 PM` |

**Tokens:** `yyyy` year, `MM` month, `dd` day of month, `HH` 24h hour, `mm` minutes, `ss` seconds. Not Moment-style `YYYY`/`DD` (date-fns throws on those by default).

### Display vs storage

```
<input type="date">  'yyyy-MM-dd' string   parse at the input boundary
form / logic         Date object           compare with date-fns
API / DB             ISO 8601 string       formatISO on the way out
edit form hydrate    ISO -> parseISO -> format('yyyy-MM-dd') -> input
display              format(d, 'MMMM d, yyyy')
```

Lessons: [Fundamentals](/group/rhf-zod-date-fns/day/07/01-date-fns-fundamentals-pure-functions-and-immutability) · [format / formatISO](/group/rhf-zod-date-fns/day/07/02-format-and-formatiso-display-formatting) · [parse / parseISO](/group/rhf-zod-date-fns/day/07/03-parse-and-parseiso-parsing-user-input-and-iso-strings) · [Display vs storage](/group/rhf-zod-date-fns/day/07/08-display-vs-storage-normalization-in-form-workflows)

## Production patterns

| Topic | Pattern |
|---|---|
| Date range | Put the rule on the **object** with `.refine`/`.superRefine` + `isBefore`, path on `end` |
| Async uniqueness (live) | Debounced `useEffect` + fetch, then `setError` / `clearErrors` |
| Async check (submit) | Async `.refine` in schema; resolver uses async parse |
| Create vs edit | Derive the edit schema from create (`.partial()`, `.extend({ id })`) |
| Edit hydration | `reset(apiToForm(data))` when data loads, not many `setValue` calls |
| Re-render control | Read only needed `formState` keys; `useWatch` in leaf components |
| Discriminated union + refine | Zod 4: refined members are fine (Zod 3: not allowed); `superRefine` on the union keeps cross-branch rules in one place |
| UTC midnight bug | `new Date('2025-06-15')` is UTC midnight; use `parseISO` for local |

### Accessibility checklist

```tsx
<label htmlFor="email">Email</label>
<input
  id="email"
  aria-invalid={errors.email ? 'true' : 'false'}
  aria-describedby={errors.email ? 'email-error' : undefined}
  {...register('email')}
/>
{errors.email && (
  <p id="email-error" role="alert">{errors.email.message}</p>
)}
```

RHF focuses the first invalid field on submit (`shouldFocusError: true` default) when the input ref is registered.

### Testing layers

| Layer | How |
|---|---|
| Schema | Pure unit tests with `safeParse` (valid + each invalid case) |
| Form behaviour | Testing Library + `userEvent.type` / `userEvent.click`, assert visible errors |
| Submit | Mock the API, assert the handler receives parsed values |

Lessons: [Advanced refine](/group/rhf-zod-date-fns/day/08/01-advanced-refine-and-superrefine) · [Async validation](/group/rhf-zod-date-fns/day/08/03-async-validation-debounced-server-checks) · [Create vs edit](/group/rhf-zod-date-fns/day/08/04-create-vs-edit-flows-schema-variants-and-api-hydration) · [Union and date caveats](/group/rhf-zod-date-fns/day/08/08-discriminated-union-caveats-refined-schemas-and-date-interval-edge-cases)

## Gotchas

| ❌ Mistake | ✅ Fix |
|---|---|
| Spreading or copying `formState` | Destructure only the keys you render |
| `watch()` (all fields) at the top of a large form | `useWatch({ name })` in the child that needs it |
| `z.number()` on an HTML input (always a string) | `z.coerce.number()` or `valueAsNumber` |
| `z.coerce.boolean()` on string `'false'` (becomes `true`) | Checkbox via `register` already gives a boolean: use `z.boolean()` |
| `.refine()` without `path` on a cross-field rule | Add `path: ['confirm']` so the error shows on the field (a pathless error is stored under `errors['']`; use `path: ['root']` for a form-level message) |
| `.pick()` / `.omit()` / `.partial()` / key-overwriting `.extend()` after `.refine()` | Compose first, refine last (or `.safeExtend()`) |
| Rules on `register` and a `zodResolver` | Keep all rules in the schema |
| `setValue` without `shouldDirty: true` | Pass options or `isDirty` stays false |
| `trigger()` not awaited | `if (await trigger('step1')) next()` |
| `key={index}` in field arrays | `key={field.id}` |
| `remove(i)` in a loop with fixed indices | `remove([i, j])` in one call |
| `isDirty` without `defaultValues` | Always set `defaultValues` (nested objects, not dotted keys) |
| `{...field}` on a checkbox in `Controller` | Map `checked` and `onChange` explicitly |
| Raw ISO datetime as a date input default | `format(parseISO(iso), 'yyyy-MM-dd')` |
| `YYYY-MM-DD` tokens in `format` | `yyyy-MM-dd` |
| Comparing Dates with `===` / `<` | `isEqual`, `isBefore`, `isAfter` |
| `fireEvent.change` in form tests | `userEvent.type` (fires the real event sequence) |

## Interview quick answers

**Q:** Why does RHF re-render less than a `useState` form?
Inputs are uncontrolled (refs + internal store), and `formState` is a Proxy that only subscribes the component to the keys it reads.

**Q:** `watch` vs `useWatch` vs `getValues`?
`watch` subscribes the form component, `useWatch` subscribes only the calling child, `getValues` reads once with no subscription.

**Q:** `mode` vs `reValidateMode`?
`mode` decides when a field is first validated; `reValidateMode` decides when it re-validates after showing an error.

**Q:** When do you need `Controller`?
When a component has no native ref and is controlled via `value`/`onChange` (UI libraries, pickers). Otherwise `register`.

**Q:** How do server errors get into the form?
`setError('email', { message })` for a field, `setError('root.serverError', ...)` for form-level, read from `errors.root`.

**Q:** `parse` vs `safeParse`?
`parse` throws a `ZodError`; `safeParse` returns `{ success, data | error }`. Use `safeParse` in forms and API handlers.

**Q:** `refine` vs `superRefine`?
`refine` is one boolean check with one message; `superRefine` can add many issues with custom paths and codes.

**Q:** How does a Zod issue reach `errors.x`?
`zodResolver` uses the issue `path` array: `['items', 0, 'name']` becomes `errors.items[0].name`.

**Q:** `transform` vs `preprocess`?
`preprocess` runs before validation (clean raw input); `transform` runs after (reshape valid data). Transforms make input and output types differ.

**Q:** Why the schema as the single source of truth?
One definition validates client and server and generates the TS type, so rules and types cannot drift.

**Q:** Why `field.id` as key in `useFieldArray`?
Index keys break when items are removed or reordered: inputs keep the wrong values. `id` is stable per item.

**Q:** When choose `z.discriminatedUnion`?
When a field (e.g. `type`) picks entirely different field sets; Zod validates only the matching branch.

**Q:** How should dates flow through a form?
Input string, parse to `Date` for logic, `formatISO` to store, `parseISO` + `format` to hydrate and display.

**Q:** Why is `new Date('2025-06-15')` dangerous?
Date-only ISO strings parse as UTC midnight, which can show the previous day in negative-offset time zones. `parseISO` gives local midnight.
