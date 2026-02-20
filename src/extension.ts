import * as vscode from 'vscode';
import * as path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { showBlockPreview, updatePreview } from './blockPreview';
import { t } from './i18n';
import { ToolboxManager } from './toolbox';
import { openCommentEditor, closeAllCommentEditors, saveAndCloseComment, getAllActiveCommentEditors, cleanupCommentEditor, currentActiveCommentId } from './commentEditor';

let wss: WebSocketServer | null = null;
let statusBarItem: vscode.StatusBarItem;
const clients: Set<WebSocket> = new Set();
let toolboxManager: ToolboxManager;
let extensionContext: vscode.ExtensionContext;

export function activate(context: vscode.ExtensionContext) {
    // 存储上下文供其他函数使用
    extensionContext = context;

    console.log(t('activated'));

    // 初始化工具箱管理器
    toolboxManager = new ToolboxManager();

    // 创建状态栏项
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = '02engine.showStatus';
    updateStatusBar();
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // 注册工具
    toolboxManager.registerTools([
        {
            id: 'previewBlocks',
            name: t('tool.previewBlocks.name'),
            description: t('tool.previewBlocks.description'),
            icon: '$(preview)',
            execute: () => showBlockPreview(context)
        },
        {
            id: 'sendExtension',
            name: t('tool.sendExtension.name'),
            description: t('tool.sendExtension.description'),
            icon: '$(cloud-upload)',
            execute: sendCurrentFile
        },
        {
            id: 'serverManagement',
            name: t('tool.serverManagement.name'),
            description: t('tool.serverManagement.description'),
            icon: '$(server)',
            execute: showServerMenu
        },
        {
            id: 'saveAndSendComment',
            name: t('tool.saveAndSendComment.name'),
            description: t('tool.saveAndSendComment.description'),
            icon: '$(check)',
            execute: saveActiveComment
        }
    ]);

    // 注册命令
    context.subscriptions.push(
        vscode.commands.registerCommand('02engine.openToolbox', () => toolboxManager.openToolbox()),
        vscode.commands.registerCommand('02engine.startServer', startServer),
        vscode.commands.registerCommand('02engine.stopServer', stopServer),
        vscode.commands.registerCommand('02engine.sendExtension', sendCurrentFile),
        vscode.commands.registerCommand('02engine.showStatus', showStatus),
        vscode.commands.registerCommand('02engine.previewBlocks', () => showBlockPreview(context)),
        vscode.commands.registerCommand('02engine.saveAndSendComment', saveActiveComment),
        vscode.commands.registerCommand('02engine.saveCurrentComment', saveCurrentComment)
    );

    // 设置命令标题（支持多语言）
    vscode.commands.executeCommand('setContext', '02engine.openToolboxTitle', t('openToolbox'));
    vscode.commands.executeCommand('setContext', '02engine.startServerTitle', t('startServer'));
    vscode.commands.executeCommand('setContext', '02engine.stopServerTitle', t('stopServer'));
    vscode.commands.executeCommand('setContext', '02engine.sendExtensionTitle', t('sendExtension'));
    vscode.commands.executeCommand('setContext', '02engine.showStatusTitle', t('showStatus'));
    vscode.commands.executeCommand('setContext', '02engine.previewBlocksTitle', t('previewBlocks'));
    vscode.commands.executeCommand('setContext', '02engine.saveAndSendCommentTitle', t('saveAndSendComment'));
    vscode.commands.executeCommand('setContext', '02engine.saveCurrentCommentTitle', t('saveCurrentComment'));

    // 监听文档变化，自动更新预览
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument((e) => {
            if (e.document === vscode.window.activeTextEditor?.document) {
                updatePreview();
            }
        })
    );

    // 检查是否自动启动
    const config = vscode.workspace.getConfiguration('02engine');
    if (config.get<boolean>('autoStart')) {
        startServer();
    }
}

