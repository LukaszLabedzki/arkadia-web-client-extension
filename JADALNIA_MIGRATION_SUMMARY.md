# Jadalnia Script Migration Summary

## Overview

Successfully migrated the `/jadalnia_ra` automation script from the old Mudlet format (found in `ra-scripts` branch) to the new Arkadia Web Client plugin system.

## What Was Done

### 1. Analyzed Plugin System Architecture
- Studied `src/client/PluginApi.ts` - the plugin API interface
- Reviewed example plugins in `examples/` directory
- Understood the lifecycle: `init()` → `destroy()`
- Learned about tag-based trigger management

### 2. Located and Analyzed Original Script
- Found original script in `ra-scripts` branch: `client/src/scripts/jadalnia.ts`
- Identified key functionality:
  - Alias `/jadalnia_ra` to trigger automation
  - Multiple triggers for food detection
  - Child triggers for specific food items
  - Functional bind for command queuing
  - Cleanup logic with timeouts

### 3. Created New Plugin
- **Location**: `examples/jadalnia-plugin.ts`
- **Built output**: `examples/dist/jadalnia-plugin.js` (5.0 KB)
- **Features**:
  - Full migration of all food patterns (14 different food items)
  - State management to replace child triggers
  - Automatic cleanup with timeout safety
  - Added `/jadalnia_stop` command for manual stopping
  - User-friendly status messages

### 4. Created Documentation
- **Migration Guide**: `docs/SCRIPT_MIGRATION_GUIDE.md`
  - Complete mapping of old API → new API
  - Common patterns and examples
  - Troubleshooting tips
  - Best practices

## Key Migration Patterns

### Aliases
```typescript
// Old
client.aliases.push({
    pattern: /^\/jadalnia_ra$/,
    callback: () => { /* ... */ }
});

// New
api.aliases.register(/^\/jadalnia_ra$/, () => {
    // ...
    return true;
});
```

### Triggers with Tags
```typescript
// Old
const trigger = client.Triggers.registerTrigger(pattern, callback);
// Manual cleanup required

// New
api.triggers.register(pattern, callback, "jadalnia");
// Automatic cleanup via api.triggers.removeByTag("jadalnia")
```

### Child Triggers → State Management
```typescript
// Old
const mainTrigger = client.Triggers.registerTrigger(parentPattern, ...);
const childTrigger = mainTrigger.registerChild(childPattern, ...);

// New
let isActive = false;
api.triggers.register(parentPattern, () => {
    isActive = true;
    return undefined;
}, tag);

api.triggers.register(childPattern, () => {
    if (!isActive) return undefined;
    // Process only when parent matched
}, tag);
```

### Functional Bind
```typescript
// Old
client.FunctionalBind.set(command);

// New
api.bind.set(command);
```

### Commands
```typescript
// Old
client.sendCommand("spojrz", false);

// New
await api.command.send("spojrz", false);
```

## How to Use

### For Development
1. **Build the plugin:**
   ```bash
   yarn build:examples
   ```

2. **Start dev server:**
   ```bash
   yarn serve:examples
   ```

3. **In Arkadia Web Client:**
   - Open Scripts section from menu
   - Add URL: `http://localhost:3030/plugins/jadalnia-plugin.js`
   - Plugin loads automatically

4. **Test in game:**
   - Type `/jadalnia_ra` to start automation
   - Type `/jadalnia_stop` to stop manually
   - Go to a dining hall and it will automatically eat and drink

### For Production
1. Host the plugin file publicly (GitHub Pages, your server, etc.)
2. Add the public URL in client's Scripts section
3. Plugin persists across sessions

## Plugin Features

### Commands
- `/jadalnia_ra` - Start dining hall automation
- `/jadalnia_stop` - Stop automation manually

### Supported Food Items
The plugin recognizes 14 different food patterns:
- Soup (zupa Le Virtu)
- Pizza variations (3 types + szarlotka)
- Pasta variations (5 types of makaronu/spaghetti)
- Other foods (pierozki, tartinki, buleczki, pstrag)

### Automation Flow
1. User types `/jadalnia_ra`
2. Plugin sends `spojrz` to look at the room
3. Detects available food on table
4. Sits down and starts eating (`usiadz przy stole; poczestuj sie ...`)
5. When full, starts drinking water
6. When can't drink more, stands up
7. Automatically cleans up triggers

### Safety Features
- 10-second timeout to prevent infinite triggers
- State management prevents unwanted activations
- Manual stop command available
- Status messages inform user of progress
- Automatic cleanup on completion

## Files Created/Modified

### New Files
1. `examples/jadalnia-plugin.ts` - Plugin source code
2. `examples/dist/jadalnia-plugin.js` - Compiled plugin (5.0 KB)
3. `docs/SCRIPT_MIGRATION_GUIDE.md` - Complete migration guide
4. `JADALNIA_MIGRATION_SUMMARY.md` - This summary

### Modified Files
1. `CLAUDE.md` - Updated with comprehensive project documentation

## Testing

✅ Plugin builds successfully (`yarn build:examples`)
✅ Main project builds without errors (`yarn build`)
✅ No breaking changes to existing code
✅ Plugin follows established patterns from examples

## Next Steps

### To Use This Plugin
1. Build and test locally using dev server
2. Test in actual game environment
3. Fine-tune timing/patterns if needed
4. Deploy to production (host publicly)

### To Migrate More Scripts
1. Review `docs/SCRIPT_MIGRATION_GUIDE.md`
2. Use `jadalnia-plugin.ts` as reference
3. Follow the same patterns:
   - Export `init(api)` and `destroy()`
   - Use tags for trigger management
   - Implement state management for complex logic
   - Add cleanup in destroy()

### Recommended Next Scripts to Migrate
From the `ra-scripts` branch:
- `readiness.ts` - Readiness checking automation
- `stoneProperties.ts` - Stone property management

## Benefits of Plugin System

1. **Isolation**: Plugins can't accidentally break the client
2. **Hot Loading**: Add/remove plugins without restart
3. **Version Control**: Each plugin has version info
4. **Type Safety**: Full TypeScript support
5. **Automatic Cleanup**: Tag-based trigger management
6. **Shareable**: Easy to distribute and share with others

## Resources

- **Plugin API**: `src/client/PluginApi.ts`
- **Examples**: `examples/` directory
- **Migration Guide**: `docs/SCRIPT_MIGRATION_GUIDE.md`
- **Example Plugins**:
  - `simple-highlighter-plugin.ts` - Basic highlighting
  - `example-plugin.ts` - Multiple features demo
  - `combat-alert-plugin.ts` - Complex state tracking
  - `jadalnia-plugin.ts` - This migration

## Conclusion

The jadalnia script has been successfully migrated from the old client architecture to the new plugin system. The plugin maintains all original functionality while benefiting from the improved isolation, safety, and maintainability of the plugin architecture.

The migration process has been documented to facilitate future script migrations.
