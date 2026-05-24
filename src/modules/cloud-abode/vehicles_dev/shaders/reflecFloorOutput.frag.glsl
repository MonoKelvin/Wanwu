#include "../../../../../node_modules/lygia/lighting/fresnel.glsl"
#include "./packedTexture2DLOD.glsl"

vec3 viewDir = normalize(vViewPosition);
float d = max(length(viewDir), 0.001);

vec2 surfaceNormalUv = vWorldFloorPos.xz;
surfaceNormalUv.x += uFloorTime * uFloorSpeed;
vec3 surfaceNormal = vec3(0.0, 1.0, 0.0);
#ifdef USE_NORMALMAP
  surfaceNormal = texture2D(normalMap, surfaceNormalUv).rgb * 2.0 - 1.0;
  surfaceNormal = surfaceNormal.rbg;
  surfaceNormal = normalize(surfaceNormal);
#endif

vec2 distortion = surfaceNormal.xz * (0.001 + 1.0 / d);
vec4 reflectPoint = uReflectMatrix * vec4(vWorldFloorPos, 1.0);
reflectPoint.xyz /= max(reflectPoint.w, 0.0001);
vec2 finalUv = reflectPoint.xy + distortion;

vec2 roughnessUv = vWorldFloorPos.xz;
roughnessUv.x += uFloorTime * uFloorSpeed;
float roughnessValue = 0.35;
#ifdef USE_ROUGHNESSMAP
  roughnessValue = texture2D(roughnessMap, roughnessUv).r;
#endif
roughnessValue = roughnessValue * (1.7 - 0.7 * roughnessValue);
float lodLevel = roughnessValue * __FLOOR_ROUGHNESS_MUL__;

vec3 reflectionSample = packedTexture2DLOD(
  uReflectTexture,
  finalUv,
  lodLevel,
  uMipmapTextureSize
).rgb;
reflectionSample *= uReflectIntensity;

vec3 col = uFloorTint * uFloorTintMul;
#ifdef USE_LIGHTMAP
  float lm = max(texture2D(lightMap, vUv2).r, texture2D(lightMap, vUv2).g);
  lm = pow(clamp(lm, 0.0, 1.0), __FLOOR_SPOT_CONTRAST__);
  col *= lm;
#else
  col *= 0.08;
#endif
#ifdef USE_AOMAP
  col *= texture2D(aoMap, vUv2).rgb;
#endif

vec3 fres = fresnel(vec3(0.0), nonPerturbedNormal, viewDir);
if (uReflectIntensity > 0.01) {
  col = mix(col, reflectionSample, fres);
}

#include <tonemapping_fragment>
#include <colorspace_fragment>
gl_FragColor = vec4(col, 1.0);
