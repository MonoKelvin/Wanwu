import { Effect, EffectAttribute } from 'postprocessing'
import { Uniform } from 'three'
import type { Texture } from 'three'

const fragmentShader = /* glsl */ `
uniform float intensity;
uniform float maxDistance;
uniform float thickness;
uniform float stepCount;
#ifdef USE_NORMAL_BUFFER
uniform sampler2D normalBuffer;
#endif

vec3 resolveViewNormal(const in vec2 uv, const in vec3 viewPos) {
#ifdef USE_NORMAL_BUFFER
  return normalize(unpackRGBToNormal(texture2D(normalBuffer, uv).rgb));
#else
  return normalize(cross(dFdx(viewPos), dFdy(viewPos)));
#endif
}

float edgeFade(const in vec2 uv) {
  vec2 d = min(uv, 1.0 - uv);
  return clamp(min(d.x, d.y) * 28.0, 0.0, 1.0);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  if (intensity <= 0.001 || depth >= 0.9999) {
    outputColor = inputColor;
    return;
  }

  float viewZ = getViewZ(depth);
  vec3 viewPos = getViewPosition(uv, depth, viewZ);
  vec3 viewNormal = resolveViewNormal(uv, viewPos);
  vec3 viewDir = normalize(viewPos);
  vec3 reflectDir = reflect(viewDir, viewNormal);

  float steps = max(stepCount, 8.0);
  float stepLen = maxDistance / steps;
  vec3 rayPos = viewPos;
  vec3 reflectedColor = inputColor.rgb;
  bool hit = false;
  float hitDist = maxDistance;

  for (float i = 0.0; i < 64.0; i++) {
    if (i >= steps) break;
    rayPos += reflectDir * stepLen;
    vec4 clipPos = projectionMatrix * vec4(rayPos, 1.0);
    if (clipPos.w <= 0.0) break;
    vec2 sampleUv = clipPos.xy / clipPos.w * 0.5 + 0.5;
    if (sampleUv.x < 0.0 || sampleUv.x > 1.0 || sampleUv.y < 0.0 || sampleUv.y > 1.0) break;

    float sampleDepth = readDepth(sampleUv);
    float sampleViewZ = getViewZ(sampleDepth);
    vec3 sampleViewPos = getViewPosition(sampleUv, sampleDepth, sampleViewZ);
    float delta = sampleViewPos.z - rayPos.z;
    if (delta >= 0.0 && delta < thickness) {
      reflectedColor = texture2D(inputBuffer, sampleUv).rgb;
      hit = true;
      hitDist = (i + 1.0) * stepLen;
      break;
    }
  }

  float fresnel = pow(1.0 - max(dot(-viewDir, viewNormal), 0.0), 2.5);
  float distFade = 1.0 - clamp(hitDist / maxDistance, 0.0, 1.0);
  float fade = edgeFade(uv) * distFade;
  float mixAmt = intensity * fresnel * fade * (hit ? 1.0 : 0.35);
  outputColor = vec4(mix(inputColor.rgb, reflectedColor, mixAmt), inputColor.a);
}
`

export interface ScreenSpaceReflectionEffectOptions {
  intensity?: number
  maxDistance?: number
  thickness?: number
  steps?: number
  normalBuffer?: Texture | null
}

export class ScreenSpaceReflectionEffect extends Effect {
  constructor(options: ScreenSpaceReflectionEffectOptions = {}) {
    const defines = options.normalBuffer
      ? new Map<string, string>([['USE_NORMAL_BUFFER', '1']])
      : undefined

    super('ScreenSpaceReflectionEffect', fragmentShader, {
      attributes: EffectAttribute.DEPTH,
      defines,
      uniforms: new Map<string, Uniform>([
        ['intensity', new Uniform(options.intensity ?? 0.35)],
        ['maxDistance', new Uniform(options.maxDistance ?? 12)],
        ['thickness', new Uniform(options.thickness ?? 0.18)],
        ['stepCount', new Uniform(options.steps ?? 32)],
        ['normalBuffer', new Uniform(options.normalBuffer ?? null)]
      ])
    })
  }

  setIntensity(value: number): void {
    this.uniforms.get('intensity')!.value = value
  }

  setMaxDistance(value: number): void {
    this.uniforms.get('maxDistance')!.value = value
  }

  setNormalBuffer(texture: Texture | null): void {
    this.uniforms.get('normalBuffer')!.value = texture
  }
}
