import { Renderer } from "./renderer";
import type { CameraTargetId } from "./simulation";
import { UIOverlay } from "./ui";
import "./ui/styles.css";

async function main() {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const errorEl = document.getElementById("error") as HTMLDivElement;
  const ui = new UIOverlay();
  const statsEl = ui.statsEl;

  const renderer = new Renderer(canvas);
  const ok = await renderer.init();

  if (!ok) {
    errorEl.style.display = "flex";
    errorEl.innerHTML = `
      WebGPU is not supported in this browser.<br><br>
      Try Chrome 113+, Edge 113+, or Chrome Canary.<br>
      On macOS, Safari Technology Preview also works.
    `;
    return;
  }

  ui.setCameraTargets(
    renderer.getCameraTargetOptions(),
    renderer.getSelectedCameraTarget(),
  );
  ui.onCameraTargetChange((targetId) =>
    renderer.setCameraTarget(targetId as CameraTargetId),
  );
  ui.setMsaaEnabled(renderer.getMsaaEnabled());
  ui.onMsaaChange((enabled) => {
    void renderer.setMsaaEnabled(enabled).then(() => {
      ui.setMsaaEnabled(renderer.getMsaaEnabled());
    });
  });

  // Frame loop
  let lastTime = performance.now();
  let frameCount = 0;
  let fpsTime = 0;
  let fps = 0;

  function frame(now: number) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    // FPS counter
    frameCount++;
    fpsTime += dt;
    if (fpsTime >= 1) {
      fps = frameCount;
      frameCount = 0;
      fpsTime = 0;
    }

    renderer.render(dt);

    const cam = renderer.camera;
    statsEl.textContent = [
      `${fps} fps`,
      `focus: ${renderer.getFocusLabel()}`,
      `alt: ${renderer.getCameraAltitudeKm().toFixed(0)} km`,
      `msaa: x${renderer.getMsaaSampleCount()}`,
      `drag to orbit · scroll to zoom`,
    ].join(" · ");

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

main();
