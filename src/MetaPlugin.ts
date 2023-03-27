/* eslint-disable import/no-extraneous-dependencies */
import { getAudioDurationInSeconds } from 'get-audio-duration';
import path from 'node:path';

import {
  createSoundsConfig,
  createTexturesConfig,
  Ext,
  getBasePath,
  getFilesPaths,
  imageConvert,
  makeTempFile,
  removeFile,
  soundConvert,
  writeConfig,
} from './processes';

// https://sound.stackexchange.com/questions/42711/what-is-the-difference-between-vorbis-and-opus
// https://slhck.info/video/2017/02/24/vbr-settings.html
// https://tritondigitalcommunity.force.com/s/article/Choosing-Audio-Bitrate-Settings?language=en_US
const formats = {
  '.mp3': ['-f', 'mp3', '-aq', '6'],
  '.ogg': ['-acodec', 'libvorbis', '-f', 'ogg', '-aq', '2'],
  '.m4a': ['-ab', '96k', '-strict', '-2'],
};
const imagesExt: ReadonlyArray<string> = [Ext.png, Ext.jpg, Ext.jpeg];
const soundsExt: ReadonlyArray<string> = [Ext.wav];

function fileLog(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log('\t - ', ...args);
}

export default class MetaPlugin {
  private configPath?: string;

  private imagesFiles = new Array<string>();

  private soundsFiles = new Array<string>();

  private trackDuration: Record<string, number> = {};

  constructor(public readonly metaConfigName: string, private readonly version: string) {}

  public selectFiles(dir: string): void {
    getFilesPaths(dir).forEach((file) => {
      const extname = path.extname(file).toLowerCase();
      if (imagesExt.includes(extname)) this.imagesFiles.push(file);
      else if (soundsExt.includes(extname)) this.soundsFiles.push(file);
    });
  }

  public async audioDurationProcess(): Promise<void> {
    const jobs = this.soundsFiles.map(async (soundPath) => {
      try {
        const audioDuration = await getAudioDurationInSeconds(soundPath);
        this.trackDuration[getBasePath(soundPath)] = audioDuration;
      } catch (err) {
        throw new Error(`audioDurationProcess ${soundPath} failed: \n${String(err)}`);
      }
    });
    await Promise.all(jobs);
  }

  public async imagesConversionProcess(): Promise<void> {
    const jobs = this.imagesFiles.map(async (imagePath) => {
      try {
        const tempFileName = await makeTempFile(imagePath);
        await imageConvert(tempFileName);
        await removeFile(tempFileName);
        fileLog(imagePath);
      } catch (err) {
        throw new Error(`imagesConversionProcess failed: \n${String(err)}`);
      }
    });
    await Promise.all(jobs);
  }

  public async soundsConversionProcess(): Promise<void> {
    const jobs = this.soundsFiles.map(async (soundPath) => {
      try {
        await soundConvert(soundPath, formats);
        fileLog(soundPath);
      } catch (err) {
        throw new Error(`imagesConversionProcess failed: \n${String(err)}`);
      }
    });
    await Promise.all(jobs);
  }

  public async writeConfig(prod: boolean, dir: string): Promise<void> {
    const jobs = [this.removeConfig()];
    if (prod) {
      jobs.push(...this.soundsFiles.map((soundPath) => removeFile(soundPath)));
    }
    await Promise.all(jobs);

    const metaConfig = {
      prod,
      gameVersion: this.version,
      textures: createTexturesConfig(),
      sounds: createSoundsConfig(this.trackDuration),
    };
    this.configPath = path.join(dir, this.metaConfigName);
    await writeConfig(this.configPath, metaConfig);
  }

  public async removeConfig(): Promise<void> {
    if (!this.configPath) return;
    await removeFile(this.configPath);
    this.imagesFiles = new Array<string>();
    this.soundsFiles = new Array<string>();
  }
}
