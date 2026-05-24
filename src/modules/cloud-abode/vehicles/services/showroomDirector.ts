import { gsap } from 'gsap'
import { SHOWROOM_EASE } from '@modules/cloud-abode/config/showroomAnimation'
import * as THREE from 'three'
import type { RenderEngine } from '@renderer/core/RenderEngine'
import { CinematicCameraController } from '@renderer/camera/CinematicCameraController'
import { SHOWROOM_SCENE_DEFAULTS } from '@modules/cloud-abode/config/showroomDefaults'
import { createAeroWindLines, scrollAeroWindLines } from '@modules/cloud-abode/vehicles/effects/aeroWindLines'
import { createSpeedStreakParticles } from '@modules/cloud-abode/vehicles/effects/driveParticles'
import type { ParticleSystem } from '@renderer/effects/ParticleSystem'
import type { ReflectionFloorHandles } from '@modules/cloud-abode/vehicles/types/showroomScene'
import { setObjectClipping } from '@renderer/utils/materialClipping'
import { updateReflecFloorUniforms } from '@renderer/shaders/reflecFloorPatch'
import { SHOWROOM_LIGHTING } from '@modules/cloud-abode/config/showroomLighting'
import { DriveCameraShake } from '@modules/cloud-abode/vehicles/effects/driveCameraShake'
import { setFloorVisible, setLightPanelState, setLightPanelOpacity } from './showroomScene'
import { setBodyEnvMapIntensity } from './vehicleShowroom'
import type { ShowroomViewMode } from '../types/showroom'

const SHOWROOM_CAMERA = { x: 0, y: 0.8, z: -7 } as const
const AERO_CLIP = new THREE.Plane(new THREE.Vector3(1, 0, 0.12), 0.05)

export interface ShowroomDirectorOptions {
  reflectionFloorTintMul?: number
}

/**
 * 云斋展车导演 — 对齐 su7-replica World.enter / rush / rushDone
 * 所有展厅业务逻辑（轮毂、地板、环境切换）集中于此，不污染 RenderEngine。
 */
export class ShowroomDirector {
  private enterTimeline: gsap.core.Timeline | null = null
  private driveTimeline: gsap.core.Timeline | null = null
  private readonly cameraShake = new DriveCameraShake()
  private driveActive = false
  private rushSpeed = 0
  private viewMode: ShowroomViewMode = 'customize'
  private aeroActive = false
  private windLines: THREE.LineSegments | null = null
  private driveParticles: ParticleSystem | null = null
  private vehicleRoot: THREE.Object3D | null = null
  private aeroMaterials: THREE.Material[] = []
  private showroomHandles: ReflectionFloorHandles | null = null
  private spinTargets: THREE.Object3D[] = []
  private wheelSpinSpeed = 0
  private floorScrollSpeed = 0
  private floorVisible = true
  private readonly reflectionFloorTintMul: number
  private unsubLoop: (() => void) | null = null
  private readonly cinematic: CinematicCameraController

  constructor(
    private readonly engine: RenderEngine,
    options: ShowroomDirectorOptions = {}
  ) {
    this.reflectionFloorTintMul = options.reflectionFloorTintMul ?? SHOWROOM_SCENE_DEFAULTS.reflectionFloorTintMul
    this.cinematic = new CinematicCameraController(engine)
    this.unsubLoop = this.engine.loop.onPreRender((dt, elapsed) => this.tickFrame(dt, elapsed))
  }

  setSpinTargets(nodes: THREE.Object3D[]): void {
    this.spinTargets = nodes
  }

  setFloorVisible(visible: boolean): void {
    this.floorVisible = visible
    if (this.showroomHandles?.floorMesh) {
      this.showroomHandles.floorMesh.visible = visible
    }
  }

  bindVehicle(root: THREE.Object3D): void {
    this.vehicleRoot = root
    this.ensureDriveParticles()
  }

  bindShowroom(handles: ReflectionFloorHandles): void {
    this.showroomHandles = handles
  }

  get isRushActive(): boolean {
    return this.driveActive
  }

  get currentViewMode(): ShowroomViewMode {
    return this.viewMode
  }

