# Prettier - Quick Reference

## Commands

```bash
npm run prettier       # Check formatting
npm run prettier:fix   # Auto-fix formatting
```

## What Gets Auto-Fixed

- ✅ Single quotes
- ✅ Semicolons
- ✅ Trailing commas
- ✅ Indentation (2 spaces)
- ✅ Line wrapping (120 chars)
- ✅ Arrow function parentheses

## CI Behavior

PR checks will **FAIL** if any file has formatting issues.

Run `npm run prettier:fix` before committing to ensure files are formatted.

## Files Affected

- TypeScript (`.ts`)
- JavaScript (`.js`)
- JSON (`.json`)
- YAML (`.yml`, `.yaml`)
- Markdown (`.md`)

## Configuration

- [`.prettierrc.json`](.prettierrc.json) - Formatting rules
- [`.prettierignore`](.prettierignore) - Excluded files

## VSCode Auto-Format on Save

Create `.vscode/settings.json` in project root (ignored by git):

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

This enables:

- Auto-format with Prettier on save
- Auto-fix ESLint issues on save

Requires: [Prettier VSCode extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
