## What does this PR do?

<!-- Brief description of the change -->

## Checklist

- [ ] Freeze-forever test applied to all new inline content: would it still be correct if never updated?
- [ ] Routing still correct from `skills/massive/SKILL.md`
- [ ] New or changed local links are valid
- [ ] No absolute local paths (`/Users/...`, `C:\Users\...`)
- [ ] No hardcoded API keys; starter keeps `MASSIVE_API_KEY` server-only
- [ ] No Polygon-era hosts or package names (except where explaining the rebrand)
- [ ] `endpoint-index.md` changed only via `scripts/sync-docs.mjs`
- [ ] At least one eval case added or updated in `tests/eval-cases.md` (required for new routes/widgets)
- [ ] Starter changes: `npx tsc --noEmit` and `npx next build` pass
- [ ] `bash scripts/validate-skills.sh` passes locally
