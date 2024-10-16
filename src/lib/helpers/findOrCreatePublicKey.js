const fsx = require('./fsx')
const path = require('path')
const dotenv = require('dotenv')

const keyPair = require('./keyPair')
const guessPublicKeyName = require('./guessPublicKeyName')
const guessPrivateKeyName = require('./guessPrivateKeyName')

function findOrCreatePublicKey (envFilepath, envKeysFilepath) {
  // filename
  const filename = path.basename(envFilepath)
  const publicKeyName = guessPublicKeyName(envFilepath)
  const privateKeyName = guessPrivateKeyName(envFilepath)

  // src
  let envSrc = fsx.readFileX(envFilepath)
  let keysSrc = ''
  if (fsx.existsSync(envKeysFilepath)) {
    keysSrc = fsx.readFileX(envKeysFilepath)
  }

  // parsed
  const envParsed = dotenv.parse(envSrc)
  const keysParsed = dotenv.parse(keysSrc)
  const existingPublicKey = envParsed[publicKeyName]
  const existingPrivateKey = keysParsed[privateKeyName]

  // if DOTENV_PUBLIC_KEY_${environment} already present then go no further
  if (existingPublicKey && existingPublicKey.length > 0) {
    return {
      envSrc,
      keysSrc,
      publicKey: existingPublicKey,
      privateKey: existingPrivateKey,
      publicKeyAdded: false,
      privateKeyAdded: false
    }
  }

  // preserve shebang
  const [firstLine, ...remainingLines] = envSrc.split('\n')
  let firstLinePreserved = ''
  if (firstLine.startsWith('#!')) {
    firstLinePreserved = firstLine + '\n'
    envSrc = remainingLines.join('\n')
  }

  // generate key pair
  const { publicKey, privateKey } = keyPair(existingPrivateKey)

  // publicKey
  const prependPublicKey = [
    '#/-------------------[DOTENV_PUBLIC_KEY]--------------------/',
    '#/            public-key encryption for .env files          /',
    '#/       [how it works](https://dotenvx.com/encryption)     /',
    '#/----------------------------------------------------------/',
    `${publicKeyName}="${publicKey}"`,
    '',
    `# ${filename}`
  ].join('\n')

  // privateKey
  const firstTimeKeysSrc = [
    '#/------------------!DOTENV_PRIVATE_KEYS!-------------------/',
    '#/ private decryption keys. DO NOT commit to source control /',
    '#/     [how it works](https://dotenvx.com/encryption)       /',
    '#/----------------------------------------------------------/'
  ].join('\n')
  const appendPrivateKey = [
    `# ${filename}`,
    `${privateKeyName}="${privateKey}"`,
    ''
  ].join('\n')

  envSrc = `${firstLinePreserved}${prependPublicKey}\n${envSrc}`
  keysSrc = keysSrc.length > 1 ? keysSrc : `${firstTimeKeysSrc}\n`

  let privateKeyAdded = false
  if (!existingPrivateKey) {
    keysSrc = `${keysSrc}\n${appendPrivateKey}`
    privateKeyAdded = true
  }

  return {
    envSrc,
    keysSrc,
    publicKey,
    privateKey,
    publicKeyAdded: true,
    privateKeyAdded
  }
}

module.exports = findOrCreatePublicKey
