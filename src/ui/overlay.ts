import { makeDraggable } from "./drag";
import { uiMarkup } from "./markup";

const MENU_BAR_HEIGHT = 52;
const WINDOW_MARGIN = 16;

export class UIOverlay {
  readonly statsEl: HTMLDivElement;

  private readonly root: HTMLDivElement;
  private readonly cameraTargetSelect: HTMLSelectElement;
  private readonly fileMenuButton: HTMLButtonElement;
  private readonly fileMenu: HTMLDivElement;
  private readonly scenePanel: HTMLDivElement;
  private readonly scenePanelDockButton: HTMLButtonElement;
  private readonly earthWindow: HTMLDivElement;
  private readonly earthToggleButton: HTMLButtonElement;
  private readonly settingsToggleButton: HTMLButtonElement;
  private readonly settingsWindow: HTMLDivElement;
  private readonly msaaToggle: HTMLInputElement;
  private readonly cameraTargetListeners = new Set<(targetId: string) => void>();
  private readonly msaaListeners = new Set<(enabled: boolean) => void>();
  private scenePanelDocked = true;

  constructor() {
    this.root = document.createElement("div");
    this.root.id = "ui-root";
    this.root.innerHTML = uiMarkup;

    document.body.appendChild(this.root);

    this.cameraTargetSelect = this.require('[data-action="camera-target"]');
    this.fileMenuButton = this.require(".menu-trigger");
    this.fileMenu = this.require(".menu-dropdown");
    this.scenePanel = this.require('[data-window="scene"]');
    this.scenePanelDockButton = this.require('[data-action="dock-scene"]');
    this.earthWindow = this.require('[data-window="earth"]');
    this.earthToggleButton = this.require('[data-action="toggle-earth"]');
    this.settingsToggleButton = this.require('[data-action="toggle-settings"]');
    this.settingsWindow = this.require('[data-window="settings"]');
    this.msaaToggle = this.require('[data-action="msaa-toggle"]');
    this.statsEl = this.require(".hud-stats");

    this.setupFileMenu();
    this.setupScenePanel();
    this.setupEarthWindow();
    this.setupSettingsWindow();

    this.setSceneDocked(true);
    this.placeFloatingWindow(this.earthWindow, 364, 116);
    this.placeFloatingWindow(this.settingsWindow, 696, 116);

    window.addEventListener("resize", () => {
      if (!this.scenePanelDocked) {
        this.clampWindow(this.scenePanel);
      }
      if (!this.earthWindow.classList.contains("is-hidden")) {
        this.clampWindow(this.earthWindow);
      }
      if (!this.settingsWindow.classList.contains("is-hidden")) {
        this.clampWindow(this.settingsWindow);
      }
    });
  }

  onCameraTargetChange(listener: (targetId: string) => void) {
    this.cameraTargetListeners.add(listener);
  }

  onMsaaChange(listener: (enabled: boolean) => void) {
    this.msaaListeners.add(listener);
  }

  setCameraTargets(
    targets: Array<{ id: string; label: string }>,
    selectedTargetId: string,
  ) {
    this.cameraTargetSelect.replaceChildren(
      ...targets.map((target) => {
        const option = document.createElement("option");
        option.value = target.id;
        option.textContent = target.label;
        option.selected = target.id === selectedTargetId;
        return option;
      }),
    );
  }

  setMsaaEnabled(enabled: boolean) {
    this.msaaToggle.checked = enabled;
  }

  private setupFileMenu() {
    this.fileMenuButton.addEventListener("click", (event) => {
      event.stopPropagation();
      const willOpen = this.fileMenu.classList.contains("hidden");
      this.fileMenu.classList.toggle("hidden", !willOpen);
      this.fileMenuButton.setAttribute("aria-expanded", String(willOpen));
    });

    for (const menuItem of this.fileMenu.querySelectorAll<HTMLButtonElement>(
      ".menu-item:not(:disabled)",
    )) {
      menuItem.addEventListener("click", () => this.closeFileMenu());
    }

    document.addEventListener("click", (event) => {
      if (!this.root.contains(event.target as Node)) {
        this.closeFileMenu();
        return;
      }

      const target = event.target as HTMLElement;
      if (!target.closest(".menu-group")) {
        this.closeFileMenu();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.closeFileMenu();
      }
    });
  }

  private setupScenePanel() {
    this.cameraTargetSelect.addEventListener("change", () => {
      for (const listener of this.cameraTargetListeners) {
        listener(this.cameraTargetSelect.value);
      }
    });

    this.scenePanelDockButton.addEventListener("click", () => {
      if (this.scenePanelDocked) {
        const rect = this.scenePanel.getBoundingClientRect();
        this.setSceneDocked(false, rect.left, rect.top);
        return;
      }

      this.setSceneDocked(true);
    });

    makeDraggable(this.scenePanel, {
      onDragStart: () => {
        if (this.scenePanelDocked) {
          const rect = this.scenePanel.getBoundingClientRect();
          this.setSceneDocked(false, rect.left, rect.top);
        }
      },
      onDragMove: ({ event, offsetX, offsetY }) => {
        const { left, top } = this.getClampedPosition(
          this.scenePanel,
          event.clientX - offsetX,
          event.clientY - offsetY,
        );
        this.scenePanel.style.left = `${left}px`;
        this.scenePanel.style.top = `${top}px`;
      },
    });

    this.earthToggleButton.addEventListener("click", () => {
      const isHidden = this.earthWindow.classList.contains("is-hidden");
      this.setEarthWindowVisible(isHidden);
    });
  }

