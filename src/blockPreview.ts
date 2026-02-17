import * as vscode from 'vscode';
import { t, getLanguage } from './i18n';

interface BlockArgument {
    type: string;
    defaultValue?: any;
    menu?: string;
}

interface BlockInfo {
    opcode: string;
    blockType: string;
    text: string;
    arguments?: { [key: string]: BlockArgument };
}

interface ExtensionInfo {
    id: string;
    name: string;
    color1?: string;
    color2?: string;
    blocks: BlockInfo[];
    menus?: { [key: string]: any };
}

let previewPanel: vscode.WebviewPanel | null = null;

export function showBlockPreview(context: vscode.ExtensionContext) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage(t('noFileOpen'));
        return;
    }

    const code = editor.document.getText();
    const extensionInfo = parseExtensionCode(code);

    if (!extensionInfo) {
        vscode.window.showWarningMessage(t('parseError'));
        return;
    }

    if (previewPanel) {
        previewPanel.reveal(vscode.ViewColumn.Beside);
    } else {
        previewPanel = vscode.window.createWebviewPanel(
            'scratchBlockPreview',
            t('previewTitle', { name: extensionInfo.name }),
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        );

        previewPanel.onDidDispose(() => {
            previewPanel = null;
        });
    }

    previewPanel.webview.html = generatePreviewHtml(extensionInfo);
}

function parseExtensionCode(code: string): ExtensionInfo | null {
    try {
        // 找到 getInfo 方法的 return 语句
        const getInfoMatch = code.match(/getInfo\s*\(\s*\)\s*\{/);
        if (!getInfoMatch) {
            return null;
        }

        const startIndex = getInfoMatch.index! + getInfoMatch[0].length;
        
        // 找到 return 语句
        const returnMatch = code.slice(startIndex).match(/return\s*\{/);
        if (!returnMatch) {
            return null;
        }

        const returnStart = startIndex + returnMatch.index! + returnMatch[0].length - 1;
        
        // 使用括号匹配找到完整的对象
        let braceCount = 1;
        let i = returnStart + 1;
        while (i < code.length && braceCount > 0) {
            const char = code[i];
            // 跳过字符串内容
            if (char === '"' || char === "'") {
                const quote = char;
                i++;
                while (i < code.length && code[i] !== quote) {
                    if (code[i] === '\\') i++; // 跳过转义字符
                    i++;
                }
            } else if (char === '{') {
                braceCount++;
            } else if (char === '}') {
                braceCount--;
            }
            i++;
        }

        let infoStr = code.slice(returnStart, i);
        
        // 处理 Scratch.BlockType 和 Scratch.ArgumentType
        infoStr = infoStr
            .replace(/Scratch\.BlockType\.(\w+)/g, '"$1"')
            .replace(/Scratch\.ArgumentType\.(\w+)/g, '"$1"');

        // 给没有引号的属性名加上双引号
        // 匹配 { 或 , 后面的属性名
        infoStr = infoStr.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');

        // 将单引号字符串转换为双引号
        infoStr = infoStr.replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, '"$1"');

        // 移除尾随逗号
        infoStr = infoStr.replace(/,(\s*[}\]])/g, '$1');

        // 尝试解析 JSON
        const info = JSON.parse(infoStr);

        return {
            id: info.id || 'unknown',
            name: info.name || t('unnamedExtension'),
            color1: info.color1 || '#4C97FF',
            color2: info.color2 || '#3373CC',
            blocks: info.blocks || [],
            menus: info.menus || {}
        };
    } catch (e) {
        console.error('解析扩展代码失败:', e);
        return null;
    }
}

