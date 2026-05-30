import * as THREE from 'three'

const PACK_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const BLIT_FRAG = /* glsl */ `
uniform sampler2D uSource;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(uSource, vUv);
}
`

/**
 * 从 mirror RT 直接盒式降采样到目标 mip（避免读写同一 FBO 的 feedback loop）
 * uLevel=1 → 2×2，uLevel=2 → 4×4 … 最大 8×8
 */
const DOWNSAMPLE_FRAG = /* glsl */ `
uniform sampler2D uSource;
uniform vec2 uSourcePixelSize;
uniform float uLevel;
varying vec2 vUv;
void main() {
  int block = int(clamp(uLevel, 1.0, 8.0));
  vec2 texel = 1.0 / uSourcePixelSize;
  vec2 mipSize = uSourcePixelSize / float(block);
  vec2 srcBase = (floor(vUv * mipSize) * float(block) + 0.5) * texel;
  vec4 sum = vec4(0.0);
  float count = 0.0;
  for (int y = 0; y < 8; y++) {
    if (y >= block) break;
    for (int x = 0; x < 8; x++) {
      if (x >= block) break;
      sum += texture2D(uSource, srcBase + vec2(float(x), float(y)) * texel);
      count += 1.0;
    }
  }
  gl_FragColor = sum / count;
}
`

/**
 * 将镜面 RT 打包为多级 mipmap atlas（对齐 su7 / furina packedTexture2DLOD）
 * atlas 尺寸：(sourceSize * 1.5) × sourceSize
 */
export class PackedMipMapGenerator {
  private readonly blitMaterial: THREE.ShaderMaterial
  private readonly downsampleMaterial: THREE.ShaderMaterial
  private readonly scene: THREE.Scene
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private readonly quad: THREE.Mesh

  constructor() {
    this.blitMaterial = new THREE.ShaderMaterial({
      vertexShader: PACK_VERT,
      fragmentShader: BLIT_FRAG,
      uniforms: { uSource: { value: null as THREE.Texture | null } },
      depthTest: false,
      depthWrite: false
    })
    this.downsampleMaterial = new THREE.ShaderMaterial({
      vertexShader: PACK_VERT,
      fragmentShader: DOWNSAMPLE_FRAG,
      uniforms: {
        uSource: { value: null as THREE.Texture | null },
        uSourcePixelSize: { value: new THREE.Vector2(1, 1) },
        uLevel: { value: 1 }
      },
      depthTest: false,
      depthWrite: false
    })
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.blitMaterial)
    this.quad.frustumCulled = false
    this.scene = new THREE.Scene()
    this.scene.add(this.quad)
  }

  update(
    source: THREE.Texture,
    dest: THREE.WebGLRenderTarget,
    renderer: THREE.WebGLRenderer,
    sourcePixelSize: number
  ): void {
    const N = sourcePixelSize
    const maxLevel = Math.floor(Math.log2(N))

    const prevTarget = renderer.getRenderTarget()
    const prevAutoClear = renderer.autoClear
    const prevScissorTest = renderer.getScissorTest()
    const prevViewport = new THREE.Vector4()
    const prevScissor = new THREE.Vector4()
    renderer.getViewport(prevViewport)
    renderer.getScissor(prevScissor)

    renderer.setRenderTarget(dest)
    renderer.autoClear = true
    renderer.clear()

    // mip0：左区完整拷贝 mirror（源/目标不同纹理，无 feedback loop）
    this.quad.material = this.blitMaterial
    this.blitMaterial.uniforms.uSource.value = source
    this.setViewport(renderer, 0, 0, N, N)
    renderer.render(this.scene, this.camera)

    // mip1+：始终从 mirror 降采样写入 atlas 右侧槽位
    this.quad.material = this.downsampleMaterial
    this.downsampleMaterial.uniforms.uSource.value = source
    this.downsampleMaterial.uniforms.uSourcePixelSize.value.set(N, N)

    for (let level = 1; level <= maxLevel; level++) {
      const dim = N >> level
      if (dim < 1) break
      this.downsampleMaterial.uniforms.uLevel.value = level
      this.setViewport(renderer, N, dim, dim, dim)
      renderer.render(this.scene, this.camera)
    }

    renderer.setRenderTarget(prevTarget)
    renderer.autoClear = prevAutoClear
    renderer.setScissorTest(prevScissorTest)
    renderer.setViewport(prevViewport)
    renderer.setScissor(prevScissor)
  }

  dispose(): void {
    this.blitMaterial.dispose()
    this.downsampleMaterial.dispose()
    this.quad.geometry.dispose()
  }

  private setViewport(
    renderer: THREE.WebGLRenderer,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    renderer.setViewport(x, y, w, h)
    renderer.setScissor(x, y, w, h)
    renderer.setScissorTest(true)
  }
}
