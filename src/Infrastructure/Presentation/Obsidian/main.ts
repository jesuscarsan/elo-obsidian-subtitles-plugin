import { Plugin } from 'obsidian';
import { SubtitlesSettings, DEFAULT_SETTINGS } from './settings';
import { SubtitlesSettingsView } from './SubtitlesSettingsView';
import { OpenSubtitlesAdapter } from '../../Adapters/OpenSubtitles/OpenSubtitlesAdapter';
import { DownloadSubtitlesUseCase } from '../../../Application/UseCases/DownloadSubtitlesUseCase';
import {
	ObsidianEditorAdapter,
	ObsidianNotificationAdapter,
	ObsidianNoteRepository,
	ObsidianTranslationAdapter,
	TranslationService,
} from '@elo/obsidian-plugin';
import en from '../../../I18n/locales/en';
import es from '../../../I18n/locales/es';

export default class SubtitlesPlugin extends Plugin {
	settings: SubtitlesSettings = DEFAULT_SETTINGS;
	public translationService!: TranslationService;

	async onload() {
		await this.loadSettings();

		// --- I18n ---
		this.translationService = new ObsidianTranslationAdapter({ en, es });

		this.addSettingTab(new SubtitlesSettingsView(this.app, this));

		const subtitlesAdapter = new OpenSubtitlesAdapter({
			apiKey: this.settings.openSubtitlesApiKey,
			username: this.settings.openSubtitlesUsername,
			password: this.settings.openSubtitlesPassword,
		});

		const noteRepository = new ObsidianNoteRepository(this.app);
		const notificationAdapter = new ObsidianNotificationAdapter(this.translationService);

		this.addCommand({
			id: 'elo-download-subtitles',
			name: this.translationService.t('command.downloadSubtitles'),
			editorCallback: async (_editor, view) => {
				const editorAdapter = new ObsidianEditorAdapter(view as import('obsidian').MarkdownView);
				const downloadSubtitlesUseCase = new DownloadSubtitlesUseCase(
					subtitlesAdapter,
					noteRepository,
					editorAdapter,
					notificationAdapter,
				);
				await downloadSubtitlesUseCase.execute();
			},
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
