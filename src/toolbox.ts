import * as vscode from 'vscode';
import { t } from './i18n';

export interface Tool {
    id: string;
    name: string;
    description: string;
    icon?: string;
    execute: () => void;
}

export class ToolboxManager {
    private tools: Map<string, Tool> = new Map();

    registerTool(tool: Tool) {
        this.tools.set(tool.id, tool);
    }

    registerTools(tools: Tool[]) {
        tools.forEach(tool => this.registerTool(tool));
    }

    async showToolMenu(): Promise<Tool | undefined> {
        const tools = Array.from(this.tools.values());

        if (tools.length === 0) {
            vscode.window.showWarningMessage(t('noToolsAvailable'));
            return undefined;
        }

        const items = tools.map(tool => ({
            label: tool.icon ? `${tool.icon} ${tool.name}` : tool.name,
            description: tool.description,
            tool: tool
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: t('toolboxPlaceholder'),
            matchOnDescription: true
        });

        return selected?.tool;
    }

    async openToolbox() {
        const tool = await this.showToolMenu();
        if (tool) {
            tool.execute();
        }
    }

    getTool(id: string): Tool | undefined {
        return this.tools.get(id);
    }

    listTools(): Tool[] {
        return Array.from(this.tools.values());
    }
}