  /** su7 World.enter */
  playEnter(handles: ReflectionFloorHandles, duration = 4, onComplete?: () => void): void {
    this.showroomHandles = handles
    this.enterTimeline?.kill()

    const black = new THREE.Color(0x000000)
    const white = new THREE.Color(0xffffff)
    const lightColor = new THREE.Color()
    const params = {
      lightAlpha: 0,
      lightIntensity: 0,
      reflectIntensity: 0,
      envIntensity: 0,
      envWeight: 0
    }

    setLightPanelState(handles, 0)
    setFloorVisible(handles, true)
    this.setFloorVisible(true)
    this.engine.environment.dynamicEnvironment?.setIntensity(0)
    this.engine.environment.dynamicEnvironment?.setWeight(0)
    updateReflecFloorUniforms(handles.floorMaterial, {
      reflectIntensity: 0,
      floorColor: black,
      speed: 0,
      floorTintMul: this.reflectionFloorTintMul
    })

    this.engine.setInteractLocked(true)

    this.engine.threeCamera.position.set(
      SHOWROOM_SCENE_DEFAULTS.cameraBase.x,
      SHOWROOM_SCENE_DEFAULTS.cameraBase.y,
      SHOWROOM_SCENE_DEFAULTS.cameraBase.z
    )
    this.engine.controls.target.set(
      SHOWROOM_SCENE_DEFAULTS.orbitTarget.x,
      SHOWROOM_SCENE_DEFAULTS.orbitTarget.y,
      SHOWROOM_SCENE_DEFAULTS.orbitTarget.z
    )

    const tl = gsap.timeline()
    this.enterTimeline = tl

    this.cinematic.flyTo(
      [SHOWROOM_CAMERA.x, SHOWROOM_CAMERA.y, SHOWROOM_CAMERA.z],
      [SHOWROOM_SCENE_DEFAULTS.orbitTarget.x, SHOWROOM_SCENE_DEFAULTS.orbitTarget.y, SHOWROOM_SCENE_DEFAULTS.orbitTarget.z],
      duration,
      SHOWROOM_EASE.inOut,
      {
        onComplete: () => {
          this.engine.syncOrbitControls()
          this.engine.setInteractLocked(false)
        }
      }
    )

    tl.to(
      params,
      {
        lightAlpha: 1,
        lightIntensity: 1,
        reflectIntensity: SHOWROOM_LIGHTING.floorReflectIntensity,
        duration: SHOWROOM_LIGHTING.lightFadeInDuration,
        delay: SHOWROOM_LIGHTING.lightFadeInDelay,
        ease: SHOWROOM_EASE.inOut,
        onUpdate: () => {
          lightColor.copy(black).lerp(white, params.lightAlpha)
          handles.lightMaterial.emissive.copy(lightColor)
          handles.lightMaterial.emissiveIntensity = params.lightIntensity
          handles.lightMaterial.needsUpdate = true
          setLightPanelState(handles, params.lightIntensity, { fadeOpacity: false })
          updateReflecFloorUniforms(handles.floorMaterial, {
            reflectIntensity: params.reflectIntensity,
            floorColor: lightColor,
            floorTintMul: this.reflectionFloorTintMul
          })
        }
      },
      0
    )

    tl.to(
      params,
      {
        envIntensity: SHOWROOM_LIGHTING.envIntensity,
        duration: SHOWROOM_LIGHTING.envFadeInDuration,
        delay: SHOWROOM_LIGHTING.envFadeInDelay,
        ease: SHOWROOM_EASE.inOut,
        onUpdate: () => {
          this.engine.environment.dynamicEnvironment?.setIntensity(params.envIntensity)
        }
      },
      0
    )

    tl.to(
      params,
      {
        envWeight: SHOWROOM_LIGHTING.envWeight,
        duration: SHOWROOM_LIGHTING.envFadeInDuration,
        ease: SHOWROOM_EASE.inOut,
        onUpdate: () => {
          this.engine.environment.dynamicEnvironment?.setWeight(params.envWeight)
        }
      },
      `-=${SHOWROOM_LIGHTING.envWeightFadeOverlap}`
    )

    if (onComplete) tl.eventCallback('onComplete', onComplete)
  }

  async applyViewMode(mode: ShowroomViewMode): Promise<void> {
    if (this.engine.isInteractLocked && mode !== this.viewMode) return

    if (mode !== 'aero') this.setAeroMode(false)
    if (mode !== 'drive' && this.driveActive) this.exitDriveMode()
    if (mode === 'drive' && this.driveActive) {
      this.viewMode = mode
      return
    }

    switch (mode) {
      case 'customize':
        this.resetShowroomCamera()
        break
      case 'drive':
        this.enterDriveMode()
        break
      case 'aero':
        this.resetShowroomCamera()
        this.setAeroMode(true)
        break
      case 'radar':
        this.resetShowroomCamera()
        this.moveCameraTo(1.6, 0.95, 3.8, 0, 0.72, 0)
        break
      case 'size':
        this.resetShowroomCamera()
        this.moveCameraTo(4.2, 1.35, 5.8, 0, 0.65, 0)
        break
    }

    this.viewMode = mode
  }

