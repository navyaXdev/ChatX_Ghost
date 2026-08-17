import React, { useContext, useEffect, useState, useRef } from 'react';
import { ArrowLeft, Lock, Send, Loader2, WifiOff } from 'lucide-react';
import { ChatContext } from '../context/ChatProvider';
import { useNavigate } from 'react-router-dom';
import formatTime from '../utils/timeFormatter';
import { encryptMessage } from '../utils/cyptoUtils';

const CHATX_API = import.meta.env.VITE_CHATX_API || "http://127.0.0.1:5000/messages";

function base64ToArrayBuffer(base64) {
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer;
}

function initials(name = '') {
    return name.trim().slice(0, 1).toUpperCase() || '?';
}

const ChatPage = () => {
    const { name, key, conversationId } = useContext(ChatContext);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [isSending, setIsSending] = useState(false);
    const [connectionOk, setConnectionOk] = useState(true);
    const navigate = useNavigate();

    const lastMessageId = useRef(0);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);
    // Tracks ciphertexts we just sent optimistically, so when the poll later
    // fetches that same message back from the server we don't render it twice.
    const pendingCiphertexts = useRef(new Set());
    // Tracks message IDs we've already rendered, so re-running effects
    // (e.g. React StrictMode) never double-add a message.
    const receivedMessageIds = useRef(new Set());

    const handleGoBack = () => {
        navigate("/")
    }

    useEffect(() => {
        // Auto-scroll to the latest message whenever the list changes.
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    async function handleSendMessage() {
        const trimmed = message.trim();
        if (!trimmed || isSending) return;

        setIsSending(true);
        try {
            const latestTime = new Date();
            const formatedTime = formatTime(latestTime);
            const newData = {
                id: crypto.randomUUID(),
                sender: name,
                time: formatedTime,
                text: trimmed,
                isMe: true
            }
            const { ciphertext, iv } = await encryptMessage(trimmed, key);
            const payload = {
                conversationId,
                senderName: name,
                ciphertext,
                iv
            }

            pendingCiphertexts.current.add(ciphertext);

            const res = await fetch(CHATX_API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                setMessages((state) => [...state, newData]);
                setMessage("");
                setConnectionOk(true);
            } else {
                pendingCiphertexts.current.delete(ciphertext);
                setConnectionOk(false);
            }
        } catch (error) {
            console.error("couldn't send message: ", error)
            setConnectionOk(false);
        } finally {
            setIsSending(false);
            inputRef.current?.focus();
        }
    }

    function handleKeyDown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    }

    useEffect(() => {
        let cancelled = false;

        const poll = async () => {
            try {
                const response = await fetch(`${CHATX_API}?conversationId=${conversationId}&since=${lastMessageId.current}`);
                if (cancelled) return; // effect was cleaned up (e.g. StrictMode double-invoke) — abandon before touching any refs
                if (!response.ok) {
                    setConnectionOk(false);
                    return;
                }
                setConnectionOk(true);
                const msgs = await response.json();
                if (cancelled) return;

                for (const msg of msgs) {
                    if (cancelled) break; // stop touching refs the moment this run is no longer current

                    // Already rendered this exact message (e.g. duplicate
                    // fetch) — skip so we never show it twice.
                    if (receivedMessageIds.current.has(msg.messageId)) continue;
                    receivedMessageIds.current.add(msg.messageId);

                    lastMessageId.current = Math.max(
                        lastMessageId.current,
                        msg.messageId
                    );

                    // If this is a message we just sent ourselves (matched by
                    // ciphertext), it's already showing as the optimistic
                    // bubble — don't add it again.
                    if (msg.senderName === name && pendingCiphertexts.current.has(msg.ciphertext)) {
                        pendingCiphertexts.current.delete(msg.ciphertext);
                        continue;
                    }

                    let text;
                    try {
                        const plaintextBuffer = await crypto.subtle.decrypt(
                            { name: "AES-GCM", iv: base64ToArrayBuffer(msg.iv) },
                            key,
                            base64ToArrayBuffer(msg.ciphertext)
                        );
                        text = new TextDecoder().decode(plaintextBuffer);

                    } catch (error) {
                        text = "[Unable to decrypt — wrong passphrase or tampered message]";

                    }

                    if (cancelled) break;

                    setMessages((state) => [...state, {
                        id: msg.messageId,
                        sender: msg.senderName,
                        time: formatTime(new Date(msg.timestamp * 1000)),
                        text,
                        // Correctly mark our own messages as "isMe" even when
                        // they're loaded fresh after a refresh (not just the
                        // ones sent optimistically in this session).
                        isMe: msg.senderName === name
                    }]);
                }

            } catch (error) {
                if (!cancelled) {
                    console.error("some error occured!", error)
                    setConnectionOk(false);
                }
            }
        }
        poll();
        const interval = setInterval(poll, 2500);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };

    }, [conversationId, key, name])

    return (
        <div className="flex flex-col h-screen bg-[#0b0e14] text-gray-300 font-sans">
            <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50 bg-[#0f1117]">
                <div className="flex items-center gap-4">
                    <button onClick={handleGoBack} className="p-2 hover:bg-gray-800 rounded-lg transition-colors ">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex items-center gap-2">
                        <Lock size={16} className="text-blue-400" />
                        <h1 className="text-white font-bold text-lg">Secure Chat</h1>
                        <span className="text-xs text-gray-500 ml-2 font-mono">{conversationId}</span>
                    </div>
                </div>

                {connectionOk ? (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-green-500">Polling</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                        <WifiOff size={12} className="text-red-500" />
                        <span className="text-[10px] uppercase tracking-wider font-bold text-red-500">Connection lost</span>
                    </div>
                )}
            </header>

            <main className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-600 gap-2">
                        <Lock size={28} className="text-gray-700" />
                        <p className="text-sm">No messages yet. Say hi — everything here is end-to-end encrypted.</p>
                    </div>
                )}

                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`max-w-3xl flex items-end gap-3 ${msg.isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                    >
                        <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                            msg.isMe ? 'bg-linear-to-br from-blue-500 to-indigo-600' : 'bg-gray-700'
                        }`}>
                            {initials(msg.sender)}
                        </div>
                        <div
                            className={`rounded-xl p-4 border transition-all ${msg.isMe
                                ? 'bg-[#1e2d5a] border-blue-500/30 shadow-lg shadow-blue-900/10'
                                : 'bg-[#161922] border-gray-800'
                                }`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-bold ${msg.isMe ? 'text-blue-300' : 'text-gray-400'}`}>
                                    {msg.sender}
                                </span>
                                <span className="text-[10px] text-gray-600 font-mono">[{msg.time}]</span>
                            </div>
                            <p className="text-white leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </main>

            <footer className="p-4 bg-[#0f1117] border-t border-gray-800/50">
                <div className="max-w-5xl mx-auto flex gap-3">
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Type a message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isSending}
                        className="flex-1 bg-[#161922] border border-gray-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-gray-600 disabled:opacity-60"
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={isSending || !message.trim()}
                        type="button"
                        className="bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                    >
                        {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        Send
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default ChatPage;
