import type { AppTab } from '../types';
import { NoirSearchGlyph } from './NoirSearchGlyph';
import { useNavIconSet } from './NoirNavIcons';
import { strings } from '../../../constants/strings';

type NoirTabBarProps = {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  /** An artist/mix page covers the tab: nothing reads as active (same rule as the sidebar). */
  detailOverlayOpen?: boolean;
};

/** Phone navigation (< 640 px): the sidebar's places as a bottom bar. Search stays an action. */
export function NoirTabBar({ activeTab, onTabChange, detailOverlayOpen = false }: NoirTabBarProps) {
  const { Home, Discover, Library } = useNavIconSet();
  const items = [
    { id: 'search' as const, label: 'Home', Icon: Home },
    { id: 'discover' as const, label: 'Discover', Icon: Discover },
    { id: 'myhub' as const, label: 'Library', Icon: Library },
  ];

  return (
    <nav className="noir-tabbar" aria-label="Main navigation">
      {items.slice(0, 1).map(({ id, label, Icon }) => {
        const active = activeTab === id && !detailOverlayOpen;
        return (
          <button
            key={id}
            type="button"
            className="noir-tabbar-item elva-focus-ring"
            data-active={active ? 'true' : 'false'}
            aria-current={active ? 'page' : undefined}
            onClick={() => onTabChange(id)}
          >
            <Icon size={20} strokeWidth={active ? 2.1 : 1.65} />
            <span>{label}</span>
          </button>
        );
      })}
      <button
        type="button"
        className="noir-tabbar-item elva-focus-ring"
        data-active="false"
        onClick={() => window.dispatchEvent(new Event('elva-open-search-palette'))}
      >
        <NoirSearchGlyph size={20} />
        <span>{strings.search.navLabel}</span>
      </button>
      {items.slice(1).map(({ id, label, Icon }) => {
        const active = activeTab === id && !detailOverlayOpen;
        return (
          <button
            key={id}
            type="button"
            className="noir-tabbar-item elva-focus-ring"
            data-active={active ? 'true' : 'false'}
            aria-current={active ? 'page' : undefined}
            onClick={() => onTabChange(id)}
          >
            <Icon size={20} strokeWidth={active ? 2.1 : 1.65} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