  toggleDrive(): void {
    if (this.engine.isInteractLocked) return
    if (this.driveActive) this.exitDriveMode()
    else this.enterDriveMode()
  }

  beginHoldDrive(): void {
    if (this.engine.isInteractLocked || this.driveActive) return
    this.enterDriveMode()
  }

  endHoldDrive(): void {
    if (!this.driveActive) return
    this.exitDriveMode(true)
  }

  async toggleRush(): Promise<void> {
    this.toggleDrive()
  }

  async beginHoldRush(): Promise<void> {
    this.beginHoldDrive()
  }

  endHoldRush(): void {
    this.endHoldDrive()
  }

  tickFrame(dt: number, elapsed: number): void {
    if (this.showroomHandles?.floorMaterial && this.floorVisible) {
      updateReflecFloorUniforms(this.showroomHandles.floorMaterial, {
        time: elapsed,
        speed: this.floorScrollSpeed
      })
    }
    if (this.wheelSpinSpeed > 0) {
      for (const node of this.spinTargets) {
        node.rotateZ(-this.wheelSpinSpeed * dt)
      }
    }
    if (this.windLines?.visible) scrollAeroWindLines(this.windLines, 6, dt)
    if (this.driveParticles?.object.visible) {
      const timeScale = 1 + this.rushSpeed * 0.12
      this.driveParticles.setTimeScale(timeScale)
      this.driveParticles.update(dt)
    }
    if (this.driveActive) {
      this.wheelSpinSpeed = this.rushSpeed * SHOWROOM_LIGHTING.wheelSpinPerSpeed
      this.floorScrollSpeed = this.rushSpeed
      if (this.cameraShake.currentIntensity > 0) {
        this.cameraShake.apply(this.engine.threeCamera, dt)
      }
    }
  }

  dispose(): void {
    this.unsubLoop?.()
    this.unsubLoop = null
    this.cinematic.dispose()
    this.enterTimeline?.kill()
    this.driveTimeline?.kill()
    this.cameraShake.reset()
    this.setAeroMode(false)
    if (this.windLines) {
      this.engine.threeScene.remove(this.windLines)
      this.windLines.geometry.dispose()
      ;(this.windLines.material as THREE.Material).dispose()
      this.windLines = null
    }
    this.driveParticles?.object.removeFromParent()
    this.driveParticles?.dispose()
    this.driveParticles = null
  }

