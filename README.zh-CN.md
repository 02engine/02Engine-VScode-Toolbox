# 02Engine VSCode Toolbox

[中文](./README.zh-CN.md) | [English](./README.en.md)

一个功能丰富的 VSCode 工具箱，为开发者提供多种开发辅助工具和调试功能。当前集成 Scratch 扩展开发调试工具，未来将持续扩展更多功能模块。

## 功能特性

### Scratch 扩展开发工具

#### WebSocket 调试服务器
- 监听端口 1101，等待 Scratch GUI 连接
- 实时发送扩展代码到 GUI 进行热加载
- 支持心跳机制保持连接稳定
- 状态栏显示连接状态

#### 积木预览
- 实时预览扩展中定义的积木样式
- 支持命令、返回值、布尔值、事件等积木类型
- 自动解析 `getInfo()` 方法
- 代码修改时自动更新预览

## 安装

1. 克隆或下载此项目
2. 在扩展目录运行 `npm install`
3. 运行 `npm run compile` 编译
4. 按 F5 启动调试，或使用 `vsce package` 打包安装

## 使用方法

### 启动调试服务器

1. 按 `Ctrl+Shift+P` 打开命令面板
2. 输入 `02Engine: 启动调试服务器`
3. 状态栏显示 `02Engine: 0 连接` 表示服务器已启动

### 发送扩展代码

1. 打开 Scratch 扩展 JavaScript 文件
2. 确保 Scratch GUI 已连接（状态栏显示连接数 > 0）
3. 按 `Ctrl+Shift+T` 或执行 `02Engine: 发送当前扩展到 GUI`

### 预览积木

1. 打开包含 `getInfo()` 方法的扩展文件
2. 点击编辑器右上角的预览图标，或执行 `02Engine: 预览积木`
3. 预览面板会在侧边显示积木样式

## 命令列表

| 命令 | 说明 | 快捷键 |
|------|------|--------|
| `02Engine: 启动调试服务器` | 启动 WebSocket 服务器 | - |
| `02Engine: 停止调试服务器` | 停止服务器 | - |
| `02Engine: 发送当前扩展到 GUI` | 发送代码到已连接的 GUI | `Ctrl+Shift+T` |
| `02Engine: 预览积木` | 打开积木预览面板 | `Ctrl+Shift+Q` |
| `02Engine: 显示连接状态` | 显示状态菜单 | 点击状态栏 |

## 配置选项

在 VSCode 设置中可配置：

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `02engine.port` | number | 1101 | WebSocket 服务器端口 |
| `02engine.autoStart` | boolean | false | 启动 VSCode 时自动启动服务器 |

## 通信协议

### 服务器 → GUI

发送扩展代码：
```json
{
    "type": "extension",
    "code": "完整的 JavaScript 代码字符串"
}
```

### GUI → 服务器

心跳消息：
```json
{
    "type": "heartbeat"
}
```

## 扩展代码示例

```javascript
(function(Scratch) {
    'use strict';
    
    class MyExtension {
        getInfo() {
            return {
                id: 'myExtension',
                name: '我的扩展',
                color1: '#FF6B6B',
                color2: '#EE5A5A',
                blocks: [
                    {
                        opcode: 'sayHello',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '说 [MESSAGE]',
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

## 开发

```bash
# 安装依赖
npm install

# 编译
npm run compile

# 监听模式编译
npm run watch

# 打包
npx vsce package
```

## 许可证

GPL3
