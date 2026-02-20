import * as vscode from 'vscode';
import { WebSocket } from 'ws';
import { t } from './i18n';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

// 存储活动的注释编辑器信息
interface ActiveCommentEditor {
    commentId: string;
    filePath: string;
    clients: Set<WebSocket>;
    document?: vscode.TextDocument;
}

const activeCommentEditors = new Map<string, ActiveCommentEditor>();

// 状态栏保存按钮
let saveButton: vscode.StatusBarItem | undefined;

// 当前活动的注释ID
export let currentActiveCommentId: string | undefined;

// 编辑器切换监听器
let editorChangeListener: vscode.Disposable | undefined;

interface CommentMessage {
    type: 'comment';
    action: 'open' | 'update';
    commentId: string;
    content?: string;
    targetId?: string;
    targetName?: string;
    timestamp?: number;
}

/**
 * 打开注释编辑器
 * @param message 来自02Engine的消息
 * @param clients WebSocket客户端集合
 * @param context 扩展上下文
 */
export async function openCommentEditor(
    message: CommentMessage,
    clients: Set<WebSocket>,
    context: vscode.ExtensionContext
): Promise<void> {
    const { commentId, content, targetId, targetName, timestamp } = message;

    console.log('[02Engine] 收到打开注释请求:', { commentId, targetName });

    // 如果已经存在相同commentId的编辑器，直接显示它
    const existingEditor = activeCommentEditors.get(commentId);
    if (existingEditor) {
        try {
            const doc = await vscode.workspace.openTextDocument(existingEditor.filePath);
            await vscode.window.showTextDocument(doc);
            console.log('[02Engine] 已打开现有注释编辑器:', existingEditor.filePath);
            return;
        } catch (e) {
            console.log('[02Engine] 现有文件已失效，创建新的:', e);
            activeCommentEditors.delete(commentId);
        }
    }

    try {
        // 让用户选择文件类型
        const fileType = await selectFileType(targetName || t('unnamedTarget'));
        if (!fileType) {
            console.log('[02Engine] 用户取消了文件类型选择');
            return; // 用户取消了选择
        }

        console.log('[02Engine] 用户选择文件类型:', fileType);

        // 创建临时文件
        const tempFilePath = createTempFile(commentId, targetName, content || '', fileType);
        console.log('[02Engine] 临时文件创建成功:', tempFilePath);

        // 验证文件是否存在
        if (!fs.existsSync(tempFilePath)) {
            throw new Error(`临时文件创建失败: ${tempFilePath}`);
        }

        // 存储活动编辑器信息
        const activeEditor: ActiveCommentEditor = {
            commentId,
            filePath: tempFilePath,
            clients: clients
        };
        activeCommentEditors.set(commentId, activeEditor);

        // 打开文件
        console.log('[02Engine] 正在打开文件:', tempFilePath);
        const document = await vscode.workspace.openTextDocument(tempFilePath);
        activeEditor.document = document;
        console.log('[02Engine] 文件文档已创建');

        const editor = await vscode.window.showTextDocument(document, {
            preview: false,
            viewColumn: vscode.ViewColumn.One
        });
        console.log('[02Engine] 文件编辑器已显示');

        // 设置当前活动的注释ID
        currentActiveCommentId = commentId;

        // 设置 context 标记，用于显示顶部保存按钮
        vscode.commands.executeCommand('setContext', '02engine.isCommentEditor', true);
        console.log('[02Engine] 已设置 context: 02engine.isCommentEditor = true');

        // 创建状态栏保存按钮
        createSaveButton(commentId);

        // 设置编辑器切换监听器
        setupEditorChangeListener();

        // 显示信息消息
        vscode.window.showInformationMessage(
            t('commentEditorOpened', { targetName: targetName || t('unnamedTarget') })
        );

    } catch (error) {
        console.error('[02Engine] 打开注释编辑器失败:', error);
        vscode.window.showErrorMessage(`打开注释编辑器失败: ${error}`);
    }
}

/**
 * 让用户选择文件类型
 * @param targetName 目标角色名称
 */
