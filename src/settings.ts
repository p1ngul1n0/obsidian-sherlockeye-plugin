import { App, PluginSettingTab, Setting } from "obsidian";
import SherlockeyePlugin from "./main";

export interface SherlockeyeSettings {
	apiToken: string;
	deepSearch: boolean;
}

export const DEFAULT_SETTINGS: SherlockeyeSettings = {
	apiToken: "",
	deepSearch: true,
};

export class SherlockeyeSettingTab extends PluginSettingTab {
	plugin: SherlockeyePlugin;

	constructor(app: App, plugin: SherlockeyePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("API Key")
			.setDesc(
				createFragment((frag) => {
					frag.appendText("Get your API key at ");
					frag.createEl("a", {
						text: "sherlockeye.io",
						href: "https://sherlockeye.io/?utm_source=obsidian.md",
					});
				}),
			)
			.addText((text) => {
				text.inputEl.type = "password";
				text.setValue(this.plugin.settings?.apiToken).onChange(
					async (value) => {
						this.plugin.settings.apiToken = value;
						await this.plugin.saveSettings();
					},
				);
			});

		new Setting(containerEl)
			.setName("Deep Search")
			.setDesc("Enable deep search mode")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings?.deepSearch ?? true)
					.onChange(async (value) => {
						this.plugin.settings.deepSearch = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
