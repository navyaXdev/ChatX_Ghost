import React, { createContext, useEffect, useState } from 'react'
import { deriveKey } from '../utils/cyptoUtils';
export const ChatContext = createContext();

const ChatProvider = ({ children }) => {
    const [name, setName] = useState("")
    const [conversationId, setConversationId] = useState("")
    const [key, setKey] = useState(null)
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {

        async function restoreSession() {
            try {
                const storedName = sessionStorage.getItem("name");
                const storedConversationId = sessionStorage.getItem("conversationId");
                const storedPassphrase = sessionStorage.getItem("passphrase");

                // Bug fix: previously this early-return left isLoading stuck at
                // `true` forever whenever there was no saved session, which made
                // ProtectedRoute show "Loading..." forever even for users who had
                // just joined via EnterUser. The finally block below guarantees
                // isLoading always gets resolved.
                if (!storedName || !storedConversationId || !storedPassphrase) return;

                const DerivedKey = await deriveKey(storedPassphrase, storedConversationId);
                setConversationId(storedConversationId);
                setKey(DerivedKey);
                setName(storedName);
            } finally {
                setIsLoading(false);
            }
        }

        restoreSession();

    }, [])
    return (
        <ChatContext.Provider value={{
            name,
            setName,
            conversationId,
            setConversationId,
            key,
            setKey,
            isLoading
        }} >
            {children}
        </ChatContext.Provider>
    )
}

export default ChatProvider
