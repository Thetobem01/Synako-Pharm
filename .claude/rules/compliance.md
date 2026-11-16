# Rules the code must keep (PCN Electronic Pharmacy Regulations 2026)

Not legal advice. Anything that loosens one of these needs Tobe and the superintendent pharmacist.

- **No controlled medicines or dangerous drugs online.** Never add them to `js/data.js` as orderable;
  `/controlled-medicines` explains in-store collection.
- **Prescription-only medicines need a valid prescription** (licensed prescriber with a Nigerian
  address) and pharmacist approval before payment. Don't add a path that pays for a POM first.
- **Nigeria only, prices in Naira.** No cross-border shipping or foreign currencies.
- **Adults only.** The date-of-birth check must not be weakened; a real ID check is still to come.
- **Audit trail.** Every order change goes through `log()` in `api/_lib/core.js`; don't mutate orders
  without a history entry.
- **NEPP (National Electronic Pharmacy Platform).** All online orders must eventually pass through it;
  the PCN hasn't published the specs. Not on `main` yet: when it's added, mark it with a `NEPP:` comment
  and keep that marker through refactors.
- **Data protection (NDPA 2023).** Prescription photos stay private (staff only); no personal data
  in logs, analytics or URLs.
- **Licence details** (ROPSE emblem, licence numbers) come from `js/config.js`. Never invent them.
