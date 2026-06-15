import type { ITransactionUnit, UnitRecord } from '../domain/types'

export interface IUnitFactory {
  readonly unitType: string
  create(decoded: unknown): ITransactionUnit
}

export class UnitRegistry {
  private readonly factories = new Map<string, IUnitFactory>()

  register(factory: IUnitFactory): void {
    this.factories.set(factory.unitType, factory)
  }

  unregister(unitType: string): void {
    this.factories.delete(unitType)
  }

  has(unitType: string): boolean {
    return this.factories.has(unitType)
  }

  create(unitType: string, decoded: unknown): ITransactionUnit {
    const factory = this.factories.get(unitType)
    if (!factory) {
      throw new Error(`TX_UNKNOWN_UNIT_TYPE: ${unitType}`)
    }
    return factory.create(decoded)
  }

  createFromRecord(record: UnitRecord, body: unknown): ITransactionUnit {
    return this.create(record.unitType, body)
  }
}