async function selectFileType(targetName: string): Promise<string | undefined> {
    const options: vscode.QuickPickItem[] = [
        {
            label: '$(file-code) Markdown (.md)',
            description: t('fileTypeMdDesc'),
            detail: t('fileTypeMdDetail')
        },
        {
            label: '$(code) JavaScript (.js)',
            description: t('fileTypeJsDesc'),
            detail: t('fileTypeJsDetail')
        }
    ];

    const selected = await vscode.window.showQuickPick(options, {
        placeHolder: t('selectFileTypePlaceholder', { targetName }),
        ignoreFocusOut: true
    });

    if (!selected) {
        return undefined;
    }

    if (selected.label.includes('Markdown')) {
        return 'md';
    } else {
        return 'js';
    }
}

/**
 * 创建临时文件
 * @param commentId 注释ID
 * @param targetName 目标名称
 * @param content 注释内容
 * @param fileType 文件类型
 */
function createTempFile(
    commentId: string,
    targetName: string | undefined,
    content: string,
    fileType: string
): string {
    try {
        // 创建临时目录 - 使用 vscode 扩展存储路径而不是系统临时目录
        // 这样可以确保 VSCode 有权限访问
        const storagePath = path.join(os.homedir(), '.02engine-vscode-comments');
        console.log('[02Engine] 存储目录:', storagePath);

        if (!fs.existsSync(storagePath)) {
            fs.mkdirSync(storagePath, { recursive: true });
            console.log('[02Engine] 已创建存储目录');
        }

        // 生成文件名 - 使用更短的名称避免 Windows 路径过长问题
        const safeTargetName = (targetName || 'unnamed').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').substring(0, 20);
        // 清理 commentId 中的非法字符，只保留字母数字
        const shortCommentId = commentId.slice(-8).replace(/[^a-zA-Z0-9]/g, '');
        const fileName = `cmt_${safeTargetName}_${shortCommentId || '00000000'}.${fileType}`;
        const filePath = path.join(storagePath, fileName);
        console.log('[02Engine] 文件路径:', filePath);

        // 直接保存原文，不添加任何头部信息
        const fileContent = content || '';

        // 写入文件
        fs.writeFileSync(filePath, fileContent, 'utf8');
        console.log('[02Engine] 文件写入成功，大小:', fileContent.length, '字节');

        // 验证文件
        const stats = fs.statSync(filePath);
        console.log('[02Engine] 文件验证 - 存在:', fs.existsSync(filePath), '大小:', stats.size);

        return filePath;
    } catch (error) {
        console.error('[02Engine] 创建临时文件失败:', error);
        throw error;
    }
}

/**
 * 保存并关闭注释
 * @param commentId 注释ID
 */
export async function saveAndCloseComment(commentId: string): Promise<void> {
    const activeEditor = activeCommentEditors.get(commentId);
    if (!activeEditor) {
        vscode.window.showWarningMessage(t('commentEditorNotFound'));
        return;
    }

    try {
        // 保存文件
        const document = activeEditor.document;
        if (document) {
            await document.save();
        }

        // 读取最新内容
        const content = fs.readFileSync(activeEditor.filePath, 'utf8');

        // 提取实际注释内容（去掉头部）
        const actualContent = extractContent(content);

        // 发送更新到02Engine
        await sendUpdateToEngine(commentId, actualContent, activeEditor.clients);

        // 关闭编辑器
        await closeCommentEditor(commentId);

    } catch (error) {
        vscode.window.showErrorMessage(t('saveCommentError', { error: String(error) }));
    }
}

/**
 * 从文件内容中提取实际注释内容
 * 现在直接返回完整内容，不再跳过任何头部
 * @param fileContent 文件内容
 */
function extractContent(fileContent: string): string {
    // 直接返回完整文件内容
    return fileContent;
}

/**
 * 发送更新到02Engine
 * @param commentId 注释ID
 * @param content 更新后的内容
 * @param clients WebSocket客户端集合
 */
async function sendUpdateToEngine(
    commentId: string,
    content: string,
    clients: Set<WebSocket>
): Promise<void> {
    if (clients.size === 0) {
        vscode.window.showWarningMessage(t('noClients'));
        return;
    }

    // 发送更新消息到02Engine
    const updateMessage = {
        type: 'comment',
        action: 'update',
        commentId: commentId,
        content: content
    };

    const messageStr = JSON.stringify(updateMessage);
    let sentCount = 0;

    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
            sentCount++;
        }
    });

    if (sentCount > 0) {
        vscode.window.showInformationMessage(t('commentUpdated'));
    } else {
        vscode.window.showWarningMessage(t('noClientsToUpdate'));
    }
}

