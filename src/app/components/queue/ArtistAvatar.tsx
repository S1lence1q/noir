import { useState, useEffect } from 'react';
import { getHandPickedImage } from '../../utils/apiUtils';
import { getArtistImage } from '../../services/musicGraph';

export function ArtistAvatar({ name, fallbackThumbnail }: { name: string; fallbackThumbnail: string }) {
  const handPicked = getHandPickedImage(name);
  const [imgUrl, setImgUrl] = useState(handPicked || fallbackThumbnail);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (handPicked) {
      setImgUrl(handPicked);
      return;
    }
    let active = true;
    const fetchRealImg = async () => {
      try {
        const cached = localStorage.getItem(`elva_artist_img_${name.toLowerCase()}`);
        if (cached) {
          if (active) setImgUrl(cached);
          return;
        }

        const url = await getArtistImage(name);
        if (url && active) {
          setImgUrl(url);
          localStorage.setItem(`elva_artist_img_${name.toLowerCase()}`, url);
          window.dispatchEvent(new CustomEvent('elva-artist-image-loaded', { detail: { name, url } }));
        }
      } catch {
        // silent fallback
      }
    };

    fetchRealImg();
    return () => {
      active = false;
    };
  }, [name, fallbackThumbnail, handPicked]);

  return (
    <img
      src={imgUrl}
      alt={name}
      onLoad={() => setLoaded(true)}
      className="w-full h-full object-cover rounded-full transition-opacity duration-300"
      style={{ opacity: loaded ? 1 : 0 }}
    />
  );
}
