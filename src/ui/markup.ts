export const uiMarkup = `
  <header class="menu-bar">
    <div class="menu-cluster">
      <div class="menu-group">
        <button class="menu-trigger" type="button" aria-expanded="false">
          File
        </button>
        <div class="menu-dropdown hidden" role="menu" aria-label="File menu">
          <button class="menu-item" type="button" role="menuitem">New Mission</button>
          <button class="menu-item" type="button" role="menuitem">Open Prototype</button>
          <button class="menu-item" type="button" role="menuitem" disabled>
            Save
          </button>
        </div>
      </div>
    </div>
    <div class="menu-title">MISSION PLURAL</div>
  </header>

  <aside class="window-panel scene-panel is-docked" data-window="scene">
    <div class="window-header" data-drag-handle>
      <div>
        <div class="window-eyebrow">Workspace</div>
        <div class="window-title">Scene Settings</div>
      </div>
      <div class="window-actions">
        <button class="window-action" type="button" data-action="dock-scene">
          Undock
        </button>
      </div>
    </div>
    <div class="window-body">
      <section class="window-section">
        <div class="section-title">Viewport</div>
        <label class="field-row">
          <span>Planet rotation</span>
          <input type="checkbox" checked />
        </label>
        <label class="field-row">
          <span>Orbit guides</span>
          <input type="checkbox" checked />
        </label>
        <label class="field-row">
          <span>Atmosphere glow</span>
          <input type="checkbox" checked />
        </label>
      </section>

      <section class="window-section">
        <div class="section-title">Camera</div>
        <label class="stack-field">
          <span>Exposure</span>
          <input type="range" min="0" max="100" value="62" />
        </label>
        <label class="stack-field">
          <span>UI scale</span>
          <input type="range" min="80" max="140" value="100" />
        </label>
      </section>

      <section class="window-section">
        <div class="section-title">Panels</div>
        <button class="secondary-button" type="button" data-action="toggle-earth">
          Hide Earth Settings
        </button>
      </section>
    </div>
  </aside>

  <section class="window-panel earth-window" data-window="earth">
    <div class="window-header" data-drag-handle>
      <div>
        <div class="window-eyebrow">Inspector</div>
        <div class="window-title">Earth Settings</div>
      </div>
      <div class="window-actions">
        <button class="window-action" type="button" data-action="close-earth">
          Close
        </button>
      </div>
    </div>
    <div class="window-body">
      <section class="window-section">
        <div class="section-title">Surface</div>
        <label class="stack-field">
          <span>Cloud density</span>
          <input type="range" min="0" max="100" value="38" />
        </label>
        <label class="stack-field">
          <span>Night lights</span>
          <input type="range" min="0" max="100" value="28" />
        </label>
      </section>

      <section class="window-section">
        <div class="section-title">Orbit Preview</div>
        <label class="field-row">
          <span>Show apoapsis</span>
          <input type="checkbox" checked />
        </label>
        <label class="field-row">
          <span>Show periapsis</span>
          <input type="checkbox" checked />
        </label>
      </section>
    </div>
  </section>

  <div class="hud-panel">
    <div class="hud-label">MISSION PLURAL v0.1</div>
    <div class="hud-stats"></div>
  </div>
`;
