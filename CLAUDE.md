# Claude Development Memory

## Successful Development Patterns & Philosophy

### Our Core Values
- **Beauty as Architecture** - We optimize for code that is both beautiful to read and architecturally sound
- **Incrementalism Rocks** - Tackle one problem at a time, building on each success
- **Reusability Over Repetition** - Create frameworks and patterns that benefit the entire codebase
- **Single Source of Truth** - Eliminate duplication through shared constants and utilities

### Testing Excellence
- **Follow cursor rules religiously** - Always use `yarn test:ci`, fix tests one at a time with `.only`
- **BDD-style naming** - Tests should read like sentences: `when("handling X", (discord) => { it("does Y") })`
- **Beautiful helpers over repetition** - Extract complex assertions into intent-revealing functions
- **Shared constants** - Production and test code use the same constants for perfect sync
- **Reusable test frameworks** - Build helpers that work across all features (like `discord-ui-expectations.ts`)

### Code Organization Success Patterns
1. **Start with working solution** - Get tests passing first
2. **Extract for beauty** - Move constants, helpers, and utilities to shared locations  
3. **Build reusable frameworks** - Create tools that future features can use
4. **Optimize formatting** - Ensure code is beautiful and readable (100 char line width)
5. **Maintain architectural consistency** - Every improvement should benefit the whole codebase

### Architectural Wins from Recent Session
- **Global Discord mocks** in `test/setup.ts` - Consistent testing environment
- **`when()` helper** - Beautiful BDD-style test syntax with automatic Discord setup
- **Shared constants** - Production code and tests use same values (see `features/applications/constants.ts`)
- **Reusable UI expectations** - `discord-ui-expectations.ts` works across all Discord features
- **Beautiful formatting** - 100 char lines, consistent style via `.prettierrc`

### Discord Testing Patterns
```typescript
// ✅ Beautiful pattern to follow
when("handling feature X", (discord) => {
  it("accomplishes user goal Y", async () => {
    await updateFeatureX(discord);
    expectButtonCreated(FEATURE_X.CUSTOM_ID, FEATURE_X.LABEL);
    // ... rest of test
  });
});
```

### File Organization That Works
```
src/features/[feature]/
├── constants.ts          # Shared between prod and test
├── [feature].ts         # Main implementation  
├── [feature].test.ts    # Beautiful BDD tests
└── ...

src/test/helpers/
├── describe-discord.ts      # when() helper
├── discord-ui-expectations.ts   # Reusable UI testing
└── ...
```

## Project-Specific Context

### Cursor Rules Location
- **Cursor rules directory**: `.cursor/rules/`
- **Current rules**:
  - `unit-tests.mdc` - Testing guidelines and best practices
  - `formatting-and-linting.mdc` - Code formatting automation
  - `development-philosophy.mdc` - Core development philosophy (this session's learnings)
- All rules are set to `alwaysApply: true` for consistent guidance

### Testing Commands
- **Run tests**: `yarn test:ci` (never `yarn test` - that's watch mode)
- **Format code**: `yarn format` 
- **Lint and fix**: `yarn lint:fix`
- **Full cleanup**: `yarn cleanup`

### Current Architecture
- **Discord bot** using discord.js with TypeScript
- **Global test setup** in `src/test/setup.ts` with automatic mock management
- **BDD-style testing** with `when()` helper for readable test organization
- **Shared constants** between production and test code for consistency
- **100 character line width** for beautiful, readable formatting

---

*This memory captures our successful collaborative approach. The key is always optimizing for both beauty and architectural soundness, building reusable patterns that make the entire codebase better.*