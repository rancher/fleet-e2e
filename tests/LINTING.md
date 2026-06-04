# Code Quality & Soft Formatting

This project uses **ESLint** with:
- **Hard rules (errors)** - Code quality issues that must be fixed
- **Soft rules (warnings)** - Formatting suggestions that can be auto-fixed

## Commands

```bash
npm run lint          # Check for all issues (errors + warnings)
npm run lint:fix      # Auto-fix formatting + fixable errors
```

**What `npm run lint:fix` auto-fixes:**
- ✅ Indentation (2 spaces)
- ✅ Quotes (single quotes)
- ✅ Semicolons (always added)
- ✅ Spacing (around operators, braces, keywords)
- ✅ Trailing commas (on multiline)
- ✅ Blank lines (after const/imports, before return)
- ✅ Extra semicolons (removed)
- ❌ Blank lines after `() => {` (add manually)
- ❌ Unused variables (manual fix - prefix with `_`)
- ❌ `require()` imports (manual fix - convert to ES6)
- ❌ Useless escapes (manual fix)

## What ESLint Checks

### Hard Rules (Errors - Must Fix)
- **Indentation** - 2 spaces, consistent for all nested code
- **Blank lines** - Required:
  - After the last variable declaration (consecutive `const`/`let`/`var` can be together)
  - After import statements (consecutive imports can be together)
  - Before `return` statements
  - After block statements (if, for, while, etc.)
  - **NOT automatically added** after function opening braces `() => {` (add manually if desired)
- **Extra semicolons** - Removed (e.g., `() => {;`)
- **Unused variables** - Variables declared but never used (prefix with `_` to ignore)
- **require() imports** - Use ES6 `import` instead
- **Useless escape characters** - Unnecessary backslashes in strings
- **Constant conditions** - `if (true)` or similar

### Soft Rules (Warnings - Auto-fixable Suggestions)
- **Quotes** - Single quotes preferred
- **Semicolons** - Always add semicolons
- **Trailing commas** - Add on multiline
- **Spacing** - Consistent spacing around braces, operators, keywords
- **Trailing spaces** - Remove
- **Empty lines** - Max 2 consecutive

### Type Safety (Warnings)
- **Explicit `any` types** - Prefer proper TypeScript types

**Soft rules are warnings only** - your code works either way, but `--fix` will clean them up.

## Configuration

- **eslint.config.mjs** - ESLint rules (code quality only)

## Common Fixes

### Unused Variables
```typescript
// ❌ Error
function handler(event, context) { }

// ✅ Fix 1: Use the variable
function handler(event, context) { 
  console.log(event);
}

// ✅ Fix 2: Prefix with underscore
function handler(_event, context) { }
```

### require() Imports
```typescript
// ❌ Error
const lib = require('library');

// ✅ Fix
import lib from 'library';
```

### Useless Escapes
```typescript
// ❌ Error
const msg = "Quote: \"hello\"";

// ✅ Fix
const msg = 'Quote: "hello"';
// or
const msg = "Quote: 'hello'";
```

## IDE Integration

### VS Code
Install extension:
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)

### JetBrains
1. Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint
2. Enable "Automatic ESLint configuration"

## Example

Before `npm run lint:fix`:
```typescript
const x = "test"  // double quotes, no semicolon
if(true){         // no spacing
  console.log(x)  // wrong indentation
  return x        // no blank line before return
}
```

After `npm run lint:fix`:
```typescript
const x = 'test';  // single quotes, semicolon added

if (true) {        // spacing added, blank line after const
  console.log(x);  // indentation fixed

  return x;        // blank line before return
}
```

**Note:** Blank lines after `() => {` in test functions are NOT auto-added, but if you add them manually, the linter will keep them.

Example manual formatting (recommended for tests):
```typescript
it(qase(123, 'Test description'), { tags: '@fleet-123' }, () => {
                                                                    // <- manually add blank line
  const repoName = 'test';

  cy.something();
});
```
