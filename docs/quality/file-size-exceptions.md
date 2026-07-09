# File size exceptions

Files allowed to exceed the 500 line soft limit (absolute max 750), with the
reason. Every entry must stay under 750 lines and carry a justification.

| File | Lines | Reason |
|---|---|---|
| src/components/tableau/TableauPage.tsx | 700 | Rich board page: kanban with drag and drop of cards and columns, inline column editing, WIP limits, filters, list/table view, near-real-time refresh and the embedded card modal. The card tile was extracted to CarteVue.tsx; the column sub-component (ColonneVue) remains inline and is the next scheduled split. |
| src/components/tableau/CarteModalProto.tsx | 536 | Full card detail modal (rich description, checklists with multi-assignee, attachments, comments with edit/delete and reactions, labels, dates, publish-as-activity, live presence). Dense but cohesive single screen; further splits (chat, side panel) tracked for a follow-up. |
