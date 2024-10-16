const t = require('tap')
const fsx = require('./../../../src/lib/helpers/fsx')
const sinon = require('sinon')
const capcon = require('capture-console')
const proxyquire = require('proxyquire')

const main = require('./../../../src/lib/main')
const { logger } = require('../../../src/shared/logger')

const encrypt = proxyquire('../../../src/cli/actions/encrypt', {
  '../../../src/lib/helpers/isIgnoringDotenvKeys': () => true
})

let writeStub

t.beforeEach((ct) => {
  sinon.restore()
  writeStub = sinon.stub(fsx, 'writeFileX')
})

t.test('encrypt - nothing', ct => {
  const optsStub = sinon.stub().returns({})
  const fakeContext = { opts: optsStub }
  const stub = sinon.stub(main, 'encrypt').returns({
    processedEnvFiles: [],
    changedFilepaths: [],
    unchangedFilepaths: []
  })

  encrypt.call(fakeContext)

  t.ok(stub.called, 'main.encrypt() called')

  ct.end()
})

t.test('encrypt - .env but no changes', ct => {
  const optsStub = sinon.stub().returns({})
  const fakeContext = { opts: optsStub }
  const stub = sinon.stub(main, 'encrypt').returns({
    processedEnvFiles: [{
      envFilepath: '.env',
      filepath: '.env',
      error: null,
      changed: false,
      envSrc: 'HELLO="encrypted:1234"',
      privateKeyAdded: null,
      privateKeyName: null,
      privateKey: null
    }],
    changedFilepaths: [],
    unchangedFilepaths: ['.env']
  })
  const loggerInfoStub = sinon.stub(logger, 'info')

  encrypt.call(fakeContext)

  t.ok(stub.called, 'main.encrypt() called')
  t.ok(loggerInfoStub.calledWith('no changes (.env)'), 'logger.info')

  ct.end()
})

t.test('encrypt - --stdout', ct => {
  const processExitStub = sinon.stub(process, 'exit')
  const optsStub = sinon.stub().returns({ stdout: true })
  const fakeContext = { opts: optsStub }
  const stub = sinon.stub(main, 'encrypt').returns({
    processedEnvFiles: [{
      envFilepath: '.env',
      filepath: '.env',
      error: null,
      changed: false,
      envSrc: 'HELLO="encrypted:1234"',
      privateKeyAdded: null,
      privateKeyName: null,
      privateKey: null
    }],
    changedFilepaths: [],
    unchangedFilepaths: ['.env']
  })

  const stdout = capcon.interceptStdout(() => {
    encrypt.call(fakeContext)
  })

  t.ok(stub.called, 'main.encrypt() called')
  t.ok(processExitStub.calledWith(0), 'process.exit(0)')
  t.equal(stdout, 'HELLO="encrypted:1234"\n')

  ct.end()
})

t.test('encrypt - .env with changes', ct => {
  const optsStub = sinon.stub().returns({})
  const fakeContext = { opts: optsStub }
  const stub = sinon.stub(main, 'encrypt').returns({
    processedEnvFiles: [{
      envFilepath: '.env',
      filepath: '.env',
      error: null,
      changed: true,
      envSrc: 'HELLO="encrypted:1234"',
      privateKeyAdded: null,
      privateKeyName: null,
      privateKey: null
    }],
    changedFilepaths: ['.env'],
    unchangedFilepaths: []
  })
  const loggerInfoStub = sinon.stub(logger, 'info')
  const loggerVerboseStub = sinon.stub(logger, 'verbose')
  const loggerSuccessStub = sinon.stub(logger, 'success')

  encrypt.call(fakeContext)

  t.ok(stub.called, 'main.encrypt() called')
  t.ok(loggerInfoStub.notCalled, 'logger.info')
  t.ok(loggerVerboseStub.calledWith('encrypting .env (.env)'), 'logger.verbose')
  t.ok(writeStub.calledWith('.env', 'HELLO="encrypted:1234"'), 'fsx.writeFileX')
  t.ok(loggerVerboseStub.calledWith('encrypted .env (.env)'), 'logger.verbose')
  t.ok(loggerSuccessStub.calledWith('✔ encrypted (.env)'), 'logger.success')

  ct.end()
})

