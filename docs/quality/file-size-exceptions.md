# File size exceptions

Files allowed to exceed the 500 line soft limit (absolute max 750), with the
reason. Every entry must stay under 750 lines and carry a justification.

| File | Lines | Reason |
|---|---|---|
| src/components/tableau/TableauPage.tsx | 727 | Rich board page ported verbatim from the committee collaboration prototype: kanban with pointer drag and drop, inline column editing, WIP limits, the list/table view and the embedded rich card modal. Kept as one screen to match the prototype exactly; scheduled to be split (column, card, header sub-components) in a follow-up once the space backend is wired and behavior is proven. |
