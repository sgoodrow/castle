# Discord Testing Library

A comprehensive testing framework for Discord bots that provides a Testing Library-style API for Discord bot testing.

## Features

- ✅ **Realistic Discord environment simulation** - Full Discord object hierarchies and relationships
- ✅ **User interaction simulation** - High-level methods like `user.clickButton()`
- ✅ **Real event flow** - Interactions go through your actual Discord listeners
- ✅ **Enhanced assertions** - Works with existing Jest matchers plus Discord-specific ones
- ✅ **Beautiful, readable tests** - Clean API that focuses on user workflows

## Quick Start

```typescript
import { createDiscordTest } from '../test/discord-testing-library';

describe('My Discord Feature', () => {
  it('handles user interactions', async () => {
    // Create test environment
    const discord = createDiscordTest();
    const guild = discord.createGuild('Test Guild');
    const user = guild.createUser('testuser');
    const channel = guild.createChannel('general');

    // Run bot setup
    await discord.withClient(client => myBotSetup(client));

    // Simulate user interaction
    await user.clickButton('my-button', guild, discord.client);

    // Assert results
    expect(user).toHaveSentDm(/success/);
    expect(channel).toHaveSentMessage(/notification/);
  });
});
```

## API Reference

### `createDiscordTest()`

Creates a new Discord test environment.

```typescript
const discord = createDiscordTest();
```

### `DiscordTestEnvironment`

#### `createGuild(name: string, options?: { id?: string }): MockGuild`

Creates a guild in the test environment.

#### `withClient<T>(fn: (client: Client) => T | Promise<T>): Promise<T>`

Executes a function with the test environment's Discord client.

### `MockGuild`

#### `createUser(username: string, options?: { id?: string }): MockUser`

Creates a user in this guild.

#### `createChannel(name: string, options?: { id?: string; type?: 'text' | 'thread' }): MockChannel`

Creates a channel in this guild.

### `MockUser`

#### `clickButton(customId: string, guild: MockGuild, client: Client): Promise<void>`

Simulates the user clicking a Discord button. This creates a realistic button interaction and routes it through your actual interaction listeners.

#### `lastInteraction`

Access to the most recent interaction mocks for testing error handling:

```typescript
await user.clickButton('broken-button', guild, discord.client);
expect(user.lastInteraction?.editReply).toHaveBeenCalledWith({ 
  content: 'Error: Something went wrong' 
});
```

### `MockChannel`

Channel mock with Discord.js-compatible interface plus testing enhancements.

## Testing Patterns

### Basic Workflow Testing

```typescript
it('handles complete user workflow', async () => {
  const discord = createDiscordTest();
  const guild = discord.createGuild('Test Guild');
  const user = guild.createUser('testuser');
  const channel = guild.createChannel('announcements');

  // Bot setup
  await discord.withClient(client => setupAnnouncements(client));

  // User action
  await user.clickButton('announce', guild, discord.client);

  // Verify results
  expect(user).toHaveSentDm(/confirmation/);
  expect(channel).toHaveSentMessage(/announcement/);
});
```

### Error Handling Testing

```typescript
it('handles errors gracefully', async () => {
  const discord = createDiscordTest();
  const guild = discord.createGuild('Test Guild');
  const user = guild.createUser('testuser');
  // Don't create required channel

  await user.clickButton('needs-channel', guild, discord.client);
  
  expect(user.lastInteraction?.editReply).toHaveBeenCalledWith({ 
    content: 'Error: Channel not found' 
  });
});
```

### Bot Setup Testing

```typescript
it('creates proper Discord components', async () => {
  const discord = createDiscordTest();
  
  await discord.withClient(client => setupMyFeature(client));
  
  // Use existing assertion helpers
  expectButtonCreated('my-button', 'Click Me');
  expectEmbedCreated('My Feature');
});
```

## Migration from Old Test System

The Discord Testing Library replaces the old `when()` helper system with a more comprehensive and intuitive API:

### Before (Old System)
```typescript
when("handling feature", ({ it }) => {
  it("does something", async ({ user, guild }) => {
    // Complex setup...
  });
});
```

### After (Discord Testing Library)
```typescript
describe("handling feature", () => {
  it("does something", async () => {
    const discord = createDiscordTest();
    const guild = discord.createGuild('Test Guild');
    const user = guild.createUser('testuser');
    // Clean, explicit setup
  });
});
```

## Architecture

The Discord Testing Library provides enhanced versions of Discord mocks with testing convenience methods, isolated by import path from the original mock system. This allows for gradual migration and maintains compatibility with existing tests.

- **`MockGuild`** - Enhanced guild mock with `createUser()`, `createChannel()` methods
- **`MockUser`** - Enhanced user mock with `clickButton()` and interaction tracking
- **`MockChannel`** - Enhanced channel mock with testing helpers
- **Event Flow** - Real Discord interactions flow through your actual listeners
- **Isolation** - Clean separation from old test infrastructure by import path