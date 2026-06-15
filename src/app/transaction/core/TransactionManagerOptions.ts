export interface TransactionManagerOptions {
  maxSteps?: number
  evictionPolicy?: 'drop-oldest'
  enableMerge?: boolean
  nestMode?: 'flat'
  allowSetIndex?: boolean
}
