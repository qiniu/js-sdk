import Resume from './resume'
import Direct from './direct'
import { UploadOptions, UploadHandler } from './base'
import StatisticsLogger from '../statisticsLog'
import { MB } from '../utils'

export * from './base'
export * from './resume'

export default function createUploadManager(
  options: UploadOptions,
  handlers: UploadHandler,
  statisticsLogger: StatisticsLogger
) {
  if (options.config && options.config.forceDirect) {
    return new Direct(options, handlers, statisticsLogger)
  }

  return options.file.size > 4 * MB
    ? new Resume(options, handlers, statisticsLogger)
    : new Direct(options, handlers, statisticsLogger)
}
