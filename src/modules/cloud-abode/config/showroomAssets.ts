/**
 * 云斋展车共用场景资源（相对 assets/ 根目录）。
 * 不写入各车型 item.json。
 */
export const CLOUD_ABODE_SHOWROOM = {
  sceneGltf: 'models/scene/startroom/sm_startroom.raw.gltf',
  hdrDay: 'hdr/t_env_light.hdr',
  hdrNight: 'hdr/t_env_night.hdr',
  bgm: 'audio/tiltshifted_lost_neon_sun.mp3',
  textures: {
    floorNormal: 'texture/t_floor_normal.webp',
    floorRoughness: 'texture/t_floor_roughness.webp',
    showroomAo: 'models/scene/startroom/t_startroom_ao.raw.jpg',
    showroomLight: 'models/scene/startroom/t_startroom_light.raw.jpg'
  },
  effects: {
    speedLines: 'models/scene/sm_speedup.gltf',
    driveAnimation: 'models/scene/Driving.fbx'
  }
} as const
