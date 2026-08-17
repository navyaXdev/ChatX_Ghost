import React, { useContext, useState } from 'react';
import { Key, MessageSquare, X, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { deriveKey } from '../utils/cyptoUtils';
import { ChatContext } from '../context/ChatProvider';

const EnterUser = () => {
  const [formData, setFormData] = useState({
    conversationId: '',
    name: '',
    passphrase: ''
  });
  const [errors, setErrors] = useState({});
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const navigate = useNavigate();
  const { setName, setKey, setConversationId } = useContext(ChatContext);

  function updateField(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const nextErrors = {};
    if (!formData.conversationId.trim()) nextErrors.conversationId = "Conversation ID is required";
    if (!formData.name.trim()) nextErrors.name = "Your name is required";
    if (!formData.passphrase.trim()) nextErrors.passphrase = "Passphrase is required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setJoinError('');
    if (!validate()) return;

    setIsJoining(true);
    try {
      const key = await deriveKey(formData.passphrase, formData.conversationId);
      setName(formData.name.trim());
      setKey(key);
      setConversationId(formData.conversationId.trim());

      sessionStorage.setItem("name", formData.name.trim());
      sessionStorage.setItem("conversationId", formData.conversationId.trim());
      sessionStorage.setItem("passphrase", formData.passphrase);

      navigate("/chat");
    } catch (error) {
      console.error("couldn't join chat:", error);
      setJoinError("Something went wrong while setting up encryption. Please try again.");
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-110 bg-[#1a1c23] rounded-4xl p-10 shadow-2xl border border-white/5">

        <div className="flex items-center gap-3 mb-8">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl border-2 border-transparent bg-linear-to-br from-cyan-400 via-blue-500 to-purple-600 p-1">
              <div className="w-full h-full bg-[#1a1c23] rounded-[10px] flex items-center justify-center relative">
                <MessageSquare className="text-cyan-400 w-6 h-6" />
                <X className="absolute -top-1 -right-1 w-4 h-4 text-purple-400 font-bold" />
              </div>
            </div>
          </div>
          <span className="text-white text-2xl font-bold tracking-tight">ChatX</span>
        </div>

        <div className="mb-10">
          <h1 className="text-white text-4xl font-bold mb-3">Secure Chat</h1>
          <p className="text-gray-400 text-lg">Join a private conversation with your room details.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div className="space-y-2">
            <label className="block text-gray-300 font-semibold text-sm">Conversation ID</label>
            <input
              placeholder='e.g. room1'
              type="text"
              value={formData.conversationId}
              onChange={(e) => updateField('conversationId', e.target.value)}
              className={`w-full bg-[#242731] border rounded-xl px-4 py-4 text-white focus:outline-none focus:ring-2 transition-all ${
                errors.conversationId
                  ? 'border-red-500/60 focus:ring-red-500/40'
                  : 'border-gray-700/50 focus:ring-blue-500/50'
              }`}
            />
            {errors.conversationId && (
              <p className="flex items-center gap-1.5 text-red-400 text-xs mt-1">
                <AlertCircle size={12} /> {errors.conversationId}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-gray-300 font-semibold text-sm">Your Name</label>
            <input
              placeholder='e.g. Rohan'
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              className={`w-full bg-[#242731] border rounded-xl px-4 py-4 text-white focus:outline-none focus:ring-2 transition-all ${
                errors.name
                  ? 'border-red-500/60 focus:ring-red-500/40'
                  : 'border-gray-700/50 focus:ring-blue-500/50'
              }`}
            />
            {errors.name && (
              <p className="flex items-center gap-1.5 text-red-400 text-xs mt-1">
                <AlertCircle size={12} /> {errors.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-gray-300 font-semibold text-sm">Shared Passphrase</label>
            <input
              type="password"
              placeholder="Enter passphrase"
              value={formData.passphrase}
              onChange={(e) => updateField('passphrase', e.target.value)}
              className={`w-full bg-[#242731] border rounded-xl px-4 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 transition-all ${
                errors.passphrase
                  ? 'border-red-500/60 focus:ring-red-500/40'
                  : 'border-gray-700/50 focus:ring-blue-500/50'
              }`}
            />
            {errors.passphrase && (
              <p className="flex items-center gap-1.5 text-red-400 text-xs mt-1">
                <AlertCircle size={12} /> {errors.passphrase}
              </p>
            )}
          </div>

          {joinError && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
              <AlertCircle size={16} />
              {joinError}
            </div>
          )}

          <button
            type="submit"
            disabled={isJoining}
            className="w-full mt-4 bg-linear-to-r from-[#1d8cff] to-[#804dff] hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
          >
            {isJoining ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <Key size={20} className="-rotate-45" />
                Join Chat
              </>
            )}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-8">
          Your room details stay private to this session.
        </p>
      </div>
    </div>
  );
};

export default EnterUser;
