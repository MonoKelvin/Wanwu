import { Effect } from 'postprocessing'
import { Uniform } from 'three'
import type { Texture } from 'three'

const fragmentShader = /* glsl */ `
uniform sampler2D historyBuffer;
uniform float feedback;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 history = texture2D(historyBuffer, uv).rgb;
  float blend = clamp(feedback, 0.0, 0.96);
  outputColor = vec4(mix(inputColor.rgb, history, blend), inputColor.a);
}
`

/** 轻量时间混合 — 相机静止时累积帧，运动时不混合 */
export class TemporalBlendEffect extends Effect {
  constructor(feedback = 0.88) {
    super('TemporalBlendEffect', fragmentShader, {
      uniforms: new Map<string, Uniform>([
        ['historyBuffer', new Uniform(null as Texture | null)],
        ['feedback', new Uniform(feedback)]
      ])
    })
  }

  setHistory(texture: Texture | null): void {
    this.uniforms.get('historyBuffer')!.value = texture
  }

  setFeedback(value: number): void {
    this.uniforms.get('feedback')!.value = value
  }
}
