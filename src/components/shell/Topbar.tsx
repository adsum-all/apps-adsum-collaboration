interface TopbarProps {
  crumb: string;
  title: string;
  onSearch?: (q: string) => void;
  onOpenSearch?: () => void;
  right?: JSX.Element;
}

export function Topbar({ crumb, title, onSearch, onOpenSearch, right }: TopbarProps): JSX.Element {
  return (
    <header className="topbar-app">
      <div className="topbar-title">
        <p className="topbar-crumb">{crumb}</p>
        <h1 className="topbar-h1">{title}</h1>
      </div>
      <button
        type="button"
        className="search-global search-global-btn"
        onClick={() => onOpenSearch?.()}
        aria-label="Ouvrir la recherche globale"
      >
        <span className="search-ico" aria-hidden="true">⌕</span>
        <span className="search-placeholder">Rechercher un espace, un tableau, une carte</span>
        <kbd className="kbd kbd-sm">Ctrl K</kbd>
      </button>
      {onSearch ? <span hidden aria-hidden="true">{/* onSearch reserved */}</span> : null}
      {right}
    </header>
  );
}

