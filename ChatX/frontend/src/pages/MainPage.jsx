import React from 'react';
import { Shield, Zap, Lock, UserX, Globe, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MainPage = () => {
    const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#0b0716] text-white font-sans selection:bg-purple-500/30">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-purple-400 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-[#0b0716] rounded-full"></div>
          </div>
          <span className="font-bold text-xl tracking-tight">ChatX</span>
        </div>
        

        <button onClick={()=>{navigate("/start")}} className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-purple-500/20">
          Start Chat
        </button>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-32 px-6 text-center max-w-4xl mx-auto">
        <span className="text-[10px] uppercase tracking-[0.2em] text-purple-400 font-bold mb-6 block">
          Private by default
        </span>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-[1.1] mb-8">
          Private Conversations. <br />
          Zero Trust. <br />
          Maximum Security.
        </h1>
        <p className="text-purple-100/60 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
          ChatX is a browser-based end-to-end encrypted messaging platform where 
          encryption keys never leave your device. No accounts. No tracking. No compromises.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onClick={()=>{navigate("/start")}} className="w-full sm:w-auto bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-purple-500/25">
            Start Chat
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-[10px] uppercase tracking-[0.2em] text-purple-400 font-bold mb-4 block">
            Security without friction
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Built for trust at every layer.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard 
            icon={<Shield className="w-5 h-5 text-purple-400" />}
            title="End-to-End Encryption"
            description="Your keys stay on your device — never on our servers."
          />
          <FeatureCard 
            icon={<Zap className="w-5 h-5 text-purple-400" />}
            title="Instant Chat Rooms"
            description="Create a private room and start talking in seconds."
          />
          <FeatureCard 
            icon={<Lock className="w-5 h-5 text-purple-400" />}
            title="Zero-Knowledge Security"
            description="We cannot read what we never receive."
          />
          <FeatureCard 
            icon={<UserX className="w-5 h-5 text-purple-400" />}
            title="No Registration Required"
            description="No email, profile, or identity trail needed to join."
          />
          <FeatureCard 
            icon={<Globe className="w-5 h-5 text-purple-400" />}
            title="Browser-Based Messaging"
            description="Open a tab, join a room, and keep your tools lightweight."
          />
          <FeatureCard 
            icon={<Key className="w-5 h-5 text-purple-400" />}
            title="PBKDF2 Secure Key Generation"
            description="Strong keys generated locally with modern derivation standards."
          />
        </div>
      </section>

      {/* Bottom CTA Section */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="bg-[#130d24] border border-purple-500/10 rounded-[2rem] p-12 md:p-20 text-center relative overflow-hidden">
          {/* Subtle Glow Effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-purple-500/10 blur-[120px] pointer-events-none"></div>
          
          <span className="text-[10px] uppercase tracking-[0.2em] text-purple-400 font-bold mb-6 block relative z-10">
            Your room, your rules
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-6 relative z-10">
            Start a conversation <br /> no one else can read.
          </h2>
          <p className="text-purple-100/60 mb-10 relative z-10">
            No account. No tracking. Just a private room ready when you are.
          </p>
          <button onClick={()=>{navigate("/start")}} className="bg-purple-400 text-[#0b0716] hover:bg-purple-300 px-10 py-4 rounded-xl font-bold transition-all relative z-10">
            Start Chat
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-purple-500/10 text-center">
        <p className="text-purple-100/40 text-xs tracking-tight">
          ChatX · Private by design · © 2024
        </p>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }) => (
  <div className="bg-[#130d24] border border-purple-500/10 p-8 rounded-2xl hover:border-purple-500/20 transition-colors group">
    <div className="mb-6">{icon}</div>
    <h3 className="text-lg font-bold mb-3">{title}</h3>
    <p className="text-purple-100/60 text-sm leading-relaxed">
      {description}
    </p>
  </div>
);

export default MainPage;