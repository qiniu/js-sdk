import { Result } from './types'

export interface HostProvider {
  getUploadHost(): Promise<Result<string>>
}
