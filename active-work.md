# Discord Testing Library Redesign Plan

## Background

We are building a comprehensive testing framework for Discord bots, similar to Testing Library for React. The goal is to provide a clean, intuitive API for testing Discord bot interactions with proper separation of concerns and excellent developer experience.

### Current State
- **Architecture**: Test infrastructure is generic, bot-specific config is separated
- **API Status**: Working but complex with multiple abstractions
- **Test Status**: 1/3 tests passing, remaining failures are specific channel configuration issues
- **Technical Quality**: TypeScript-safe, no `any` casts, clear error messages

### Problems Solved
✅ **Fixed critical mock bug**: `mockReset()` was destroying custom implementations  
✅ **Achieved architectural separation**: Generic test infra + bot-specific config layer  
✅ **Eliminated bot-specific leaks**: No hardcoded channels/concepts in generic code  
✅ **Type safety**: Proper Discord.js union type handling without casts  
✅ **Testing Library patterns**: `getButton(label, { style? })` with helpful error messages  

### Current Pain Points
❌ **Over-engineered abstractions**: Too many concepts (registry, multiple mock layers, dual APIs)  
❌ **Complex setup**: Multiple ways to configure channels, unclear ownership  
❌ **API inconsistency**: Mix of Testing Library patterns and custom approaches  
❌ **Leaky abstractions**: Users exposed to internal concepts (guild, client)  
❌ **Unnecessary indirection**: Component registry middleware for simple queries  

## Goals

### Primary Goals
1. **Beautiful API**: Clean, intuitive interface that feels like Testing Library
2. **Architectural soundness**: Single responsibility, clear ownership, minimal concepts
3. **Developer experience**: Excellent error messages, helpful failures, fast feedback
4. **Type safety**: Leverage TypeScript without compromises or casts
5. **Maintainability**: Easy to understand, extend, and debug

### Success Metrics
- **API Simplicity**: New team member can write tests without documentation
- **Test Reliability**: Tests pass consistently, failures are actionable
- **Performance**: Fast test execution, minimal setup overhead
- **Extensibility**: Easy to add new Discord features (slash commands, modals, etc.)

## Design Constraints

### Must Have
- **Generic test infrastructure**: No bot-specific knowledge in core library
- **Testing Library compatibility**: Familiar patterns for React developers  
- **Full Discord.js support**: Buttons, embeds, interactions, channels, users
- **Real event flow**: Use actual Discord listeners, not just mocks
- **TypeScript first**: Proper types, no `any` escapes

### Nice to Have
- **Zero configuration**: Sensible defaults for common scenarios
- **Rich assertions**: Custom matchers that provide clear feedback
- **Async support**: Proper handling of Discord's async nature
- **Debug tools**: Easy to understand what's happening when tests fail

### Constraints
- **Jest ecosystem**: Must work within existing Jest setup
- **Existing codebase**: Cannot break current working tests during transition
- **Discord.js compatibility**: Work with current Discord.js version and types

## Things We've Tried (Bad Approaches)

### ❌ Component Registry Pattern
```typescript
// Too much indirection:
updateApplicationInfo() → mock → discordComponentRegistry.registerButton() → getButton()
```
**Problem**: Unnecessary middleware layer for simple component queries

### ❌ Dual Channel Setup APIs  
```typescript
// Confusing - two ways to do the same thing:
channels: { "request-dump": "text" }
defaultChannels: [{ name: "request-dump", id: "111222333", type: "thread" }]
```
**Problem**: Inconsistent behavior, unclear which to use when

### ❌ Multiple Mock Layers
```typescript
// Too complex:
setup.ts → setup-discord-actions.ts → globalDiscordMocks → registry → query
```
**Problem**: Hard to debug, unclear ownership, many failure points

### ❌ Leaky User Creation
```typescript
// Exposes internals:
const applicant = discord.guild.createUser("eager_applicant");
```
**Problem**: User shouldn't need to know about guild concept

### ❌ TypeScript Casts
```typescript
// Unsafe:
button.data as any
```
**Problem**: Loses type safety, hides real type issues

## Proposed Solution

### Core Design: Single Environment Object

