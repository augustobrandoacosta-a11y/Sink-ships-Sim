import React from 'react';
import { Player, ShipSpec } from '../types/game';
import { 
  Anchor, 
  RotateCcw, 
  Trophy, 
  Timer, 
  Coins, 
  Sparkles, 
  Waves, 
  ArrowRight,
  Vote
} from 'lucide-react';

interface DespawnOverlayProps {
  ship: ShipSpec;
  phase: 'sinking' | 'despawning';
  despawnCountdown: number;
  players: Record<string, Player>;
  myPlayerId: string;
  onDespawnNow: () => void;
}

export const DespawnOverlay: React.FC<DespawnOverlayProps> = ({
  ship,
  phase,
  despawnCountdown,
  players,
  myPlayerId,
  onDespawnNow,
}) => {
  // Calculate MVP
  const playerList = Object.values(players).sort((a, b) => b.damageDealt - a.damageDealt);
  const mvp = playerList[0];

  return (
    <div className="absolute inset-x-0 bottom-24 z-40 px-4 flex justify-center pointer-events-none animate-fade-in">
      <div className="bg-slate-950/95 border-2 border-cyan-500/60 rounded-3xl p-5 shadow-2xl max-w-2xl w-full backdrop-blur-xl pointer-events-auto flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Anchor className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400 font-bold block">
                {phase === 'sinking' ? 'FINAL PLUNGE IN PROGRESS' : 'DESPAWNING WRECKAGE FROM WATERS'}
              </span>
              <h3 className="text-xl font-black text-white">
                {ship.name} Has Been Sunk!
              </h3>
            </div>
          </div>

          {/* Countdown timer badge */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 px-3 py-1.5 rounded-xl font-mono">
            <Timer className="w-4 h-4 text-amber-400 animate-spin-slow" />
            <span className="text-xs font-bold text-slate-400">Next Vote In:</span>
            <span className="text-sm font-black text-amber-300">
              00:{despawnCountdown < 10 ? `0${despawnCountdown}` : despawnCountdown}s
            </span>
          </div>
        </div>

        {/* Demolition Crew MVP & Bounties */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* MVP Card */}
          {mvp && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">
                  Demolition MVP
                </span>
                <div className="text-sm font-black text-white truncate flex items-center gap-1.5">
                  <span style={{ color: mvp.color }}>{mvp.name}</span>
                  {mvp.id === myPlayerId && <span className="text-[10px] text-cyan-400 font-mono">(You)</span>}
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {mvp.damageDealt.toLocaleString()} Total DMG
                </span>
              </div>
            </div>
          )}

          {/* Sinking Bounty Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-400 shrink-0">
              <Coins className="w-5 h-5 fill-yellow-400" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-yellow-400 block tracking-wider">
                Crew Sinking Bounty
              </span>
              <div className="text-sm font-black text-yellow-300 font-mono">
                +650 Coins Awarded
              </div>
              <span className="text-xs text-slate-400">
                Added to your weapons wallet
              </span>
            </div>
          </div>
        </div>

        {/* Action Button: Despawn Ship & Vote For Next */}
        <div className="pt-1 flex flex-col sm:flex-row gap-2">
          <button
            onClick={onDespawnNow}
            className="flex-1 py-3 px-5 rounded-2xl font-black text-sm uppercase tracking-wider bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-xl shadow-cyan-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Waves className="w-4 h-4" />
            <span>Despawn Ship & Vote For Next One Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
