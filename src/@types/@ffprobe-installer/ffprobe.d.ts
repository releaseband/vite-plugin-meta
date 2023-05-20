declare module 'ffprobe' {
	export type FfprobeOptions = {
		readonly path: string;
	};

	export type FfprobeStream = {
		readonly duration?: string;
	};

	export type FfprobeResponse = {
		readonly streams: ReadonlyArray<FfprobeStream>;
	};

	export default function ffprobe(path: string, options: FfprobeOptions): Promise<FfprobeResponse>;
}
