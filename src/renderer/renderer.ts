import { Mat4, Vec3, mat4, vec3 } from "../math";
import {
  OrbitalScene,
  type BodyState,
  type CameraTargetId,
  type CameraTargetOption,
  type OrbitVisual,
} from "../simulation";
import { OrbitCamera } from "./camera";
import { createSphere, createStubShip, type MeshData } from "./geometry";
import { createOrbitTube } from "./orbit-geometry";
import { loadPlanetShaderSources } from "./shaders";

type GpuMesh = {
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  indexCount: number;
};

type DrawCall = {
  mesh: GpuMesh;
  model: Mat4;
  baseColor: [number, number, number, number];
  material: [number, number, number, number];
};

const MAX_DRAW_CALLS = 32;

export class Renderer {
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private pipeline!: GPURenderPipeline;
  private colorTexture!: GPUTexture;
  private uniformBuffer!: GPUBuffer;
  private uniformBindGroup!: GPUBindGroup;
  private depthTexture!: GPUTexture;
  private canvas: HTMLCanvasElement;
  private format!: GPUTextureFormat;
  private desiredMsaaSamples = 1;
  private msaaSamples = 1;
  private maxSupportedMsaaSamples = 1;
  private uniformStride = 256;
  private shaderSourcePromise = loadPlanetShaderSources();

  private readonly scene = new OrbitalScene();
  private sphereMesh!: GpuMesh;
  private shipMesh!: GpuMesh;
  private orbitVisuals: Array<OrbitVisual & { mesh: GpuMesh }> = [];
  private cameraTargetId: CameraTargetId = "earth";

