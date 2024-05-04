const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')
const { PrivateKey } = require('eciesjs')

const guessPrivateKeyName = require('./guessPrivateKeyName')

const ENCODING = 'utf8'

function findOrCreatePublicKey (envFilepath, envKeysFilepath) {
  // filename
  const filename = path.basename(envFilepath)
  const privateKeyName = guessPrivateKeyName(envFilepath)

  // src
  let envSrc = fs.readFileSync(envFilepath, { encoding: ENCODING })
  let keysSrc = ''
  if (fs.existsSync(envKeysFilepath)) {
    keysSrc = fs.readFileSync(envKeysFilepath, { encoding: ENCODING })
  }

  // parsed
  const envParsed = dotenv.parse(envSrc)
  const keysParsed = dotenv.parse(keysSrc)

  // if DOTENV_PUBLIC_KEY already present then go no further
  if (envParsed.DOTENV_PUBLIC_KEY && envParsed.DOTENV_PUBLIC_KEY.length > 0) {
    return {
      envSrc,
      keysSrc,
      publicKey: envParsed.DOTENV_PUBLIC_KEY,
      privateKey: keysParsed[privateKeyName]
    }
  }

  // generate key pair
  const keyPair = new PrivateKey()
  const publicKey = keyPair.publicKey.toHex()
  const privateKey = keyPair.secret.toString('hex')

  // publicKey
  const prependPublicKey = [
    `#/-------------------[DOTENV_PUBLIC_KEY]--------------------/`,
    `#/            public-key encryption for .env files          /`,
    `#/       [how it works](https://dotenvx.com/encryption)     /`,
    `#/----------------------------------------------------------/`,
    `DOTENV_PUBLIC_KEY="${publicKey}"`,
    '',
    `# ${filename}`,
  ].join('\n')

  // privateKey
  const firstTimeKeysSrc = [
    `#/------------------!DOTENV_PRIVATE_KEYS!-------------------/`,
    `#/ private decryption keys. DO NOT commit to source control /`,
    `#/     [how it works](https://dotenvx.com/encryption)       /`,
    `#/----------------------------------------------------------/`
  ].join('\n')
  const appendPrivateKey = [
    `# ${filename}`,
    `${privateKeyName}="${privateKey}"`,
    ''
  ].join('\n')

  envSrc = `${prependPublicKey}\n${envSrc}`
  keysSrc = keysSrc.length > 1 ? keysSrc : `${firstTimeKeysSrc}\n`
  keysSrc = `${keysSrc}\n${appendPrivateKey}`

  fs.writeFileSync(envFilepath, envSrc)
  fs.writeFileSync(envKeysFilepath, keysSrc)

  return {
    envSrc,
    keysSrc,
    publicKey,
    privateKey
  }
}

module.exports = findOrCreatePublicKey