t.test('encrypt - .env with changes and privateKeyAdded', ct => {
  const optsStub = sinon.stub().returns({})
  const fakeContext = { opts: optsStub }
  const stub = sinon.stub(main, 'encrypt').returns({
    processedEnvFiles: [{
      envFilepath: '.env',
      filepath: '.env',
      error: null,
      changed: true,
      envSrc: 'HELLO="encrypted:1234"',
      privateKeyAdded: true,
      privateKeyName: 'DOTENV_PRIVATE_KEY',
      privateKey: '1234'
    }],
    changedFilepaths: ['.env'],
    unchangedFilepaths: []
  })
  const loggerInfoStub = sinon.stub(logger, 'info')
  const loggerVerboseStub = sinon.stub(logger, 'verbose')
  const loggerSuccessStub = sinon.stub(logger, 'success')
  const loggerHelp2Stub = sinon.stub(logger, 'help2')

  encrypt.call(fakeContext)

  t.ok(stub.called, 'main.encrypt() called')
  t.ok(loggerInfoStub.notCalled, 'logger.info')
  t.ok(loggerVerboseStub.calledWith('encrypting .env (.env)'), 'logger.verbose')
  t.ok(writeStub.calledWith('.env', 'HELLO="encrypted:1234"'), 'fsx.writeFileX')
  t.ok(loggerVerboseStub.calledWith('encrypted .env (.env)'), 'logger.verbose')
  t.ok(loggerSuccessStub.calledWith('✔ encrypted (.env)'), 'logger.success')
  t.ok(loggerSuccessStub.calledWith('✔ key added to .env.keys (DOTENV_PRIVATE_KEY)'), 'logger success')
  t.ok(loggerHelp2Stub.calledWith('ℹ run [DOTENV_PRIVATE_KEY=\'1234\' dotenvx run -- yourcommand] to test decryption locally'), 'logger help2')

  ct.end()
})

t.test('encrypt - .env with changes and privateKeyAdded but not ignoring .env.keys', ct => {
  const encryptNotIgnoring = proxyquire('../../../src/cli/actions/encrypt', {
    '../../../src/lib/helpers/isIgnoringDotenvKeys': () => false
  })

  const optsStub = sinon.stub().returns({})
  const fakeContext = { opts: optsStub }
  const stub = sinon.stub(main, 'encrypt').returns({
    processedEnvFiles: [{
      envFilepath: '.env',
      filepath: '.env',
      error: null,
      changed: true,
      envSrc: 'HELLO="encrypted:1234"',
      privateKeyAdded: true,
      privateKeyName: 'DOTENV_PRIVATE_KEY',
      privateKey: '1234'
    }],
    changedFilepaths: ['.env'],
    unchangedFilepaths: []
  })
  const loggerInfoStub = sinon.stub(logger, 'info')
  const loggerVerboseStub = sinon.stub(logger, 'verbose')
  const loggerSuccessStub = sinon.stub(logger, 'success')
  const loggerHelp2Stub = sinon.stub(logger, 'help2')

  encryptNotIgnoring.call(fakeContext)

  t.ok(stub.called, 'main.encrypt() called')
  t.ok(loggerInfoStub.notCalled, 'logger.info')
  t.ok(loggerVerboseStub.calledWith('encrypting .env (.env)'), 'logger.verbose')
  t.ok(writeStub.calledWith('.env', 'HELLO="encrypted:1234"'), 'fsx.writeFileX')
  t.ok(loggerVerboseStub.calledWith('encrypted .env (.env)'), 'logger.verbose')
  t.ok(loggerSuccessStub.calledWith('✔ encrypted (.env)'), 'logger.success')
  t.ok(loggerSuccessStub.calledWith('✔ key added to .env.keys (DOTENV_PRIVATE_KEY)'), 'logger success')
  t.ok(loggerHelp2Stub.calledWith('ℹ add .env.keys to .gitignore: [echo ".env.keys" >> .gitignore]'), 'logger help2')
  t.ok(loggerHelp2Stub.calledWith('ℹ run [DOTENV_PRIVATE_KEY=\'1234\' dotenvx run -- yourcommand] to test decryption locally'), 'logger help2')

  ct.end()
})

