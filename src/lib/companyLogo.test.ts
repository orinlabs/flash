import assert from 'node:assert/strict'
import test from 'node:test'

import { logoUrlForCompany, logoUrlForDomain } from './companyLogo.js'

test('logoUrlForDomain normalizes hosts like company domain fields', () => {
  assert.equal(
    logoUrlForDomain('https://www.Acme.COM/about'),
    'https://www.google.com/s2/favicons?domain=acme.com&sz=64'
  )
  assert.equal(logoUrlForDomain(''), null)
  assert.equal(logoUrlForDomain(null), null)
})

test('logoUrlForCompany prefers domain over website', () => {
  assert.equal(
    logoUrlForCompany({ domain: 'acme.com', website: 'https://other.com' }),
    'https://www.google.com/s2/favicons?domain=acme.com&sz=64'
  )
  assert.equal(
    logoUrlForCompany({ domain: null, website: 'https://beta.io' }),
    'https://www.google.com/s2/favicons?domain=beta.io&sz=64'
  )
})
