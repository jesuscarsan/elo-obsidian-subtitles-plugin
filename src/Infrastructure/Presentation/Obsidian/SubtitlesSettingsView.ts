import { App, PluginSettingTab, Setting, TextComponent } from 'obsidian';
import type SubtitlesPlugin from './main';

export class SubtitlesSettingsView extends PluginSettingTab {
	plugin: SubtitlesPlugin;

	constructor(app: App, plugin: SubtitlesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Elocuency Subtitles Settings' });

		containerEl.createEl('h3', { text: 'OpenSubtitles' });

		new Setting(containerEl)
			.setName('API Key')
			.setDesc('Consumer Key from OpenSubtitles.com API.')
			.addText((text: TextComponent) => {
				text
					.setPlaceholder('API Key')
					.setValue(this.plugin.settings.openSubtitlesApiKey)
					.onChange(async (value: string) => {
						this.plugin.settings.openSubtitlesApiKey = value.trim();
						await this.plugin.saveSettings();
					});
				text.inputEl.type = 'password';
			});

		new Setting(containerEl)
			.setName('Username')
			.setDesc('OpenSubtitles.com Username.')
			.addText((text: TextComponent) => {
				text
					.setPlaceholder('Username')
					.setValue(this.plugin.settings.openSubtitlesUsername)
					.onChange(async (value: string) => {
						this.plugin.settings.openSubtitlesUsername = value.trim();
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Password')
			.setDesc('OpenSubtitles.com Password.')
			.addText((text: TextComponent) => {
				text
					.setPlaceholder('Password')
					.setValue(this.plugin.settings.openSubtitlesPassword)
					.onChange(async (value: string) => {
						this.plugin.settings.openSubtitlesPassword = value.trim();
						await this.plugin.saveSettings();
					});
				text.inputEl.type = 'password';
			});
	}
}