```typescript
interface DiscordTest {
  // Bot actions - what the bot does
  bot: {
    updateApplicationInfo(): Promise<void>;
    sendMessage(channel: string, content: string): Promise<void>;
    // other bot methods as needed
  };
  
  // Element queries - Testing Library style
  getByRole(role: 'button' | 'embed', options?: QueryOptions): DiscordElement;
  queryByRole(role: 'button' | 'embed', options?: QueryOptions): DiscordElement | null;
  getAllByRole(role: 'button' | 'embed', options?: QueryOptions): DiscordElement[];
  
  // User interactions - implicit context
  user(name: string): DiscordUser;
  
  // Channel access - simple and direct
  channel(name: string): DiscordChannel;
}

interface QueryOptions {
  name?: string;        // Button label, embed title
  style?: ButtonStyle;  // For buttons
}

interface DiscordElement {
  // Element properties
  role: 'button' | 'embed';
  name: string;
  
  // Actions available on element
  click?(user: DiscordUser): Promise<void>;
}

interface DiscordUser {
  name: string;
  click(element: DiscordElement): Promise<void>;
  
  // Assertions built in
  sentDM: jest.MockedFunction<any>;
  editedReply: jest.MockedFunction<any>;
}

interface DiscordChannel {
  name: string;
  type: 'text' | 'thread';
  
  // Assertions built in  
  sentMessage: jest.MockedFunction<any>;
}
```

### Beautiful Usage Example

```typescript
// Simple setup with sensible defaults
const discord = createDiscordTest();

// Bot performs action
await discord.bot.updateApplicationInfo();

// Query for elements (Testing Library style)
const volunteerButton = discord.getByRole('button', { name: 'Volunteer Application' });
const embed = discord.getByRole('embed', { name: 'Volunteer Applications' });

// User interactions
const applicant = discord.user('eager_applicant');
await applicant.click(volunteerButton);

// Assertions with built-in matchers
expect(applicant.sentDM).toHaveBeenCalledWith(APPLICATION_MESSAGE_TEMPLATE);
expect(discord.channel('request-dump').sentMessage).toHaveBeenCalledWith(/sent to \*\*eager_applicant\*\*/);
```

### Key Design Principles

1. **Single Entry Point**: One `discord` object owns everything
2. **No Registry**: Query rendered Discord UI directly like DOM
3. **Implicit Context**: Users/channels connected automatically
4. **Testing Library Patterns**: `getByRole`, `queryByRole` familiar to React devs
5. **Built-in Assertions**: Matchers integrated into objects, not separate

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)
- [ ] Create new `DiscordTest` interface
- [ ] Implement direct UI querying (no registry)
- [ ] Build user/channel abstractions with implicit context
- [ ] Create `createDiscordTest()` factory with defaults

### Phase 2: Testing Library API (Week 1) 
- [ ] Implement `getByRole('button')` and `getByRole('embed')`
- [ ] Add `queryByRole` and `getAllByRole` variants
- [ ] Create rich `QueryOptions` with name/style filtering
- [ ] Add helpful error messages for failed queries

### Phase 3: Built-in Assertions (Week 2)
- [ ] Integrate Jest matchers into user/channel objects
- [ ] Remove separate matcher files
- [ ] Create fluent assertion API
- [ ] Add custom error messages

### Phase 4: Migration & Cleanup (Week 2)
- [ ] Migrate existing tests to new API
- [ ] Remove old abstractions (registry, dual mock layers)
- [ ] Clean up file structure
- [ ] Update documentation

### Phase 5: Polish & Extension (Week 3)
- [ ] Add support for more Discord elements (modals, select menus)
- [ ] Performance optimization
- [ ] Advanced debugging tools
- [ ] Comprehensive test coverage

## Incremental Delivery Strategy

### Step 1: Parallel Implementation
- Build new API alongside existing system
- No breaking changes to current tests
- Validate design with simple test cases

### Step 2: Gradual Migration  
- Convert one test file at a time
- Keep old system working during transition
- Compare results to ensure compatibility

### Step 3: Clean Cutover
- Remove old abstractions once all tests migrated
- Delete unused files and concepts
- Final API polish

### Step 4: Documentation & Rollout
- Create comprehensive examples
- Write migration guide
- Team training and adoption

## Risk Mitigation

### Technical Risks
- **Discord.js type complexity**: Prototype with real types early
- **Jest integration issues**: Test with actual Jest environment
- **Performance degradation**: Benchmark against current system

