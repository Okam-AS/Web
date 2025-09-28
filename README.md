# Okam

## Add subrepo

```bash
$ rm -rf .git/modules/Core && rm -rf .git/modules/core
$ git rm --cached core
$ git submodule add https://github.com/Okam-AS/Core.git core/
```

## Run this to deploy:

```bash
$ heroku login
$ git push heroku master
```

## If you get a error about not finding repo in heroku, you have to add a remote:

```bash
$ heroku git:remote -a okam-site
```

### Build Setup

```bash
# install dependencies
$ npm install

# serve with hot reload at localhost:3000
$ npm run dev

# build for production and launch server
$ npm run build
$ npm run start

# generate static project
$ npm run generate
```
