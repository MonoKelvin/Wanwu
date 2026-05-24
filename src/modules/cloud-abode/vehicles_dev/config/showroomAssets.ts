/**
 * 云斋展车共用场景资源（相对 assets/ 根目录）。
 * 3D 资源统一在 assets/3d/；不写入各车型 item.json。
 */
export const CLOUD_ABODE_SHOWROOM = {
  sceneGltf: '3d/models/startroom/sm_startroom.raw.gltf',
  hdrDay: '3d/hdr/t_env_light.hdr',
  hdrNight: '3d/hdr/t_env_night.hdr',
  bgm: 'audio/tiltshifted_lost_neon_sun.mp3',
  textures: {
    floorNormal: '3d/texture/t_floor_normal.webp',
    floorRoughness: '3d/texture/t_floor_roughness.webp',
    showroomAo: '3d/models/startroom/t_startroom_ao.raw.jpg',
    showroomLight: '3d/models/startroom/t_startroom_light.raw.jpg'
  },
  effects: {
    speedLines: '3d/models/speedup/sm_speedup.gltf',
    driveAnimation: '3d/models/speedup/Driving.fbx'
  }
} as const
