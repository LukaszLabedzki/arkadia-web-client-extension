# Script Migration Guide

This guide explains how to migrate old Mudlet scripts (like those from `skrypty-ra`) to the new Arkadia Web Client plugin system.

## Overview

The new plugin system provides a clean, stable API for creating custom functionality without directly accessing client internals. This guide uses the `/jadalnia_ra` script as an example migration.

## Key Differences

### Old System (Direct Client Access)
```typescript
export default function initJadalnia(client: Client) {
    client.aliases.push({
        pattern: /^\/jadalnia_ra$/,
        callback: () => {
            // ...
        }
    });

    const trigger = client.Triggers.registerTrigger(pattern, callback);
    client.FunctionalBind.set(command);
    client.sendCommand("spojrz", false);
}
```

### New System (Plugin API)
```typescript
export async function init(api: PluginApi): Promise<PluginInfo> {
    api.aliases.register(/^\/jadalnia_ra$/, () => {
        // ...
    });

    api.triggers.register(pattern, callback, tag);
    api.bind.set(command);
    await api.command.send("spojrz", false);

    return {
        name: "Plugin Name",
        version: "1.0.0",
        description: "..."
    };
}
```

## Migration Mapping

### 1. Aliases

**Old:**
```typescript
client.aliases.push({
    pattern: /^\/command$/,
    callback: () => {
        // do something
    }
});
```

**New:**
```typescript
api.aliases.register(/^\/command$/, () => {
    // do something
    return true; // Return true to prevent command from being sent to server
});
```

### 2. Triggers

**Old:**
```typescript
const trigger = client.Triggers.registerTrigger(
    /pattern/,
    (line, matches) => {
        return line.color([0, 5], colorCode);
    }
);

// Child trigger
const childTrigger = trigger.registerChild(
    /child pattern/,
    (line, matches) => {
        return line;
    }
);
```

**New:**
```typescript
// Use a tag to group related triggers
const tag = "myPlugin";

api.triggers.register(
    /pattern/,
    (line, matches) => {
        return line.color([0, 5], colorCode);
    },
    tag
);

// Child triggers are simulated with state management
let isActive = false;

api.triggers.register(
    /parent pattern/,
    () => {
        isActive = true;
        return undefined;
    },
    tag
);

api.triggers.register(
    /child pattern/,
    (line) => {
        if (!isActive) return undefined;
        // Process only when parent matched
        return line;
    },
    tag
);
```

### 3. Functional Bind

**Old:**
```typescript
client.FunctionalBind.set("command");
client.FunctionalBind.newMessage(); // Not needed in new system
client.FunctionalBind.clear();
```

**New:**
```typescript
api.bind.set("command");
// newMessage() is not needed
api.bind.clear();
```

### 4. Sending Commands

**Old:**
```typescript
client.sendCommand("command", false); // false = no echo
```

**New:**
```typescript
await api.command.send("command", false); // false = no echo
```

### 5. Output to Client

**Old:**
```typescript
client.print("message");
```

**New:**
```typescript
api.output.print("message");

// For colored output
const buffer = new api.AnsiAwareBuffer("Hello ", greenColor);
buffer.append("World!", redColor);
api.output.print(buffer);
```

### 6. Colors

**Old:**
```typescript
import { color, RESET } from "./Colors";
const colorCode = 196; // Hard-coded color
```

**New:**
```typescript
const RED_COLOR = api.colors.fromHex('#ff0000');
const GREEN_COLOR = api.colors.fromRgb(0, 255, 0);
```

### 7. Cleanup

**Old:**
```typescript
const cleanup = () => {
    activeTriggers.forEach(trigger => {
        client.Triggers.removeTrigger(trigger);
    });
    activeTriggers = [];
};
```

**New:**
```typescript
// Triggers are automatically cleaned up by tag
api.triggers.removeByTag("myPlugin");

// Or implement in destroy function
export async function destroy(): Promise<void> {
    // Any additional cleanup
    // Triggers with tags are automatically removed
}
```

### 8. Events

**Old:**
```typescript
client.on("mapMove", () => {
    // Handle event
});
```

**New:**
```typescript
api.events.on("mapMove", () => {
    // Handle event
});

// Emit events
api.events.emit("sound:play", { key: "beep" });
```

## Complete Migration Example: Jadalnia

