class Errors {
  constructor (options = {}) {
    this.filepath = options.filepath
    this.envFilepath = options.envFilepath
  }

  missingEnvFile () {
    const code = 'MISSING_ENV_FILE'
    const message = `[${code}] missing ${this.envFilepath} file (${this.filepath})`
    const help = `[${code}] ? add one with [echo "HELLO=World" > ${this.envFilepath}]`

    const e = new Error(message)
    e.code = code
    e.help = help
    return e
  }
}

module.exports = Errors