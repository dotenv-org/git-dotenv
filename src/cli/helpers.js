const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { spawn, execSync } = require('child_process')
const xxhash = require('xxhashjs')

const XXHASH_SEED = 0xABCD
const NONCE_BYTES = 12

const main = require('./../lib/main')
const logger = require('./../shared/logger')

const RESERVED_ENV_FILES = ['.env.vault', '.env.projects', '.env.keys', '.env.me', '.env.x']
const REPORT_ISSUE_LINK = 'https://github.com/dotenvx/dotenvx/issues/new'

const sleep = function (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// resolve path based on current running process location
const resolvePath = function (filepath) {
  return path.resolve(process.cwd(), filepath)
}

const executeCommand = function (subCommand, env) {
  const subprocess = spawn(subCommand[0], subCommand.slice(1), {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...env }
  })

  subprocess.on('close', (code) => {
    if (code > 0) {
      logger.error(`command [${subCommand.join(' ')}] failed (code: ${code})`)
      logger.error('')
      logger.error(`  try without dotenvx: [${subCommand.join(' ')}]`)
      logger.error('')
      logger.error('if that succeeds, then dotenvx is the culprit. report issue:')
      logger.error(`<${REPORT_ISSUE_LINK}>`)
    }

    process.exit(code)
  })

  subprocess.on('error', (err) => {
    logger.error(err)
    logger.error(`command [${subCommand.join(' ')}] failed`)
    logger.error('')
    logger.error(`  try without dotenvx: [${subCommand.join(' ')}]`)
    logger.error('')
    logger.error('if that succeeds, then dotenvx is the culprit. report issue:')
    logger.error(`<${REPORT_ISSUE_LINK}>`)

    process.exit(1)
  })
}

const pluralize = function (word, count) {
  // simple pluralization: add 's' at the end
  if (count === 0 || count > 1) {
    return word + 's'
  } else {
    return word
  }
}

const findEnvFiles = function (directory) {
  const files = fs.readdirSync(directory)

  const envFiles = files.filter(file =>
    file.startsWith('.env') &&
    !file.endsWith('.previous') &&
    !RESERVED_ENV_FILES.includes(file)
  )

  return envFiles
}

const guessEnvironment = function (file) {
  const splitFile = file.split('.')
  const possibleEnvironment = splitFile[2] // ['', 'env', environment']

  if (!possibleEnvironment || possibleEnvironment.length === 0) {
    return 'development'
  }

  return possibleEnvironment
}

const generateDotenvKey = function (environment) {
  const rand = crypto.randomBytes(32).toString('hex')

  return `dotenv://:key_${rand}@dotenvx.com/vault/.env.vault?environment=${environment.toLowerCase()}`
}

const encryptFile = function (filepath, dotenvKey, encoding) {
  const key = _parseEncryptionKeyFromDotenvKey(dotenvKey)
  const message = fs.readFileSync(filepath, encoding)

  const ciphertext = encrypt(key, message)

  return ciphertext
}

const encrypt = function (key, message) {
  // set up nonce
  const nonce = crypto.randomBytes(NONCE_BYTES)

  // set up cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce)

  // generate ciphertext
  let ciphertext = ''
  ciphertext += cipher.update(message, 'utf8', 'hex')
  ciphertext += cipher.final('hex')
  ciphertext += cipher.getAuthTag().toString('hex')

  // prepend nonce
  ciphertext = nonce.toString('hex') + ciphertext

  // base64 encode output
  return Buffer.from(ciphertext, 'hex').toString('base64')
}

const changed = function (ciphertext, dotenvKey, filepath, encoding) {
  const key = _parseEncryptionKeyFromDotenvKey(dotenvKey)
  const decrypted = main.decrypt(ciphertext, key)
  const raw = fs.readFileSync(filepath, encoding)

  return hash(decrypted) !== hash(raw)
}

const hash = function (str) {
  return xxhash.h32(str, XXHASH_SEED).toString(16)
}

const _parseEncryptionKeyFromDotenvKey = function (dotenvKey) {
  // Parse DOTENV_KEY. Format is a URI
  let uri
  try {
    uri = new URL(dotenvKey)
  } catch (e) {
    throw new Error(`INVALID_DOTENV_KEY: ${e.message}`)
  }

  // Get decrypt key
  const key = uri.password
  if (!key) {
    throw new Error('INVALID_DOTENV_KEY: Missing key part')
  }

  return Buffer.from(key.slice(-64), 'hex')
}

const _parseCipherTextFromDotenvKeyAndParsedVault = function (dotenvKey, parsedVault) {
  // Parse DOTENV_KEY. Format is a URI
  let uri
  try {
    uri = new URL(dotenvKey)
  } catch (e) {
    throw new Error(`INVALID_DOTENV_KEY: ${e.message}`)
  }

  // Get environment
  const environment = uri.searchParams.get('environment')
  if (!environment) {
    throw new Error('INVALID_DOTENV_KEY: Missing environment part')
  }

  // Get ciphertext payload
  const environmentKey = `DOTENV_VAULT_${environment.toUpperCase()}`
  const ciphertext = parsedVault[environmentKey] // DOTENV_VAULT_PRODUCTION
  if (!ciphertext) {
    throw new Error(`NOT_FOUND_DOTENV_ENVIRONMENT: cannot locate environment ${environmentKey} in your .env.vault file`)
  }

  return ciphertext
}

const formatCode = function (str) {
  const parts = []

  for (let i = 0; i < str.length; i += 4) {
    parts.push(str.substring(i, i + 4))
  }

  return parts.join('-')
}

const getRemoteOriginUrl = function () {
  try {
    const url = execSync('git remote get-url origin 2> /dev/null').toString().trim()
    return url
  } catch (_error) {
    return null
  }
}

const extractUsernameRepository = function (url) {
  // Removing the protocol part and splitting by slashes and colons
  // Removing the protocol part and .git suffix, then splitting by slashes and colons
  const parts = url.replace(/(^\w+:|^)\/\//, '').replace(/\.git$/, '').split(/[/:]/)

  // Extract the 'username/repository' part
  return parts.slice(-2).join('/')
}

module.exports = {
  sleep,
  resolvePath,
  executeCommand,
  pluralize,
  findEnvFiles,
  guessEnvironment,
  generateDotenvKey,
  encryptFile,
  encrypt,
  changed,
  hash,
  formatCode,
  getRemoteOriginUrl,
  extractUsernameRepository,
  _parseEncryptionKeyFromDotenvKey,
  _parseCipherTextFromDotenvKeyAndParsedVault
}
