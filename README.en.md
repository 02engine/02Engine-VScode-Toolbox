# 02Engine VSCode Toolbox

[中文](./README.zh-CN.md) | [English](./README.en.md)

A feature-rich VSCode toolbox providing various development tools and debugging features for developers. Currently integrates Scratch extension development and debugging tools, with plans to expand more feature modules in the future.

## Features

### Scratch Extension Development Tools

#### WebSocket Debug Server
- Listens on port 1101 and waits for Scratch GUI connection
- Real-time hot-reload of extension code to GUI
- Supports heartbeat mechanism to maintain stable connections
- Displays connection status in status bar

#### Block Preview
- Real-time preview of block styles defined in extensions
- Supports command, reporter, boolean, and event block types
- Automatically parses `getInfo()` method
- Auto-updates preview when code changes

## Installation

1. Clone or download this project
2. Run `npm install` in the extension directory
3. Run `npm run compile` to compile
4. Press F5 to start debugging, or use `vsce package` to package and install

## Usage

### Start Debug Server

1. Press `Ctrl+Shift+P` to open the command palette
2. Enter `02Engine: Start Debug Server`
3. Status bar shows `02Engine: 0 connections` indicating server is started

### Send Extension Code

1. Open a Scratch extension JavaScript file
2. Ensure Scratch GUI is connected (status bar shows connections > 0)
3. Press `Ctrl+Shift+T` or execute `02Engine: Send Current Extension to GUI`

### Preview Blocks

1. Open an extension file containing the `getInfo()` method
2. Click the preview icon in the top-right of the editor, or execute `02Engine: Preview Blocks`
3. Block styles will be displayed in the side panel

## Command List

| Command | Description | Shortcut |
|---------|-------------|----------|
| `02Engine: Start Debug Server` | Start WebSocket server | - |
| `02Engine: Stop Debug Server` | Stop server | - |
| `02Engine: Send Current Extension to GUI` | Send code to connected GUI | `Ctrl+Shift+T` |
| `02Engine: Preview Blocks` | Open block preview panel | `Ctrl+Shift+Q` |
| `02Engine: Show Connection Status` | Show status menu | Click status bar |

## Configuration Options

Configurable in VSCode settings:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `02engine.port` | number | 1101 | WebSocket server port |
| `02engine.autoStart` | boolean | false | Automatically start server when VSCode starts |

## Communication Protocol

### Server → GUI

Send extension code:
```json
{
    "type": "extension",
    "code": "complete JavaScript code string"
}
```

### GUI → Server

Heartbeat message:
```json
{
    "type": "heartbeat"
}
```

## Extension Code Example

```javascript
(function(Scratch) {
    'use strict';
    
    class MyExtension {
        getInfo() {
            return {
                id: 'myExtension',
                name: 'My Extension',
                color1: '#FF6B6B',
                color2: '#EE5A5A',
                blocks: [
                    {
                        opcode: 'sayHello',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'say [MESSAGE]',
                        arguments: {
                            MESSAGE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'Hello!'
                            }
                        }
                    }
                ]
            };
        }
        
        sayHello(args) {
            console.log(args.MESSAGE);
        }
    }
    
    Scratch.extensions.register(new MyExtension());
})(Scratch);
```

## Development

```bash
# Install dependencies
npm install

# Compile
npm run compile

# Watch mode compilation
npm run watch

# Package
npx vsce package
```

## License

GPL3
