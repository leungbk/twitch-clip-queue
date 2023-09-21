import youtubeApi from '../../../../common/apis/youtubeApi';
import type { Clip } from '../../clipQueueSlice';
import type { ClipProvider } from '../providers';

class YoutubeProvider implements ClipProvider {
  name = 'youtube';

  getIdFromUrl(url: string): string | undefined {
    let uri: URL;
    try {
      uri = new URL(url);
    } catch {
      return undefined;
    }

    let id: string | undefined = undefined;
    if (uri.hostname === 'youtu.be' || uri.pathname.includes('shorts')) {
      const idStart = uri.pathname.lastIndexOf('/') + 1;
      id = uri.pathname.slice(idStart).split('?')[0];
    } else if (uri.hostname.endsWith('youtube.com')) {
      id = uri.searchParams.get('v') ?? undefined;
    }

    if (!id) {
      return undefined;
    }

    const startTime = uri.searchParams.get('t') ?? undefined;

    if (startTime) {
      const chunks = startTime.split(/([hms])/).filter(chunk => chunk !== '');
      const magnitudes = chunks.filter(chunk => chunk.match(/[0-9]+/)).map(chunk => parseInt(chunk));
      const TIME_UNITS = ['h', 'm', 's'];
      const seen_units = chunks.filter(chunk => TIME_UNITS.includes(chunk));

      if (chunks.length === 1) {
        return `${id};${chunks[0]}`;
      } else {
        const normalizedStartTime = magnitudes.reduce((accum, magnitude, index) => {
          let conversion_factor = 0;

          if (seen_units[index] === 'h') {
            conversion_factor = 3600;
          } else if (seen_units[index] === 'm') {
            conversion_factor = 60;
          } else if (seen_units[index] === 's') {
            conversion_factor = 1;
          }

          return accum + magnitude * conversion_factor;
        }, 0);

        return `${id};${normalizedStartTime}`;
      }
    } else {
      return id;
    }
  }

  async getClipById(id: string): Promise<Clip | undefined> {
    if (!id) {
      return undefined;
    }

    const [idPart] = id.split(';');

    const clipInfo = await youtubeApi.getClip(idPart);

    if (!clipInfo) {
      return undefined;
    }

    return {
      id: idPart,
      title: clipInfo.title,
      author: clipInfo.author_name,
      thumbnailUrl: clipInfo.thumbnail_url,
      submitters: [],
    };
  }

  getUrl(id: string): string | undefined {
    const [idPart, startTime = ''] = id.split(';');
    return `https://youtu.be/${idPart}?t=${startTime}`;
  }

  getEmbedUrl(id: string): string | undefined {
    const [idPart, startTime = ''] = id.split(';');
    return `https://www.youtube.com/embed/${idPart}?autoplay=1&start=${startTime}`;
  }

  getAutoplayUrl(id: string, clip: Clip): string | undefined {
    return this.getUrl(id);
  }
}

const youtubeProvider = new YoutubeProvider();

export default youtubeProvider;
