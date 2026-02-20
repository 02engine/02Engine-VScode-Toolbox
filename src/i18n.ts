import * as vscode from 'vscode';

type Language = 'zh-cn' | 'en';

interface Translations {
    [key: string]: {
        [key: string]: string;
    };
}

const translations: Translations = {
    'zh-cn': {
        // 激活和日志
        'activated': '02Engine VSCode 工具箱已激活',
        
        // 命令标题
        'openToolbox': '02Engine: 打开工具箱',
        'startServer': '02Engine: 启动调试服务器',
        'stopServer': '02Engine: 停止调试服务器',
        'sendExtension': '02Engine: 发送当前扩展到 GUI',
        'showStatus': '02Engine: 显示连接状态',
        'previewBlocks': '02Engine: 预览积木',
        
        // 工具菜单
        'tool.previewBlocks.name': '预览积木',
        'tool.previewBlocks.description': '预览扩展中的积木定义',
        'tool.sendExtension.name': '发送扩展',
        'tool.sendExtension.description': '将当前扩展代码发送到 GUI 客户端',
        'tool.serverManagement.name': '服务器管理',
        'tool.serverManagement.description': '启动、停止或查询服务器状态',
        'tool.saveAndSendComment.name': '保存并发送注释',
        'tool.saveAndSendComment.description': '保存当前注释并发送回 02Engine',

        // 工具箱菜单
        'toolboxPlaceholder': '选择要使用的工具',
        'noToolsAvailable': '暂无可用工具',
        
        // 状态栏
        'statusRunning': '$(broadcast) 02Engine: {count} 连接',
        'statusStopped': '$(circle-slash) 02Engine: 未启动',
        'tooltipRunning': '02Engine VSCode 工具箱运行中\n端口: {port}\n连接数: {count}',
        'tooltipStopped': '02Engine VSCode 工具箱未运行\n点击查看状态',
        
        // 服务器相关
        'serverAlreadyRunning': '服务器已在运行中',
        'serverStarted': '02Engine 调试服务器已启动，端口: {port}',
        'serverError': '服务器错误: {error}',
        'startServerError': '无法启动服务器: {error}',
        'serverStopped': '02Engine 调试服务器已停止',
        'serverNotRunning': '服务器未运行',
        'clientConnected': '02Engine GUI 已连接: {id}',
        'clientDisconnected': '02Engine GUI 已断开: {id}',
        'webSocketError': 'WebSocket 错误: {message}',
        
        // 文件操作
        'noFileOpen': '请先打开一个扩展文件',
        'noJavaScriptFile': '请先打开一个 JavaScript 文件',
        'notJavaScriptFile': '当前文件不是 JavaScript 文件，是否继续发送？',
        'yes': '是',
        'no': '否',
        'serverNotRunningAsk': '服务器未运行，是否启动？',
        'start': '启动',
        'cancel': '取消',
        'noClients': '没有连接的 02Engine GUI 客户端',
        'extensionSent': '扩展代码已发送到 {count} 个客户端',
        
        // 预览相关
        'parseError': '无法解析扩展信息，请确保文件包含有效的 getInfo() 方法',
        'previewTitle': '积木预览: {name}',
        
        // 积木类型标签
        'blockTypeCommand': '命令',
        'blockTypeReporter': '返回值',
        'blockTypeBoolean': '布尔值',
        'blockTypeHat': '事件',
        'unnamedExtension': '未命名扩展',
        
        // 状态查询
        'quickPickPlaceholder': '02Engine VSCode Toolbox',
        'serverPort': '端口:',
        'quickPickServer': '$(server) 服务器状态: {status}',
        'quickPickConnections': '$(plug) 连接数: {count}',
        'quickPickConnectionsDesc': '客户端已连接',
        'quickPickWaiting': '等待连接',
        'quickPickStop': '$(debug-stop) 停止服务器',
        'quickPickStart': '$(play) 启动服务器',
        'quickPickSend': '$(file-code) 发送当前扩展',
        'quickPickRunning': '运行中',
        'quickPickStopped': '未运行',

        // 注释编辑器
        'commentEditorTitle': '编辑注释 - {targetName}',
        'unnamedTarget': '未命名目标',
        'commentUpdated': '注释已更新并发送回 02Engine',
        'noClientsToUpdate': '没有可用的客户端来更新注释',
        'selectFileTypePlaceholder': '选择文件类型来编辑 {targetName} 的注释',
        'fileTypeMdDesc': 'Markdown 格式',
        'fileTypeMdDetail': '以 Markdown 文件形式打开，适合富文本注释',
        'fileTypeJsDesc': 'JavaScript 格式',
        'fileTypeJsDetail': '以 JavaScript 文件形式打开，适合代码注释',
        'commentEditorOpened': '已打开 {targetName} 的注释编辑器',
        'saveAndSend': '保存并发送',
        'commentEditorNotFound': '未找到注释编辑器',
        'saveCommentError': '保存注释失败: {error}',
        'noActiveCommentEditor': '没有活动的注释编辑器',
        'selectCommentToSave': '选择要保存的注释',
        'saveAndSendComment': '02Engine: 保存并发送注释',
        'saveCurrentComment': '02Engine: 保存到 02Engine',
    },
    'en': {
        // Activation and logging
        'activated': '02Engine VSCode Toolbox activated',
        
        // Command titles
        'openToolbox': '02Engine: Open Toolbox',
        'startServer': '02Engine: Start Debug Server',
        'stopServer': '02Engine: Stop Debug Server',
        'sendExtension': '02Engine: Send Current Extension to GUI',
        'showStatus': '02Engine: Show Connection Status',
        'previewBlocks': '02Engine: Preview Blocks',
        
        // Tool menu
        'tool.previewBlocks.name': 'Preview Blocks',
        'tool.previewBlocks.description': 'Preview block definitions in the extension',
        'tool.sendExtension.name': 'Send Extension',
        'tool.sendExtension.description': 'Send current extension code to GUI clients',
        'tool.serverManagement.name': 'Server Management',
        'tool.serverManagement.description': 'Start, stop, or view server status',
        'tool.saveAndSendComment.name': 'Save & Send Comment',
        'tool.saveAndSendComment.description': 'Save current comment and send back to 02Engine',

        // Toolbox menu
        'toolboxPlaceholder': 'Select a tool to use',
        'noToolsAvailable': 'No tools available',
        
        // Status bar
        'statusRunning': '$(broadcast) 02Engine: {count} connections',
        'statusStopped': '$(circle-slash) 02Engine: Not Started',
        'tooltipRunning': '02Engine VSCode Toolbox is running\nPort: {port}\nConnections: {count}',
        'tooltipStopped': '02Engine VSCode Toolbox is not running\nClick to view status',
        
        // Server related
        'serverAlreadyRunning': 'Server is already running',
        'serverStarted': '02Engine debug server started on port: {port}',
        'serverError': 'Server error: {error}',
        'startServerError': 'Failed to start server: {error}',
        'serverStopped': '02Engine debug server stopped',
        'serverNotRunning': 'Server is not running',
        'clientConnected': '02Engine GUI connected: {id}',
        'clientDisconnected': '02Engine GUI disconnected: {id}',
        'webSocketError': 'WebSocket error: {message}',
        
        // File operations
        'noFileOpen': 'Please open an extension file first',
        'noJavaScriptFile': 'Please open a JavaScript file first',
        'notJavaScriptFile': 'Current file is not a JavaScript file. Continue sending?',
        'yes': 'Yes',
        'no': 'No',
        'serverNotRunningAsk': 'Server is not running. Start it?',
        'start': 'Start',
        'cancel': 'Cancel',
        'noClients': 'No connected 02Engine GUI clients',
        'extensionSent': 'Extension code sent to {count} clients',
        
        // Preview related
        'parseError': 'Failed to parse extension info. Make sure the file contains a valid getInfo() method',
        'previewTitle': 'Block Preview: {name}',
        
        // Block type labels
        'blockTypeCommand': 'Command',
        'blockTypeReporter': 'Reporter',
        'blockTypeBoolean': 'Boolean',
        'blockTypeHat': 'Event',
        'unnamedExtension': 'Unnamed Extension',
        
        // Status query
        'quickPickPlaceholder': '02Engine VSCode Toolbox',
        'serverPort': 'Port:',
        'quickPickServer': '$(server) Server status: {status}',
        'quickPickConnections': '$(plug) Connections: {count}',
        'quickPickConnectionsDesc': 'Client connected',
        'quickPickWaiting': 'Waiting for connection',
        'quickPickStop': '$(debug-stop) Stop server',
        'quickPickStart': '$(play) Start server',
        'quickPickSend': '$(file-code) Send current extension',
        'quickPickRunning': 'Running',
        'quickPickStopped': 'Not running',

        // Comment editor
        'commentEditorTitle': 'Edit Comment - {targetName}',
        'unnamedTarget': 'Unnamed Target',
        'commentUpdated': 'Comment updated and sent back to 02Engine',
        'noClientsToUpdate': 'No available clients to update comment',
        'selectFileTypePlaceholder': 'Select file type to edit {targetName}\'s comment',
        'fileTypeMdDesc': 'Markdown format',
        'fileTypeMdDetail': 'Open as Markdown file, suitable for rich text comments',
        'fileTypeJsDesc': 'JavaScript format',
        'fileTypeJsDetail': 'Open as JavaScript file, suitable for code comments',
        'commentEditorOpened': 'Opened comment editor for {targetName}',
        'saveAndSend': 'Save & Send',
        'commentEditorNotFound': 'Comment editor not found',
        'saveCommentError': 'Failed to save comment: {error}',
        'noActiveCommentEditor': 'No active comment editor',
        'selectCommentToSave': 'Select comment to save',
        'saveAndSendComment': '02Engine: Save & Send Comment',
        'saveCurrentComment': '02Engine: Save to 02Engine',
    }
};

function getCurrentLanguage(): Language {
    const lang = vscode.env.language.toLowerCase();
    // 支持中文（包括 zh-cn, zh-Hans 等）
    if (lang.startsWith('zh')) {
        return 'zh-cn';
    }
    // 默认使用英文
    return 'en';
}

export function t(key: string, params?: { [key: string]: string | number }): string {
    const lang = getCurrentLanguage();
    let message = translations[lang][key] || translations['en'][key] || key;
    
    if (params) {
        for (const [paramKey, paramValue] of Object.entries(params)) {
            message = message.replace(`{${paramKey}}`, String(paramValue));
        }
    }
    
    return message;
}

export function getLanguage(): Language {
    return getCurrentLanguage();
}
