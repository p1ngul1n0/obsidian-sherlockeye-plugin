import { Plugin, addIcon, Notice, TFile } from "obsidian";
import {
	SherlockeyeSettingTab,
	DEFAULT_SETTINGS,
	SherlockeyeSettings,
} from "./settings";

export default class SherlockeyePlugin extends Plugin {
	settings: SherlockeyeSettings = DEFAULT_SETTINGS;

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
						const type = this.detectSearchType(selectedText);
						item.setTitle(
							'Search "' + selectedText + '" (' + type + ")",
						)
							.setIcon("sherlockeye-icon")
							.onClick(async () => {
								const statusBar = this.addStatusBarItem();
								await this.performSearch(
									selectedText,
									statusBar,
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
					const type = this.detectSearchType(fileName);
					menu.addItem((item) => {
						item.setTitle(
							'Search "' + fileName + '" (' + type + ")",
						)
							.setIcon("sherlockeye-icon")
							.onClick(async () => {
								const statusBar = this.addStatusBarItem();
								await this.performSearch(fileName, statusBar);
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

	private async performSearch(identifier: string, statusBar: HTMLElement) {
		if (!this.settings?.apiToken) {
			new Notice("Set your API Key in Sherlockeye Settings!");
			statusBar.remove();
			return;
		}

		try {
			statusBar.setText("Searching...");

			const additional_modules = this.settings?.deepSearch
				? ["digital_accounts_expansion"]
				: [];
			const type = this.detectSearchType(identifier);
			const data = {
				type: type,
				value: identifier,
				additional_modules: additional_modules,
			};
			const response = await fetch(
				"https://api.sherlockeye.io/v1/searches",
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${this.settings.apiToken}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify(data),
				},
			);

			if (!response.ok) {
				new Notice("Error starting search!");
				statusBar.remove();
				return;
			}

			const initialData = await response.json();
			if (!initialData.success) {
				new Notice("Search failed!");
				statusBar.remove();
				return;
			}

			const searchId = initialData.data.searchId;
			let lastCount = 0;
			let completed = false;

			while (!completed) {
				const pollResponse = await fetch(
					`https://api.sherlockeye.io/v1/searches/${searchId}`,
					{
						headers: {
							Authorization: `Bearer ${this.settings.apiToken}`,
						},
					},
				);
				const pollData = await pollResponse.json();

				if (pollData.success && pollData.data.results) {
					if (pollData.data.results.length > lastCount) {
						const newResults =
							pollData.data.results.slice(lastCount);
						await this.processResults(identifier, newResults);
						lastCount = pollData.data.results.length;
					}

					statusBar.setText(
						`Searching... ${pollData.data.progress}%`,
					);

					if (pollData.data.status === "complete") {
						completed = true;
						statusBar.setText(`Found ${lastCount} results`);
					}
				}

				if (!completed) {
					await new Promise((r) => setTimeout(r, 2000));
				}
			}

			statusBar.remove();
		} catch (err) {
			new Notice("Error using Sherlockeye API!");
			console.log(err);
			statusBar.remove();
		}
	}

	private async processResults(identifier: string, results: any[]) {
		const identifiers = new Set<string>();
		const relevantAttributes = [
			"name",
			"full_name",
			"legal_name",
			"email",
			"phone",
		];

		results.forEach((result) => {
			relevantAttributes.forEach((attrib) => {
				if (result.attributes[attrib]) {
					if (identifier != result.attributes[attrib]) {
						console.log(result.attributes[attrib]);
						identifiers.add(result.attributes[attrib]);
					}
				}
			});
		});

		for (const i of identifiers) {
			const content = `Found via search for [[${identifier}]] in Sherlockeye`;
			await this.app.vault.create(`${i}.md`, content);
		}
	}

	private detectSearchType(identifier: string): string {
		if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
			return "email";
		}

		if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/.test(identifier)) {
			return "cpf";
		}

		if (/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/.test(identifier)) {
			return "cnpj";
		}

		if (/^\+?[\d\s\-\(\)]{10,}$/.test(identifier)) {
			return "phone";
		}

		if (
			/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/.test(
				identifier,
			)
		) {
			return "domain";
		}

		if (/^(\d{1,3}\.){3}\d{1,3}$/.test(identifier)) {
			return "ip";
		}

		if (/^[a-zA-Z0-9._-]+$/.test(identifier) && !identifier.includes(" ")) {
			return "username";
		}

		return "name";
	}
}
