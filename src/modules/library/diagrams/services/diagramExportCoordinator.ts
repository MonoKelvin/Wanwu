import type LogicFlow from '@logicflow/core'

export interface DiagramExportCoordinatorPorts {
  getLf(): LogicFlow | null
  getBackgroundColor(): string
  ensureSnapshotPlugin(): Promise<void>
}

/** 画布导出 PNG / SVG */
export class DiagramExportCoordinator {
  constructor(private readonly ports: DiagramExportCoordinatorPorts) {}

  async exportPng(): Promise<Blob> {
    await this.ports.ensureSnapshotPlugin()
    const lf = this.ports.getLf()
    if (!lf) throw new Error('画布未挂载')
    if (!lf.extension.snapshot) throw new Error('快照插件未就绪')
    const ext = lf.extension.snapshot as unknown as {
      getSnapshot: (name?: string, opts?: { fileType?: string; backgroundColor?: string }) => Promise<string>
    }
    const dataUrl = await ext.getSnapshot('diagram', {
      fileType: 'png',
      backgroundColor: this.ports.getBackgroundColor()
    })
    const res = await fetch(dataUrl)
    return res.blob()
  }

  async exportSvg(): Promise<string> {
    await this.ports.ensureSnapshotPlugin()
    const lf = this.ports.getLf()
    if (!lf) throw new Error('画布未挂载')
    if (!lf.extension.snapshot) throw new Error('快照插件未就绪')
    const ext = lf.extension.snapshot as unknown as {
      getSnapshot: (name?: string, opts?: { fileType?: string }) => Promise<string>
    }
    return ext.getSnapshot('diagram', { fileType: 'svg' })
  }
}
