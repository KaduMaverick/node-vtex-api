import { defaultFieldResolver, GraphQLField } from 'graphql'
import { SchemaDirectiveVisitor } from 'graphql-tools'
import { APP } from '../../../../../..'
import { GraphQLServiceContext } from '../../typings'

export class Telemetry extends SchemaDirectiveVisitor {
  public visitFieldDefinition(field: GraphQLField<any, GraphQLServiceContext>) {
    const { resolve = defaultFieldResolver, name } = field

    field.resolve = async (root, args, ctx, info) => {
      let failedToResolve = false
      let result: any = null
      let ellapsed: [number, number] = [0, 0]

      try {
        const start = process.hrtime()
        result = await resolve(root, args, ctx, info)
        ellapsed = process.hrtime(start)
      } catch (error) {
        result = error
        failedToResolve = true
      }

      ctx.graphql.status = failedToResolve ? 'error' : 'success'

      const payload = {
        [ctx.graphql.status]: 1,
      }

      metrics.batch(`graphql-telemetry-${APP.NAME}-${name}`, failedToResolve ? undefined : ellapsed, payload)

      if (failedToResolve) {
        throw result
      }

      return result
    }
  }
}

export const telemetryDirectiveTypeDefs = `
directive @telemetry on FIELD_DEFINITION
`
