/* v8 ignore start */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { environment, type Environment } from 'service-utils/environment';
import type { Variables } from './context.js';
import { environmentMiddleware } from './middleware/api-middleware-environment.js';
import { errorHandler } from './middleware/api-middleware-errors.js';
import { authRouter } from './routes/api-routes-auth.js';

const app = new Hono<{ Bindings: Environment; Variables: Variables }>();

app.use(environmentMiddleware);
app.onError(errorHandler);
app.use('*', async (context, next) => {
  const origin =
    environment.DOMAIN === 'localhost'
      ? ['http://localhost:5173', 'http://localhost:8787']
      : ['https://app.example.com', 'https://api.example.com'];
  const corsMiddlewareHandler = cors({
    credentials: true,
    maxAge: 600,
    origin,
  });
  return corsMiddlewareHandler(context, next);
});

app.route('/auth', authRouter);

// eslint-disable-next-line import-x/no-default-export -- needed for CF workers
export default app;
/* v8 ignore end */
