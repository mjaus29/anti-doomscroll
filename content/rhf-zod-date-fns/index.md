# Full Curriculum Overview — RHF-Zod-datefns

This index was generated from the `RHF-Zod-datefns` folder.

Day 1

- [React Form Architecture — Why Forms Are Hard](day-01/01-react-form-architecture-why-forms-are-hard.md)
- [Uncontrolled vs Controlled Inputs](day-01/02-uncontrolled-vs-controlled-inputs.md)
- [`useForm` — Setup, Options, Return Values](day-01/03-useform-setup-options-return-values.md)
- [`register` — Registering Inputs and Options](day-01/04-register-registering-inputs-and-options.md)
- [`handleSubmit` — Submit Lifecycle and Async](day-01/05-handlesubmit-submit-lifecycle-and-async.md)
- [Validation Modes — `onChange`, `onBlur`, `onSubmit`](day-01/06-validation-modes-onchange-onblur-onsubmit.md)
- [`defaultValues` — Static, Async, Reset Behaviour](day-01/07-defaultvalues-static-async-reset-behaviour.md)
- [RHF's Low Re-render Mental Model](day-01/08-rhfs-low-re-render-mental-model.md)

Day 2

- [`formState` — The Proxy and What It Tracks](day-02/01-formstate-the-proxy-and-what-it-tracks.md)
- [`errors` — Field, Nested, and Root Errors](day-02/02-errors-field-nested-and-root-errors.md)
- [`touched` and `dirty` — User Interaction Tracking](day-02/03-touched-and-dirty-user-interaction-tracking.md)
- [`watch` — Reactive Value Subscription](day-02/04-watch-reactive-value-subscription.md)
- [`useWatch` — Isolated Component Re-renders](day-02/05-usewatch-isolated-component-re-renders.md)
- [`getValues` — Reading Values On Demand](day-02/06-getvalues-reading-values-on-demand.md)
- [`setValue` — Programmatic Field Updates](day-02/07-setvalue-programmatic-field-updates.md)
- [`trigger` — Manual Validation Control](day-02/08-trigger-manual-validation-control.md)
- [`setError` and `clearErrors` — Manual Error Management](day-02/09-seterror-and-clearerrors-manual-error-management.md)
- [`reset` and `resetField` — Form and Field Reset](day-02/10-reset-and-resetfield-form-and-field-reset.md)
- [Subscribe vs Read On Demand — The Decision Model](day-02/11-subscribe-vs-read-on-demand-the-decision-model.md)

Day 3

- [What is Zod and Why Use It](day-03/01-what-is-zod-and-why-use-it.md)
- [Primitive Schemas — string, number, boolean, date](day-03/02-primitive-schemas-string-number-boolean-date.md)
- [Objects — `z.object`, shape, strict, passthrough](day-03/03-objects-z-object-shape-strict-passthrough.md)
- [Arrays — `z.array`, min, max, nonempty](day-03/04-arrays-z-array-min-max-nonempty.md)
- [Enums and Literals](day-03/05-enums-and-literals.md)
- [Optional, Nullable, and Default Values](day-03/06-optional-nullable-and-default-values.md)
- [`parse` vs `safeParse`](day-03/07-parse-vs-safeparse.md)
- [Schema Composition — extend, merge, pick, omit, partial](day-03/08-schema-composition-extend-merge-pick-omit-partial.md)
- [TypeScript Inference — `z.infer`](day-03/09-typescript-inference-z-infer.md)

Day 4

- [`zodResolver` — Connecting Zod to RHF](day-04/01-zodresolver-connecting-zod-to-rhf.md)
- [Typed Form Values from Schemas](day-04/02-typed-form-values-from-schemas.md)
- [Input Coercion — Handling HTML String Inputs](day-04/03-input-coercion-handling-html-string-inputs.md)
- [Transforms and Preprocessing](day-04/04-transforms-and-preprocessing.md)
- [Custom Error Messages — Per-rule and Per-field](day-04/05-custom-error-messages-per-rule-and-per-field.md)
- [Error Path Mapping — How Zod Errors Become RHF Errors](day-04/06-error-path-mapping-how-zod-errors-become-rhf-errors.md)
- [Cross-field Validation with `.refine` and `.superRefine`](day-04/07-cross-field-validation-with-refine-and-superrefine.md)
- [Schema as Single Source of Truth](day-04/08-schema-as-single-source-of-truth.md)

Day 5

- [`Controller` — When and Why](day-05/01-controller-when-and-why.md)
- [`Controller` with Native Inputs](day-05/02-controller-with-native-inputs.md)
- [`Controller` with Third-Party Components](day-05/03-controller-with-third-party-components.md)
- [Reusable Field Wrapper Components](day-05/04-reusable-field-wrapper-components.md)
- [`FormProvider` and `useFormContext`](day-05/05-formprovider-and-useformcontext.md)
- [Nested Field Paths — Dot Notation and Objects](day-05/06-nested-field-paths-dot-notation-and-objects.md)
- [Component Composition Patterns](day-05/07-component-composition-patterns.md)
- [Scalable Form Module Structure](day-05/08-scalable-form-module-structure.md)

Day 6

- [`useFieldArray` — Setup and Core Concepts](day-06/01-usefieldarray-setup-and-core-concepts.md)
- [`append`, `prepend`, `remove`, `insert`, `swap`, `move`](day-06/02-append-prepend-remove-insert-swap-move.md)
- [`update`, `replace`, and the `fields` Array](day-06/03-update-replace-and-the-fields-array.md)
- [Nested Arrays and Objects inside Field Arrays](day-06/04-nested-arrays-and-objects-inside-field-arrays.md)
- [Field Array Validation with Zod](day-06/05-field-array-validation-with-zod.md)
- [Dependent and Conditional Fields](day-06/06-dependent-and-conditional-fields.md)
- [Discriminated Unions — Schema Branching](day-06/07-discriminated-unions-schema-branching.md)
- [Aligning Dynamic UI with Schema Structure](day-06/08-aligning-dynamic-ui-with-schema-structure.md)

Day 7

- [date-fns Fundamentals — Pure Functions and Immutability](day-07/01-date-fns-fundamentals-pure-functions-and-immutability.md)
- [`format` and `formatISO` — Display Formatting](day-07/02-format-and-formatiso-display-formatting.md)
- [`parse` and `parseISO` — Parsing User Input and ISO Strings](day-07/03-parse-and-parseiso-parsing-user-input-and-iso-strings.md)
- [Add/Subtract Helpers](day-07/04-add-subtract-helpers.md)
- [Date Comparisons — `isBefore`, `isAfter`, `isValid`](day-07/05-date-comparisons-isbefore-isafter-isvalid.md)
- [Intervals and Duration](day-07/06-intervals-and-duration.md)
- [`formatDistance` and `formatRelative`](day-07/07-formatdistance-and-formatrelative.md)
- [Display vs Storage — Normalization in Form Workflows](day-07/08-display-vs-storage-normalization-in-form-workflows.md)

Day 8

- [Advanced `refine` and `superRefine`](day-08/01-advanced-refine-and-superrefine.md)
- [Cross-field and Date-Range Validation Patterns](day-08/02-cross-field-and-date-range-validation-patterns.md)
- [Async Validation — Debounced Server Checks](day-08/03-async-validation-debounced-server-checks.md)
- [Create vs Edit Flows — Schema Variants and API Hydration](day-08/04-create-vs-edit-flows-schema-variants-and-api-hydration.md)
- [Form Accessibility — ARIA, Focus, Error Announcements](day-08/05-form-accessibility-aria-focus-error-announcements.md)
- [Performance Tuning — Re-render Control](day-08/06-performance-tuning-re-render-control.md)
- [Testing Strategies — What to Test in RHF + Zod Forms](day-08/07-testing-strategies-what-to-test-in-rhf-zod-forms.md)
- [Discriminated Union Caveats, Refined Schemas, and Date Interval Edge Cases](day-08/08-discriminated-union-caveats-refined-schemas-and-date-interval-edge-cases.md)
