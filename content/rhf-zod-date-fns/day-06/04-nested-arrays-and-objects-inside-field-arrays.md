# 4 — Nested Arrays and Objects inside Field Arrays

---

## T — TL;DR

Field array items can contain nested objects (dot-notation paths) and even nested arrays (nested `useFieldArray` calls). Each nesting level follows the same `register('array.${index}.nested.field')` pattern. Nested `useFieldArray` requires the outer item's `name` path as the `name` option.

---

## K — Key Concepts

```tsx
// ─── Schema: array of objects with nested objects
const ProjectSchema = z.object({
  projects: z.array(z.object({
    name:    z.string().min(1),
    address: z.object({          // nested object inside array item
      city:    z.string().min(1),
      country: z.string().length(2)
    }),
    tags:    z.array(z.string()) // nested array inside array item
  }))
})

// ─── Registering nested object fields inside array items
// projects.${i}.name
// projects.${i}.address.city
// projects.${i}.address.country
<input {...register(`projects.${index}.name`)} />
<input {...register(`projects.${index}.address.city`)} />
<input {...register(`projects.${index}.address.country`)} />

// ─── Accessing nested errors
errors.projects?.[index]?.name?.message
errors.projects?.[index]?.address?.city?.message
```

```tsx
// ─── Nested useFieldArray (array inside array)
// Schema: form has sections[], each section has questions[]
const SurveySchema = z.object({
  title:    z.string().min(1),
  sections: z.array(z.object({
    heading:   z.string().min(1),
    questions: z.array(z.object({
      text:     z.string().min(1),
      required: z.boolean().default(false)
    }))
  }))
})
type SurveyForm = z.infer<typeof SurveySchema>

// ─── Outer field array component
function SurveyForm() {
  const { register, control, handleSubmit } = useForm<SurveyForm>({
    resolver:      zodResolver(SurveySchema),
    defaultValues: { title: '', sections: [{ heading: '', questions: [] }] }
  })
  const { fields: sections, append: addSection } = useFieldArray({ control, name: 'sections' })

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-6">
      <input {...register('title')} placeholder="Survey title"
             className="w-full border rounded-xl px-3 py-2 text-sm" />
      {sections.map((section, sIndex) => (
        <SectionRow key={section.id} sIndex={sIndex} control={control} register={register} />
      ))}
      <button type="button" onClick={() => addSection({ heading: '', questions: [] })}>
        + Add section
      </button>
    </form>
  )
}

// ─── Inner field array in a child component
function SectionRow({ sIndex, control, register }: {
  sIndex: number
  control: any
  register: any
}) {
  // Nested useFieldArray — name is the FULL path to the nested array
  const { fields: questions, append: addQuestion, remove: removeQuestion } =
    useFieldArray({
      control,
      name: `sections.${sIndex}.questions`  // ← full dot-notation path
    })

  return (
    <div className="p-4 border border-gray-200 rounded-2xl space-y-3">
      <input {...register(`sections.${sIndex}.heading`)}
             placeholder="Section heading"
             className="w-full border rounded-xl px-3 py-2 text-sm font-semibold" />

      {questions.map((q, qIndex) => (
        <div key={q.id} className="flex gap-2 items-center ml-4">
          <input {...register(`sections.${sIndex}.questions.${qIndex}.text`)}
                 placeholder="Question text"
                 className="flex-1 border rounded-xl px-3 py-2 text-sm" />
          <label className="flex items-center gap-1 text-xs text-gray-500">
            <input {...register(`sections.${sIndex}.questions.${qIndex}.required`)}
                   type="checkbox" />
            Required
          </label>
          <button type="button" onClick={() => removeQuestion(qIndex)}
                  className="text-xs text-red-500 px-2 py-1 border border-red-200 rounded-lg">
            ✕
          </button>
        </div>
      ))}

      <button type="button"
              onClick={() => addQuestion({ text: '', required: false })}
              className="ml-4 text-xs text-blue-600 underline">
        + Add question
      </button>
    </div>
  )
}
```

---

## W — Why It Matters

- Nested `useFieldArray` with the full dot-notation `name` (`sections.${i}.questions`) is the correct way to manage arrays-within-arrays. Trying to manage nested arrays manually with `setValue` and `getValues` leads to stale state bugs.
- Splitting the inner array into a child component (`SectionRow`) that receives `control` and calls its own `useFieldArray` is the recommended pattern — it keeps each level self-contained and independently maintainable.
- The error path for nested arrays follows the same dot-notation: `errors.sections?.[0]?.questions?.[1]?.text?.message` — optional chaining through each level.

---

## I — Interview Q&A

### Q: How do you implement a nested `useFieldArray` — an array inside an array item?