### Project Risks  
- **Scope creep**: Stick to core API, resist feature additions
- **Breaking changes**: Maintain backward compatibility during transition
- **Team adoption**: Get early feedback, iterate on developer experience

## Success Criteria

### Functional Requirements
- [ ] All existing tests pass with new API
- [ ] New tests are 50% shorter than current approach
- [ ] Error messages are actionable and helpful
- [ ] No TypeScript `any` casts required

### Quality Requirements
- [ ] Test execution time within 10% of current system
- [ ] New team member can write test without documentation
- [ ] Failed tests clearly indicate what to fix
- [ ] Codebase is easier to understand and maintain

## Technical Implementation Details

### Current Codebase Structure
```
src/test/
├── setup/                     # Mock setup (will be simplified)
│   ├── setup-discord-actions.ts   # Contains critical mock bug fix
│   ├── setup-test-config.ts
│   └── setup-service-*.ts
├── discord-testing-library/   # Core library (will be redesigned)
│   ├── create-discord-environment.ts
│   ├── discord-component-registry.ts  # Will be removed
│   └── create-mock-*.ts
├── matchers/                  # Jest matchers (will be integrated)
├── expects/                   # UI expectations (will be integrated)
└── app-test-config.ts        # Bot-specific config (keep)
```

### Critical Bug Fix to Preserve
**File**: `src/test/setup/setup-discord-actions.ts`  
**Line 74**: `mockClear()` instead of `mockReset()`  
**Why Critical**: `mockReset()` destroys custom implementations, `mockClear()` preserves them  
**Symptom if broken**: Button registration fails silently, tests show "Available buttons: none"

### Key Files to Understand
1. **Current working test**: `src/features/applications/request-application-button-commands.test.ts`
2. **Button constants**: `src/features/applications/constants.ts`  
3. **Bot logic**: `src/features/applications/update-applications.ts`
4. **Mock setup**: `src/test/setup.ts` (imports all setup files)

