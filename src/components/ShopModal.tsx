import React from 'react';
import { ToolSpec, ToolId } from '../types/game';
import { TOOLS_DATABASE } from '../data/tools';
import { soundManager } from '../utils/audio';
import {
  X,
  Coins,
  Radiation,
  Crosshair,
  Scissors,
  MountainSnow,
  Plane,
  OctagonAlert,
  Sparkles,
  ShoppingBag,
  Plus,
} from 'lucide-react';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  coins: number;
  ammo: Record<ToolId, number>;
  onBuyAmmo: (toolId: ToolId, quantity: number, cost: number) => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  onClose,
  coins,
  ammo,
  onBuyAmmo,
}) => {
  if (!isOpen) return null;

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

  const handlePurchase = (tool: ToolSpec, quantity: number) => {
    const totalCost = tool.cost * quantity;
    if (coins < totalCost) return;
    soundManager.playClick(900);
    onBuyAmmo(tool.id, quantity, totalCost);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Naval Demolition Arsenal</h3>
              <p className="text-xs text-slate-400">Re-supply ordnance, tactical lasers, and glacial summoners</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700">
              <Coins className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="font-mono font-black text-yellow-300 text-sm">
                {coins.toLocaleString()}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Arsenal Weapons List */}
        <div className="p-5 overflow-y-auto space-y-3.5 flex-1 divide-y divide-slate-800/60">
          {TOOLS_DATABASE.map(tool => {
            const currentAmmo = ammo[tool.id] || 0;
            const canAffordSingle = coins >= tool.cost;
            const canAffordPack = coins >= tool.cost * 3;

            return (
              <div key={tool.id} className="pt-3.5 first:pt-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${tool.color}20`,
                      color: tool.color,
                      border: `1px solid ${tool.color}50`,
                    }}
                  >
                    {getToolIcon(tool.iconName)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-white text-base">{tool.name}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-rose-400 font-bold border border-slate-700">
                        {tool.damage} DMG
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 font-bold border border-cyan-800/50">
                        Current: {currentAmmo}x
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-md">
                      {tool.description}
                    </p>
                  </div>
                </div>

                {/* Purchase Buttons */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {/* Buy 1 */}
                  <button
                    disabled={!canAffordSingle}
                    onClick={() => handlePurchase(tool, 1)}
                    className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                      canAffordSingle
                        ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 active:scale-95'
                        : 'bg-slate-900 text-slate-600 border border-slate-800/60 cursor-not-allowed'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>1x ({tool.cost}c)</span>
                  </button>

                  {/* Buy 3 Pack */}
                  <button
                    disabled={!canAffordPack}
                    onClick={() => handlePurchase(tool, 3)}
                    className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                      canAffordPack
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-lg shadow-amber-500/10 active:scale-95 font-black'
                        : 'bg-slate-900 text-slate-600 border border-slate-800/60 cursor-not-allowed'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>3x Pack ({tool.cost * 3}c)</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>Earn coins by hitting and completely sinking ships!</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
          >
            Back to Simulation
          </button>
        </div>
      </div>
    </div>
  );
};
