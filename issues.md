# TODO

## todo now

- CI/CD pipelines
- Deploy to CF
- Branding + split projects

## urgent

- Use clause 3.5 instead of 3.7
- add logs on what's happening with the orchestrator
- Log the orchestrator output in debug
- log in debug the messages sent to bedrock

## When done

- Handle 409 errors with Claude
- Upload folders (https://stackoverflow.com/questions/42239663/upload-folder-and-all-its-content-in-javascript)
- parser to markdown instead of raw text
- refactor the messages into a more raw format (use the LanguageModelMessage format, and put everything in a single jsonb)
- better observability: https://pashpashpash.substack.com/p/why-does-my-rag-suck-and-how-do-i

```
- Questions being asked
- Vector embeddings search for retrieval. Extra points if you also have traditional text search as well
- Thumbs up/down feedback + checkboxes for categorising feedback
- Reranker score for your retrieved context
- Cosine similarity scores for retrieved embeddings
- Average values of these metrics and how they correlate with user feedback (thumbs up/down)
```

## Other issues

### From frontend

- LLM output to html (MD rendering)

### From claude

On throttling exception (catch, wait, retry)
-> may require to rewrite and remove the SDK

```bash


✘ [ERROR] { context: 'ai-providers-lm-aws.ts' } ThrottlingException: Too many requests, please wait before trying again.

      at de_ThrottlingExceptionRes
  (file:///home/mael/Documents/monorepo-template/node_modules/@aws-sdk/client-bedrock-runtime/dist-es/protocols/Aws_restJson1.js:470:23)
      at de_CommandError
  (file:///home/mael/Documents/monorepo-template/node_modules/@aws-sdk/client-bedrock-runtime/dist-es/protocols/Aws_restJson1.js:297:25)
      at null.<anonymous> (async
  file:///home/mael/Documents/monorepo-template/services/apps/api/.wrangler/tmp/dev-MT1D29/development.js:52201:20)
      at null.<anonymous> (async
  file:///home/mael/Documents/monorepo-template/services/apps/api/.wrangler/tmp/dev-MT1D29/development.js:52321:18)
      at null.<anonymous> (async
  file:///home/mael/Documents/monorepo-template/services/apps/api/.wrangler/tmp/dev-MT1D29/development.js:58069:38)
      at null.<anonymous> (async
  file:///home/mael/Documents/monorepo-template/services/apps/api/.wrangler/tmp/dev-MT1D29/development.js:51948:22)
      at async claude37SonnetStream
  (file:///home/mael/Documents/monorepo-template/services/packages/ai/src/providers/lm/ai-providers-lm-aws.ts:49:22)
      at async completeMessage
  (file:///home/mael/Documents/monorepo-template/services/core/src/chat/core-chat.ts:158:20)
      at async completeNewConversation
  (file:///home/mael/Documents/monorepo-template/services/core/src/chat/core-chat.ts:64:3)
      at null.<anonymous> (async
  file:///home/mael/Documents/monorepo-template/services/apps/api/.wrangler/tmp/dev-MT1D29/development.js:62480:11)
  {
    '$fault': 'client',
    '$metadata': {
      httpStatusCode: 429,
      requestId: 'a7561a9b-6bb4-4bc7-be74-883c1f6fe8e5',
      extendedRequestId: undefined,
      cfId: undefined,
      attempts: 3,
      totalRetryDelay: 326
    }
  }


✘ [ERROR] { context: 'api-routes-chat.ts' } error while streaming

  { context: 'api-routes-chat.ts' } ThrottlingException: Too many requests, please wait
  before trying again.
      at de_ThrottlingExceptionRes
  (file:///home/mael/Documents/monorepo-template/node_modules/@aws-sdk/client-bedrock-runtime/dist-es/protocols/Aws_restJson1.js:470:23)
      at de_CommandError
  (file:///home/mael/Documents/monorepo-template/node_modules/@aws-sdk/client-bedrock-runtime/dist-es/protocols/Aws_restJson1.js:297:25)
      at null.<anonymous> (async
  file:///home/mael/Documents/monorepo-template/services/apps/api/.wrangler/tmp/dev-MT1D29/development.js:52201:20)
      at null.<anonymous> (async
  file:///home/mael/Documents/monorepo-template/services/apps/api/.wrangler/tmp/dev-MT1D29/development.js:52321:18)
      at null.<anonymous> (async
  file:///home/mael/Documents/monorepo-template/services/apps/api/.wrangler/tmp/dev-MT1D29/development.js:58069:38)
      at null.<anonymous> (async
  file:///home/mael/Documents/monorepo-template/services/apps/api/.wrangler/tmp/dev-MT1D29/development.js:51948:22)
      at async claude37SonnetStream
  (file:///home/mael/Documents/monorepo-template/services/packages/ai/src/providers/lm/ai-providers-lm-aws.ts:49:22)
      at async completeMessage
  (file:///home/mael/Documents/monorepo-template/services/core/src/chat/core-chat.ts:158:20)
      at async completeNewConversation
  (file:///home/mael/Documents/monorepo-template/services/core/src/chat/core-chat.ts:64:3)
      at null.<anonymous> (async
  file:///home/mael/Documents/monorepo-template/services/apps/api/.wrangler/tmp/dev-MT1D29/development.js:62480:11)
  {
    '$fault': 'client',
    '$metadata': {
      httpStatusCode: 429,
      requestId: 'a7561a9b-6bb4-4bc7-be74-883c1f6fe8e5',
      extendedRequestId: undefined,
      cfId: undefined,
      attempts: 3,
      totalRetryDelay: 326
    }
  }
```