  /** su7 World.rush */
  private enterDriveMode(): void {
    const handles = this.showroomHandles
    if (!handles) return

    this.setAeroMode(false)
    this.driveActive = true
    this.viewMode = 'drive'
    this.driveTimeline?.kill()
    this.cameraShake.reset()
    this.rushSpeed = 0
    this.ensureDriveParticles()
    this.driveParticles?.setVisible(true)

    setFloorVisible(handles, true)
    this.setFloorVisible(true)

    const floorColor = new THREE.Color()
    const black = new THREE.Color(0x000000)
    const white = new THREE.Color(0xffffff)
    const cam = this.engine.threeCamera as THREE.PerspectiveCamera

    const params = {
      speed: 0,
      lightOpacity: 1,
      floorLerpColor: 0,
      envIntensity: SHOWROOM_LIGHTING.envIntensity,
      speedUpOpacity: 0,
      cameraFov: SHOWROOM_LIGHTING.cameraFov,
      bodyEnv: SHOWROOM_LIGHTING.bodyEnvMapIntensity,
      shake: 0,
      bloom: SHOWROOM_LIGHTING.bloomIntensity,
      bloomSmooth: SHOWROOM_LIGHTING.bloomLuminanceSmoothing
    }

    const tl = gsap.timeline({ onUpdate: () => {
      this.rushSpeed = params.speed
    }})
    this.driveTimeline = tl

    tl.to(params, {
      speed: SHOWROOM_LIGHTING.rushSpeedMid,
      duration: SHOWROOM_LIGHTING.rushSpeedMidDuration,
      ease: SHOWROOM_EASE.out
    }).to(params, {
      speed: SHOWROOM_LIGHTING.rushSpeedMax,
      duration: SHOWROOM_LIGHTING.rushSpeedMaxDuration,
      ease: SHOWROOM_EASE.out
    })

    tl.to(
      params,
      {
        lightOpacity: 0,
        duration: SHOWROOM_LIGHTING.rushLightFadeDuration,
        ease: SHOWROOM_EASE.out,
        onUpdate: () => setLightPanelOpacity(handles, params.lightOpacity)
      },
      0
    )

    tl.fromTo(
      params,
      { floorLerpColor: 0 },
      {
        floorLerpColor: 1,
        duration: SHOWROOM_LIGHTING.rushFloorLerpDuration,
        ease: SHOWROOM_EASE.none,
        onUpdate: () => {
          floorColor.copy(white).lerp(black, params.floorLerpColor)
          updateReflecFloorUniforms(handles.floorMaterial, {
            floorColor,
            reflectIntensity: SHOWROOM_LIGHTING.floorReflectIntensity
          })
        }
      },
      0
    )

    tl.to(
      params,
      {
        envIntensity: SHOWROOM_LIGHTING.envIntensityRush,
        duration: SHOWROOM_LIGHTING.rushEnvFadeDuration,
        ease: SHOWROOM_EASE.out,
        onUpdate: () => this.engine.environment.dynamicEnvironment?.setIntensity(params.envIntensity)
      },
      0
    )

    tl.to(
      params,
      {
        speedUpOpacity: 1,
        cameraFov: SHOWROOM_LIGHTING.cameraFovRush,
        duration: SHOWROOM_LIGHTING.rushFovDuration,
        ease: SHOWROOM_EASE.out,
        onUpdate: () => {
          cam.fov = params.cameraFov
          cam.updateProjectionMatrix()
        }
      },
      0
    )

    if (this.vehicleRoot) {
      const vehicle = this.vehicleRoot
      tl.call(
        () => {
          const captured = this.engine.environment.captureScene([vehicle])
          this.engine.environment.setOverride(captured)
        },
        undefined,
        SHOWROOM_LIGHTING.rushSceneCaptureDelay
      )
    }

    tl.to(
      params,
      {
        bodyEnv: SHOWROOM_LIGHTING.bodyEnvMapIntensityRush,
        shake: SHOWROOM_LIGHTING.cameraShakeRush,
        bloomSmooth: SHOWROOM_LIGHTING.bloomLuminanceSmoothingRush,
        bloom: SHOWROOM_LIGHTING.bloomIntensityRush,
        duration: SHOWROOM_LIGHTING.rushEnvBoostDuration,
        ease: SHOWROOM_EASE.out,
        onUpdate: () => {
          setBodyEnvMapIntensity(params.bodyEnv)
          this.cameraShake.setIntensity(params.shake)
          this.engine.setBloomSmoothing(params.bloomSmooth)
          this.engine.setBloomIntensity(params.bloom)
        }
      },
      SHOWROOM_LIGHTING.rushSceneCaptureDelay
    )
  }

