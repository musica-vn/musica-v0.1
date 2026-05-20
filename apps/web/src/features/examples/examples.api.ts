import type { paths } from '../../shared/api/generated/schema'
import { apiGet } from '../../shared/api/http'

type ExamplesOkResponse =
  paths['/examples']['get']['responses'][200]['content']['application/json']

export type ExampleItem = ExamplesOkResponse['data']['items'][number]
export type ExamplesMeta = ExamplesOkResponse['meta']

export const listExamples = async (params: {
  page: number
  pageSize: number
}): Promise<{ items: ExampleItem[]; meta: ExamplesMeta }> => {
  const result = await apiGet<ExamplesOkResponse['data'], ExamplesOkResponse['meta']>(
    '/examples',
    { params },
  )

  return { items: result.data.items, meta: result.meta }
}
