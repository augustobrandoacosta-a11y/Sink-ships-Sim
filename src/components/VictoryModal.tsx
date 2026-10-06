import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ScoreReport } from '../types/game';
import { soundManager } from '../utils/audio';
import {
  Trophy,
  Award,
  Clock,
  Zap,
  ShieldAlert,
  Coins,
  RotateCcw,
  Vote,
  Sparkles,
  Flame,
  CheckCircle2,
} from 'lucide-react';

interface VictoryModalProps {
  report: ScoreReport;
  onPlayAgain: () => void;
  onVoteNext: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  report,
  onPlayAgain,
  onVoteNext,
}) => {
  useEffect(() => {
    // Confetti burst
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
    soundManager.playHorn();
  }, []);

  const getRankBadge = (rank: string) => {
    switch (rank) {
      case 'S+':
        return {
          bg: 'from-amber-400 via-rose-500 to-purple-600',
          text: 'text-amber-300',
          border: 'border-amber-400/80',
          label: 'LEGENDARY DEMOLITION (S+)',
        };
      case 'S':
        return {
          bg: 'from-amber-500 to-yellow-300',
          text: 'text-amber-300',
          border: 'border-amber-400/80',
          label: 'MASTER DEMOLITION (S)',
        };
      case 'A':
        return {
          bg: 'from-cyan-500 to-blue-600',
          text: 'text-cyan-300',
          border: 'border-cyan-400/80',
          label: 'EXPERT SINKING (A)',
        };
      case 'B':
        return {
          bg: 'from-emerald-500 to-teal-600',
          text: 'text-emerald-300',
          border: 'border-emerald-400/80',
          label: 'STANDARD VICTORY (B)',
        };
      default:
        return {
          bg: 'from-slate-500 to-slate-700',
          text: 'text-slate-300',
          border: 'border-slate-500',
          label: 'ATTRITION VICTORY (C)',
        };
    }
  };

  const rankStyle = getRankBadge(report.rank);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top Decorative Banner */}
        <div className={`p-6 text-center bg-gradient-to-r ${rankStyle.bg} relative overflow-hidden`}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/30 backdrop-blur-md flex items-center justify-center text-white mb-2 shadow-xl">
              <Trophy className="w-9 h-9" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-amber-300 bg-black/40 px-3 py-1 rounded-full mb-1">
              Target Catastrophically Destroyed
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {report.shipName} Sunk!
            </h2>
            <div className="mt-2 text-3xl font-black tracking-wider text-white font-mono drop-shadow-md">
              {report.rank} RANK
            </div>
          </div>
        </div>

        {/* Score Breakdown Cards */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400 flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-500" /> Base Hull Destruction
              </span>
              <span className="font-mono font-bold text-white">
                +{report.basePoints.toLocaleString()} pts
              </span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" /> Time Bonus ({report.timeTakenSeconds}s)
              </span>
              <span className="font-mono font-bold text-amber-300">
                +{report.timeBonus.toLocaleString()} pts
              </span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400 flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" /> Resource Efficiency Bonus
              </span>
              <span className="font-mono font-bold text-cyan-300">
                +{report.resourceBonus.toLocaleString()} pts
              </span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" /> Demolition Style Bonus
              </span>
              <span className="font-mono font-bold text-purple-300">
                +{report.styleBonus.toLocaleString()} pts
              </span>
            </div>

            <div className="h-[1px] bg-slate-800 my-2" />

            <div className="flex justify-between items-center text-lg sm:text-xl font-black">
              <span className="text-white uppercase tracking-wider">Final Score</span>
              <span className="font-mono text-cyan-400 text-2xl drop-shadow-sm">
                {report.totalScore.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Reward Bounty */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-yellow-500/10 border border-yellow-500/30">
            <div className="flex items-center gap-2.5">
              <Coins className="w-6 h-6 text-yellow-400 fill-yellow-400" />
              <div>
                <h4 className="text-xs font-bold text-yellow-300 uppercase tracking-wider">
                  Bounty Awarded
                </h4>
                <p className="text-xs text-slate-400">Added to your weapons wallet</p>
              </div>
            </div>
            <span className="font-mono font-black text-yellow-300 text-lg">
              +{report.coinsEarned} Coins
            </span>
          </div>

          {/* Achievements if any */}
          {report.achievements.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Accomplishments
              </span>
              <div className="flex flex-wrap gap-1.5">
                {report.achievements.map((ach, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{ach}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-6 pt-0 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onVoteNext}
            className="flex-1 py-3 px-4 rounded-xl font-black text-sm uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-xl shadow-cyan-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Vote className="w-4 h-4" />
            <span>Vote Next Ship</span>
          </button>

          <button
            onClick={onPlayAgain}
            className="py-3 px-5 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Destroy Again</span>
          </button>
        </div>
      </div>
    </div>
  );
};