  private setupEarthWindow() {
    const closeButton = this.require<HTMLButtonElement>('[data-action="close-earth"]');
    closeButton.addEventListener("click", () => this.setEarthWindowVisible(false));

    makeDraggable(this.earthWindow, {
      onDragMove: ({ event, offsetX, offsetY }) => {
        const { left, top } = this.getClampedPosition(
          this.earthWindow,
          event.clientX - offsetX,
          event.clientY - offsetY,
        );
        this.earthWindow.style.left = `${left}px`;
        this.earthWindow.style.top = `${top}px`;
      },
    });
  }

  private setupSettingsWindow() {
    this.settingsToggleButton.addEventListener("click", () => {
      const isHidden = this.settingsWindow.classList.contains("is-hidden");
      this.setSettingsWindowVisible(isHidden);
    });

    const closeButton = this.require<HTMLButtonElement>(
      '[data-action="close-settings"]',
    );
    closeButton.addEventListener("click", () => this.setSettingsWindowVisible(false));

    this.msaaToggle.addEventListener("change", () => {
      for (const listener of this.msaaListeners) {
        listener(this.msaaToggle.checked);
      }
    });

    makeDraggable(this.settingsWindow, {
      onDragMove: ({ event, offsetX, offsetY }) => {
        const { left, top } = this.getClampedPosition(
          this.settingsWindow,
          event.clientX - offsetX,
          event.clientY - offsetY,
        );
        this.settingsWindow.style.left = `${left}px`;
        this.settingsWindow.style.top = `${top}px`;
      },
    });
  }

  private setSceneDocked(
    docked: boolean,
    left = WINDOW_MARGIN,
    top = MENU_BAR_HEIGHT + WINDOW_MARGIN,
  ) {
    this.scenePanelDocked = docked;
    this.scenePanel.classList.toggle("is-docked", docked);

    if (docked) {
      this.scenePanel.style.removeProperty("left");
      this.scenePanel.style.removeProperty("top");
      this.scenePanelDockButton.textContent = "Undock";
      return;
    }

    const clamped = this.getClampedPosition(this.scenePanel, left, top);
    this.scenePanel.style.left = `${clamped.left}px`;
    this.scenePanel.style.top = `${clamped.top}px`;
    this.scenePanelDockButton.textContent = "Dock Left";
  }

  private setEarthWindowVisible(visible: boolean) {
    this.earthWindow.classList.toggle("is-hidden", !visible);
    this.earthToggleButton.textContent = visible
      ? "Hide Earth Settings"
      : "Open Earth Settings";

    if (visible) {
      this.clampWindow(this.earthWindow);
    }
  }

  private setSettingsWindowVisible(visible: boolean) {
    this.settingsWindow.classList.toggle("is-hidden", !visible);
    this.settingsToggleButton.setAttribute("aria-pressed", String(visible));

    if (visible) {
      this.clampWindow(this.settingsWindow);
    }
  }

  private placeFloatingWindow(panel: HTMLDivElement, left: number, top: number) {
    const clamped = this.getClampedPosition(panel, left, top);
    panel.style.left = `${clamped.left}px`;
    panel.style.top = `${clamped.top}px`;
  }

  private clampWindow(panel: HTMLDivElement) {
    const left = Number.parseFloat(panel.style.left || "0");
    const top = Number.parseFloat(
      panel.style.top || `${MENU_BAR_HEIGHT + WINDOW_MARGIN}`,
    );
    this.placeFloatingWindow(panel, left, top);
  }

  private getClampedPosition(panel: HTMLDivElement, left: number, top: number) {
    const width = panel.offsetWidth || 320;
    const height = panel.offsetHeight || 280;
    const minLeft = WINDOW_MARGIN;
    const minTop = MENU_BAR_HEIGHT + WINDOW_MARGIN;
    const maxLeft = Math.max(minLeft, window.innerWidth - width - WINDOW_MARGIN);
    const maxTop = Math.max(minTop, window.innerHeight - height - WINDOW_MARGIN);

    return {
      left: Math.min(Math.max(left, minLeft), maxLeft),
      top: Math.min(Math.max(top, minTop), maxTop),
    };
  }

  private closeFileMenu() {
    this.fileMenu.classList.add("hidden");
    this.fileMenuButton.setAttribute("aria-expanded", "false");
  }

  private require<T extends HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) {
      throw new Error(`Missing UI element: ${selector}`);
    }
    return element;
  }
}
