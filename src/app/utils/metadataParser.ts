import localFallbackArtwork from '../../assets/noir/atmosphere-warm.jpeg';

export interface LocalMetadata {
  title: string;
  artist: string;
  artworkUrl: string;
}

/**
 * Parses ID3v2 tags (TIT2, TPE1, APIC) from a local audio File.
 * Falls back to filename and Unsplash cover if parsing fails.
 */
export async function parseLocalMetadata(file: File): Promise<LocalMetadata> {
  const defaultArtwork = localFallbackArtwork;
  
  const defaultMeta: LocalMetadata = {
    title: file.name.replace(/\.[^/.]+$/, ''),
    artist: 'Unknown Artist',
    artworkUrl: defaultArtwork
  };

  try {
    // Read up to first 3MB of the file which safely contains all ID3 tag frames
    const headerBuffer = await readFileHeader(file, 3 * 1024 * 1024);
    const view = new DataView(headerBuffer);
    
    if (headerBuffer.byteLength < 10) return defaultMeta;
    
    // Check for 'ID3' magic bytes
    const isId3 = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2)) === 'ID3';
    if (!isId3) return defaultMeta;

    const version = view.getUint8(3); // 3 = v2.3, 4 = v2.4
    
    // Syncsafe tag size (4 bytes, 7 bits per byte)
    const sizeBytes = [view.getUint8(6), view.getUint8(7), view.getUint8(8), view.getUint8(9)];
    const tagSize = (sizeBytes[0] << 21) | (sizeBytes[1] << 14) | (sizeBytes[2] << 7) | sizeBytes[3];

    let offset = 10;
    const limit = Math.min(tagSize + 10, headerBuffer.byteLength);
    
    let title = '';
    let artist = '';
    let artworkUrl = '';

    while (offset + 10 < limit) {
      const frameId = String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3)
      );

      // Frame size (4 bytes)
      let frameSize = 0;
      if (version === 4) {
        // ID3v2.4 uses syncsafe integer for frame size (7 bits per byte)
        frameSize = (view.getUint8(offset + 4) << 21) |
                    (view.getUint8(offset + 5) << 14) |
                    (view.getUint8(offset + 6) << 7) |
                    view.getUint8(offset + 7);
      } else {
        // ID3v2.3 uses regular 32-bit big-endian integer
        frameSize = view.getUint32(offset + 4);
      }

      // Safeguard against corrupted sizes or infinite loops
      if (frameSize <= 0 || offset + 10 + frameSize > limit) break;

      const contentOffset = offset + 10;

      if (frameId === 'TIT2') {
        title = decodeTextFrame(view, contentOffset, frameSize);
      } else if (frameId === 'TPE1') {
        artist = decodeTextFrame(view, contentOffset, frameSize);
      } else if (frameId === 'APIC') {
        artworkUrl = decodeApicFrame(headerBuffer, contentOffset, frameSize);
      }

      offset += 10 + frameSize;
    }

    return {
      title: title.trim() || defaultMeta.title,
      artist: artist.trim() || defaultMeta.artist,
      artworkUrl: artworkUrl || defaultMeta.artworkUrl
    };
  } catch (e) {
    console.warn('Failed to parse ID3 tags from file:', e);
    return defaultMeta;
  }
}

function readFileHeader(file: File, bytes: number): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file.slice(0, bytes));
  });
}

function decodeTextFrame(view: DataView, offset: number, size: number): string {
  if (size <= 1) return '';
  const encoding = view.getUint8(offset);
  const data = new Uint8Array(view.buffer, view.byteOffset + offset + 1, size - 1);
  return decodeString(data, encoding);
}

function decodeString(data: Uint8Array, encoding: number): string {
  try {
    if (encoding === 0) {
      return new TextDecoder('iso-8859-1').decode(data);
    } else if (encoding === 1) {
      return new TextDecoder('utf-16').decode(data);
    } else if (encoding === 2) {
      return new TextDecoder('utf-16be').decode(data);
    } else if (encoding === 3) {
      return new TextDecoder('utf-8').decode(data);
    }
    return new TextDecoder('utf-8').decode(data);
  } catch {
    return '';
  }
}

function decodeApicFrame(buffer: ArrayBuffer, offset: number, size: number): string {
  try {
    const view = new DataView(buffer, offset, size);
    if (size <= 5) return '';
    
    const encoding = view.getUint8(0);
    
    // Find MIME type (null terminated ASCII string)
    let mimeTypeOffset = 1;
    while (mimeTypeOffset < size && view.getUint8(mimeTypeOffset) !== 0) {
      mimeTypeOffset++;
    }
    const mimeType = new TextDecoder('ascii').decode(new Uint8Array(buffer, offset + 1, mimeTypeOffset - 1));
    
    // Description is after picture type (1 byte)
    let descOffset = mimeTypeOffset + 2;
    
    if (encoding === 1 || encoding === 2) {
      // UTF-16 description (ends with double 0x00)
      while (descOffset + 1 < size && !(view.getUint8(descOffset) === 0 && view.getUint8(descOffset + 1) === 0)) {
        descOffset += 2;
      }
      descOffset += 2;
    } else {
      // ASCII/UTF-8 description (ends with single 0x00)
      while (descOffset < size && view.getUint8(descOffset) !== 0) {
        descOffset++;
      }
      descOffset += 1;
    }

    if (descOffset >= size) return '';

    // Slice raw picture data
    const imgData = new Uint8Array(buffer, offset + descOffset, size - descOffset);
    const blob = new Blob([imgData], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.warn('Failed to parse APIC cover art frame:', e);
    return '';
  }
}
