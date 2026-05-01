import React from 'react';

export type TabKey = 'activity' | 'artifacts';

export function Tabs({
  active,
  artifactCount,
  onChange,
}: {
  active: TabKey;
  artifactCount: number;
  onChange: (tab: TabKey) => void;
}) {
  return (
    <nav className="tabs" role="tablist" aria-label="View">
      <button
        type="button"
        role="tab"
        aria-selected={active === 'activity'}
        className={`tabs__tab${active === 'activity' ? ' is-active' : ''}`}
        onClick={() => onChange('activity')}
      >
        Activity
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === 'artifacts'}
        className={`tabs__tab${active === 'artifacts' ? ' is-active' : ''}`}
        onClick={() => onChange('artifacts')}
      >
        Artifacts
        {artifactCount > 0 && <span className="tabs__count">{artifactCount}</span>}
      </button>
    </nav>
  );
}
