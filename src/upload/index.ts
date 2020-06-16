import Resume from './resume'
import Direct from './direct'
import { UploadOptions, UploadHandler, DEFAULT_CHUNK_SIZE } from './base'
import StatisticsLog from '../statisticsLog'

export * from './base'
export * from './resume'

export default function createUploadManager(
  options: UploadOptions,
  handlers: UploadHandler,
  statisticsLog: StatisticsLog
) {
  if (options.config && options.config.forceDirect) {
    return new Direct(options, handlers, statisticsLog)
  }

  return options.file.size > DEFAULT_CHUNK_SIZE
    ? new Resume(options, handlers, statisticsLog)
    : new Direct(options, handlers, statisticsLog)
}
