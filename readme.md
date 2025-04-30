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

- `apps` is for the applications, they have both the interface exposed to consumers (API or UI). The apps do not have access to the packages, only the core exposes functions to the apps.
- `core` for the core functions; in a traditionally MVC architecture, this would be the controllers. It is split into business logic and data access.
- `packages` is for the individual packages. Those packages usually expose only the functions to be used and nothing more through `package.json` exports. There are exceptions when the packages have a lot of exposed files and functions.

## conventions

- Files are named based on the package they live in for easy search
- Whenever possible, the code uses functional programming, and named parameters for functions. Although, don't forget that code readability >> functional programming.
- Tests are written next to the original file, and the folder is split into 2: one for unit tests, and one for integration tests.

## Starting the project

```bash
yarn workspace app dev
yarn workspace api dev
```

## Create a private fork & sync your project with the template

### Create a private fork

```bash
git clone --bare git@github.com:Mael-Abgrall/monorepo-template.git
```

- Create a new repository on github; then push the template to it

```bash
cd monorepo-template
git push --mirror <your-repo>
```

- Add the required secrets from the CICD pipelines to github
- Remove and replace the monorepo-template by your project

```bash
rm -rf monorepo-template
git clone <your-repo>
```

- Add the monorepo as an upstream remote & disable push (optional if you want to sync any updates)

```bash
git remote add monorepo-template https://github.com/maelvls/monorepo-template.git
git remote set-url --push monorepo-template disabled
```

### Sync your project with the template

```bash
git fetch monorepo-template
git checkout <your-branch>
git merge monorepo-template/main
```