function getPort(): number {
    const config = vscode.workspace.getConfiguration('02engine');
    return config.get<number>('port') || 1101;
}

function updateStatusBar() {
    if (wss) {
        statusBarItem.text = t('statusRunning', { count: clients.size });
        statusBarItem.tooltip = t('tooltipRunning', { port: getPort(), count: clients.size });
        statusBarItem.backgroundColor = undefined;
    } else {
        statusBarItem.text = t('statusStopped');
        statusBarItem.tooltip = t('tooltipStopped');
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
}

function startServer() {
    if (wss) {
        vscode.window.showInformationMessage(t('serverAlreadyRunning'));
        return;
    }

    const port = getPort();

    try {
        wss = new WebSocketServer({ port });

        wss.on('connection', (ws, req) => {
            const clientId = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
            clients.add(ws);
            updateStatusBar();

            vscode.window.showInformationMessage(t('clientConnected', { id: clientId }));

            ws.on('message', async (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    if (message.type === 'heartbeat') {
                        // 回复心跳
                        ws.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
                    } else if (message.type === 'comment' && message.action === 'open') {
                        // 处理注释打开请求
                        console.log('[02Engine] 收到 comment/open 消息:', message);
                        try {
                            await openCommentEditor(message, clients, extensionContext);
                        } catch (err) {
                            console.error('[02Engine] 处理 comment/open 失败:', err);
                            vscode.window.showErrorMessage(`打开注释编辑器失败: ${err}`);
                        }
                    }
                } catch (e) {
                    console.error('[02Engine] 解析消息失败:', e);
                }
            });

            ws.on('close', () => {
                clients.delete(ws);
                updateStatusBar();
                vscode.window.showInformationMessage(t('clientDisconnected', { id: clientId }));
            });

            ws.on('error', (error) => {
                console.error(t('webSocketError', { message: error.message }));
            });
        });

        wss.on('error', (error) => {
            vscode.window.showErrorMessage(t('serverError', { error: error.message }));
            stopServer();
        });

        vscode.window.showInformationMessage(t('serverStarted', { port }));
        updateStatusBar();

    } catch (error) {
        vscode.window.showErrorMessage(t('startServerError', { error }));
    }
}

function stopServer() {
    if (!wss) {
        vscode.window.showInformationMessage(t('serverNotRunning'));
        return;
    }

    // 关闭所有注释编辑器
    closeAllCommentEditors();

    // 关闭所有客户端连接
    clients.forEach(client => {
        client.close();
    });
    clients.clear();

    wss.close();
    wss = null;

    vscode.window.showInformationMessage(t('serverStopped'));
    updateStatusBar();
}

async function sendCurrentFile() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage(t('noJavaScriptFile'));
        return;
    }

    const document = editor.document;
    if (document.languageId !== 'javascript') {
        const proceed = await vscode.window.showWarningMessage(
            t('notJavaScriptFile'),
            t('yes'), t('no')
        );
        if (proceed !== t('yes')) {
            return;
        }
    }

    if (!wss) {
        const start = await vscode.window.showWarningMessage(
            t('serverNotRunningAsk'),
            t('start'), t('cancel')
        );
        if (start === t('start')) {
            startServer();
            // 等待一小段时间让服务器启动
            await new Promise(resolve => setTimeout(resolve, 500));
        } else {
            return;
        }
    }

    if (clients.size === 0) {
        vscode.window.showWarningMessage(t('noClients'));
        return;
    }

    const code = document.getText();
    const message = JSON.stringify({
        type: 'extension',
        code: code
    });

    let sentCount = 0;
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
            sentCount++;
        }
    });

    vscode.window.showInformationMessage(t('extensionSent', { count: sentCount }));
}