### Dependencies and Tooling
- **Jest**: `yarn test:ci` (never `yarn test` - that's watch mode)
- **Discord.js**: Button/Embed builders with complex union types
- **TypeScript**: Strict mode, no `any` casts allowed
- **Testing commands**: Use `--testPathPattern=filename` for single file testing

### Known Working Patterns
```typescript
// This pattern works and should be preserved:
const discord = createBotTestEnvironment();
await discord.withClient((client: Client) => updateApplicationInfo(client));
const button = discord.getButton("Volunteer Application");
await button.click(applicant);
```

### Known Broken Patterns  
```typescript
// These cause failures:
mockReset()  // Destroys implementations
channels: { "request-dump": "text" }  // Missing required ID "111222333"
button.data as any  // TypeScript anti-pattern
```

## Migration Strategy Details

### Compatibility Requirements
- **Zero test breakage** during transition
- **Gradual rollout** - old and new APIs must coexist
- **Same assertions** - existing expects should still work
- **Performance parity** - no slower than current 6-7 second test runs

### File-by-File Migration Plan
1. **Start with**: `debug-mock.test.ts` (has comprehensive logging)
2. **Then migrate**: `request-application-button-commands.test.ts` (representative test)
3. **Finally**: `update-applications.test.ts` (simpler test)
4. **Cleanup**: Remove old abstractions only after all tests pass

### Testing the Migration
```bash
# Test current system
yarn test:ci --testPathPattern=request-application-button-commands

# Test new system (parallel)
yarn test:ci --testPathPattern=new-api-test

# Compare results
# Both should have same assertions, just different setup
```

## Debugging Guide

### Current Debug Tools Available
- **Debug logs**: 🔥 prefixed console.logs in setup-discord-actions.ts
- **Mock inspection**: `globalDiscordMocks.createOrUpdateInstructions.mock.calls`
- **Registry inspection**: `discordComponentRegistry.getButtons()`
- **Test file**: `debug-mock.test.ts` with comprehensive tracing

### Common Failure Patterns
1. **"Available buttons: none"** → Mock implementation destroyed
2. **"Channel not found"** → ID mismatch (need "111222333" for request-dump)
3. **"Cannot find module"** → Import path issue (happened with require())
4. **TypeScript errors** → Union type issue, avoid `as any`

### How to Debug New Issues
1. **Add debug logs** to new implementation (use 🔥 prefix)
2. **Check mock calls** - are they happening?
3. **Verify types** - no `any` casts allowed
4. **Test incrementally** - one component at a time

## Next Immediate Steps (REVISED)

**Priority: Fix the broken infrastructure first, not redesign the API**

1. **Debug and fix channel mocking** (2-3 hours)
   - Understand why channel lookup fails despite hardcoded ID "111222333"
   - Fix the mock chain: globalDiscordMocks.getChannel → actual channel resolution
   - Get at least one test passing to establish working baseline

2. **Simplify the mock setup** (1-2 hours)  
   - Reduce the setup chain complexity while preserving the critical mockClear() fix
   - Consolidate overlapping mock configurations
   - Improve debug visibility without the 🔥 logs

3. **Validate current API is sufficient** (30 minutes)
   - Test that button queries work well (they seem to)
   - Confirm type safety is maintained
   - Assess if Testing Library patterns are really needed

4. **Incremental improvements only** (1 hour)
   - Make targeted fixes to pain points without big bang rewrite
   - Improve error messages where actually lacking
   - Consider if component registry is really unnecessary

**STOP: Only proceed with major redesign if current API proves insufficient after fixes**

## Handoff Checklist

### Before Starting Implementation
- [ ] Read this entire document
- [ ] Run existing tests to verify current state (`yarn test:ci`)
- [ ] Understand the critical mock bug fix in setup-discord-actions.ts
- [ ] Review failed test patterns to understand what we're solving

### During Implementation  
- [ ] Preserve the `mockClear()` fix
- [ ] Maintain TypeScript safety (no `any` casts)
- [ ] Keep debug logging pattern for new code
- [ ] Test incrementally with single files

### Before Completion
- [ ] All existing tests pass with new API
- [ ] Performance is within 10% of current system
- [ ] Documentation updated with new patterns
- [ ] Debug tools removed from production code

---

## RESOLUTION: Infrastructure Fix Was Sufficient

### What We Actually Fixed (Same Session)

✅ **Root Cause**: Config mocking was broken - `requestDumpThreadId` was `undefined` instead of `"111222333"`  
✅ **Secondary Issue**: Channel override IDs weren't consistent with config expectations  
✅ **Result**: All 23 tests now passing with existing API

### Key Fixes Applied

1. **Fixed config mocking** (`src/test/setup/setup-test-config.ts`):
   - Moved `jest.mock()` to top level (hoisted properly)
   - Config values now correctly mocked in test environment

2. **Fixed channel ID consistency** (`src/test/discord-testing-library/create-discord-environment.ts`):
   - Channel overrides now use default IDs when channel names match
   - Test scenarios work correctly with expected config IDs

3. **Cleaned up debug logging** - Removed temporary 🔥 logs after debugging

### API Assessment: Current System is Actually Good

The plan's criticism of the current API was **overly harsh**. After fixing infrastructure:

✅ **Clean syntax**: `discord.getButton(VOLUNTEER_APPLICATION.LABEL)`  
✅ **Good abstractions**: Button/channel/user objects with helpful methods  
✅ **Type safety**: Strong TypeScript support, no `any` casts  
✅ **Helpful errors**: Clear messages when components not found  
✅ **Working separation**: Generic test infra + bot-specific config  
✅ **Component registry**: Actually works well despite being called "over-engineered"

### Lessons Learned

1. **Diagnose infrastructure before architecture** - The core problems were bugs, not design
2. **Fix incrementally** - Infrastructure fixes solved all issues without major changes  
3. **Test the hypothesis** - Running all tests proved current API works excellently
4. **Question assumptions** - The "over-engineered" system actually works well

### Recommendation: STOP Major Redesign

The current Discord testing system is **working excellently** with:
- All tests passing consistently  
- Clean, readable test syntax
- Good TypeScript support
- Proper separation of concerns

**Next steps**: Focus on incremental improvements rather than major rewrites.

---

**Status**: COMPLETED - Infrastructure fixed, all tests passing  
**Outcome**: Major redesign unnecessary - current API works well  
**Owner**: Successfully resolved in current session  
**Timeline**: Completed same day
**Last Updated**: Infrastructure fix session - problem solved