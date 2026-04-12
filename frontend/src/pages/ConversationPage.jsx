import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import api from '../utils/api'
import { useAuthStore } from '../store/authStore'
import { encryptMessage, decryptMessage, loadPrivateKey } from '../utils/crypto'
import './Messages.css'

export default function ConversationPage() {
  const { userId } = useParams()
  const { user: me } = useAuthStore()
  const [messages, setMessages] = useState([])
  const [otherUser, setOtherUser] = useState(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [msgResp, userResp] = await Promise.all([
          api.get(`/messages/conversation/${userId}`),
          api.get(`/users/by-id/${userId}`),
        ])
        setMessages(msgResp.data)
        setOtherUser(userResp.data)
      } catch {}
      setLoading(false)
    }
    load()
  }, [userId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const decryptMsg = (msg) => {
    const privateKey = loadPrivateKey()
    if (!privateKey) return '[Unable to decrypt – private key not found]'

    const isMine = msg.sender_id === me?.id
    if (isMine) {
      // We sent this: we need the recipient's public key to decrypt (not possible without storing sender copy)
      // Show placeholder for sent messages we can't decrypt after reload
      return '[Sent message]'
    }
    const senderPubKey = msg.sender?.public_key
    if (!senderPubKey) return '[No public key available]'
    return decryptMessage(msg.ciphertext, msg.nonce, senderPubKey, privateKey) || '[Decryption failed]'
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!text.trim() || !otherUser?.public_key) return
    setSending(true)
    try {
      const privateKey = loadPrivateKey()
      if (!privateKey) {
        alert('Encryption key not found. Please log out and log back in.')
        return
      }
      const { ciphertext, nonce } = encryptMessage(text.trim(), otherUser.public_key, privateKey)
      const resp = await api.post('/messages/', {
        recipient_id: userId,
        ciphertext,
        nonce,
      })
      setMessages(prev => [...prev, resp.data])
      setText('')
    } catch {}
    setSending(false)
  }

  if (loading) return <div className="spinner" style={{ margin: '4rem auto' }} />

  return (
    <div className="conv-container">
      <div className="conv-header card">
        <h3 className="conv-title">
          {otherUser?.display_name || otherUser?.username}
          <span className="muted" style={{ fontSize: '0.85rem' }}> @{otherUser?.username}</span>
        </h3>
        <span className="badge badge-primary">🔒 End-to-end encrypted</span>
      </div>

      <div className="conv-messages">
        {messages.map((msg) => {
          const isMine = msg.sender_id === me?.id
          return (
            <div key={msg.id} className={`message-bubble ${isMine ? 'mine' : 'theirs'}`}>
              <p className="message-text">{decryptMsg(msg)}</p>
              <span className="message-time muted">
                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
              </span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {!otherUser?.public_key && (
        <p className="error-text" style={{ padding: '0.5rem 1rem' }}>
          This user hasn't set up encryption keys yet. Messaging is unavailable.
        </p>
      )}

      <form className="conv-input-row" onSubmit={handleSend}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type a message…"
          disabled={!otherUser?.public_key}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={sending || !text.trim() || !otherUser?.public_key}
        >
          Send
        </button>
      </form>
    </div>
  )
}
