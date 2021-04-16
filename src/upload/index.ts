import Resume from './resume'
import Direct from './direct'
import { UploadOptions, UploadHandler } from './base'
import { Logger } from '../logger'
import { MB } from '../utils'

export * from './base'
export * from './resume'

export default function createUploadManager(
  options: UploadOptions,
  handlers: UploadHandler,
  logger: Logger
) {
  if (options.config && options.config.forceDirect) {
    logger.info('ues forceDirect mode.')
    return new Direct(options, handlers, logger)
  }

  if (options.file.size > 4 * MB) {
    logger.info('file size over 4M, use Resume.')
    return new Resume(options, handlers, logger)
  }

  logger.info('file size less than 4M, use Direct.')
  return new Direct(options, handlers, logger)
}
