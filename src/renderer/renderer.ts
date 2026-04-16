import { mat4 } from "../math";
import { createSphere } from "./geometry";
import { loadPlanetShaderSources } from "./shaders";
import { OrbitCamera } from "./camera";

export class Renderer {
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private pipeline!: GPURenderPipeline;
  private uniformBuffer!: GPUBuffer;
  private uniformBindGroup!: GPUBindGroup;
  private vertexBuffer!: GPUBuffer;
  private indexBuffer!: GPUBuffer;
  private indexCount!: number;
  private depthTexture!: GPUTexture;
  private canvas: HTMLCanvasElement;
  private format!: GPUTextureFormat;

  camera: OrbitCamera;
  time = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.camera = new OrbitCamera(4, 0.5, 0.3, 1.5, 30);
    this.camera.attach(canvas);
  }

  async init(): Promise<boolean> {
    if (!navigator.gpu) return false;

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return false;

    this.device = await adapter.requestDevice();
    this.context = this.canvas.getContext("webgpu") as GPUCanvasContext;
    this.format = navigator.gpu.getPreferredCanvasFormat();

    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: "opaque",
    });

    this.createBuffers();
    await this.createPipeline();
    this.resize();

    window.addEventListener("resize", () => this.resize());

    return true;
  }

  private createBuffers() {
    // Earth sphere: radius 1.0 (will represent ~6371km in game units later)
    const sphere = createSphere(1.0, 64, 64);
    this.indexCount = sphere.indexCount;

    this.vertexBuffer = this.device.createBuffer({
      size: sphere.vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.vertexBuffer, 0, sphere.vertices);

    this.indexBuffer = this.device.createBuffer({
      size: sphere.indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.indexBuffer, 0, sphere.indices);

    // Uniform buffer: mvp(64) + model(64) + eye(12) + time(4) + padding(16) = 160
    this.uniformBuffer = this.device.createBuffer({
      size: 176,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  private async createPipeline() {
    const { vertex, fragment } = await loadPlanetShaderSources();
    const vertModule = this.device.createShaderModule({ code: vertex });
    const fragModule = this.device.createShaderModule({ code: fragment });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
      ],
    });

    this.uniformBindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
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
            // Interleaved: pos(3) + normal(3) + uv(2) = 8 floats = 32 bytes
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

    if (this.depthTexture) this.depthTexture.destroy();
    this.depthTexture = this.device.createTexture({
      size: [w, h],
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  render(dt: number) {
    this.time += dt;
    this.camera.update(dt);

    const eye = this.camera.getEye();
    const aspect = this.canvas.width / this.canvas.height;

    const proj = mat4.perspective(Math.PI / 4, aspect, 0.01, 100);
    const view = mat4.lookAt(eye, this.camera.target, [0, 1, 0]);

    let model = mat4.create();
    model = mat4.rotateY(model, this.time * 0.05);
    model = mat4.rotateX(model, 23.4 * (Math.PI / 180));

    const mvp = mat4.multiply(proj, mat4.multiply(view, model));

    const uniformData = new ArrayBuffer(176);
    const f32 = new Float32Array(uniformData);
    f32.set(mvp, 0);
    f32.set(model, 16);
    f32[32] = eye[0];
    f32[33] = eye[1];
    f32[34] = eye[2];
    f32[35] = this.time;

    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.0, g: 0.0, b: 0.01, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: this.depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    });

    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.uniformBindGroup);
    passEncoder.setVertexBuffer(0, this.vertexBuffer);
    passEncoder.setIndexBuffer(this.indexBuffer, "uint16");
    passEncoder.drawIndexed(this.indexCount);
    passEncoder.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }
}
