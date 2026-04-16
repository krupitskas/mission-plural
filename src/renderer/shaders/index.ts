type ShaderSources = {
  vertex: string;
  fragment: string;
};

const planetVertexShaderUrl = new URL("./planet.vertex.wgsl", import.meta.url);
const planetFragmentShaderUrl = new URL("./planet.fragment.wgsl", import.meta.url);

let planetShaderSourcesPromise: Promise<ShaderSources> | undefined;

async function loadShaderText(url: URL): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load shader: ${url.pathname}`);
  }

  return response.text();
}

export function loadPlanetShaderSources(): Promise<ShaderSources> {
  if (!planetShaderSourcesPromise) {
    planetShaderSourcesPromise = Promise.all([
      loadShaderText(planetVertexShaderUrl),
      loadShaderText(planetFragmentShaderUrl),
    ]).then(([vertex, fragment]) => ({ vertex, fragment }));
  }

  return planetShaderSourcesPromise;
}
