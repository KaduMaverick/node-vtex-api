import test from 'ava'
import Client from './Client'

test('HTTP client is created with all options', t => {
  const authToken = 'authToken'
  const userAgent = 'userAgent'
  const baseURL = 'baseURL'
  const accept = 'application/vnd.vtex.sppa.v4+json'
  const client = new Client(baseURL, {accept, authToken, userAgent})
  t.is(client.http.defaults.baseURL, baseURL)
  t.is(client.http.defaults.headers['User-Agent'], userAgent)
  t.is(client.http.defaults.headers['Authorization'], `token ${authToken}`)
  t.is(client.http.defaults.headers['Accept'], accept)
})

test('HTTP client is created with no accept', t => {
  const authToken = 'authToken'
  const userAgent = 'userAgent'
  const baseURL = 'baseURL'
  const client = new Client(baseURL, {authToken, userAgent})
  t.is(client.http.defaults.baseURL, baseURL)
  t.is(client.http.defaults.headers['User-Agent'], userAgent)
  t.is(client.http.defaults.headers['Authorization'], `token ${authToken}`)
  t.is(client.http.defaults.headers['Accept'], undefined)
})

test('HTTP client is created with no baseURL', t => {
  t.throws(() => {
    new Client() // eslint-disable-line
    t.fail()
  }, 'A required argument is missing: (baseURL, {authToken, userAgent}).')
})