  camera: OrbitCamera;
  time = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.camera = new OrbitCamera(8, 0.45, 0.3, 0.01, 260);
    this.camera.attach(canvas);
  }

  async init(): Promise<boolean> {
    if (!navigator.gpu) return false;

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return false;

    this.device = await adapter.requestDevice();
    this.context = this.canvas.getContext("webgpu") as GPUCanvasContext;
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.uniformStride = Math.max(
      256,
      this.device.limits.minUniformBufferOffsetAlignment,
    );

    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: "opaque",
    });

    this.createBuffers();
    this.maxSupportedMsaaSamples = await this.detectMaxSupportedMsaaSampleCount();
    this.desiredMsaaSamples = this.maxSupportedMsaaSamples;
    await this.rebuildRenderState();
    this.resize();
    this.focusCameraTarget(this.cameraTargetId);

    window.addEventListener("resize", () => this.resize());

    return true;
  }

  getCameraTargetOptions(): CameraTargetOption[] {
    return this.scene.getTargetOptions();
  }

  getSelectedCameraTarget(): CameraTargetId {
    return this.cameraTargetId;
  }

  setCameraTarget(id: CameraTargetId) {
    this.cameraTargetId = id;
    this.focusCameraTarget(id);
  }

  getFocusLabel(): string {
    return this.scene.getCameraTarget(this.cameraTargetId).label;
  }

  getCameraAltitudeKm(): number {
    const target = this.scene.getCameraTarget(this.cameraTargetId);
    return Math.max(0, this.camera.distance * target.kmPerSceneUnit - target.radiusKm);
  }

  getMsaaEnabled(): boolean {
    return this.msaaSamples > 1;
  }

  async setMsaaEnabled(enabled: boolean) {
    const nextSampleCount = enabled ? this.maxSupportedMsaaSamples : 1;
    if (nextSampleCount === this.desiredMsaaSamples) {
      return;
    }

    this.desiredMsaaSamples = nextSampleCount;
    await this.rebuildRenderState();
    this.resize();
  }

  getMsaaSampleCount(): number {
    return this.msaaSamples;
  }

  getMaxSupportedMsaaSampleCount(): number {
    return this.maxSupportedMsaaSamples;
  }

  private createBuffers() {
    this.sphereMesh = this.createGpuMesh(createSphere(1, 64, 64));
    this.shipMesh = this.createGpuMesh(createStubShip());
    this.orbitVisuals = this.scene.getOrbitVisuals().map((orbitVisual) => ({
      ...orbitVisual,
      mesh: this.createGpuMesh(
        createOrbitTube(
          orbitVisual.pointsScene,
          orbitVisual.tubeRadius,
          orbitVisual.radialSegments,
        ),
      ),
    }));

    this.uniformBuffer = this.device.createBuffer({
      size: this.uniformStride * MAX_DRAW_CALLS,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  private createGpuMesh(data: MeshData): GpuMesh {
    const vertexBuffer = this.device.createBuffer({
      size: data.vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(vertexBuffer, 0, data.vertices);

    const indexBuffer = this.device.createBuffer({
      size: data.indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(indexBuffer, 0, data.indices);

    return {
      vertexBuffer,
      indexBuffer,
      indexCount: data.indexCount,
    };
  }

  private async rebuildRenderState() {
    const supportedSampleCount = await this.resolveSampleCount(
      this.desiredMsaaSamples,
    );
    this.msaaSamples = supportedSampleCount;
    await this.createPipeline();
  }

  private async detectMaxSupportedMsaaSampleCount(): Promise<number> {
    for (const candidate of [8, 4, 2, 1]) {
      if (await this.supportsSampleCount(candidate)) {
        return candidate;
      }
    }

    return 1;
  }

  private async resolveSampleCount(preferredSampleCount: number): Promise<number> {
    const candidates =
      preferredSampleCount > 1 ? [preferredSampleCount, 4, 1] : [1];

    for (const candidate of candidates) {
      if (await this.supportsSampleCount(candidate)) {
        return candidate;
      }
    }

    return 1;
  }

  private async supportsSampleCount(sampleCount: number): Promise<boolean> {
    const { vertex, fragment } = await this.shaderSourcePromise;
    const vertModule = this.device.createShaderModule({ code: vertex });
    const fragModule = this.device.createShaderModule({ code: fragment });

    this.device.pushErrorScope("validation");
    let colorTexture: GPUTexture | undefined;
    let depthTexture: GPUTexture | undefined;

    try {
      if (sampleCount > 1) {
        colorTexture = this.device.createTexture({
          size: [4, 4],
          sampleCount,
          format: this.format,
          usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
      }

      depthTexture = this.device.createTexture({
        size: [4, 4],
        sampleCount,
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });

      await this.device.createRenderPipelineAsync({
        layout: "auto",
        vertex: {
          module: vertModule,
          entryPoint: "main",
          buffers: [
            {
              arrayStride: 32,
              attributes: [
                { shaderLocation: 0, offset: 0, format: "float32x3" },
                { shaderLocation: 1, offset: 12, format: "float32x3" },
                { shaderLocation: 2, offset: 24, format: "float32x2" },
              ],
            },
          ],
        },
        fragment: {
          module: fragModule,
          entryPoint: "main",
          targets: [{ format: this.format }],
        },
        primitive: {
          topology: "triangle-list",
          cullMode: "back",
        },
        multisample: {
          count: sampleCount,
        },
        depthStencil: {
          depthWriteEnabled: true,
          depthCompare: "less",
          format: "depth24plus",
        },
      });
    } catch {
      // Validation result is captured by the error scope below.
    }

    const validationError = await this.device.popErrorScope();
    colorTexture?.destroy();
    depthTexture?.destroy();
    return validationError === null;
  }

  private async createPipeline() {
    const { vertex, fragment } = await this.shaderSourcePromise;
    const vertModule = this.device.createShaderModule({ code: vertex });
    const fragModule = this.device.createShaderModule({ code: fragment });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: {
            type: "uniform",
            hasDynamicOffset: true,
            minBindingSize: 176,
          },
        },
      ],
    });

    this.uniformBindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.uniformBuffer,
            size: 176,
          },
        },
      ],
    });

    this.pipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
      vertex: {
        module: vertModule,
        entryPoint: "main",
        buffers: [
          {
            arrayStride: 32,
            attributes: [
              { shaderLocation: 0, offset: 0, format: "float32x3" },
              { shaderLocation: 1, offset: 12, format: "float32x3" },
              { shaderLocation: 2, offset: 24, format: "float32x2" },
            ],
          },
        ],
      },
      fragment: {
        module: fragModule,
        entryPoint: "main",
        targets: [{ format: this.format }],
      },
      primitive: {
        topology: "triangle-list",
        cullMode: "back",
      },
      multisample: {
        count: this.msaaSamples,
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: "less",
        format: "depth24plus",
      },
    });
  }

  private resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(this.canvas.clientWidth * dpr);
    const h = Math.floor(this.canvas.clientHeight * dpr);
    this.canvas.width = w;
    this.canvas.height = h;

    if (this.colorTexture) this.colorTexture.destroy();
    if (this.depthTexture) this.depthTexture.destroy();

    if (this.msaaSamples > 1) {
      this.colorTexture = this.device.createTexture({
        size: [w, h],
        sampleCount: this.msaaSamples,
        format: this.format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
    }

    this.depthTexture = this.device.createTexture({
      size: [w, h],
      sampleCount: this.msaaSamples,
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  render(dt: number) {
    this.scene.update(dt);
    this.time = this.scene.getTimeSeconds();

    const focusTarget = this.scene.getCameraTarget(this.cameraTargetId);
    this.camera.setTarget(
      focusTarget.positionScene,
      this.cameraTargetId === "ship",
    );
    this.camera.update(dt);

    const eye = this.camera.getEye();
    const aspect = this.canvas.width / this.canvas.height;
    const near = Math.max(0.0005, this.camera.distance * 0.002);
    const far = Math.max(420, this.camera.distance * 4);
    const proj = mat4.perspective(Math.PI / 4, aspect, near, far);
    const view = mat4.lookAt(eye, this.camera.target, [0, 1, 0]);
    const viewProj = mat4.multiply(proj, view);
    const drawCalls = this.buildDrawCalls();
    if (drawCalls.length > MAX_DRAW_CALLS) {
      throw new Error(`Too many draw calls for uniform ring: ${drawCalls.length}`);
    }

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();
    const colorAttachment: GPURenderPassColorAttachment =
      this.msaaSamples > 1
        ? {
            view: this.colorTexture.createView(),
            resolveTarget: textureView,
            clearValue: { r: 0.1, g: 0.105, b: 0.115, a: 1.0 },
            loadOp: "clear",
            storeOp: "discard",
          }
        : {
            view: textureView,
            clearValue: { r: 0.1, g: 0.105, b: 0.115, a: 1.0 },
            loadOp: "clear",
            storeOp: "store",
          };
    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [colorAttachment],
      depthStencilAttachment: {
        view: this.depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    });

    passEncoder.setPipeline(this.pipeline);

    for (const [index, draw] of drawCalls.entries()) {
      const uniformOffset = index * this.uniformStride;
      this.writeUniforms(
        uniformOffset,
        viewProj,
        draw.model,
        eye,
        draw.baseColor,
        draw.material,
      );
      passEncoder.setBindGroup(0, this.uniformBindGroup, [uniformOffset]);
      passEncoder.setVertexBuffer(0, draw.mesh.vertexBuffer);
      passEncoder.setIndexBuffer(draw.mesh.indexBuffer, "uint16");
      passEncoder.drawIndexed(draw.mesh.indexCount);
    }

    passEncoder.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  private buildDrawCalls(): DrawCall[] {
    const bodies = this.scene.getBodies();
    const bodyMap = new Map<CameraTargetId, BodyState>();
    for (const body of bodies) {
      bodyMap.set(body.id, body);
    }

    const orbitDrawCalls = this.orbitVisuals
      .map((orbitVisual) => {
        const anchorPosition: Vec3 | undefined =
          orbitVisual.anchorId === null
            ? [0, 0, 0]
            : bodyMap.get(orbitVisual.anchorId)?.positionScene;
        if (!anchorPosition) {
          return null;
        }

        return {
          mesh: orbitVisual.mesh,
          model:
            orbitVisual.anchorId === null
              ? mat4.create()
              : mat4.fromTranslation(anchorPosition),
          baseColor: orbitVisual.color,
          material: [4, 1.0, 0, 0] as [number, number, number, number],
        };
      })
      .filter((draw): draw is DrawCall => draw !== null);

    const bodyDrawCalls = bodies.map((body) => ({
      mesh: body.id === "ship" ? this.shipMesh : this.sphereMesh,
      model:
        body.id === "ship" ? this.createShipModel(body) : this.createBodyModel(body),
      baseColor: body.baseColor,
      material: [body.materialKind, body.emissiveStrength, 0, 0] as [
        number,
        number,
        number,
        number,
      ],
    }));

    return [...orbitDrawCalls, ...bodyDrawCalls];
  }

  private createBodyModel(body: BodyState): Mat4 {
    const scale = body.visualScaleScene;
    let local = mat4.create();
    local = mat4.rotateX(local, body.axialTiltRad);
    local = mat4.rotateY(local, body.spinRad);
    local = mat4.multiply(local, mat4.fromScaling([scale, scale, scale]));
    return mat4.multiply(mat4.fromTranslation(body.positionScene), local);
  }

  private createShipModel(ship: BodyState): Mat4 {
    let local = mat4.create();
    local = mat4.rotateX(local, -0.2);
    local = mat4.rotateY(local, 0.45);
    local = mat4.multiply(
      local,
      mat4.fromScaling([
        ship.visualScaleScene,
        ship.visualScaleScene,
        ship.visualScaleScene,
      ]),
    );
    return mat4.multiply(mat4.fromTranslation(ship.positionScene), local);
  }

  private writeUniforms(
    bufferOffset: number,
    viewProj: Mat4,
    model: Mat4,
    eye: Vec3,
    baseColor: [number, number, number, number],
    material: [number, number, number, number],
  ) {
    const mvp = mat4.multiply(viewProj, model);
    const uniformData = new ArrayBuffer(176);
    const f32 = new Float32Array(uniformData);
    f32.set(mvp, 0);
    f32.set(model, 16);
    f32[32] = eye[0];
    f32[33] = eye[1];
    f32[34] = eye[2];
    f32[35] = this.time;
    f32[36] = baseColor[0];
    f32[37] = baseColor[1];
    f32[38] = baseColor[2];
    f32[39] = baseColor[3];
    f32[40] = material[0];
    f32[41] = material[1];
    f32[42] = material[2];
    f32[43] = material[3];
    this.device.queue.writeBuffer(this.uniformBuffer, bufferOffset, uniformData);
  }

  private focusCameraTarget(id: CameraTargetId) {
    const target = this.scene.getCameraTarget(id);
    this.camera.focusOn(
      target.positionScene,
      target.suggestedDistance,
      target.minDistance,
      target.maxDistance,
    );
  }
}