**A:** Extract the inner array row into a child component. Pass `control` and the outer item's `index` as props. Inside the child, call `useFieldArray` with `name: \`outerArray.${index}.innerArray\`` — the full dot-notation path to the inner array. The child component renders its own `fields.map()` and mutation buttons. This pattern keeps each level of nesting isolated: the outer component manages sections, the inner component manages questions within each section, and each can independently append or remove items.

---

## C — Common Pitfalls + Fix

### ❌ Hardcoding the outer index in the nested `useFieldArray` name

```tsx
// ❌ Always references sections[0] — all rows share the same inner array
const { fields: questions } = useFieldArray({ control, name: 'sections.0.questions' })
```

**Fix:** Use the dynamic outer index:

```tsx
// ✅ Each section row has its own inner array
const { fields: questions } = useFieldArray({
  control,
  name: `sections.${sIndex}.questions`  // sIndex from outer map
})
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `ResumeForm` with an `experience` field array. Each experience has `company` (string), `role` (string), and `responsibilities` (nested array of strings). Each experience can add/remove responsibilities. Validate with Zod.

### Solution

```tsx
'use client'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver }            from '@hookform/resolvers/zod'
import { z }                      from 'zod'

const ResumeSchema = z.object({
  fullName:   z.string().min(1, 'Required'),
  experience: z.array(z.object({
    company:          z.string().min(1, 'Company required'),
    role:             z.string().min(1, 'Role required'),
    responsibilities: z.array(z.object({
      text: z.string().min(1, 'Cannot be empty')
    })).min(1, 'Add at least one responsibility')
  }))
})
type ResumeForm = z.infer<typeof ResumeSchema>

function ExperienceRow({ expIndex, control, register, errors }: any) {
  const { fields: resps, append: addResp, remove: removeResp } = useFieldArray({
    control, name: `experience.${expIndex}.responsibilities`
  })
  const cls = 'border rounded-xl px-3 py-2 text-sm w-full'
  const e   = (m?: string) => m ? <p className="text-xs text-red-600 mt-1">{m}</p> : null

  return (
    <div className="p-4 border border-gray-200 rounded-2xl space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <input {...register(`experience.${expIndex}.company`)} placeholder="Company" className={cls} />
          {e(errors.experience?.[expIndex]?.company?.message)}
        </div>
        <div>
          <input {...register(`experience.${expIndex}.role`)}    placeholder="Role"    className={cls} />
          {e(errors.experience?.[expIndex]?.role?.message)}
        </div>
      </div>
      <div className="space-y-2 ml-2">
        <p className="text-xs font-semibold text-gray-500">Responsibilities</p>
        {resps.map((r, rIndex) => (
          <div key={r.id} className="flex gap-2">
            <input {...register(`experience.${expIndex}.responsibilities.${rIndex}.text`)}
                   placeholder="Responsibility" className={cls} />
            <button type="button" onClick={() => removeResp(rIndex)}
                    className="px-2 py-1 border border-red-200 rounded-lg text-xs text-red-500">✕</button>
          </div>
        ))}
        {e(errors.experience?.[expIndex]?.responsibilities?.root?.message)}
        <button type="button" onClick={() => addResp({ text: '' })}
                className="text-xs text-blue-600 underline">+ Add responsibility</button>
      </div>
    </div>
  )
}

export function ResumeForm() {
  const { register, control, handleSubmit, formState: { errors } } = useForm<ResumeForm>({
    resolver:      zodResolver(ResumeSchema),
    defaultValues: { fullName: '', experience: [{ company: '', role: '', responsibilities: [{ text: '' }] }] }
  })
  const { fields: exps, append: addExp, remove: removeExp } = useFieldArray({ control, name: 'experience' })

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-5 max-w-lg">
      <input {...register('fullName')} placeholder="Full name"
             className="w-full border rounded-xl px-3 py-2 text-sm" />
      {errors.fullName && <p className="text-xs text-red-600">{errors.fullName.message}</p>}

      {exps.map((exp, i) => (
        <div key={exp.id} className="relative">
          <ExperienceRow expIndex={i} control={control} register={register} errors={errors} />
          {exps.length > 1 && (
            <button type="button" onClick={() => removeExp(i)}
                    className="absolute top-3 right-3 text-xs text-red-500 hover:text-red-700">
              Remove
            </button>
          )}
        </div>
      ))}

      <button type="button"
              onClick={() => addExp({ company: '', role: '', responsibilities: [{ text: '' }] })}
              className="text-sm text-blue-600 underline">
        + Add experience
      </button>
      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
        Save resume
      </button>
    </form>
  )
}
```

---

---