t.test('encrypt - MISSING_ENV_FILE', ct => {
  const error = new Error('Mock Error')
  error.code = 'MISSING_ENV_FILE'
  const optsStub = sinon.stub().returns({})
  const fakeContext = { opts: optsStub }
  const stub = sinon.stub(main, 'encrypt').returns({
    processedEnvFiles: [{
      envFilepath: '.env',
      filepath: '.env',
      error,
      changed: true,
      envSrc: 'HELLO="encrypted:1234"',
      privateKeyAdded: null,
      privateKeyName: null,
      privateKey: null
    }],
    changedFilepaths: [],
    unchangedFilepaths: []
  })
  const loggerInfoStub = sinon.stub(logger, 'info')
  const loggerVerboseStub = sinon.stub(logger, 'verbose')
  const loggerSuccessStub = sinon.stub(logger, 'success')
  const loggerWarnStub = sinon.stub(logger, 'warn')
  const loggerHelpStub = sinon.stub(logger, 'help')

  encrypt.call(fakeContext)

  t.ok(stub.called, 'main.encrypt() called')
  t.ok(loggerInfoStub.notCalled, 'logger.info')
  t.ok(loggerVerboseStub.calledWith('encrypting .env (.env)'), 'logger.verbose')
  t.ok(writeStub.notCalled, 'fsx.writeFileX')
  t.ok(loggerWarnStub.calledWith('Mock Error'), 'logger.warn')
  t.ok(loggerHelpStub.calledWith('? add one with [echo "HELLO=World" > .env] and re-run [dotenvx encrypt]'), 'logger.help')
  t.ok(loggerSuccessStub.notCalled, 'logger.success')

  ct.end()
})

t.test('encrypt - OTHER_ERROR', ct => {
  const error = new Error('Mock Error')
  error.code = 'OTHER_ERROR'
  const optsStub = sinon.stub().returns({})
  const fakeContext = { opts: optsStub }
  const stub = sinon.stub(main, 'encrypt').returns({
    processedEnvFiles: [{
      envFilepath: '.env',
      filepath: '.env',
      error,
      changed: true,
      envSrc: 'HELLO="encrypted:1234"',
      privateKeyAdded: null,
      privateKeyName: null,
      privateKey: null
    }],
    changedFilepaths: [],
    unchangedFilepaths: []
  })
  const loggerInfoStub = sinon.stub(logger, 'info')
  const loggerVerboseStub = sinon.stub(logger, 'verbose')
  const loggerSuccessStub = sinon.stub(logger, 'success')
  const loggerWarnStub = sinon.stub(logger, 'warn')
  const loggerHelpStub = sinon.stub(logger, 'help')

  encrypt.call(fakeContext)

  t.ok(stub.called, 'main.encrypt() called')
  t.ok(loggerInfoStub.notCalled, 'logger.info')
  t.ok(loggerVerboseStub.calledWith('encrypting .env (.env)'), 'logger.verbose')
  t.ok(writeStub.notCalled, 'fsx.writeFileX')
  t.ok(loggerWarnStub.calledWith('Mock Error'), 'logger.warn')
  t.ok(loggerHelpStub.notCalled, 'logger.help')
  t.ok(loggerSuccessStub.notCalled, 'logger.success')

  ct.end()
})

t.test('encrypt - catch error', ct => {
  const error = new Error('Mock Error')
  error.help = 'Mock Help'
  error.debug = 'Mock Debug'
  error.code = 500

  const optsStub = sinon.stub().returns({})
  const fakeContext = { opts: optsStub }
  const stub = sinon.stub(main, 'encrypt').throws(error)

  const processExitStub = sinon.stub(process, 'exit')
  const loggerInfoStub = sinon.stub(logger, 'info')
  const loggerSuccessStub = sinon.stub(logger, 'success')
  const loggerErrorStub = sinon.stub(logger, 'error')
  const loggerHelpStub = sinon.stub(logger, 'help')
  const loggerDebugStub = sinon.stub(logger, 'debug')

  encrypt.call(fakeContext)

  t.ok(stub.called, 'main.encrypt() called')
  t.ok(writeStub.notCalled, 'fsx.writeFileX')
  t.ok(loggerInfoStub.notCalled, 'logger info')
  t.ok(loggerSuccessStub.notCalled, 'logger success')
  t.ok(loggerErrorStub.calledWith('Mock Error'), 'logger error')
  t.ok(loggerHelpStub.calledWith('Mock Help'), 'logger help')
  t.ok(loggerDebugStub.calledWith('Mock Debug'), 'logger debug')
  t.ok(loggerDebugStub.calledWith('ERROR_CODE: 500'), 'logger debug')
  t.ok(processExitStub.calledWith(1), 'process.exit(1)')

  ct.end()
})
