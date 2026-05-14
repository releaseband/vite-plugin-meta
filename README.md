# @releaseband/vite-plugin-meta

Плагин для Vite, который готовит ассеты игры к сборке и пишет небольшой `meta.json` для рантайма.

Если коротко: в `public` лежат исходные ассеты, а плагин на build делает из них более подходящие для браузера форматы, кладет результат в `dist` и описывает доступные форматы в `meta.json`.

## Что Делает

- Картинки `.png`, `.jpg`, `.jpeg` конвертирует в `.png`, `.webp`, `.avif`.
- Звуки `.wav` конвертирует в `.m4a`, `.mp3`, `.ogg`.
- GIF-анимации `.gif` конвертирует в `.gif`, `.webp`, `.avif`.
- Видео `.mp4` конвертирует в `.mp4` и `.av1.mp4`.
- Считает длительность аудио и записывает ее в `meta.json`.
- Кеширует результат конвертации в `resourceCache`, чтобы не пережимать неизмененные файлы каждый раз.
- Удаляет старые сконвертированные файлы из кеша, если исходник был удален.

В dev-режиме плагин не пережимает ассеты, а только пишет временный `public/meta.json` под оригинальные форматы. В build-режиме он конвертирует ассеты и кладет оптимизированные файлы в output сборки.

## Подключение

```ts
import metaPlugin from '@releaseband/vite-plugin-meta';

export default {
  plugins: [
    metaPlugin({
      version: '1.0.0',
      fileChangeLog: true,
    }),
  ],
};
```

## CLI

Можно запускать конвертацию отдельно, без Vite build:

```bash
file-convert --publicDir public --storageDir resourceCache
```

Это удобно, когда нужно заранее подготовить кеш или быстро проверить, во что превратятся ассеты.

## Основные Параметры

| Параметр | Тип | Значение по умолчанию | Описание |
| --- | --- | --- | --- |
| `version` | `string` | `process.env.GAME_VERSION` или `0.0.0` | Версия игры, которая попадет в `meta.json`. |
| `metaConfigName` | `string` | `meta.json` | Имя metadata-файла. |
| `hashConfigName` | `string` | `files-hash.json` | Имя файла с хешами для кеша конвертации. |
| `storageDir` | `string` | `resourceCache` | Папка, где хранится кеш сконвертированных ассетов. |
| `exclude` | `string[]` | `[]` | Список файлов из `public`, которые нужно пропустить. Пути указываются относительно `public`. |
| `losslessImages` | `string[]` | `undefined` | Паттерны путей для картинок, которые нужно сжимать без потерь. |
| `convert` | `boolean` | `true` | Только для Vite-плагина. Включает конвертацию на build. |
| `audioDuration` | `boolean` | `true` | Только для Vite-плагина. Включает подсчет длительности аудио. |
| `selectFilesLog` | `boolean` | `false` | Логирует найденные файлы. |
| `filesHashLog` | `boolean` | `false` | Логирует сохраненные хеши файлов. |
| `convertLog` | `boolean` | `false` | Логирует проверки хешей перед конвертацией. |
| `optionLog` | `boolean` | `false` | Логирует итоговые параметры плагина. |
| `publicLog` | `boolean` | `false` | Логирует путь к public-директории. |
| `fileChangeLog` | `boolean` | `false` | Логирует добавленные и удаленные файлы. |

## Оптимизация Аудио

Аудио-настройки необязательные. Если их не передавать, плагин будет работать как раньше:

```ts
metaPlugin({
  audioOptimization: {
    sampleRate: 44100,
    channels: 2,
    mp3Quality: 6,
    oggQuality: 2,
    m4aBitrate: '96k',
    m4aVbrQuality: undefined,
  },
});
```

| Параметр | Диапазон | По умолчанию | Как влияет |
| --- | --- | --- | --- |
| `sampleRate` | положительное число; обычно `22050`, `32000`, `44100`, `48000` | `44100` | Чем ниже значение, тем меньше файл, но хуже детализация. |
| `channels` | положительное число; обычно `1` или `2` | `2` | `1` делает mono и уменьшает размер. `2` сохраняет stereo. |
| `mp3Quality` | `0..9` | `6` | VBR-качество MP3. Меньше число = лучше качество и больше размер. Больше число = сильнее сжатие. |
| `oggQuality` | `-1..10` | `2` | Качество Vorbis. Меньше число = меньше размер. Больше число = лучше качество. |
| `m4aBitrate` | строка bitrate для ffmpeg: `48k`, `64k`, `96k`, `128k` и т.п. | `96k` | Чем ниже bitrate, тем меньше файл. |
| `m4aVbrQuality` | число для ffmpeg `-q:a` | `undefined` | Включает VBR для M4A/AAC. Если задано, используется вместо `m4aBitrate`. |

### Balanced Preset

Для игровых ассетов обычно лучше не начинать с агрессивного сжатия. Хороший безопасный старт:

```ts
metaPlugin({
  audioOptimization: {
    sampleRate: 44100,
    channels: 2,
    mp3Quality: 5,
    oggQuality: 3,
    m4aBitrate: '128k',
  },
});
```

Этот пресет сохраняет stereo и `44100 Hz`, но все равно заметно уменьшает размер файлов. На тестовом MP3-файле результат был примерно такой:

| Вариант | Размер | Экономия |
| --- | ---: | ---: |
| Оригинал MP3 192 kb/s | 4.66 MB | - |
| MP3 `-aq 5` | 2.79 MB | 40.2% |
| M4A `128k` | 3.18 MB | 31.8% |
| OGG `-aq 3` | 2.43 MB | 47.8% |

Важно: если исходник уже `.mp3`, повторная конвертация будет lossy -> lossy. Для реальных ассетов лучше хранить исходники в `.wav` и уже из них получать `.mp3`, `.ogg`, `.m4a`.

CLI-эквивалент:

```bash
file-convert \
  --publicDir public \
  --storageDir resourceCache \
  --audioSampleRate 44100 \
  --audioChannels 2 \
  --mp3Quality 5 \
  --oggQuality 3 \
  --m4aBitrate 128k
```

Для M4A можно включить VBR вместо фиксированного bitrate:

```bash
file-convert \
  --publicDir public \
  --storageDir resourceCache \
  --m4aVbrQuality 2
```

## Пример meta.json

Production `meta.json` выглядит примерно так:

```json
{
  "prod": true,
  "gameVersion": "1.0.0",
  "textures": { "formats": [".avif", ".png", ".webp"] },
  "sounds": {
    "formats": [".m4a", ".mp3", ".ogg"],
    "trackDuration": {}
  },
  "video": { "codecs": ["h264", "av1"] }
}
```

Клиент может читать этот файл и понимать, какие форматы ассетов доступны в текущей сборке.
