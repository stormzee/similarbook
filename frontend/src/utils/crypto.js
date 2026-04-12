/**
 * End-to-end encryption utilities using TweetNaCl (NaCl box).
 *
 * Key pairs are generated client-side and the private key NEVER leaves the browser
 * (stored in localStorage, never sent to the server).
 * The public key is uploaded to the server so other users can encrypt messages for you.
 *
 * Encryption: sender uses box(message, nonce, recipientPublicKey, senderPrivateKey)
 * Decryption: recipient uses box.open(ciphertext, nonce, senderPublicKey, recipientPrivateKey)
 */
import nacl from 'tweetnacl'
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util'

const PRIVATE_KEY_STORAGE = 'sb_private_key'

/** Generate a new key pair and persist the private key locally. */
export function generateKeyPair() {
  const kp = nacl.box.keyPair()
  const publicKeyB64 = encodeBase64(kp.publicKey)
  const privateKeyB64 = encodeBase64(kp.secretKey)
  localStorage.setItem(PRIVATE_KEY_STORAGE, privateKeyB64)
  return publicKeyB64
}

/** Load the locally stored private key (Uint8Array). */
export function loadPrivateKey() {
  const stored = localStorage.getItem(PRIVATE_KEY_STORAGE)
  if (!stored) return null
  return decodeBase64(stored)
}

/** Encrypt a plaintext string for a recipient. Returns { ciphertext, nonce } base64 strings. */
export function encryptMessage(plaintext, recipientPublicKeyB64, senderPrivateKey) {
  const nonce = nacl.randomBytes(nacl.box.nonceLength)
  const messageUint8 = encodeUTF8(plaintext)
  const recipientPublicKey = decodeBase64(recipientPublicKeyB64)
  const box = nacl.box(messageUint8, nonce, recipientPublicKey, senderPrivateKey)
  return {
    ciphertext: encodeBase64(box),
    nonce: encodeBase64(nonce),
  }
}

/** Decrypt a message. Returns plaintext string or null on failure. */
export function decryptMessage(ciphertextB64, nonceB64, senderPublicKeyB64, recipientPrivateKey) {
  try {
    const ciphertext = decodeBase64(ciphertextB64)
    const nonce = decodeBase64(nonceB64)
    const senderPublicKey = decodeBase64(senderPublicKeyB64)
    const decrypted = nacl.box.open(ciphertext, nonce, senderPublicKey, recipientPrivateKey)
    if (!decrypted) return null
    return decodeUTF8(decrypted)
  } catch {
    return null
  }
}
