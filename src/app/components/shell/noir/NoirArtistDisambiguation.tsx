import type { ArtistIdentity } from '../../../services/artistIdentity';
import { strings } from '../../../constants/strings';

type NoirArtistDisambiguationProps = {
  queryName: string;
  candidates: ArtistIdentity[];
  onPick: (candidate: ArtistIdentity) => void;
};

export function NoirArtistDisambiguation({
  queryName,
  candidates,
  onPick,
}: NoirArtistDisambiguationProps) {
  return (
    <div className="flex w-full flex-col px-1 pb-8 pt-2">
      <p className="noir-section-title mb-1">{strings.artist.whichArtist}</p>
      <p className="mb-6 text-[14px] text-[color:var(--noir-text-secondary)]">
        {strings.artist.whichArtistHint}
        {queryName ? (
          <>
            {' '}
            (&ldquo;{queryName}&rdquo;)
          </>
        ) : null}
      </p>
      <div className="flex flex-col gap-1">
        {candidates.map((candidate) => (
          <button
            key={`${candidate.deezerId ?? candidate.canonicalName}-${candidate.mbid ?? ''}`}
            type="button"
            onClick={() => onPick(candidate)}
            className="noir-track-row flex w-full items-center gap-4 px-3 py-3 text-left noir-focus-ring"
          >
            {candidate.image ? (
              <img
                src={candidate.image}
                alt=""
                className="noir-art h-14 w-14 shrink-0 object-cover"
              />
            ) : (
              <div className="noir-art h-14 w-14 shrink-0 bg-white/[0.06]" />
            )}
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium text-[color:var(--noir-text-primary)]">
                {candidate.canonicalName}
              </p>
              <p className="truncate text-[13px] text-[color:var(--noir-text-secondary)]">
                {candidate.disambiguation ||
                  candidate.country ||
                  (candidate.deezerId != null ? 'Artist' : 'Artist')}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
