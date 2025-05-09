/* v8 ignore start */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { environment, type Environment } from 'service-utils/environment';
import type { Variables } from './context';
import { environmentMiddleware } from './middleware/api-middleware-environment';
import { errorHandler } from './middleware/api-middleware-errors';
import { authRouter } from './routes/api-routes-auth';
import { chatRouter } from './routes/api-routes-chat';
import { documentsRouter } from './routes/api-routes-documents';
import { spaceRouter } from './routes/api-routes-space';
import { userRouter } from './routes/api-routes-user';

const app = new Hono<{ Bindings: Environment; Variables: Variables }>();

app.use(environmentMiddleware);
app.onError(errorHandler);
app.use('*', async (context, next) => {
  const origin =
    environment.DOMAIN === 'localhost'
      ? ['http://localhost:5173', 'http://localhost:8787']
      : ['https://app.example.com', 'https://api.example.com']; // todo update this url
  const corsMiddlewareHandler = cors({
    credentials: true,
    maxAge: 600,
    origin,
  });
  return corsMiddlewareHandler(context, next);
});

app.route('/auth', authRouter);
app.route('/user', userRouter);
app.route('/chat', chatRouter);
app.route('/space', spaceRouter);
app.route('/documents', documentsRouter);

// eslint-disable-next-line import-x/no-default-export -- needed for CF workers
export default app;
/* v8 ignore end */
