import { Result } from './types'

// TODO: there is nothing reference this interface.
//   should we remove it and create a more common interface in `upload/common/host`?
export interface HostProvider {
  getUploadHost(): Promise<Result<string>>
}
