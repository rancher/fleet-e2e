# CLAUDE.md

Fleet E2E automation. Two frameworks: **Ginkgo (Go)** for infrastructure, **Cypress (TypeScript)** for UI.

## Commands

From `tests/` directory:

```bash
# Ginkgo
make deps
make e2e-install-rancher
make e2e-upgrade-rancher-manager
ginkgo --label-filter install -r -v ./e2e

# Cypress
npx cypress run -C cypress.config.ts cypress/e2e/unit_tests/*.spec.ts
npx cypress run -C cypress.config.ts --env grepTags="@p0" cypress/e2e/unit_tests/*.spec.ts
npx cypress open -C cypress.config.ts
```

## Structure

- `tests/e2e/` - Ginkgo tests
- `tests/cypress/e2e/unit_tests/` - Cypress specs
- `tests/cypress/support/commands.ts` - Custom commands
- `tests/cypress/support/e2e.ts` - Command types
- `.github/workflows/` - CI

## Key Files

- `tests/Makefile`
- `tests/cypress.config.ts`
