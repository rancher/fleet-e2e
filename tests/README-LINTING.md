# ESLint Setup - Final Configuration

## Quick Reference

```bash
npm run lint          # Check all issues
npm run lint:fix      # Auto-fix everything fixable
```

## What Gets Auto-Fixed

### ✅ Always Auto-Fixed
- **Indentation**: 2 spaces, consistent
- **Quotes**: Single quotes `'` 
- **Semicolons**: Always added `;`
- **Spacing**: Around `=`, `{`, `}`, keywords, operators
- **Trailing commas**: Added on multiline arrays/objects
- **Extra semicolons**: Removed (e.g., `() => {;` → `() => {`)
- **Blank lines**:
  - After last `const`/`let`/`var` declaration
  - After last `import` statement
  - Before `return` statements
  - After block statements (if, for, while)

### ❌ NOT Auto-Fixed (Manual Fix Required)
- **Blank lines after `() => {`** in test functions (add manually if desired)
- **Unused variables** (prefix with `_` if intentional)
- **`require()` imports** (convert to ES6 `import`)
- **Useless escape characters** (fix manually)
- **`any` types** (add proper TypeScript types)

## Configuration Files

- **`eslint.config.mjs`** - ESLint rules
- **`.vscode/settings.json`** - VS Code integration
- **`LINTING.md`** - Full documentation

## Current Formatting Style

### Indentation
```typescript
it(qase(126,
  'Fleet-126: Test description'),
  { tags: '@fleet-126' },
  () => {
    const x = 'test';  // 2 spaces
    
    if (condition) {   // 2 spaces per level
      doSomething();
    }
  });
```

### Blank Lines
```typescript
// After variable declarations
const x = 'test';
const y = 'test2';
                      // <- blank line auto-added here
cy.something();

// Before return
cy.something();
                      // <- blank line auto-added here
return x;

// After imports
import 'module';
                      // <- blank line auto-added here
export const x = 1;
```

### Manual Blank Lines (Recommended for Tests)
```typescript
it(qase(123, 'Test'), () => {
                              // <- add this manually if you want
  const repoName = 'test';
  
  cy.something();
});
```

## Remaining Issues (Manual Fix)

After running `npm run lint:fix`, you may see:
- **0 errors**: All auto-fixable errors are fixed ✅
- **~33 warnings**: 
  - Type safety (`any` types) - Acceptable, won't fail CI
  - Line length > 120 characters - Acceptable, won't fail CI

**What ESLint cannot auto-fix:**
- Multi-line function call alignment (e.g., `it(qase(...))` formatting)
- require() imports for CommonJS libraries (suppressed with `// eslint-disable-next-line`)

## IDE Setup

### VS Code
1. Install [ESLint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
2. Auto-fix on save is configured globally in user settings

## Summary

**ESLint now provides:**
- Single quotes, semicolons, trailing commas
- Spacing (around operators, braces, keywords)
- Automatic blank lines for readability
- Line length warnings (120 chars max)
- Real code quality checks (unused vars, type safety)

**Note:** Indentation rule is disabled - ESLint cannot handle complex multi-line function call alignment

**You control:**
- Blank lines after test function opening braces `() => {`
- Other manual formatting preferences

The linter won't fight you - it enforces consistency while respecting your manual formatting choices.
