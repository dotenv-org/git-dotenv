const fs = require('fs')
const dotenv = require('dotenv')

const ENCODING = 'utf8'

const guessPublicKeyName = require('./guessPublicKeyName')

function searchProcessEnv (publicKeyName) {
  if (process.env[publicKeyName] && process.env[publicKeyName].length > 0) {
    return process.env[publicKeyName]
  }
}

function searchEnvFile (publicKeyName, envFilepath) {
  if (fs.existsSync(envFilepath)) {
    const keysSrc = fs.readFileSync(envFilepath, { encoding: ENCODING })
    const keysParsed = dotenv.parse(keysSrc)

    if (keysParsed[publicKeyName] && keysParsed[publicKeyName].length > 0) {
      return keysParsed[publicKeyName]
    }
  }
}

function smartDotenvPublicKey (envFilepath) {
  let publicKey = null
  const publicKeyName = guessPublicKeyName(envFilepath) // DOTENV_PUBLIC_KEY_${ENVIRONMENT}

  // 1. attempt process.env first
  publicKey = searchProcessEnv(publicKeyName)
  if (publicKey) {
    return publicKey
  }

  // 2. attempt .env.keys second (path/to/.env.keys)
  publicKey = searchEnvFile(publicKeyName, envFilepath)
  if (publicKey) {
    return publicKey
  }

  return null
}

module.exports = smartDotenvPublicKey
