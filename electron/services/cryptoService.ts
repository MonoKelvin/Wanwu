/**
 * v1.0 加密服务预留（SQLCipher / 主密码派生）
 * 当前使用明文 SQLite，后续可在此接入 @journeyapps/sqlcipher
 */
export class CryptoService {
  isEnabled(): boolean {
    return false
  }
}
