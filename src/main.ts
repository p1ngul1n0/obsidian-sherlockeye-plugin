import { Plugin, addIcon, Notice } from "obsidian";
import {
	SherlockeyeSettingTab,
	DEFAULT_SETTINGS,
	SherlockeyeSettings,
} from "./settings";

export default class SherlockeyePlugin extends Plugin {
	settings: SherlockeyeSettings | undefined;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new SherlockeyeSettingTab(this.app, this));
		addIcon(
			"sherlockeye-icon",
			`<svg viewBox="0 0 53 53" fill="none" xmlns="http://www.w3.org/2000/svg">
	<path d="M17.4586 17.4743H0V52.4227H34.9171V34.9485C25.2749 34.9485 17.4586 27.1251 17.4586 17.4743Z" fill="currentColor"/>
	<path d="M34.9168 0C25.2746 0 17.4583 7.82337 17.4583 17.4742H34.9168V34.9484C44.559 34.9484 52.3754 27.125 52.3754 17.4742C52.3754 7.82337 44.559 0 34.9168 0Z" fill="currentColor"/>
	</svg>`,
		);

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor, view) => {
				const selectedText = editor.getSelection();
				if (selectedText) {
					menu.addItem((item) => {
						item.setTitle('Search "' + selectedText + '"')
							.setIcon("sherlockeye-icon")
							.onClick(async () => {
								const statusBar = this.addStatusBarItem();
								await search(
									selectedText,
									statusBar,
									this.settings?.apiToken,
								);
							});
					});
				}
			}),
		);

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				const fileName = file.name.replace(/\.[^.]+$/, "");
				if (fileName) {
					menu.addItem((item) => {
						item.setTitle('Search "' + fileName + '"')
							.setIcon("sherlockeye-icon")
							.onClick(async () => {
								const statusBar = this.addStatusBarItem();
								await search(
									fileName,
									statusBar,
									this.settings?.apiToken,
								);
							});
					});
				}
			}),
		);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

async function search(
	identifier: string,
	statusBar: HTMLElement,
	apiToken: string | undefined,
) {
	if (!apiToken) {
		new Notice("Set your API Key in Sherlockeye Settings!");
		return;
	}

	try {
		statusBar.setText("Searching...");

		const token = apiToken;

		const response = await fetch(
			"https://api.sherlockeye.io/v1/searches/sync",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					type: "email",
					value: identifier,
					timeoutSeconds: 60,
					additional_modules: ["digital_accounts_expansion"],
				}),
			},
		);

		const data = await response.json();
		console.log(data.data.results);
	} catch (err) {
		new Notice("Error using Sherlockeye API!");
		console.log(err);
	}
}
