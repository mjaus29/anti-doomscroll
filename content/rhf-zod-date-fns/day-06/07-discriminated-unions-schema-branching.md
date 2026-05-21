# 7 — Discriminated Unions — Schema Branching

---

## T — TL;DR

`z.discriminatedUnion('key', [schema1, schema2])` selects the active schema branch based on a single discriminator field. Each branch can have different required fields. This is more precise than `superRefine` for forms where different account types or payment methods have entirely different field sets.

---

## K — Key Concepts

```tsx
import { z } from 'zod'

// ─── z.discriminatedUnion — select schema by discriminator key
const PaymentSchema = z.discriminatedUnion('method', [
  z.object({
    method:     z.literal('card'),
    cardNumber: z.string().regex(/^\d{16}$/, '16 digits required'),
    expiry:     z.string().regex(/^\d{2}\/\d{2}$/, 'MM/YY format'),
    cvv:        z.string().regex(/^\d{3,4}$/, '3–4 digits')
  }),
  z.object({
    method:      z.literal('bank'),
    accountName: z.string().min(2, 'Required'),
    bsb:         z.string().regex(/^\d{6}$/, '6-digit BSB'),
    accountNumber: z.string().regex(/^\d{6,10}$/, '6–10 digits')
  }),
  z.object({
    method: z.literal('paypal'),
    paypalEmail: z.string().email('Valid PayPal email required')
  })
])

type Payment = z.infer<typeof PaymentSchema>
// Payment =
//   | { method: 'card';   cardNumber: string; expiry: string; cvv: string }
//   | { method: 'bank';   accountName: string; bsb: string; accountNumber: string }
//   | { method: 'paypal'; paypalEmail: string }

// ─── Parse — only validates the active branch
PaymentSchema.safeParse({ method: 'card', cardNumber: '1234567890123456', expiry: '12/27', cvv: '123' })
// ✅ validates card fields only — bank/paypal fields not required

PaymentSchema.safeParse({ method: 'bank', accountName: 'Mark', bsb: '123456', accountNumber: '12345678' })
// ✅ validates bank fields only — card/paypal fields not required
```

```tsx
// ─── Wrapping in a parent schema
const CheckoutSchema = z.object({
  cartId:  z.string().uuid(),
  payment: PaymentSchema        // discriminated union as a nested field
})
```

```tsx
// ─── With RHF: the form type includes all possible fields (union)
type PaymentForm = z.infer<typeof PaymentSchema>
// All possible fields are in the union type
// RHF needs a concrete defaultValues — pick the starting method

const { register, watch, handleSubmit, formState: { errors } } = useForm<PaymentForm>({
  resolver:      zodResolver(PaymentSchema),
  defaultValues: { method: 'card', cardNumber: '', expiry: '', cvv: '' }
})

const method = watch('method')  // controls which branch renders

// When user switches method, reset to branch defaults using setValue/reset
function switchMethod(newMethod: string) {
  if (newMethod === 'card')
    reset({ method: 'card',   cardNumber: '', expiry: '', cvv: '' })
  if (newMethod === 'bank')
    reset({ method: 'bank',   accountName: '', bsb: '', accountNumber: '' })
  if (newMethod === 'paypal')
    reset({ method: 'paypal', paypalEmail: '' })
}
```

---

## W — Why It Matters

- `z.discriminatedUnion` is more efficient than `z.union` — it looks at the discriminator key first and only validates the matching branch, without trying all options. This matters for large union schemas.
- The discriminated union TypeScript type is a proper tagged union — TypeScript can narrow to the correct branch inside `onSubmit` with an `if (data.method === 'card')` check, giving full type safety for branch-specific fields.
- Calling `reset()` when switching branches is essential — it clears the previous branch's field values so they don't contaminate the next branch's submission payload.

---

## I — Interview Q&A

### Q: What is the advantage of `z.discriminatedUnion` over `z.union` for a payment method form?

**A:** `z.union` tries every schema in order and returns the first that matches — for three payment method schemas, it tries all three even when the first one passes, which is slow and produces confusing error messages. `z.discriminatedUnion` reads the discriminator field first (`method`), immediately selects the matching schema branch, and only validates that branch. Error messages are precise — if `method: 'card'` and `cardNumber` is invalid, you get the card error, not errors from the bank or paypal schemas. The inferred TypeScript type is also a proper tagged union, enabling `if (data.method === 'card') { data.cardNumber }` narrowing in `onSubmit`.

---

## C — Common Pitfalls + Fix

### ❌ Not resetting field values when the user switches discriminator branch

```tsx
// ❌ User fills card fields, switches to PayPal
// card fields (cardNumber, expiry, cvv) still in formState — submitted with paypal data
<select onChange={e => setValue('method', e.target.value)}>
```

