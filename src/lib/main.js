const logger = require('./../shared/logger')
const dotenv = require('dotenv')
const dotenvExpand = require('dotenv-expand')

// services
const Encrypt = require('./services/encrypt')
const Ls = require('./services/ls')
const Get = require('./services/get')

const config = function (options) {
  return dotenv.config(options)
}

const configDotenv = function (options) {
  return dotenv.configDotenv(options)
}

const parse = function (src) {
  return dotenv.parse(src)
}

const encrypt = function (directory, envFile) {
  return new Encrypt(directory, envFile).run()
}

const ls = function (directory, envFile) {
  return new Ls(directory, envFile).run()
}

const get = function (key, envFile, overload, all) {
  return new Get(key, envFile, overload, all).run()
}

const decrypt = function (encrypted, keyStr) {
  try {
    return dotenv.decrypt(encrypted, keyStr)
  } catch (e) {
    switch (e.code) {
      case 'DECRYPTION_FAILED':
        // more helpful error when decryption fails
        logger.error('[DECRYPTION_FAILED] Unable to decrypt .env.vault with DOTENV_KEY.')
        logger.help('[DECRYPTION_FAILED] Run with debug flag [dotenvx run --debug -- yourcommand] or manually run [echo $DOTENV_KEY] to compare it to the one in .env.keys.')
        logger.debug(`[DECRYPTION_FAILED] DOTENV_KEY is ${process.env.DOTENV_KEY}`)
        process.exit(1)
        break
      default:
        throw e
    }
  }
}

const inject = function (processEnv = {}, parsed = {}, overload = false) {
  if (typeof parsed !== 'object') {
    throw new Error('OBJECT_REQUIRED: Please check the parsed argument being passed to inject')
  }

  const injected = new Set()
  const preExisting = new Set()

  // set processEnv
  for (const key of Object.keys(parsed)) {
    if (Object.prototype.hasOwnProperty.call(processEnv, key)) {
      if (overload === true) {
        processEnv[key] = parsed[key]
        injected.add(key)

        logger.verbose(`${key} set`)
        logger.debug(`${key} set to ${parsed[key]}`)
      } else {
        preExisting.add(key)

        logger.verbose(`${key} pre-exists (protip: use --overload to override)`)
        logger.debug(`${key} pre-exists as ${processEnv[key]} (protip: use --overload to override)`)
      }
    } else {
      processEnv[key] = parsed[key]
      injected.add(key)

      logger.verbose(`${key} set`)
      logger.debug(`${key} set to ${parsed[key]}`)
    }
  }

  return {
    injected,
    preExisting
  }
}

module.exports = {
  config,
  configDotenv,
  decrypt,
  parse,
  inject,
  encrypt,
  ls,
  get
}
