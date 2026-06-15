export interface IUnitCodec<T = unknown> {
  readonly codecId: string
  encode(value: T): string
  decode(body: string): T
}

export class JsonUnitCodec implements IUnitCodec {
  readonly codecId = 'json'

  encode(value: unknown): string {
    return JSON.stringify(value)
  }

  decode(body: string): unknown {
    return JSON.parse(body) as unknown
  }
}

export class UnitCodecRegistry {
  private readonly codecs = new Map<string, IUnitCodec>()

  constructor(defaultCodec?: IUnitCodec) {
    if (defaultCodec) {
      this.register(defaultCodec)
    } else {
      this.register(new JsonUnitCodec())
    }
  }

  register(codec: IUnitCodec): void {
    this.codecs.set(codec.codecId, codec)
  }

  has(codecId: string): boolean {
    return this.codecs.has(codecId)
  }

  encode(codecId: string, value: unknown): string {
    const codec = this.codecs.get(codecId)
    if (!codec) throw new Error(`TX_UNKNOWN_CODEC: ${codecId}`)
    return codec.encode(value)
  }

  decode(codecId: string, body: string): unknown {
    const codec = this.codecs.get(codecId)
    if (!codec) throw new Error(`TX_UNKNOWN_CODEC: ${codecId}`)
    return codec.decode(body)
  }
}
