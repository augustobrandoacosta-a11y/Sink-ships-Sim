import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ShipSpec, ToolId, ScoreReport } from './types/game';
import { SHIPS_DATABASE } from './data/ships';
import { TOOLS_DATABASE } from './data/tools';
import { VotingPhase } from './components/VotingPhase';
import { GameCanvas } from './components/GameCanvas';
import { GameHUD } from './components/GameHUD';
import { ShopModal } from './components/ShopModal';
import { VictoryModal } from './components/VictoryModal';
import { DespawnOverlay } from './components/DespawnOverlay';
import { useMultiplayer } from './utils/useMultiplayer';
import { soundManager } from './utils/audio';

export default function App() {
  const {
    isConnected,
    myPlayerId,
    players,
    chatMessages,
    gameState: multiState,
    remoteWeaponEvents,
    remoteCursors,
    castVote,
    skipVote,
    fireWeapon,
    despawnShipNow,
    sendChat,
    updateCursor,
  } = useMultiplayer();

  const selectedShip =
    SHIPS_DATABASE.find(s => s.id === multiState.selectedShipId) || SHIPS_DATABASE[0];

  const [coins, setCoins] = useState<number>(450);
  const [ammo, setAmmo] = useState<Record<ToolId, number>>(() => {
    const initialAmmo: Record<ToolId, number> = {} as any;
    TOOLS_DATABASE.forEach(t => {
      initialAmmo[t.id] = t.startingAmmo;
    });
    return initialAmmo;
  });

  const [activeToolId, setActiveToolId] = useState<ToolId | null>('torpedo');
  const [isShopOpen, setIsShopOpen] = useState<boolean>(false);
  const [victoryReport, setVictoryReport] = useState<ScoreReport | null>(null);

  const [environment, setEnvironment] = useState<'day' | 'sunset' | 'storm' | 'night'>('sunset');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (multiState.phase !== 'playing') return;
      if (e.key >= '1' && e.key <= '6') {
        const index = parseInt(e.key) - 1;
        if (TOOLS_DATABASE[index]) {
          setActiveToolId(TOOLS_DATABASE[index].id);
          soundManager.playClick(700);
        }
      } else if (e.key.toLowerCase() === 'b' || e.key.toLowerCase() === 's') {
        setIsShopOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [multiState.phase]);

  const handleUseAmmo = useCallback((toolId: ToolId) => {
    setAmmo(prev => ({
      ...prev,
      [toolId]: Math.max(0, (prev[toolId] || 0) - 1),
    }));
  }, []);

  const handleFireWeaponLocal = useCallback((params: {
    toolId: ToolId;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    damage: number;
  }) => {
    const coinsReward = Math.max(10, Math.round(params.damage / 8));
    setCoins(prev => prev + coinsReward);
    fireWeapon(params);
  }, [fireWeapon]);

  const handleQuickBuy = (toolId: ToolId) => {
    const tool = TOOLS_DATABASE.find(t => t.id === toolId);
    if (!tool || coins < tool.cost) return;

    soundManager.playClick(950);
    setCoins(prev => prev - tool.cost);
    setAmmo(prev => ({
      ...prev,
      [toolId]: (prev[toolId] || 0) + 1,
    }));
  };

  const handleBuyAmmo = (toolId: ToolId, quantity: number, totalCost: number) => {
    setCoins(prev => Math.max(0, prev - totalCost));
    setAmmo(prev => ({
      ...prev,
      [toolId]: (prev[toolId] || 0) + quantity,
    }));
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundManager.setMuted(nextMuted);
  };

  // Only show victory report when currentHp is actually depleted to 0 and in sinking/despawning
  useEffect(() => {
    if ((multiState.phase === 'sinking' || multiState.phase === 'despawning') && multiState.currentHp <= 0) {
      const myPlayer = players[myPlayerId];
      const basePoints = Math.round(selectedShip.maxHp * 2.5);
      const timeBonus = Math.max(0, 4500 - multiState.elapsedSeconds * 55);
      const totalScore = (myPlayer?.score || 0) + basePoints + timeBonus;

      let rank: 'S+' | 'S' | 'A' | 'B' | 'C' = 'B';
      if (totalScore >= 12000) rank = 'S+';
      else if (totalScore >= 9000) rank = 'S';
      else if (totalScore >= 7000) rank = 'A';
      else if (totalScore >= 4500) rank = 'B';
      else rank = 'C';

      setVictoryReport({
        shipName: selectedShip.name,
        basePoints,
        timeTakenSeconds: multiState.elapsedSeconds,
        timeBonus,
        toolsUsedCount: 5,
        resourceBonus: 1000,
        styleBonus: multiState.isSplit ? 1500 : 600,
        totalScore,
        rank,
        coinsEarned: 650,
        achievements: [
          'Naval Demolition Taskforce: Vessel Sent to the Depths',
          multiState.isSplit ? 'Bifurcation: Hull Cleaved Into Two Sinking Halves' : 'Keel Breached',
        ],
      });
    } else if (multiState.phase === 'voting') {
      setVictoryReport(null);
    }
  }, [multiState.phase, multiState.currentHp, multiState.elapsedSeconds, multiState.isSplit, players, myPlayerId, selectedShip]);

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-950 font-sans flex flex-col">
      {multiState.phase === 'voting' ? (
        <VotingPhase
          votes={multiState.votes}
          votingTimeLeft={multiState.votingTimeLeft}
          players={players}
          myPlayerId={myPlayerId}
          chatMessages={chatMessages}
          isConnected={isConnected}
          onCastVote={castVote}
          onSkipVote={(forceShipId) => skipVote(forceShipId)}
          onSendChat={sendChat}
        />
      ) : (
        <div className="relative w-full h-full flex flex-col">
          {/* Top HUD & Bottom Arsenal Dock */}
          <GameHUD
            ship={selectedShip}
            currentHp={multiState.currentHp}
            maxHp={multiState.maxHp}
            bowHp={multiState.bowHp}
            midHp={multiState.midHp}
            sternHp={multiState.sternHp}
            isSplit={multiState.isSplit}
            score={players[myPlayerId]?.score || 0}
            elapsedSeconds={multiState.elapsedSeconds}
            coins={coins}
            activeToolId={activeToolId}
            ammo={ammo}
            players={players}
            myPlayerId={myPlayerId}
            chatMessages={chatMessages}
            isConnected={isConnected}
            onSelectTool={id => setActiveToolId(id)}
            onOpenShop={() => setIsShopOpen(true)}
            onQuickBuy={handleQuickBuy}
            onRestartVoting={despawnShipNow}
            onSendChat={sendChat}
            environment={environment}
            onChangeEnvironment={setEnvironment}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
          />

          {/* 2D Canvas with BIG SHIPS and Authoritative Health Sync */}
          <GameCanvas
            ship={selectedShip}
            currentHp={multiState.currentHp}
            maxHp={multiState.maxHp}
            bowHp={multiState.bowHp}
            midHp={multiState.midHp}
            sternHp={multiState.sternHp}
            isSplit={multiState.isSplit}
            activeToolId={activeToolId}
            ammo={ammo}
            phase={multiState.phase}
            despawnCountdown={multiState.despawnCountdown}
            remoteWeaponEvents={remoteWeaponEvents}
            remoteCursors={remoteCursors}
            myPlayerId={myPlayerId}
            onUseAmmo={handleUseAmmo}
            onFireWeaponLocal={handleFireWeaponLocal}
            onUpdateCursor={updateCursor}
            environment={environment}
          />

          {/* Despawn & Re-Vote Banner System (Strictly when currentHp is 0) */}
          {(multiState.phase === 'sinking' || multiState.phase === 'despawning') && multiState.currentHp <= 0 && (
            <DespawnOverlay
              ship={selectedShip}
              phase={multiState.phase}
              despawnCountdown={multiState.despawnCountdown}
              players={players}
              myPlayerId={myPlayerId}
              onDespawnNow={despawnShipNow}
            />
          )}

          {/* Arsenal Supply Shop Modal */}
          <ShopModal
            isOpen={isShopOpen}
            onClose={() => setIsShopOpen(false)}
            coins={coins}
            ammo={ammo}
            onBuyAmmo={handleBuyAmmo}
          />

          {/* Sunk Victory Debrief Modal */}
          {victoryReport && (
            <VictoryModal
              report={victoryReport}
              onPlayAgain={() => {
                setVictoryReport(null);
              }}
              onVoteNext={() => {
                despawnShipNow();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
