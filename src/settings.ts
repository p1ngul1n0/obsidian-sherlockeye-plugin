import { App, PluginSettingTab, Setting } from "obsidian";
import SherlockeyePlugin from "./main";

export interface SherlockeyeSettings {
	apiToken: string;
}

export const DEFAULT_SETTINGS: SherlockeyeSettings = {
	apiToken: "",
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
			.setDesc("Put your Sherlockeye API Key here")
			.addText((text) =>
				text
					.setValue(this.plugin.settings?.apiToken)
					.onChange(async (value) => {
						this.plugin.settings.apiToken = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