function generatePreviewHtml(info: ExtensionInfo): string {
    const blocksHtml = info.blocks.map(block => generateBlockHtml(block, info)).join('');
    const htmlLang = getLanguage() === 'zh-cn' ? 'zh-CN' : 'en-US';

    return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${getLanguage() === 'zh-cn' ? '积木预览' : 'Block Preview'}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
            background: #f9f9f9;
            padding: 20px;
        }
        .extension-header {
            background: ${info.color1};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .extension-header h1 {
            font-size: 18px;
            font-weight: 600;
        }
        .extension-header .ext-id {
            font-size: 12px;
            opacity: 0.8;
            margin-top: 4px;
        }
        .blocks-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .block {
            display: inline-flex;
            align-items: center;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            color: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            min-height: 40px;
            flex-wrap: wrap;
            gap: 4px;
            width: fit-content;
        }
        .block-command {
            background: ${info.color1};
            border-radius: 4px;
        }
        .block-reporter {
            background: ${info.color1};
            border-radius: 20px;
            padding: 6px 14px;
        }
        .block-boolean {
            background: ${info.color1};
            clip-path: polygon(10px 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 10px 100%, 0% 50%);
            padding: 8px 20px;
        }
        .block-hat {
            background: ${info.color1};
            border-radius: 4px 4px 4px 4px;
            padding-top: 20px;
            border-top: 20px solid ${info.color2};
            border-top-left-radius: 20px;
            border-top-right-radius: 20px;
        }
        .input-slot {
            background: white;
            color: #575E75;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            min-width: 40px;
            text-align: center;
            display: inline-block;
        }
        .input-slot.dropdown {
            padding-right: 20px;
            position: relative;
        }
        .input-slot.dropdown::after {
            content: "▼";
            font-size: 8px;
            position: absolute;
            right: 6px;
            top: 50%;
            transform: translateY(-50%);
        }
        .block-type-label {
            font-size: 10px;
            color: #666;
            margin-bottom: 4px;
            text-transform: uppercase;
        }
        .block-wrapper {
            margin-bottom: 12px;
        }
        .separator {
            height: 1px;
            background: #ddd;
            margin: 16px 0;
        }
    </style>
</head>
<body>
    <div class="extension-header">
        <h1>${escapeHtml(info.name)}</h1>
        <div class="ext-id">ID: ${escapeHtml(info.id)}</div>
    </div>
    <div class="blocks-container">
        ${blocksHtml}
    </div>
</body>
</html>`;
}

function generateBlockHtml(block: BlockInfo, info: ExtensionInfo): string {
    const blockType = String(block.blockType).toUpperCase();
    let blockClass = 'block-command';
    let typeLabel = t('blockTypeCommand');

    switch (blockType) {
        case 'REPORTER':
            blockClass = 'block-reporter';
            typeLabel = t('blockTypeReporter');
            break;
        case 'BOOLEAN':
            blockClass = 'block-boolean';
            typeLabel = t('blockTypeBoolean');
            break;
        case 'HAT':
            blockClass = 'block-hat';
            typeLabel = t('blockTypeHat');
            break;
        case 'COMMAND':
        default:
            blockClass = 'block-command';
            typeLabel = t('blockTypeCommand');
    }

    // 解析积木文本，替换参数占位符
    let text = block.text || '';
    if (block.arguments) {
        for (const [argName, argInfo] of Object.entries(block.arguments)) {
            const placeholder = `[${argName}]`;
            const isMenu = argInfo.menu !== undefined;
            const defaultVal = argInfo.defaultValue !== undefined ? argInfo.defaultValue : '';
            const inputHtml = `<span class="input-slot${isMenu ? ' dropdown' : ''}">${escapeHtml(String(defaultVal))}</span>`;
            text = text.replace(placeholder, inputHtml);
        }
    }

    return `
        <div class="block-wrapper">
            <div class="block-type-label">${typeLabel}</div>
            <div class="block ${blockClass}">${text}</div>
        </div>
    `;
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function updatePreview() {
    if (!previewPanel) {
        return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    const code = editor.document.getText();
    const extensionInfo = parseExtensionCode(code);

    if (extensionInfo) {
        previewPanel.title = t('previewTitle', { name: extensionInfo.name });
        previewPanel.webview.html = generatePreviewHtml(extensionInfo);
    }
}