**Fix:** Reset the entire form to the new branch's shape when switching:

```tsx
// ✅ Reset to branch defaults — clears orphan fields
function handleMethodChange(newMethod: string) {
  const defaults = {
    card:   { method: 'card'   as const, cardNumber: '', expiry: '', cvv: '' },
    bank:   { method: 'bank'   as const, accountName: '', bsb: '', accountNumber: '' },
    paypal: { method: 'paypal' as const, paypalEmail: '' }
  }
  reset(defaults[newMethod as keyof typeof defaults])
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `PaymentMethodForm` with discriminated union for `card` / `bank` / `paypal`. Each branch shows only its relevant fields. Switching method resets to branch defaults. `onSubmit` uses TypeScript narrowing to log branch-specific data.

### Solution

```tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z }           from 'zod'

const PaymentSchema = z.discriminatedUnion('method', [
  z.object({ method: z.literal('card'),
    cardNumber: z.string().regex(/^\d{16}$/, '16 digits'),
    expiry:     z.string().regex(/^\d{2}\/\d{2}$/, 'MM/YY'),
    cvv:        z.string().regex(/^\d{3,4}$/, '3–4 digits') }),
  z.object({ method: z.literal('bank'),
    accountName:   z.string().min(2, 'Required'),
    bsb:           z.string().regex(/^\d{6}$/, '6 digits'),
    accountNumber: z.string().regex(/^\d{6,10}$/, '6–10 digits') }),
  z.object({ method: z.literal('paypal'),
    paypalEmail: z.string().email('Valid PayPal email') })
])
type PaymentForm = z.infer<typeof PaymentSchema>

const DEFAULTS = {
  card:   { method: 'card'   as const, cardNumber: '', expiry: '', cvv: '' },
  bank:   { method: 'bank'   as const, accountName: '', bsb: '', accountNumber: '' },
  paypal: { method: 'paypal' as const, paypalEmail: '' }
}

export function PaymentMethodForm() {
  const { register, watch, handleSubmit, reset, formState: { errors } } = useForm<PaymentForm>({
    resolver:      zodResolver(PaymentSchema),
    defaultValues: DEFAULTS.card
  })

  const method = watch('method')
  const cls    = 'w-full border rounded-xl px-3 py-2 text-sm'
  const err    = 'text-xs text-red-600 mt-1'

  function onSubmit(data: PaymentForm) {
    if (data.method === 'card')   console.log('Card payment:', data.cardNumber)
    if (data.method === 'bank')   console.log('Bank transfer:', data.bsb, data.accountNumber)
    if (data.method === 'paypal') console.log('PayPal:', data.paypalEmail)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
      <div className="flex rounded-xl overflow-hidden border border-gray-300 divide-x">
        {(['card', 'bank', 'paypal'] as const).map(m => (
          <button key={m} type="button"
                  onClick={() => reset(DEFAULTS[m])}
                  className={`flex-1 py-2 text-sm font-medium capitalize
                    ${method === m ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            {m}
          </button>
        ))}
      </div>

      {method === 'card' && (
        <>
          <div>
            <input {...register('cardNumber')} placeholder="Card number (16 digits)" className={cls} />
            {(errors as any).cardNumber && <p className={err}>{(errors as any).cardNumber.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input {...register('expiry')} placeholder="MM/YY" className={cls} />
              {(errors as any).expiry && <p className={err}>{(errors as any).expiry.message}</p>}
            </div>
            <div>
              <input {...register('cvv')} placeholder="CVV" className={cls} />
              {(errors as any).cvv && <p className={err}>{(errors as any).cvv.message}</p>}
            </div>
          </div>
        </>
      )}

      {method === 'bank' && (
        <>
          <div>
            <input {...register('accountName')} placeholder="Account name" className={cls} />
            {(errors as any).accountName && <p className={err}>{(errors as any).accountName.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input {...register('bsb')} placeholder="BSB (6 digits)" className={cls} />
              {(errors as any).bsb && <p className={err}>{(errors as any).bsb.message}</p>}
            </div>
            <div>
              <input {...register('accountNumber')} placeholder="Account number" className={cls} />
              {(errors as any).accountNumber && <p className={err}>{(errors as any).accountNumber.message}</p>}
            </div>
          </div>
        </>
      )}

      {method === 'paypal' && (
        <div>
          <input {...register('paypalEmail')} type="email" placeholder="PayPal email" className={cls} />
          {(errors as any).paypalEmail && <p className={err}>{(errors as any).paypalEmail.message}</p>}
        </div>
      )}

      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
        Pay now
      </button>
    </form>
  )
}
```

---

---
