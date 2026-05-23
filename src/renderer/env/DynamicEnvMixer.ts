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

/**
 * 双 HDR 混合（对标 su7-replica DynamicEnv）
 * - envmap1: 夜间 HDR
 * - envmap2: 日间 HDR
 * - weight 0→1：夜→昼；输出 RT 直接作 scene.environment（CubeUV），不做每帧 PMREM
 */
export class DynamicEnvMixer {
  private readonly rt: THREE.WebGLRenderTarget
  private readonly material: THREE.ShaderMaterial
  private readonly quad: THREE.Mesh
  private readonly renderMix: (r: THREE.WebGLRenderer) => void
  readonly nightHdr: THREE.DataTexture
  readonly dayHdr: THREE.DataTexture
  weight = 0
  intensity = 1

  constructor(
    renderer: THREE.WebGLRenderer,
    nightHdr: THREE.DataTexture,
    dayHdr: THREE.DataTexture
  ) {
    this.nightHdr = nightHdr
    this.dayHdr = dayHdr
    nightHdr.mapping = THREE.EquirectangularReflectionMapping
    dayHdr.mapping = THREE.EquirectangularReflectionMapping

    const w = nightHdr.image.width ?? 1024
    const h = nightHdr.image.height ?? 512
    this.rt = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      generateMipmaps: false
    })

    this.material = new THREE.ShaderMaterial({
      vertexShader: MIX_VERT,
      fragmentShader: MIX_FRAG,
      uniforms: {
        uEnvmap1: { value: nightHdr },
        uEnvmap2: { value: dayHdr },
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
  }

  setWeight(value: number): void {
    this.weight = value
    this.material.uniforms.uWeight.value = value
  }

  setIntensity(value: number): void {
    this.intensity = value
    this.material.uniforms.uIntensity.value = value
  }

  /** 每帧混合并返回环境贴图（与 su7 dynamicEnv.update 一致） */
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
    this.nightHdr.dispose()
    this.dayHdr.dispose()
  }
}
