declare module 'howler' {
  export class Howl {
    constructor(options: {
      src: string | string[]
      format?: string[]
      html5?: boolean
      volume?: number
      onload?: () => void
      onplay?: () => void
      onpause?: () => void
      onstop?: () => void
      onend?: () => void
      onloaderror?: (id: number, err: unknown) => void
      onplayerror?: (id: number, err: unknown) => void
    })
    on(event: string, handler: () => void): this
    play(id?: number): number
    pause(id?: number): this
    stop(id?: number): this
    playing(id?: number): boolean
    seek(seek?: number, id?: number): number | this
    duration(id?: number): number
    volume(volume?: number, id?: number): number | this
    mute(muted?: boolean, id?: number): boolean | this
    unload(): void
  }
}
