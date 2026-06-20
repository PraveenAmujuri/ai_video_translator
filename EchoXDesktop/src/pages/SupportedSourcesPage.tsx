import { useState, useMemo } from "react";
import {
  TOP_PLATFORMS,
  SITE_DIRECTORY,
  CATEGORY_LABELS,
  type PlatformCategory,
} from "../lib/source-registry";
import {
  PlatformIcon,
  GlobalIcon,
  SearchIcon,
  FilterIcon,
} from "../assets/platform-icons";

const ALL_CATEGORY = "__all__" as const;
type CategoryFilter = PlatformCategory | typeof ALL_CATEGORY;

export function SupportedSourcesPage() {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(ALL_CATEGORY);

  const filteredSites = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SITE_DIRECTORY.filter((site) => {
      const matchesQuery = !q || site.name.toLowerCase().includes(q);
      const matchesCategory =
        categoryFilter === ALL_CATEGORY || site.category === categoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [query, categoryFilter]);

  const allCategories = useMemo((): PlatformCategory[] => {
    const seen = new Set<PlatformCategory>();
    SITE_DIRECTORY.forEach((s) => seen.add(s.category));
    return Array.from(seen).sort();
  }, []);

  const stats = useMemo(
    () => [
      {
        value: String(SITE_DIRECTORY.length),
        label: "Catalogued sites",
        sub: "Tracked in this build",
      },
      {
        value: String(allCategories.length),
        label: "Platform categories",
        sub: "Used for filtering",
      },
      {
        value: String(TOP_PLATFORMS.length),
        label: "Featured platforms",
        sub: "Native URL detection",
      },
    ],
    [allCategories.length],
  );

  return (
    <div className="sources-page">
      <div className="sources-hero">
        <span className="sources-badge">
          <GlobalIcon size={14} />
          yt-dlp catalogue
        </span>
        <h1 className="sources-headline">Sources</h1>
        <p className="sources-sub">
          EchoX accepts any URL that yt-dlp can resolve. Paste a link in the
          Online URL tab and the desktop shell handles the download. The list
          below tracks the entries this build recognises by name.
        </p>
      </div>

      <div className="sources-stats">
        {stats.map(({ value, label, sub }) => (
          <div key={label} className="stat-card">
            <span className="stat-value">{value}</span>
            <span className="stat-label">{label}</span>
            <span className="stat-sub">{sub}</span>
          </div>
        ))}
      </div>

      <section className="sources-section" aria-label="Featured platforms">
        <div className="section-header">
          <h2 className="section-title">Featured platforms</h2>
          <span className="section-sub">URL detected as you type</span>
        </div>
        <div className="platform-grid">
          {TOP_PLATFORMS.map((platform) => (
            <div key={platform.id} className="platform-card">
              <div className="platform-card-icon">
                <PlatformIcon type={platform.iconType} size={28} />
              </div>
              <div className="platform-card-body">
                <span className="platform-card-name">{platform.name}</span>
                <span className="platform-card-tag">{platform.tagline}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="sources-section" aria-label="Site directory">
        <div className="section-header">
          <h2 className="section-title">Site directory</h2>
          <span className="section-sub">
            A curated selection — yt-dlp resolves many more
          </span>
        </div>

        <div className="sources-search">
          <div className="search-input-wrap">
            <span className="search-icon" aria-hidden="true">
              <SearchIcon size={15} />
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              placeholder="Search supported websites…"
              className="input search-input"
              aria-label="Search supported websites"
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button
                type="button"
                className="search-clear"
                aria-label="Clear search"
                onClick={() => setQuery("")}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>

          <div className="category-filter" role="group" aria-label="Filter by category">
            <span className="filter-icon" aria-hidden="true">
              <FilterIcon size={14} />
            </span>
            <button
              type="button"
              className={`filter-pill ${categoryFilter === ALL_CATEGORY ? "filter-pill--active" : ""}`}
              onClick={() => setCategoryFilter(ALL_CATEGORY)}
              aria-pressed={categoryFilter === ALL_CATEGORY}
            >
              All
            </button>
            {allCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`filter-pill ${categoryFilter === cat ? "filter-pill--active" : ""}`}
                onClick={() => setCategoryFilter(cat)}
                aria-pressed={categoryFilter === cat}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {filteredSites.length > 0 ? (
          <div className="sites-result-meta">
            <span className="sites-count">
              {filteredSites.length}{" "}
              {filteredSites.length === 1 ? "site" : "sites"}
              {query && ` matching "${query}"`}
              {categoryFilter !== ALL_CATEGORY &&
                ` in ${CATEGORY_LABELS[categoryFilter]}`}
            </span>
          </div>
        ) : null}

        <div
          className="sites-list"
          role="list"
          aria-label="Supported sites"
          aria-live="polite"
          aria-relevant="all"
        >
          {filteredSites.length === 0 ? (
            <div className="sites-empty">
              <span className="sites-empty-title">No sites match your search</span>
              <span className="sites-empty-sub">
                yt-dlp may still support this site — try pasting the URL directly.
              </span>
            </div>
          ) : (
            filteredSites.map((site) => (
              <div key={`${site.name}-${site.category}`} className="site-entry" role="listitem">
                <span className="site-entry-dot" aria-hidden="true" />
                <span className="site-entry-name">{site.name}</span>
                <span className="site-entry-category">
                  {CATEGORY_LABELS[site.category]}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="sources-footer">
        <p>
          yt-dlp is an open-source project that resolves video and audio from a
          long tail of sites. The authoritative list lives at{" "}
          <span className="sources-link-hint">github.com/yt-dlp/yt-dlp</span>.
        </p>
      </div>
    </div>
  );
}
