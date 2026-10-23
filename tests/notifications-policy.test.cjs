const assert = require('node:assert/strict')
const fs = require('node:fs')
const test = require('node:test')
const ts = require('typescript')

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  module._compile(output, filename)
}

const { notificationDeliveryAllowed, notificationOwnerMatches } = require('../lib/server/notification-policy.ts')

test('notification delivery defaults to enabled and respects category and channel preferences', () => {
  assert.equal(notificationDeliveryAllowed('announcement', undefined, 'announcements', 'in_app_enabled'), true)
  assert.equal(notificationDeliveryAllowed('announcement', {
    in_app_enabled: true,
    email_enabled: false,
    applications: true,
    experiences: true,
    internships: true,
    announcements: true,
    questions: true,
    account: true,
  }, 'announcements', 'email_enabled'), false)
  assert.equal(notificationDeliveryAllowed('verification', {
    in_app_enabled: true,
    email_enabled: true,
    applications: true,
    experiences: false,
    internships: true,
    announcements: true,
    questions: true,
    account: true,
  }, 'experiences', 'in_app_enabled'), false)
})

test('authentication and recovery messages cannot use notification delivery', () => {
  for (const type of ['password_recovery', 'password_reset', 'login_otp', 'verification_code', 'email_verification']) {
    assert.equal(notificationDeliveryAllowed(type, undefined, 'account', 'in_app_enabled'), false)
    assert.equal(notificationDeliveryAllowed(type, undefined, 'account', 'email_enabled'), false)
  }
})

test('notification ownership rejects access from another user', () => {
  assert.equal(notificationOwnerMatches(12, 12), true)
  assert.equal(notificationOwnerMatches(12, 13), false)
})
