# Touchpoint.io - Loyalty

## Getting started

  - To prepare everything for building or developing you need to install **Node JS** (http://nodejs.org/). After installation run ```npm install``` in root directory to install all necessary tools.
  - you also need to have a grunt cli installed globally: `npm install grunt-cli -g`
  - All scripts needed to build and run the app are listed in ```package.json```

### Scripts

```sh
# Building and starting the app in the browser with live update:
$ npm run dev
# Building the app for distribution:
$ npm run build
# Test:
$ npm run test
# Test in debug browser:
$ npm run test-debug
# Build android version:
$ npm run android
# Build ios version
$ npm run ios
# Jenkins script without xcode handling
$ npm run ios-jenkins
```

### Params

Following values can be overridden by passing params to the npm scripts
- `build`: sets the app version
- `superd`: sets the superdomain, default: `tp-devel.com`
- `signd`: sets the signup domain, default: `c1`
- `release`: building an android/ios release: default `false`

```sh
# params can be passed as follows
$ npm run android -- --release=true --build=9.8.7
```

