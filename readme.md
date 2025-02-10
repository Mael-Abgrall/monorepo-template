# Monorepo template

This is a template to use for my work; with what I believe would cover 80% of greenfield projects using serverless tools.

## Tech & architecture

- Frontend is an SPA with VueJS, deployed on Cloudflare pages.
- Database is PostgreSQL with Drizzle ORM (aimed to be connected at Neon, but should be swapped easily).
- API is using Hono, deployed on Cloudflare workers. It should be deployed easily on container platforms by changing the index.ts.
- Posthog for analytics and error reporting
- Turbo to orchestrate the build, tsup for building packages
- No need for `dist/*` (except during deployment)
- Github actions for QA and deployment
- a "me" flavored version of hexagonal architecture and monorepo

## Folder structure

The architecture is as follow:

- `frontends` is for the frontends applications and packages
- `services` is for the backend applications and packages
- `shared` is the only package that can be shared between frontend and backend code (the functions here are safe to use in both contexts). It also holds the API schemas.

The frontends and services folders are further split in two:

- `apps` is for the applications, they have both the interface exposed to consumers (API or UI), and the cores.
- `packages` is for the individual packages. Those packages usually expose only the functions to be used and nothing more. There are exceptions when the packages have a lot of exposed files and functions.

## conventions

- Files are named based on the package they live in for easy search
- Whenever possible, the code uses functional programming, and named parameters for functions.
- Tests are written next to the original file, and the folder is split into 2: one for unit tests, and one for integration tests.

## Starting the project

```bash
yarn workspace app dev
yarn workspace api dev
```