function showServerMenu() {
    const port = getPort();
    const status = wss ? t('quickPickRunning') : t('quickPickStopped');
    const connectionCount = clients.size;

    const items: vscode.QuickPickItem[] = [
        {
            label: t('quickPickServer', { status }),
            description: wss ? `${t('serverPort')} ${port}` : ''
        },
        {
            label: t('quickPickConnections', { count: connectionCount }),
            description: connectionCount > 0 ? t('quickPickConnectionsDesc') : t('quickPickWaiting')
        },
        { label: '', kind: vscode.QuickPickItemKind.Separator },
        {
            label: wss ? t('quickPickStop') : t('quickPickStart'),
            description: wss ? '02engine.stopServer' : '02engine.startServer'
        }
    ];

    if (wss) {
        items.push({
            label: t('quickPickSend'),
            description: '02engine.sendExtension'
        });
    }

    vscode.window.showQuickPick(items, {
        placeHolder: t('quickPickPlaceholder')
    }).then(selected => {
        if (selected?.description === '02engine.startServer') {
            startServer();
        } else if (selected?.description === '02engine.stopServer') {
            stopServer();
        } else if (selected?.description === '02engine.sendExtension') {
            sendCurrentFile();
        }
    });
}

function showStatus() {
    showServerMenu();
}

async function saveActiveComment() {
    // 优先使用当前活动的注释ID（当前显示的文件）
    if (currentActiveCommentId) {
        console.log('[02Engine] 保存当前活动的注释:', currentActiveCommentId);
        await saveAndCloseComment(currentActiveCommentId);
        return;
    }

    const activeEditors = getAllActiveCommentEditors();

    if (activeEditors.size === 0) {
        vscode.window.showWarningMessage(t('noActiveCommentEditor'));
        return;
    }

    // 如果只有一个活动的注释编辑器，直接保存
    if (activeEditors.size === 1) {
        const [commentId] = activeEditors.keys();
        await saveAndCloseComment(commentId);
    } else {
        // 多个编辑器，让用户选择
        const items: vscode.QuickPickItem[] = [];
        activeEditors.forEach((editor, commentId) => {
            items.push({
                label: `$(comment) ${path.basename(editor.filePath)}`,
                description: commentId,
                detail: editor.filePath
            });
        });

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: t('selectCommentToSave')
        });

        if (selected && selected.description) {
            await saveAndCloseComment(selected.description);
        }
    }
}

/**
 * 保存当前注释（用于标题栏按钮）
 * 使用与 saveActiveComment 相同的逻辑
 */
async function saveCurrentComment(): Promise<void> {
    console.log('[02Engine] 点击标题栏保存按钮');

    // 优先使用当前活动的注释ID（与底部按钮相同的逻辑）
    if (currentActiveCommentId) {
        console.log('[02Engine] 保存当前活动的注释:', currentActiveCommentId);
        await saveAndCloseComment(currentActiveCommentId);
        return;
    }

    // 如果没有 currentActiveCommentId，尝试从当前编辑器查找
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        const filePath = activeEditor.document.fileName;
        let foundCommentId: string | undefined;

        getAllActiveCommentEditors().forEach((editor, commentId) => {
            if (editor.filePath === filePath) {
                foundCommentId = commentId;
            }
        });

        if (foundCommentId) {
            console.log('[02Engine] 从文件路径找到注释ID:', foundCommentId);
            await saveAndCloseComment(foundCommentId);
            return;
        }
    }

    // 最后尝试使用唯一活动的编辑器
    const activeEditors = getAllActiveCommentEditors();
    if (activeEditors.size === 1) {
        const [commentId] = activeEditors.keys();
        console.log('[02Engine] 使用唯一活动的注释:', commentId);
        await saveAndCloseComment(commentId);
        return;
    }

    vscode.window.showWarningMessage(t('noActiveCommentEditor'));
}

export function deactivate() {
    // 关闭所有注释编辑器
    closeAllCommentEditors();

    // 清理注释编辑器相关资源
    cleanupCommentEditor();

    if (wss) {
        clients.forEach(client => client.close());
        clients.clear();
        wss.close();
        wss = null;
    }
}
