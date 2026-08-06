# Okam

## Add subrepo

```bash
$ rm -rf .git/modules/Core && rm -rf .git/modules/core
$ git rm --cached core
$ git submodule add https://github.com/Okam-AS/Core.git core/
```

### Build Setup

```bash
# install dependencies
$ npm install

# serve with hot reload at localhost:3000
# API_BASE_URL is REQUIRED here and has no default -- see "Which backend am I talking to?" below
$ API_BASE_URL=http://localhost:5080 npm run dev

# build for production and launch server
$ npm run build
$ npm run start

# generate static project
$ npm run generate
```

### Which backend am I talking to?

`API_BASE_URL` picks the ONE origin this app addresses. It is inlined at **build** time, so it is
chosen by the process that compiles the bundle and nothing at runtime can change it.

**A dev server refuses to start without it.** It used to fall back to the deployed API, which made
`npm run dev` a live client against real venues — and this app has admin pages that overwrite a
store's record on Save, and a register whose cash sale is a journaled fiscal event. Forgetting one
variable undid every other precaution, so there is now no value to forget your way into.

```bash
$ API_BASE_URL=http://localhost:5080 npm run dev     # a backend you are running
$ echo API_BASE_URL=http://localhost:5080 >> .env    # remembered; Nuxt reads .env, .gitignore covers it
```

Pointing a dev build at the deployed API is still allowed. It has to be typed:

```bash
$ API_BASE_URL=https://okamapi.azurewebsites.net npm run dev
```

**Deployed builds are unaffected.** `npm run build`, `npm run start` and `npm run generate` run with
`NODE_ENV=production` and keep `https://okamapi.azurewebsites.net` as their default — which is what
both deploys of this repository rely on, neither of them setting the variable:
`.github/workflows/nuxtjs.yml` (okam.no, GitHub Pages) and `vercel.json` (www.okam-swiss.ch, built
from this repository with `OKAM_EDITION=ch`).

`test/nuxt-config-api-base-url.test.js` holds both halves of that in place.
