import { SubtitlesPort } from '../../Domain/Ports/SubtitlesPort';
import { EditorPort, NotificationPort, NoteRepository } from '@elo/obsidian-plugin';

export class DownloadSubtitlesUseCase {
	constructor(
		private subtitlesPort: SubtitlesPort,
		private noteRepository: NoteRepository,
		private editor: EditorPort,
		private notification: NotificationPort,
	) {}

	async execute(): Promise<void> {
		const activeFilePath = this.editor.getNotePath();
		if (!activeFilePath) {
			this.notification.showMessage('subtitles.noActiveFile');
			return;
		}

		const metadata = await this.noteRepository.getNoteMetadata(activeFilePath);
		const frontmatter = metadata?.frontmatter;
		if (!frontmatter) {
			this.notification.showMessage('subtitles.noFrontmatter');
			return;
		}

		const serie = frontmatter['Serie'];
		const season = frontmatter['Temporada'];
		const episode = frontmatter['Capitulo'];

		if (!serie || !season || !episode) {
			this.notification.showMessage('subtitles.missingFields');
			return;
		}

		this.notification.showMessage('subtitles.searching', { serie, season, episode });

		try {
			const results = await this.subtitlesPort.search(serie, Number(season), Number(episode));

			if (results.length === 0) {
				this.notification.showMessage('subtitles.noSubtitlesFound');
				return;
			}

			const bestMatch = results[0];

			if (!bestMatch.attributes.files || bestMatch.attributes.files.length === 0) {
				this.notification.showMessage('subtitles.noFiles');
				return;
			}

			const fileId = bestMatch.attributes.files[0].file_id;

			this.notification.showMessage('subtitles.downloading');
			const subtitleContent = await this.subtitlesPort.download(fileId);

			const currentContent = await this.editor.getValue();
			const newContent = currentContent + '\n\n## Subtitles\n\n' + subtitleContent;
			await this.editor.setValue(newContent);

			this.notification.showMessage('subtitles.success');
		} catch (error) {
			console.error(error);
			this.notification.showMessage('subtitles.error');
		}
	}
}
