import * as vscode from 'vscode';
import { WebSocketServer, WebSocket } from 'ws';
import { showBlockPreview, updatePreview } from './blockPreview';
import { t } from './i18n';
import { ToolboxManager } from './toolbox';

let wss: WebSocketServer | null = null;
let statusBarItem: vscode.StatusBarItem;
const clients: Set<WebSocket> = new Set();
let toolboxManager: ToolboxManager;

export function activate(context: vscode.ExtensionContext) {
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
        }
    ]);

    // 注册命令
    context.subscriptions.push(
        vscode.commands.registerCommand('02engine.openToolbox', () => toolboxManager.openToolbox()),
        vscode.commands.registerCommand('02engine.startServer', startServer),
        vscode.commands.registerCommand('02engine.stopServer', stopServer),
        vscode.commands.registerCommand('02engine.sendExtension', sendCurrentFile),
        vscode.commands.registerCommand('02engine.showStatus', showStatus),
        vscode.commands.registerCommand('02engine.previewBlocks', () => showBlockPreview(context))
    );

    // 设置命令标题（支持多语言）
    vscode.commands.executeCommand('setContext', '02engine.openToolboxTitle', t('openToolbox'));
    vscode.commands.executeCommand('setContext', '02engine.startServerTitle', t('startServer'));
    vscode.commands.executeCommand('setContext', '02engine.stopServerTitle', t('stopServer'));
    vscode.commands.executeCommand('setContext', '02engine.sendExtensionTitle', t('sendExtension'));
    vscode.commands.executeCommand('setContext', '02engine.showStatusTitle', t('showStatus'));
    vscode.commands.executeCommand('setContext', '02engine.previewBlocksTitle', t('previewBlocks'));

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

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    if (message.type === 'heartbeat') {
                        // 回复心跳
                        ws.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
                    }
                } catch (e) {
                    // 忽略解析错误
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

export function deactivate() {
    if (wss) {
        clients.forEach(client => client.close());
        clients.clear();
        wss.close();
        wss = null;
    }
}
