/** @deprecated 请使用 media --force；保留为别名 */
import { pipelineMedia } from './pipeline-media.mjs'

export async function pipelineCurate(root, opts) {
  console.log('curate → media --force（并行下载）\n')
  await pipelineMedia(root, { ...opts, force: true })
}