Here's how the `/jadalnia_ra` script was migrated:

### Original Script Structure
1. Direct client access
2. Manual trigger management
3. Manual cleanup with arrays
4. Child triggers for food patterns

### New Plugin Structure
1. Plugin API interface
2. Tag-based trigger management
3. Automatic cleanup via tags
4. State management for conditional triggers
5. Lifecycle methods (init/destroy)

See `examples/jadalnia-plugin.ts` for the complete implementation.

## Key Benefits of New System

1. **Isolation**: Plugins can't accidentally break the client
2. **Automatic Cleanup**: Triggers with tags are cleaned up automatically
3. **Versioning**: Plugins have version information
4. **Type Safety**: Full TypeScript support with `@arkadia/plugin-types`
5. **Hot Loading**: Plugins can be loaded/unloaded without restarting

## Testing Your Plugin

1. **Build the plugin:**
   ```bash
   yarn build:examples
   ```

2. **Start the dev server:**
   ```bash
   yarn serve:examples
   ```

3. **Load in client:**
   - Open Arkadia Web Client
   - Go to Scripts section
   - Add: `http://localhost:3030/plugins/your-plugin.js`

4. **Test the functionality:**
   - Use your alias (e.g., `/jadalnia_ra`)
   - Check console for errors (F12)
   - Verify cleanup works properly

## Common Patterns

### State Management
```typescript
export async function init(api: PluginApi): Promise<PluginInfo> {
    let isActive = false;
    let counter = 0;

    api.aliases.register(/^\/toggle$/, () => {
        isActive = !isActive;
        api.output.print(`State: ${isActive}`);
        return true;
    });

    // Use state in triggers
    api.triggers.register(/pattern/, () => {
        if (!isActive) return undefined;
        counter++;
        return undefined;
    }, "myPlugin");
}
```

### Timeouts and Intervals
```typescript
export async function init(api: PluginApi): Promise<PluginInfo> {
    let timerId: number | null = null;

    const startTimer = () => {
        timerId = setTimeout(() => {
            api.output.print("Timer fired!");
            timerId = null;
        }, 5000) as unknown as number;
    };

    const cleanup = () => {
        if (timerId !== null) {
            clearTimeout(timerId);
            timerId = null;
        }
    };

    api.aliases.register(/^\/start$/, () => {
        startTimer();
        return true;
    });

    return { name: "Timer Plugin", version: "1.0.0" };
}

export async function destroy(): Promise<void> {
    // Clean up timers
}
```

### Complex Trigger Logic
```typescript
export async function init(api: PluginApi): Promise<PluginInfo> {
    const tag = "myPlugin";

    // Multi-step automation
    let step = 0;

    api.triggers.register(/Step 1 complete/, () => {
        step = 1;
        api.command.send("do step 2", false);
        return undefined;
    }, tag);

    api.triggers.register(/Step 2 complete/, () => {
        if (step !== 1) return undefined;
        step = 2;
        api.command.send("do step 3", false);
        return undefined;
    }, tag);

    api.triggers.register(/Step 3 complete/, () => {
        if (step !== 2) return undefined;
        step = 0;
        api.output.print("All steps complete!");
        return undefined;
    }, tag);

    return { name: "Multi-Step Plugin", version: "1.0.0" };
}
```

## Troubleshooting

### Plugin doesn't load
- Check browser console (F12) for errors
- Verify the URL is correct and ends with `.js`
- Ensure plugin was built (`yarn build:examples`)
- Check that `init` function is exported

### Triggers not firing
- Verify pattern matches the game output exactly
- Check if tag is set correctly
- Ensure state management logic is correct
- Test pattern with trigger tester in client

### Cleanup not working
- Make sure all triggers use the same tag
- Call `api.triggers.removeByTag(tag)` when done
- Clear timeouts/intervals manually
- Implement `destroy()` function if needed

## Next Steps

1. Identify scripts you want to migrate
2. Follow this guide to convert them
3. Test thoroughly in the dev environment
4. Share your plugins with the community!

## Resources

- **Plugin API Documentation**: See `src/client/PluginApi.ts` for full API reference
- **Example Plugins**: Check `examples/` directory
- **Type Definitions**: Install `@arkadia/plugin-types` for autocomplete
- **Dev Server**: Use `yarn serve:examples` for local testing
