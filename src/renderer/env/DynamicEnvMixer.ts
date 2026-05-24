import * as THREE from 'three'

const MIX_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const MIX_FRAG = /* glsl */ `
uniform sampler2D uEnvmap1;
uniform sampler2D uEnvmap2;
uniform float uWeight;
uniform float uIntensity;
varying vec2 vUv;
void main() {
  vec3 a = texture2D(uEnvmap1, vUv).rgb;
  vec3 b = texture2D(uEnvmap2, vUv).rgb;
  gl_FragColor = vec4(mix(a, b, uWeight) * uIntensity, 1.0);
}
`

export interface DynamicEnvMixerOptions {
  /** 为 false 时不 dispose 传入的 PMREM 贴图（由 SceneRenderer 统一管理） */
  disposeEnvTextures?: boolean
}

/**
 * 双 PMREM 环境混合（day/night HDR 权重插值）
 * 输入须为 PMREMGenerator.fromEquirectangular().texture，且 mapping = CubeUVReflectionMapping
 */
export class DynamicEnvMixer {
  private readonly rt: THREE.WebGLRenderTarget
  private readonly material: THREE.ShaderMaterial
  private readonly quad: THREE.Mesh
  private readonly renderMix: (r: THREE.WebGLRenderer) => void
  private readonly disposeEnvTextures: boolean
  readonly nightEnv: THREE.Texture
  readonly dayEnv: THREE.Texture
  weight = 0
  intensity = 1

  constructor(
    renderer: THREE.WebGLRenderer,
    nightEnv: THREE.Texture,
    dayEnv: THREE.Texture,
    options: DynamicEnvMixerOptions = {}
  ) {
    this.nightEnv = nightEnv
    this.dayEnv = dayEnv
    this.disposeEnvTextures = options.disposeEnvTextures ?? false

    const w = 1024
    const h = 512
    this.rt = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      generateMipmaps: false
    })

    this.material = new THREE.ShaderMaterial({
      vertexShader: MIX_VERT,
      fragmentShader: MIX_FRAG,
      uniforms: {
        uEnvmap1: { value: nightEnv },
        uEnvmap2: { value: dayEnv },
        uWeight: { value: 0 },
        uIntensity: { value: 1 }
      },
      depthTest: false,
      depthWrite: false
    })

    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material)
    this.quad.frustumCulled = false

    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.renderMix = (r: THREE.WebGLRenderer) => {
      const prev = r.getRenderTarget()
      r.setRenderTarget(this.rt)
      r.render(this.quad, cam)
      r.setRenderTarget(prev)
    }

    void renderer
  }

  setWeight(value: number): void {
    this.weight = value
    this.material.uniforms.uWeight.value = value
  }

  setIntensity(value: number): void {
    this.intensity = value
    this.material.uniforms.uIntensity.value = value
  }

  update(renderer: THREE.WebGLRenderer): THREE.Texture {
    this.renderMix(renderer)
    const tex = this.rt.texture
    tex.mapping = THREE.CubeUVReflectionMapping
    return tex
  }

  dispose(): void {
    this.rt.dispose()
    this.material.dispose()
    this.quad.geometry.dispose()
    if (this.disposeEnvTextures) {
      this.nightEnv.dispose()
      this.dayEnv.dispose()
    }
  }
}

/** HDR 纹理 → PMREM CubeUV 环境贴图 */
export function hdrToPmremEnv(
  pmrem: THREE.PMREMGenerator,
  hdr: THREE.DataTexture
): THREE.Texture {
  const env = pmrem.fromEquirectangular(hdr).texture
  hdr.dispose()
  env.mapping = THREE.CubeUVReflectionMapping
  return env
}
