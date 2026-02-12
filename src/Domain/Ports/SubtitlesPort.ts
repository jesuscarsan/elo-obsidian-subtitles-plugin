export interface SubtitleFile {
	file_id: number;
	file_name: string;
}

export interface Subtitle {
	id: string;
	attributes: {
		language: string;
		format: string;
		url: string;
		files: SubtitleFile[];
	};
}

export interface SubtitlesPort {
	search(query: string, season: number, episode: number): Promise<Subtitle[]>;
	download(fileId: number): Promise<string>;
}
