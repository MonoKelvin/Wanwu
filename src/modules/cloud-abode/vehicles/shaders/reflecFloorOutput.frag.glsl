#include "../../../../../node_modules/lygia/lighting/fresnel.glsl"

vec3 viewDir = normalize(vViewPosition);
float d = max(length(viewDir), 0.001);
vec2 distortion = normal.xz * (0.001 + 1.0 / d);
vec4 reflectPoint = uReflectMatrix * vec4(vWorldFloorPos, 1.0);
reflectPoint.xyz /= max(reflectPoint.w, 0.0001);
vec2 finalUv = clamp(reflectPoint.xy + distortion, 0.001, 0.999);

vec2 roughnessUv = vWorldFloorPos.xz;
roughnessUv.x += uFloorTime * uFloorSpeed;
float roughnessValue = 0.35;
#ifdef USE_ROUGHNESSMAP
  roughnessValue = texture2D(roughnessMap, roughnessUv).r;
#endif
roughnessValue = roughnessValue * (1.7 - 0.7 * roughnessValue);
float lodLevel = roughnessValue * __FLOOR_ROUGHNESS_MUL__;

vec3 reflectionSample;
#ifdef GL_EXT_shader_texture_lod
  reflectionSample = texture2DLodEXT(uReflectTexture, finalUv, lodLevel).rgb;
#else
  reflectionSample = texture2D(uReflectTexture, finalUv).rgb;
#endif
reflectionSample *= uReflectIntensity;

vec3 col = uFloorTint * uFloorTintMul;
#ifdef USE_LIGHTMAP
  float lm = max(texture2D(lightMap, vUv2).r, texture2D(lightMap, vUv2).g);
  lm = pow(clamp(lm, 0.0, 1.0), __FLOOR_SPOT_CONTRAST__);
  col *= lm;
#endif
#ifdef USE_AOMAP
  col *= texture2D(aoMap, vUv2).rgb;
#endif

vec3 fres = fresnel(vec3(0.0), normalize(normal), viewDir);
if (uReflectIntensity > 0.01) {
  col = mix(col, reflectionSample, fres);
}

#include <tonemapping_fragment>
#include <colorspace_fragment>
gl_FragColor = vec4(col, 1.0);
