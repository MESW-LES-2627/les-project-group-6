# Definition of Done

This checklist applies to **every issue** (feature, bug fix or refactor). An issue is only moved to **Done** when all items below are checked.

## Checklist

### Functionality
- [ ] All acceptance criteria of the issue are met.
- [ ] The feature works end to end: UI, API and database, not just one layer.

### Testing and CI
- [ ] Automated tests cover the change (feature, bug fix or refactor).
- [ ] The CI pipeline passes on the PR (lint, type checking, tests and build).
- [ ] The feature was manually tested by at least one team member other than the author.

### Review and integration
- [ ] The PR was reviewed and approved by at least one other team member.
- [ ] Code is merged to `main` and the feature is usable in the staging environment.

### Documentation
- [ ] Relevant docs are updated (README, API docs, changelog).

### UI and security
- [ ] The page is responsive (works on mobile and desktop widths).
- [ ] Protected pages and endpoints require login.
- [ ] Users can only edit or delete their own data.

## Notes
- Check each item in the PR once it is fulfilled. Items that do not apply to the change can be ignored (for example, a backend only change can ignore the UI items, and a frontend only change can ignore the API and database parts).
- The merge and staging check happens after the PR is approved. The issue only moves to Done once the feature is confirmed working in staging.
- This document can evolve. Changes to the Definition of Done must be agreed by the team and committed through a PR.
 