  /** su7 World.rushDone */
  private exitDriveMode(fast = false): void {
    const handles = this.showroomHandles
    this.driveActive = false
    this.rushSpeed = 0
    if (this.viewMode === 'drive') this.viewMode = 'customize'

    this.driveTimeline?.kill()
    this.driveTimeline = null
    this.driveParticles?.setVisible(false)
    this.wheelSpinSpeed = 0
    this.floorScrollSpeed = 0
    this.cameraShake.reset()

    const floorColor = new THREE.Color()
    const white = new THREE.Color(0xffffff)
    const cam = this.engine.threeCamera as THREE.PerspectiveCamera

    const params = {
      speed: 0,
      lightOpacity: 0,
      floorLerpColor: 0,
      envIntensity: SHOWROOM_LIGHTING.envIntensityRush,
      cameraFov: SHOWROOM_LIGHTING.cameraFovRush,
      bodyEnv: SHOWROOM_LIGHTING.bodyEnvMapIntensityRush,
      shake: SHOWROOM_LIGHTING.cameraShakeRush,
      bloom: SHOWROOM_LIGHTING.bloomIntensityRush,
      bloomSmooth: SHOWROOM_LIGHTING.bloomLuminanceSmoothingRush
    }

    const durMul = fast ? 0.5 : 1

    const tl = gsap.timeline({
      onComplete: () => {
        this.engine.environment.setOverride(null)
        this.engine.environment.dynamicEnvironment?.setIntensity(SHOWROOM_LIGHTING.envIntensity)
      }
    })

    tl.to(params, {
      speed: 0,
      duration: SHOWROOM_LIGHTING.rushExitSpeedDuration * durMul,
      ease: SHOWROOM_EASE.out
    })

    if (handles) {
      tl.to(
        params,
        {
          lightOpacity: 1,
          duration: SHOWROOM_LIGHTING.rushLightFadeDuration * durMul,
          ease: SHOWROOM_EASE.out,
          onUpdate: () => setLightPanelOpacity(handles, params.lightOpacity)
        },
        0
      )

      tl.fromTo(
        params,
        { floorLerpColor: 0 },
        {
          floorLerpColor: 1,
          duration: SHOWROOM_LIGHTING.rushFloorLerpDuration * durMul,
          ease: SHOWROOM_EASE.none,
          onUpdate: () => {
            floorColor.lerp(white, params.floorLerpColor)
            updateReflecFloorUniforms(handles.floorMaterial, {
              floorColor,
              reflectIntensity: SHOWROOM_LIGHTING.floorReflectIntensity
            })
          }
        },
        0
      )
    }

    tl.to(
      params,
      {
        envIntensity: SHOWROOM_LIGHTING.envIntensity,
        duration: SHOWROOM_LIGHTING.rushEnvFadeDuration * durMul,
        ease: SHOWROOM_EASE.out,
        onUpdate: () => this.engine.environment.dynamicEnvironment?.setIntensity(params.envIntensity)
      },
      0
    )

    tl.to(
      params,
      {
        cameraFov: SHOWROOM_LIGHTING.cameraFov,
        duration: SHOWROOM_LIGHTING.rushFovDuration * durMul,
        ease: SHOWROOM_EASE.out,
        onUpdate: () => {
          cam.fov = params.cameraFov
          cam.updateProjectionMatrix()
        }
      },
      0
    )

    tl.to(
      params,
      {
        bodyEnv: SHOWROOM_LIGHTING.bodyEnvMapIntensity,
        shake: 0,
        bloomSmooth: SHOWROOM_LIGHTING.bloomLuminanceSmoothing,
        bloom: SHOWROOM_LIGHTING.bloomIntensity,
        duration: SHOWROOM_LIGHTING.rushExitRestoreDuration * durMul,
        ease: SHOWROOM_EASE.out,
        onUpdate: () => {
          setBodyEnvMapIntensity(params.bodyEnv)
          this.cameraShake.setIntensity(params.shake)
          this.engine.setBloomSmoothing(params.bloomSmooth)
          this.engine.setBloomIntensity(params.bloom)
        }
      },
      0
    )
  }

  private setAeroMode(enabled: boolean): void {
    if (enabled === this.aeroActive) return
    this.aeroActive = enabled
    this.engine.webglRenderer.localClippingEnabled = enabled

    if (!enabled) {
      for (const mat of this.aeroMaterials) {
        mat.clippingPlanes = null
        mat.side = THREE.FrontSide
        mat.needsUpdate = true
      }
      this.aeroMaterials = []
      if (this.windLines) this.windLines.visible = false
      return
    }

    if (!this.windLines) {
      this.windLines = createAeroWindLines()
      this.engine.threeScene.add(this.windLines)
    }
    this.windLines.visible = true

    if (!this.vehicleRoot) return
    this.aeroMaterials = setObjectClipping(this.vehicleRoot, [AERO_CLIP], { doubleSide: true })
  }

  private resetShowroomCamera(): void {
    this.cinematic.flyTo(
      [SHOWROOM_CAMERA.x, SHOWROOM_CAMERA.y, SHOWROOM_CAMERA.z],
      [SHOWROOM_SCENE_DEFAULTS.orbitTarget.x, SHOWROOM_SCENE_DEFAULTS.orbitTarget.y, SHOWROOM_SCENE_DEFAULTS.orbitTarget.z],
      1.1,
      SHOWROOM_EASE.inOut
    )
  }

  private moveCameraTo(
    x: number,
    y: number,
    z: number,
    tx: number,
    ty: number,
    tz: number
  ): void {
    this.cinematic.flyTo([x, y, z], [tx, ty, tz], 1.2, SHOWROOM_EASE.inOut)
  }

  private ensureDriveParticles(): void {
    if (this.driveParticles || !this.vehicleRoot) return
    this.driveParticles = createSpeedStreakParticles()
    this.driveParticles.attachTo(this.vehicleRoot, [0, 0.35, 1.8])
    this.driveParticles.setVisible(false)
  }
}
