declare module 'ffprobe' {
	export type FfprobeOptions = {
		readonly path: string;
	};

	export type FileInfo = {
		/** Длительность в миллисекундах */
		readonly duration?: string;
		/** Количество фреймов в анимации */
		readonly nb_frames?: string;
	};

	export type FfprobeResponse = {
		readonly streams: ReadonlyArray<FileInfo>;
	};

	export default function ffprobe(path: string, options: FfprobeOptions): Promise<FfprobeResponse>;
}
