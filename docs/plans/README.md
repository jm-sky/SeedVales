# Plans

Każdy plik ma nazwę `domain--ID--slug.md`

`ID` ma postać `001`, kolejny numer globalny dla domeny.

np. `world--001--first-good-issue.md`

Każdy plan ma szablon:

```markdown
# Title

**Status:** draft  
**Model:** sonnet | opus — who executes it (D-PLAN-7)  
**Domain:** world  
**Sub domains:** world-gen, hydrology  
**Roadmap:** optional
**Created:** YYYY-MM-DD
**Finished:** YYYY-MM-DD

---

Treść...


```

- Status: `draft`, `planned`, `in_progress`, `blocked`, `done`
- Model (D-PLAN-7): `sonnet` = implementation, refactors, tests, debugging with a clear spec (most work); `opus` = architecture, unclear problems, hard decisions (keep/drop, vision changes, triage decisions) and the final/wave review. A plan may split it per step. Rule of thumb: **Opus sets the direction and controls quality, Sonnet does most of the work.**

