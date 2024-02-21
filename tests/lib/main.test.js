const t = require('tap')
const sinon = require('sinon')

const main = require('../../src/lib/main')

const Encrypt = require('../../src/lib/services/encrypt')

t.test('ls calls Ls.run', ct => {
  const envFiles = main.ls('tests')

  const expected = [
    '.env.vault',
    '.env.multiline',
    '.env.local',
    '.env.expand',
    '.env',
    'monorepo-example/apps/frontend/.env',
    'monorepo-example/apps/backend/.env.vault',
    'monorepo-example/apps/backend/.env.keys',
    'monorepo-example/apps/backend/.env'
  ]

  ct.same(envFiles, expected)

  ct.end()
})

t.test('encrypt calls Encrypt.run', ct => {
  const encryptRunStub = sinon.stub(Encrypt.prototype, 'run')
  encryptRunStub.returns({})

  main.encrypt()

  t.ok(encryptRunStub.called, 'new Encrypt().run() called')

  encryptRunStub.restore()

  ct.end()
})
