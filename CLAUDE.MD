# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Manager

**IMPORTANT**: Always use `yarn` instead of `npm` for all package management operations.

## Common Commands

### Development
- `yarn dev` - Start Vite development server
- `yarn build` - Build production bundle (must succeed without errors)
- `yarn lint` - Run ESLint

### Testing
- `yarn test` - Run Jest unit tests (in band mode for better output)
- `yarn test:e2e` - Run Playwright end-to-end tests
- Always run tests after making changes

### Other
- `yarn preview` - Preview production build
- `yarn build:types` - Build plugin type definitions
- `yarn build:examples` - Build plugin examples
- `yarn serve:examples` - Serve plugin examples

## Project Architecture

### High-Level Overview

This is a browser-based client for the Arkadia MUD game with integrated map, custom triggers, and configurable settings interface. The project uses Vite for building and TypeScript throughout.

### Directory Structure

```
src/
├── client/      - Core game client (scripts, triggers, game logic)
├── web/         - React UI application and web integration
├── shared/      - Shared code between client and web
├── ui/web/      - React UI components (timers, panels, hooks)
└── modules/     - Core modules (eventBus, storage, colors)
```

### Path Aliases

The project uses TypeScript path aliases (configured in vite.config.ts and tsconfig):

- `@client/*` → `src/client/*`
- `@web/*` → `src/web/*`
- `@shared/*` → `src/shared/*`
- `@web-ui/*` → `src/ui/web/*`
- `@modules/*` → `src/modules/*`

### Key Components

#### Client Layer (`src/client/`)

- **Client.ts** - Main client class with ClientAdapter interface for WebSocket communication
- **main.ts** - Entry point that initializes all game scripts and features (ships, gates, timers, combat, etc.)
- **Triggers.ts** - Trigger system for game events
- **scripts/** - Individual feature scripts (lamp, combat timer, binds, kill counter, etc.)

#### Web Layer (`src/web/`)

- **ArkadiaClient.ts** - WebSocket client implementation connecting to `wss://arkadia.rpg.pl/wss`
- **main.ts** - Web application entry point
- Implements ClientAdapter interface for game communication
- Handles GMCP (Generic Mud Communication Protocol) parsing and telnet options
- Includes recording/playback functionality for game sessions

#### Shared Layer (`src/shared/`)

- **types/Plugin.ts** - Plugin system interface with init/destroy lifecycle
- **map/** - Map integration helpers
- **socket/** - Socket utilities (GMCP, telnet parsing)
- **events/** - Event system types
- **runtime/** - Runtime utilities

#### Modules (`src/modules/`)

- **core/eventBus.ts** - Central event bus for inter-component communication
- **core/storage.ts** - Storage utilities for game data
- **core/Colors.ts** - Color management and Xterm palette

#### UI Components (`src/ui/web/`)

React components for:
- Timers (Combat, Cover, Lamp, Transport, Zask)
- Panels (CharState, AttackMode, MultiBinds, PackageStatus, etc.)
- Custom hooks (useClientEvent, useClientCommand, useLocalStorage)

### Application Flow

1. **index.html** - Single HTML entry point with inline layout structure
2. Vite bundles TypeScript/React code
3. **ArkadiaClient** connects to game server via WebSocket
4. **Client** class orchestrates game logic, triggers, and UI updates
5. React components mount to specific DOM elements for UI panels
6. Event bus enables communication between layers

### Test Structure

- Unit tests: `test/client/` and `test/web/` directories
- Jest configuration: `jest.config.cjs` with jsdom environment
- E2E tests: `e2e/` directory using Playwright
- Test mocks in `test/__mocks__/`

## Coding Guidelines

### Regular Expressions
- **Never include Polish letters in regex patterns** - use ASCII equivalents only
- Example: Use `[a-z]` not `[a-ząćęłńóśźż]`

### HTML/DOM
- Prefer creating HTML elements in HTML files when possible (not in JS/TS)
- Do not use `aria-*` attributes - they are not needed in this project

### Data Directory
- **Never modify files inside the `data` directory** - this is read-only game data

## Plugin System

The project supports a plugin architecture:
- Plugins implement the `Plugin` interface from `@shared/types/Plugin`
- Plugins receive a `PluginApi` instance during initialization
- Lifecycle: `init(api: PluginApi)` → returns `PluginInfo` → optional `destroy()`
- Plugin status: 'loading' | 'loaded' | 'error' | 'legacy'

## Build Configuration

- **Bundler**: Vite 7.x
- **TypeScript**: ES modules throughout (package.json has `"type": "module"`)
- **React**: Version 19
- Git commit info is embedded in builds via vite.config.ts (`__COMMIT_SHA__`, `__COMMIT_DATE__`)

## Testing Notes

- For screenshots during E2E testing, use `sandbox.html` or close connection popup (logging in not required)
- Tests run in jsdom environment with path alias support
- Single test files can be run with Jest's standard filtering options

## Dependencies of Note

- **mudlet-map-renderer** - Map rendering (Konva variant)
- **lua-in-js** - Lua script execution
- **sql.js** - SQLite in browser (for map data)
- **marked** - Markdown parsing
- **howler** - Audio/sound management
- **ansi-to-html** - Terminal color conversion
