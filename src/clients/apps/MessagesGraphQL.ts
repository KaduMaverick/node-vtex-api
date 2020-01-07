import { flatten, path, splitEvery, values } from 'ramda'

import { InstanceOptions } from '../../HttpClient'
import { IOContext } from '../../service/worker/runtime/typings'
import { IOMessage } from '../../utils/message'
import { AppGraphQLClient } from './AppGraphQLClient'

type IOMessageInput = Pick<IOMessage, 'id' | 'content' | 'description' | 'behavior'>

export interface IndexedMessageV2 {
  messages: IOMessageInputV2[]
  from: string
}

export interface IOMessageInputV2 {
  content: string
  context?: string
  behavior?: Behavior
}

export type Behavior = 'FULL' | 'USER_ONLY' | 'USER_AND_APP'

export interface IOMessageV2 extends IOMessageInputV2 {
  from: string
  to: string
}

interface MessagesInput {
  provider: string,
  messages: IOMessageInput[],
}

export interface IOMessageSaveInput extends IOMessageInput {
  content: string
}

export interface MessageSaveInputV2 {
  srcLang: string
  srcMessage: string
  context?: string
  targetMessage: string
  groupContext?: string
}

export interface Translate {
  messages: MessagesInput[]
  from?: string
  to: string
}

export interface TranslateInputV2 {
  indexedByFrom: IndexedMessageV2[]
  to: string
  depTree?: string
}

export interface SaveArgs {
  to: string
  messagesByProvider: Array<{
    messages: IOMessageSaveInput[]
    provider: string
  }>
}

export interface SaveArgsV2 {
  fireEvent?: boolean
  to: string
  messages: MessageSaveInputV2[]
}

interface TranslateResponse {
  newTranslate: string[]
}

interface TranslatedV2 {
  translate: string[]
}

const MAX_BATCH_SIZE = 650

export class MessagesGraphQL extends AppGraphQLClient {
  constructor(vtex: IOContext, options?: InstanceOptions) {
    super('vtex.messages@1.x', vtex, options)
  }

  public translate = async (args: Translate): Promise<string[]> => this.graphql.query<TranslateResponse, { args: Translate }>({
    query: `
    query Translate($args: NewTranslateArgs!) {
      newTranslate(args: $args)
    }
    `,
    variables: { args },
  }, {
    metric: 'messages-translate',
  }).then(path(['data', 'newTranslate'])) as Promise<TranslateResponse['newTranslate']>

  public translateV2 = (args: TranslateInputV2) => {
    const { indexedByFrom, ...rest } = args

    const allMessages: Array<{from: string, message: IOMessageInputV2}> = flatten(indexedByFrom.map(({ from, messages }) =>
      messages.map(message => ({from, message}))
    ))

    const batchedMessages = splitEvery(MAX_BATCH_SIZE, allMessages)
    return Promise.all(batchedMessages.map(batch => {
      const indexedBatch = batch.reduce((acc, {from, message}) => {
        if (!acc[from]) {
          acc[from] = {
            from,
            messages: [],
          }
        }
        acc[from].messages.push(message)
        return acc
      }, {} as Record<string, IndexedMessageV2>)
      const batchArgs = {
        ...rest,
        indexedByFrom: values(indexedBatch),
      }
      return this.graphql.query<TranslatedV2, { args: TranslateInputV2 }>({
        query: `
      query Translate($args: TranslateArgs!) {
        translate(args: $args)
      }
      `,
        variables: { args: batchArgs },
      }, {
        metric: 'messages-translate-v2',
      }).then(path(['data', 'translate'])) as Promise<TranslatedV2['translate']>
    })).then(flatten)
  }

  public save = (args: SaveArgs): Promise<boolean> => this.graphql.mutate<boolean, { args: SaveArgs }>({
    mutate: `
    mutation Save($args: SaveArgs!) {
      save(args: $args)
    }
    `,
    variables: { args },
  }, {
    metric: 'messages-save-translation',
  }).then(path(['data', 'save'])) as Promise<boolean>

  public saveV2 = (args: SaveArgsV2): Promise<boolean> => this.graphql.mutate<boolean, { args: SaveArgsV2 }>({
    mutate: `
    mutation SaveV2($args: SaveArgsV2!) {
      saveV2(args: $args)
    }
    `,
    variables: { args },
  }, {
    metric: 'messages-saveV2-translation',
  }).then(path(['data', 'saveV2'])) as Promise<boolean>

}

