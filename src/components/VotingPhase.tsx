import React, { useState } from 'react';
import { ShipSpec, Player, ChatMessage } from '../types/game';
import { SHIPS_DATABASE } from '../data/ships';
import { soundManager } from '../utils/audio';
import { 
  Trophy, 
  Timer, 
  Play, 
  Shield, 
  Heart, 
  Ruler, 
  Flame, 
  Sparkles, 
  Vote, 
  Compass, 
  CheckCircle2, 
  Users, 
  Bot, 
  Radio, 
  Wifi, 
  Send,
  Zap
} from 'lucide-react';

interface VotingPhaseProps {
  votes: Record<string, number>;
  votingTimeLeft: number;
  players: Record<string, Player>;
  myPlayerId: string;
  chatMessages: ChatMessage[];
  isConnected: boolean;
  onCastVote: (shipId: string) => void;
  onSkipVote: (forceShipId?: string) => void;
  onSendChat: (text: string) => void;
}

export const VotingPhase: React.FC<VotingPhaseProps> = ({
  votes,
  votingTimeLeft,
  players,
  myPlayerId,
  chatMessages,
  isConnected,
  onCastVote,
  onSkipVote,
  onSendChat,
}) => {
  const [playerVotedId, setPlayerVotedId] = useState<string | null>(null);
  const [selectedPreviewShip, setSelectedPreviewShip] = useState<ShipSpec>(SHIPS_DATABASE[0]);
  const [chatInput, setChatInput] = useState<string>('');
  const [showChat, setShowChat] = useState<boolean>(true);

  // Total votes calculation
  const totalVotes = Object.values(votes).reduce((sum, v) => sum + v, 0);

  // Determine current winning ship strictly based on highest vote count
  const sortedShips = [...SHIPS_DATABASE].sort((a, b) => (votes[b.id] || 0) - (votes[a.id] || 0));
  const currentLeader = sortedShips[0] || SHIPS_DATABASE[0];

  const handleVote = (ship: ShipSpec) => {
    soundManager.playClick(750);
    setPlayerVotedId(ship.id);
    setSelectedPreviewShip(ship);
    onCastVote(ship.id);
  };

  const handleLaunch = (shipToLaunch: ShipSpec) => {
    soundManager.playClick(500);
    soundManager.playHorn();
    onSkipVote(shipToLaunch.id);
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput);
    setChatInput('');
  };

  const activePlayersList = Object.values(players);

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-x-hidden selection:bg-cyan-500 selection:text-black">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-radial from-slate-900 via-slate-950 to-black opacity-80 pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Header bar */}
      <header className="relative z-10 px-4 sm:px-6 py-4 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Compass className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-wider uppercase bg-gradient-to-r from-cyan-400 via-sky-200 to-blue-400 bg-clip-text text-transparent">
                Ship Destructor 2D
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span>ONLINE MULTIPLAYER</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
                <Bot className="w-3 h-3 text-purple-400" />
                <span>AI BOTS ACTIVE</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium tracking-wide">
              Demolition Taskforce • Multi-Crew Target Election
            </p>
          </div>
        </div>

        {/* Players Online and Live Timer */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Crew Roster</span>
              <span className="text-xs font-mono font-black text-cyan-300">
                {activePlayersList.length} Active (Bots + Humans)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2 shadow-inner">
            <Timer className="w-5 h-5 text-amber-400 animate-pulse" />
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Voting Closes</span>
              <span className="text-lg font-mono font-black text-amber-300">
                00:{votingTimeLeft < 10 ? `0${votingTimeLeft}` : votingTimeLeft}
              </span>
            </div>
          </div>

          {/* Launch Leading Ship Button */}
          <button
            onClick={() => handleLaunch(currentLeader)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 transition-all transform active:scale-95 cursor-pointer"
            title="Launch the ship with the most votes right now"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Launch Winner: {currentLeader.name}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Banner with Winning Ship Teaser & Crew Roster */}
        <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-900/90 p-5 shadow-2xl backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
              <Trophy className="w-8 h-8 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Currently Leading Room Polls ({votes[currentLeader.id] || 0} Votes)</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {currentLeader.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                {currentLeader.subtitle} • {currentLeader.lengthMeters}m Length • {currentLeader.maxHp.toLocaleString()} Total HP
              </p>
            </div>
          </div>

          {/* Connected Crew & Bots Roster */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mr-1">
              Taskforce:
            </span>
            {activePlayersList.map(p => {
              const isBot = p.id.startsWith('bot_');
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 border text-xs font-bold"
                  style={{ borderColor: `${p.color}50` }}
                >
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-slate-200">{p.name}</span>
                  {p.id === myPlayerId && <span className="text-[10px] text-cyan-400 font-mono">(You)</span>}
                  {isBot && <Bot className="w-3 h-3 text-purple-400" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Big Ship Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {SHIPS_DATABASE.map(ship => {
            const shipVotes = votes[ship.id] || 0;
            const percentage = totalVotes > 0 ? Math.round((shipVotes / totalVotes) * 100) : 0;
            const isLeader = ship.id === currentLeader.id;
            const isVoted = playerVotedId === ship.id;
            const isSelected = selectedPreviewShip.id === ship.id;

            return (
              <div
                key={ship.id}
                onClick={() => setSelectedPreviewShip(ship)}
                className={`relative rounded-2xl transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden border p-5 ${
                  isSelected
                    ? 'border-cyan-400 bg-slate-900/90 shadow-xl shadow-cyan-500/15 ring-2 ring-cyan-500/30'
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/70'
                }`}
              >
                {/* Top Badge */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  {isLeader ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <Trophy className="w-3.5 h-3.5" />
                      #1 Leading ({shipVotes} votes)
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                      {ship.era}
                    </span>
                  )}

                  {isVoted && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Your Vote
                    </span>
                  )}
                </div>

                {/* Big Ship Silhouette */}
                <div className="w-full h-28 mb-4 rounded-xl bg-slate-950/80 border border-slate-800/80 p-2 flex items-center justify-center relative overflow-hidden group">
                  <div className="absolute bottom-0 inset-x-0 h-7 bg-cyan-950/40 border-t border-cyan-800/30" />
                  
                  <svg viewBox="0 0 220 70" className="w-full h-full drop-shadow-md">
                    <path
                      d="M 15 48 L 35 55 L 180 55 L 208 42 L 202 40 L 180 46 L 25 46 Z"
                      fill={ship.colorPalette.hullBottom}
                    />
                    <path
                      d="M 20 44 L 25 46 L 180 46 L 202 40 L 198 32 L 30 32 Z"
                      fill={ship.colorPalette.hullTop}
                    />
                    <rect
                      x="45"
                      y="20"
                      width="120"
                      height="12"
                      rx="1"
                      fill={ship.colorPalette.superstructure}
                    />
                    <rect
                      x="60"
                      y="14"
                      width="80"
                      height="6"
                      rx="1"
                      fill={ship.colorPalette.deck}
                    />

                    {Array.from({ length: ship.funnelCount }).map((_, fIdx) => {
                      const spacing = 100 / (ship.funnelCount + 1);
                      const fx = 55 + (fIdx + 1) * spacing;
                      return (
                        <g key={fIdx}>
                          <rect
                            x={fx - 4}
                            y="2"
                            width="8"
                            height="13"
                            fill={ship.colorPalette.funnels}
                          />
                          <rect
                            x={fx - 4}
                            y="2"
                            width="8"
                            height="4"
                            fill={ship.colorPalette.funnelTop}
                          />
                        </g>
                      );
                    })}

                    {Array.from({ length: ship.mastCount }).map((_, mIdx) => (
                      <line
                        key={mIdx}
                        x1={40 + mIdx * 115}
                        y1="1"
                        x2={40 + mIdx * 115}
                        y2="32"
                        stroke="#94a3b8"
                        strokeWidth="2"
                      />
                    ))}

                    {ship.hasContainers && (
                      <g>
                        <rect x="50" y="10" width="20" height="10" fill="#3b82f6" />
                        <rect x="72" y="10" width="20" height="10" fill="#ef4444" />
                        <rect x="94" y="10" width="20" height="10" fill="#eab308" />
                        <rect x="116" y="10" width="20" height="10" fill="#10b981" />
                        <rect x="138" y="10" width="20" height="10" fill="#f97316" />
                      </g>
                    )}

                    {ship.hasTurrets && (
                      <g>
                        <rect x="32" y="27" width="12" height="6" fill="#334155" />
                        <line x1="20" y1="30" x2="32" y2="30" stroke="#0f172a" strokeWidth="2.5" />
                        <rect x="175" y="27" width="12" height="6" fill="#334155" />
                        <line x1="187" y1="30" x2="200" y2="30" stroke="#0f172a" strokeWidth="2.5" />
                      </g>
                    )}

                    {ship.hasWaterSlide && (
                      <path
                        d="M 90 10 Q 110 0 130 14"
                        stroke="#ec4899"
                        strokeWidth="3.5"
                        fill="none"
                      />
                    )}
                  </svg>
                </div>

                {/* Ship Info */}
                <div className="space-y-1 mb-3">
                  <h3 className="text-lg font-black text-white group-hover:text-cyan-300 transition-colors">
                    {ship.name}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-1">
                    {ship.subtitle}
                  </p>
                </div>

                {/* Spec Badges */}
                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800/80 mb-3 text-center">
                  <div className="bg-slate-950/60 p-1.5 rounded-lg">
                    <span className="text-[10px] text-slate-500 font-bold block flex items-center justify-center gap-1">
                      <Heart className="w-3 h-3 text-rose-500" /> HP
                    </span>
                    <span className="text-xs font-black text-rose-300">
                      {ship.maxHp.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-slate-950/60 p-1.5 rounded-lg">
                    <span className="text-[10px] text-slate-500 font-bold block flex items-center justify-center gap-1">
                      <Ruler className="w-3 h-3 text-amber-500" /> Length
                    </span>
                    <span className="text-xs font-black text-amber-300">
                      {ship.lengthMeters}m
                    </span>
                  </div>
                  <div className="bg-slate-950/60 p-1.5 rounded-lg">
                    <span className="text-[10px] text-slate-500 font-bold block flex items-center justify-center gap-1">
                      <Shield className="w-3 h-3 text-cyan-500" /> Armor
                    </span>
                    <span className="text-xs font-black text-cyan-300">
                      {'★'.repeat(ship.armorRating)}
                    </span>
                  </div>
                </div>

                {/* Live Room Votes Bar */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-400">{shipVotes.toLocaleString()} votes</span>
                    <span className="text-cyan-400 font-mono">{percentage}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isLeader
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                          : 'bg-gradient-to-r from-cyan-600 to-blue-500'
                      }`}
                      style={{ width: `${Math.max(percentage, 4)}%` }}
                    />
                  </div>
                </div>

                {/* Action Buttons: Vote & Direct Spawn */}
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVote(ship);
                    }}
                    className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isVoted
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95'
                    }`}
                  >
                    <Vote className="w-3.5 h-3.5" />
                    <span>{isVoted ? '+10 Voted!' : 'Cast Vote'}</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLaunch(ship);
                    }}
                    className="py-2.5 px-3.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                    title={`Force spawn ${ship.name} immediately`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Spawn</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Radio Communicator / Chat Drawer */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                Taskforce Radio Channel (Live Multiplayer & Bots)
              </h4>
            </div>
            <button
              onClick={() => setShowChat(!showChat)}
              className="text-xs text-slate-400 hover:text-white"
            >
              {showChat ? 'Collapse' : 'Expand'}
            </button>
          </div>

          {showChat && (
            <div className="space-y-3">
              <div className="h-28 overflow-y-auto space-y-1.5 p-2 bg-slate-950/60 rounded-xl border border-slate-800/80 font-mono text-xs">
                {chatMessages.slice(-8).map(msg => (
                  <div key={msg.id} className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">
                      [{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]
                    </span>
                    <span className="font-bold" style={{ color: msg.senderColor }}>
                      {msg.senderName}:
                    </span>
                    <span className={msg.isSystem ? 'text-amber-300 italic' : 'text-slate-200'}>
                      {msg.text}
                    </span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleChatSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Transmit message to all connected crew & bots..."
                  maxLength={120}
                  className="flex-1 bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      <footer className="relative z-10 px-6 py-4 border-t border-slate-900 bg-slate-950/80 text-center text-xs text-slate-500">
        Taskforce bots are actively voting with you. The ship with the most votes spawns when the timer concludes, or click "Spawn" on any ship to launch it immediately.
      </footer>
    </div>
  );
};
