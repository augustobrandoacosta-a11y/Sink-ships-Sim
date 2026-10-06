import React, { useState } from 'react';
import { ShipSpec, ToolId, Player, ChatMessage } from '../types/game';
import { TOOLS_DATABASE } from '../data/tools';
import { soundManager } from '../utils/audio';
import {
  Radiation,
  Crosshair,
  Scissors,
  MountainSnow,
  Plane,
  OctagonAlert,
  Coins,
  Volume2,
  VolumeX,
  RotateCcw,
  ShoppingBag,
  Sun,
  Sunset,
  CloudRain,
  Moon,
  Clock,
  Sparkles,
  Users,
  MessageSquare,
  Send,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface GameHUDProps {
  ship: ShipSpec;
  currentHp: number;
  maxHp: number;
  bowHp: number;
  midHp: number;
  sternHp: number;
  isSplit: boolean;
  score: number;
  elapsedSeconds: number;
  coins: number;
  activeToolId: ToolId | null;
  ammo: Record<ToolId, number>;
  players: Record<string, Player>;
  myPlayerId: string;
  chatMessages: ChatMessage[];
  isConnected: boolean;
  onSelectTool: (id: ToolId) => void;
  onOpenShop: () => void;
  onQuickBuy: (id: ToolId) => void;
  onRestartVoting: () => void;
  onSendChat: (text: string) => void;
  environment: 'day' | 'sunset' | 'storm' | 'night';
  onChangeEnvironment: (env: 'day' | 'sunset' | 'storm' | 'night') => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  ship,
  currentHp,
  maxHp,
  bowHp,
  midHp,
  sternHp,
  isSplit,
  score,
  elapsedSeconds,
  coins,
  activeToolId,
  ammo,
  players,
  myPlayerId,
  chatMessages,
  isConnected,
  onSelectTool,
  onOpenShop,
  onQuickBuy,
  onRestartVoting,
  onSendChat,
  environment,
  onChangeEnvironment,
  isMuted,
  onToggleMute,
}) => {
  const [showChat, setShowChat] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');

  const hpPercent = Math.max(0, Math.min(100, Math.round((currentHp / maxHp) * 100)));

  let statusText = 'CRUISING';
  let statusColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  if (currentHp <= 0) {
    statusText = 'CATASTROPHICALLY SUNK';
    statusColor = 'text-rose-500 border-rose-500/50 bg-rose-500/20';
  } else if (isSplit) {
    statusText = 'HULL SEVERED IN HALF';
    statusColor = 'text-purple-400 border-purple-500/50 bg-purple-500/20';
  } else if (hpPercent < 35) {
    statusText = 'SEVERE FLOODING / PLUNGING';
    statusColor = 'text-amber-400 border-amber-500/50 bg-amber-500/20';
  } else if (hpPercent < 70) {
    statusText = 'HULL BREACHED';
    statusColor = 'text-sky-400 border-sky-500/40 bg-sky-500/10';
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getToolIcon = (iconName: string) => {
    switch (iconName) {
      case 'Radiation':
        return <Radiation className="w-5 h-5" />;
      case 'Crosshair':
        return <Crosshair className="w-5 h-5" />;
      case 'Scissors':
        return <Scissors className="w-5 h-5" />;
      case 'MountainSnow':
        return <MountainSnow className="w-5 h-5" />;
      case 'Plane':
        return <Plane className="w-5 h-5" />;
      case 'OctagonAlert':
        return <OctagonAlert className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput);
    setChatInput('');
  };

  const playerList = Object.values(players);

  return (
    <>
      {/* TOP HUD BAR */}
      <div className="absolute top-0 inset-x-0 z-30 p-3 sm:p-4 pointer-events-none flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
          {/* Ship Status & Health Bar Card */}
          <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-2xl p-3 sm:px-4 sm:py-3 shadow-2xl flex flex-col gap-2 min-w-[280px] sm:min-w-[360px] max-w-md">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Colossal Target Vessel
                </span>
                <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                  {ship.name}
                </h2>
              </div>
              <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusColor} animate-pulse`}>
                {statusText}
              </div>
            </div>

            {/* Health Bar with Compartments */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono font-bold">
                <span className="text-slate-400">
                  HP: <span className="text-white">{currentHp.toLocaleString()}</span> / {maxHp.toLocaleString()}
                </span>
                <span className={hpPercent > 50 ? 'text-emerald-400' : hpPercent > 20 ? 'text-amber-400' : 'text-rose-400'}>
                  {hpPercent}%
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-900 border border-slate-800 overflow-hidden relative">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    hpPercent > 50
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : hpPercent > 20
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                      : 'bg-gradient-to-r from-rose-600 to-red-500'
                  }`}
                  style={{ width: `${hpPercent}%` }}
                />
              </div>

              {/* Compartment mini indicators */}
              <div className="grid grid-cols-3 gap-1.5 pt-1 text-[10px] font-mono">
                <div className="bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800/80 text-center">
                  <span className="text-slate-500">Stern: </span>
                  <span className={sternHp <= 0 ? 'text-rose-500 font-bold' : 'text-slate-300'}>
                    {sternHp <= 0 ? 'BREACHED' : `${sternHp} HP`}
                  </span>
                </div>
                <div className="bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800/80 text-center">
                  <span className="text-slate-500">Mid: </span>
                  <span className={isSplit ? 'text-purple-400 font-bold' : midHp <= 0 ? 'text-rose-500 font-bold' : 'text-slate-300'}>
                    {isSplit ? 'SEVERED' : midHp <= 0 ? 'BREACHED' : `${midHp} HP`}
                  </span>
                </div>
                <div className="bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800/80 text-center">
                  <span className="text-slate-500">Bow: </span>
                  <span className={bowHp <= 0 ? 'text-rose-500 font-bold' : 'text-slate-300'}>
                    {bowHp <= 0 ? 'BREACHED' : `${bowHp} HP`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Multiplayer Crew Roster & Stats */}
          <div className="flex items-center gap-2 sm:gap-3 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-2xl p-2.5 sm:px-4 sm:py-2.5 shadow-2xl">
            {/* Online Crew */}
            <div className="flex items-center gap-1.5 px-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <div className="text-left">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Crew</span>
                <span className="text-xs font-mono font-black text-cyan-300">
                  {playerList.length} Active
                </span>
              </div>
            </div>

            <div className="h-7 w-[1px] bg-slate-800" />

            {/* Score */}
            <div className="px-2 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Score</span>
              <span className="text-sm sm:text-base font-black font-mono text-cyan-300">
                {score.toLocaleString()}
              </span>
            </div>

            <div className="h-7 w-[1px] bg-slate-800" />

            {/* Timer */}
            <div className="px-2 text-center flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Time</span>
                <span className="text-sm sm:text-base font-black font-mono text-amber-300">
                  {formatTime(elapsedSeconds)}
                </span>
              </div>
            </div>

            <div className="h-7 w-[1px] bg-slate-800" />

            {/* Coins & Shop Button */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2">
                <Coins className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-sm sm:text-base font-black font-mono text-yellow-300">
                  {coins.toLocaleString()}
                </span>
              </div>
              <button
                onClick={onOpenShop}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 active:scale-95 transition-all cursor-pointer shadow-md shadow-yellow-500/10"
                title="Open Weapons Arsenal Shop"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Shop</span>
              </button>
            </div>
          </div>

          {/* Quick System Controls & Chat Drawer Toggle */}
          <div className="flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-2xl p-1.5 shadow-2xl">
            {/* Chat Toggle */}
            <button
              onClick={() => setShowChat(!showChat)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer relative"
              title="Toggle Multiplayer Chat"
            >
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              {chatMessages.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400" />
              )}
            </button>

            {/* Environment Toggle */}
            <button
              onClick={() => {
                soundManager.playClick();
                const envs: Array<'day' | 'sunset' | 'storm' | 'night'> = ['day', 'sunset', 'storm', 'night'];
                const nextIdx = (envs.indexOf(environment) + 1) % envs.length;
                onChangeEnvironment(envs[nextIdx]);
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={`Switch Atmosphere (${environment})`}
            >
              {environment === 'day' && <Sun className="w-4 h-4 text-amber-400" />}
              {environment === 'sunset' && <Sunset className="w-4 h-4 text-orange-400" />}
              {environment === 'storm' && <CloudRain className="w-4 h-4 text-cyan-400" />}
              {environment === 'night' && <Moon className="w-4 h-4 text-indigo-300" />}
            </button>

            {/* Audio Toggle */}
            <button
              onClick={() => {
                soundManager.playClick();
                onToggleMute();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={isMuted ? 'Unmute SFX' : 'Mute SFX'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Revote / New Ship */}
            <button
              onClick={onRestartVoting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
              title="Return to ship voting board"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Vote Next</span>
            </button>
          </div>
        </div>

        {/* Floating Chat Drawer if opened */}
        {showChat && (
          <div className="self-end w-80 bg-slate-950/95 border border-slate-800 rounded-2xl p-3 shadow-2xl backdrop-blur-xl pointer-events-auto flex flex-col gap-2 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="text-[10px] font-black uppercase text-cyan-400 tracking-wider">
                Multiplayer Radio Chat
              </span>
              <button
                onClick={() => setShowChat(false)}
                className="text-xs text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="h-32 overflow-y-auto space-y-1 font-mono text-[11px] p-1 bg-slate-900/60 rounded-xl">
              {chatMessages.slice(-8).map(msg => (
                <div key={msg.id} className="leading-tight">
                  <span className="font-bold mr-1" style={{ color: msg.senderColor }}>
                    {msg.senderName}:
                  </span>
                  <span className={msg.isSystem ? 'text-amber-300 italic' : 'text-slate-200'}>
                    {msg.text}
                  </span>
                </div>
              ))}
            </div>
            <form onSubmit={handleChatSubmit} className="flex gap-1.5">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Radio message..."
                maxLength={100}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold"
              >
                <Send className="w-3 h-3" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* BOTTOM ARSENAL WEAPONS DOCK */}
      <div className="absolute bottom-3 sm:bottom-4 inset-x-0 z-30 px-3 sm:px-6 pointer-events-none flex justify-center">
        <div className="bg-slate-950/90 backdrop-blur-lg border border-slate-800/90 rounded-2xl p-2 sm:p-2.5 shadow-2xl flex items-center gap-2 max-w-full overflow-x-auto pointer-events-auto">
          {TOOLS_DATABASE.map((tool, idx) => {
            const isSelected = activeToolId === tool.id;
            const toolAmmo = ammo[tool.id] || 0;
            const isOutOfAmmo = toolAmmo <= 0;

            return (
              <div
                key={tool.id}
                onClick={() => {
                  soundManager.playClick(800);
                  onSelectTool(tool.id);
                }}
                className={`relative group rounded-xl p-2.5 min-w-[100px] sm:min-w-[125px] flex flex-col items-center justify-between transition-all duration-200 cursor-pointer border select-none ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-400 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400'
                    : isOutOfAmmo
                    ? 'bg-slate-950/50 border-slate-800/60 opacity-60 hover:opacity-90'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <span className="absolute top-1 left-1.5 text-[9px] font-mono font-bold text-slate-500">
                  [{idx + 1}]
                </span>

                <div
                  className={`absolute top-1 right-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black ${
                    toolAmmo > 0
                      ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {toolAmmo}x
                </div>

                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mt-2 mb-1.5 transition-transform group-hover:scale-105"
                  style={{
                    backgroundColor: `${tool.color}20`,
                    color: tool.color,
                    border: `1px solid ${tool.color}40`,
                  }}
                >
                  {getToolIcon(tool.iconName)}
                </div>

                <div className="text-center w-full">
                  <h4 className="text-xs font-black text-white truncate group-hover:text-cyan-300">
                    {tool.name}
                  </h4>
                  <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-slate-400">
                    <span className="text-rose-400 font-bold">{tool.damage} DMG</span>
                  </div>
                </div>

                {isOutOfAmmo && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickBuy(tool.id);
                    }}
                    className="w-full mt-1.5 py-1 px-1.5 rounded-lg text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                    title={`Buy 1 ammo for ${tool.cost} coins`}
                  >
                    <Coins className="w-2.5 h-2.5" />
                    <span>+{tool.cost}c</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};
