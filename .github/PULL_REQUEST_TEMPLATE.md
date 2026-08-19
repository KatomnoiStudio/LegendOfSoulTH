## Summary

Provide a brief summary of the changes made in this Pull Request.

## Type of Change

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update
- [ ] 🔧 Refactoring / Maintenance

## Checklist

- [ ] Code follows project conventions
- [ ] `npm run ci` passes cleanly locally — the whole gate set, not a subset

<!--
  This used to list typecheck / lint / test / build as four separate boxes. All four could be
  ticked while four other gates in `npm run ci` had never run, so the checklist certified less
  than it appeared to. `package.json` is the only list of what the gate set contains; naming
  the gates here again is how the two drifted apart in the first place.
-->

- [ ] A defect fix ships a test proven red against the pre-fix source (`AGENTS.md` rule 23)
