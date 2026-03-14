import { createHmac, timingSafeEqual } from 'node:crypto'

type InviteRole = 'admin' | 'staff' | 'borrower'

export type InvitePayload = {
  v: 1
  org_id: string
  org_name: string
  role: InviteRole
  exp: number // unix seconds
}

function b64urlEncode(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input)
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function b64urlDecodeToBuffer(input: string) {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4))
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad
  return Buffer.from(b64, 'base64')
}

function sign(payloadB64: string, secret: string) {
  return b64urlEncode(createHmac('sha256', secret).update(payloadB64).digest())
}

export function createInviteToken(payload: Omit<InvitePayload, 'v'>, secret: string) {
  const full: InvitePayload = { v: 1, ...payload }
  const payloadB64 = b64urlEncode(JSON.stringify(full))
  const sigB64 = sign(payloadB64, secret)
  return `${payloadB64}.${sigB64}`
}

export function verifyInviteToken(token: string, secret: string): InvitePayload {
  const [payloadB64, sigB64] = token.split('.')
  if (!payloadB64 || !sigB64) throw new Error('Invalid invite token')

  const expected = sign(payloadB64, secret)
  const expectedBuf = Buffer.from(expected)
  const sigBuf = Buffer.from(sigB64)
  if (expectedBuf.length !== sigBuf.length || !timingSafeEqual(expectedBuf, sigBuf)) {
    throw new Error('Invalid invite token')
  }

  const payloadJson = b64urlDecodeToBuffer(payloadB64).toString('utf8')
  const payload = JSON.parse(payloadJson) as InvitePayload
  if (payload.v !== 1) throw new Error('Unsupported invite token')

  const now = Math.floor(Date.now() / 1000)
  if (payload.exp <= now) throw new Error('Invite token expired')

  if (payload.role !== 'admin' && payload.role !== 'staff' && payload.role !== 'borrower') {
    throw new Error('Invalid role')
  }
  if (!payload.org_id || !payload.org_name) throw new Error('Invalid org payload')

  return payload
}