/**
 * 关闭特定注释编辑器
 * @param commentId 注释ID
 */
export async function closeCommentEditor(commentId: string): Promise<void> {
    const activeEditor = activeCommentEditors.get(commentId);
    if (!activeEditor) {
        return;
    }

    try {
        // 关闭文档
        const document = activeEditor.document;
        if (document) {
            // 尝试关闭文档
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        }

        // 删除临时文件
        if (fs.existsSync(activeEditor.filePath)) {
            fs.unlinkSync(activeEditor.filePath);
        }

        // 如果关闭的是当前活动的注释编辑器，移除按钮
        if (currentActiveCommentId === commentId) {
            removeSaveButton();
        }
    } catch (e) {
        // 忽略关闭错误
    } finally {
        activeCommentEditors.delete(commentId);

        // 如果没有活动的注释编辑器了，清理监听器
        if (activeCommentEditors.size === 0) {
            cleanupCommentEditor();
        }
    }
}

/**
 * 关闭所有注释编辑器
 */
export async function closeAllCommentEditors(): Promise<void> {
    const promises: Promise<void>[] = [];
    activeCommentEditors.forEach((_, commentId) => {
        promises.push(closeCommentEditor(commentId));
    });
    await Promise.all(promises);

    // 清理按钮和监听器
    cleanupCommentEditor();
}

/**
 * 获取活动注释编辑器
 * @param commentId 注释ID
 */
export function getActiveCommentEditor(commentId: string): ActiveCommentEditor | undefined {
    return activeCommentEditors.get(commentId);
}

/**
 * 获取所有活动注释编辑器
 */
export function getAllActiveCommentEditors(): Map<string, ActiveCommentEditor> {
    return activeCommentEditors;
}

/**
 * 创建状态栏保存按钮
 * @param commentId 注释ID
 */
function createSaveButton(commentId: string): void {
    // 如果已有按钮，先销毁
    if (saveButton) {
        saveButton.dispose();
    }

    // 创建新按钮 - 放在左侧，优先级高
    saveButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    saveButton.text = '$(check) 保存并发送';
    saveButton.tooltip = '保存注释内容并发送回 02Engine';
    saveButton.command = '02engine.saveAndSendComment';
    saveButton.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    saveButton.show();

    console.log('[02Engine] 状态栏保存按钮已创建');
}

/**
 * 移除状态栏保存按钮
 */
function removeSaveButton(): void {
    if (saveButton) {
        saveButton.dispose();
        saveButton = undefined;
        console.log('[02Engine] 状态栏保存按钮已移除');
    }
    currentActiveCommentId = undefined;

    // 清除 context 标记
    vscode.commands.executeCommand('setContext', '02engine.isCommentEditor', false);
    console.log('[02Engine] 已清除 context: 02engine.isCommentEditor = false');
}

/**
 * 设置编辑器切换监听器
 * 当切换到其他文件时隐藏按钮，切换回注释文件时显示按钮
 */
function setupEditorChangeListener(): void {
    // 如果已有监听器，先销毁
    if (editorChangeListener) {
        editorChangeListener.dispose();
    }

    editorChangeListener = vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (!editor) {
            // 没有活动编辑器，隐藏按钮
            if (saveButton) {
                saveButton.hide();
            }
            return;
        }

        const filePath = editor.document.fileName;
        console.log('[02Engine] 编辑器切换:', filePath);

        // 检查是否是注释文件
        let isCommentFile = false;
        activeCommentEditors.forEach((activeEditor) => {
            if (activeEditor.filePath === filePath) {
                isCommentFile = true;
                currentActiveCommentId = activeEditor.commentId;
            }
        });

        if (isCommentFile) {
            // 是注释文件，显示按钮
            if (!saveButton) {
                createSaveButton(currentActiveCommentId!);
            } else {
                saveButton.show();
            }
            console.log('[02Engine] 显示保存按钮');
        } else {
            // 不是注释文件，隐藏按钮
            if (saveButton) {
                saveButton.hide();
            }
            console.log('[02Engine] 隐藏保存按钮');
        }
    });
}

/**
 * 清理所有监听器和按钮
 */
export function cleanupCommentEditor(): void {
    removeSaveButton();
    if (editorChangeListener) {
        editorChangeListener.dispose();
        editorChangeListener = undefined;
    }
}