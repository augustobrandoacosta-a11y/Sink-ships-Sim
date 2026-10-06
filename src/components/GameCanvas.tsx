import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ShipSpec, ToolId, WeaponEvent, Player, GamePhase } from '../types/game';
import { TOOLS_DATABASE } from '../data/tools';
import { soundManager } from '../utils/audio';

interface GameCanvasProps {
  ship: ShipSpec;
  currentHp: number;
  maxHp: number;
  bowHp: number;
  midHp: number;
  sternHp: number;
  isSplit: boolean;
  activeToolId: ToolId | null;
  ammo: Record<ToolId, number>;
  phase: GamePhase;
  despawnCountdown: number;
  remoteWeaponEvents: WeaponEvent[];
  remoteCursors: Record<string, { x: number; y: number; activeToolId?: ToolId; name: string; color: string }>;
  myPlayerId: string;
  onUseAmmo: (toolId: ToolId) => void;
  onFireWeaponLocal: (params: {
    toolId: ToolId;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    damage: number;
  }) => void;
  onUpdateCursor: (x: number, y: number, activeToolId?: ToolId) => void;
  environment: 'day' | 'sunset' | 'storm' | 'night';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'smoke' | 'fire' | 'water' | 'bubble' | 'spark' | 'ice' | 'debris' | 'dissolve';
}

interface ActiveWeaponEffect {
  id: string;
  toolId: ToolId;
  playerName?: string;
  playerColor?: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number;
  duration: number;
  elapsed: number;
  detonated: boolean;
}

interface IcebergEntity {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  hp: number;
}

interface CargoBox {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  vAngle: number;
  color: string;
  inWater: boolean;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  ship,
  currentHp,
  maxHp,
  bowHp,
  midHp,
  sternHp,
  isSplit,
  activeToolId,
  ammo,
  phase,
  despawnCountdown,
  remoteWeaponEvents,
  remoteCursors,
  myPlayerId,
  onUseAmmo,
  onFireWeaponLocal,
  onUpdateCursor,
  environment,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Big Ship Physical State
  const shipState = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    vAngle: 0,
    width: 0,
    height: 120,
    isSplit: false,
    splitProgress: 0,

    floodBow: 0,
    floodMid: 0,
    floodStern: 0,

    stern: {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      angle: 0,
      vAngle: 0,
      width: 0,
      height: 120,
      flood: 0,
      isSunk: false,
    },

    isSunk: false,
    alpha: 1.0,
  });

  const particles = useRef<Particle[]>([]);
  const activeEffects = useRef<ActiveWeaponEffect[]>([]);
  const icebergs = useRef<IcebergEntity[]>([]);
  const cargoBoxes = useRef<CargoBox[]>([]);
  const flashAlpha = useRef<number>(0);
  const screenShake = useRef<{ x: number; y: number; trauma: number }>({ x: 0, y: 0, trauma: 0 });

  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Initialize BIG Ship on mount or ship switch
  useEffect(() => {
    const canvas = canvasRef.current;
    const w = canvas ? canvas.width : 1300;
    const h = canvas ? canvas.height : 750;

    const bigShipWidth = Math.max(900, Math.min(w * 0.94, ship.lengthMeters * 3.8));

    shipState.current = {
      x: w / 2,
      y: h * 0.60,
      vx: 0,
      vy: 0,
      angle: 0,
      vAngle: 0,
      width: bigShipWidth,
      height: 120,
      isSplit: isSplit,
      splitProgress: 0,

      floodBow: 0,
      floodMid: 0,
      floodStern: 0,

      stern: {
        x: w / 2,
        y: h * 0.60,
        vx: 0,
        vy: 0,
        angle: 0,
        vAngle: 0,
        width: bigShipWidth / 2,
        height: 120,
        flood: 0,
        isSunk: false,
      },

      isSunk: false,
      alpha: 1.0,
    };

    particles.current = [];
    activeEffects.current = [];
    icebergs.current = [];
    cargoBoxes.current = [];

    if (ship.hasContainers) {
      const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];
      const boxes: CargoBox[] = [];
      const numBoxes = 64;
      for (let i = 0; i < numBoxes; i++) {
        const col = i % 16;
        const row = Math.floor(i / 16);
        boxes.push({
          x: -bigShipWidth * 0.32 + col * (bigShipWidth * 0.038),
          y: -55 - row * 20,
          vx: 0,
          vy: 0,
          angle: 0,
          vAngle: 0,
          color: colors[i % colors.length],
          inWater: false,
        });
      }
      cargoBoxes.current = boxes;
    }
  }, [ship]);

  // Sync split state
  useEffect(() => {
    if (isSplit && !shipState.current.isSplit) {
      triggerHullSplit();
    }
  }, [isSplit]);

  // Handle Canvas Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync Remote Weapons from Multiplayer Network
  const lastProcessedEventId = useRef<string>('');
  useEffect(() => {
    if (remoteWeaponEvents.length === 0) return;
    const latest = remoteWeaponEvents[remoteWeaponEvents.length - 1];
    if (latest.id === lastProcessedEventId.current) return;
    lastProcessedEventId.current = latest.id;

    if (latest.toolId === 'nuke') {
      soundManager.playNuke();
      activeEffects.current.push({
        id: latest.id,
        toolId: 'nuke',
        playerName: latest.playerName,
        playerColor: latest.playerColor,
        startX: latest.startX,
        startY: 0,
        targetX: latest.targetX,
        targetY: latest.targetY,
        progress: 0,
        duration: 900,
        elapsed: 0,
        detonated: false,
      });
    } else if (latest.toolId === 'torpedo') {
      soundManager.playTorpedo();
      activeEffects.current.push({
        id: latest.id,
        toolId: 'torpedo',
        playerName: latest.playerName,
        playerColor: latest.playerColor,
        startX: latest.startX,
        startY: latest.startY,
        targetX: latest.targetX,
        targetY: latest.targetY,
        progress: 0,
        duration: 1100,
        elapsed: 0,
        detonated: false,
      });
    } else if (latest.toolId === 'split') {
      soundManager.playSplit();
      activeEffects.current.push({
        id: latest.id,
        toolId: 'split',
        playerName: latest.playerName,
        playerColor: latest.playerColor,
        startX: latest.targetX,
        startY: 0,
        targetX: latest.targetX,
        targetY: 600,
        progress: 0,
        duration: 500,
        elapsed: 0,
        detonated: false,
      });
      triggerHullSplit();
    } else if (latest.toolId === 'iceberg') {
      soundManager.playIceberg();
      icebergs.current.push({
        x: latest.targetX,
        y: (canvasRef.current?.height || 700) * 0.65,
        width: 180,
        height: 150,
        vx: latest.targetX < shipState.current.x ? 0.7 : -0.7,
        hp: 600,
      });
    } else if (latest.toolId === 'airstrike') {
      soundManager.playExplosion(0.8);
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          activeEffects.current.push({
            id: `${latest.id}-${i}`,
            toolId: 'airstrike',
            playerName: latest.playerName,
            playerColor: latest.playerColor,
            startX: latest.targetX - 140 + i * 90,
            startY: -30,
            targetX: latest.targetX - 140 + i * 90,
            targetY: 480 + (Math.random() - 0.5) * 40,
            progress: 0,
            duration: 600,
            elapsed: 0,
            detonated: false,
          });
        }, i * 160);
      }
    } else if (latest.toolId === 'kraken') {
      soundManager.playKraken();
      activeEffects.current.push({
        id: latest.id,
        toolId: 'kraken',
        playerName: latest.playerName,
        playerColor: latest.playerColor,
        startX: latest.targetX,
        startY: 700,
        targetX: latest.targetX,
        targetY: 460,
        progress: 0,
        duration: 2500,
        elapsed: 0,
        detonated: false,
      });
    }
  }, [remoteWeaponEvents]);

  const triggerHullSplit = useCallback(() => {
    const s = shipState.current;
    if (s.isSplit) return;
    s.isSplit = true;
    soundManager.playSplit();

    const halfW = s.width / 2;
    s.width = halfW;

    s.stern = {
      x: s.x - halfW * 0.55,
      y: s.y,
      vx: -1.8,
      vy: 0.6,
      angle: s.angle + 0.06,
      vAngle: 0.002,
      width: halfW,
      height: s.height,
      flood: 0.45,
      isSunk: false,
    };

    s.x = s.x + halfW * 0.55;
    s.vx = 1.2;
    s.angle = s.angle - 0.1;
    s.vAngle = -0.003;
    s.floodBow = 0.45;

    screenShake.current.trauma = 0.9;
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeToolId || phase !== 'playing') return;
    const currentAmmo = ammo[activeToolId] || 0;
    if (currentAmmo <= 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const clickX = (e.clientX - rect.left) * dpr;
    const clickY = (e.clientY - rect.top) * dpr;

    const tool = TOOLS_DATABASE.find(t => t.id === activeToolId);
    if (!tool) return;

    onUseAmmo(activeToolId);

    const canvasW = canvas.width;
    const waterLevel = canvas.height * 0.64;
    const fromLeft = clickX < canvasW / 2;
    const startX = activeToolId === 'torpedo' ? (fromLeft ? 0 : canvasW) : clickX;
    const startY = activeToolId === 'torpedo' ? Math.max(waterLevel + 20, clickY) : 0;

    onFireWeaponLocal({
      toolId: activeToolId,
      startX,
      startY,
      targetX: clickX,
      targetY: clickY,
      damage: tool.damage,
    });
  };

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;

      const canvas = canvasRef.current;
      if (!canvas) {
        animationFrameId = requestAnimationFrame(loop);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationFrameId = requestAnimationFrame(loop);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;
      const waterLevel = h * 0.63;

      const s = shipState.current;

      // Handle Despawn dissolving animation
      if (phase === 'despawning') {
        s.alpha = Math.max(0, s.alpha - dt * 0.25);
        if (Math.random() < 0.7) {
          particles.current.push({
            x: s.x + (Math.random() - 0.5) * s.width,
            y: s.y + (Math.random() - 0.5) * s.height,
            vx: (Math.random() - 0.5) * 2,
            vy: -Math.random() * 3 - 1,
            life: 1.0,
            maxLife: 1.5,
            size: Math.random() * 8 + 4,
            color: '#38bdf8',
            type: 'dissolve',
          });
        }
      } else {
        s.alpha = 1.0;
      }

      if (screenShake.current.trauma > 0) {
        screenShake.current.trauma = Math.max(0, screenShake.current.trauma - dt * 1.5);
        const shake = screenShake.current.trauma * screenShake.current.trauma * 25;
        screenShake.current.x = (Math.random() - 0.5) * shake;
        screenShake.current.y = (Math.random() - 0.5) * shake;
      } else {
        screenShake.current.x = 0;
        screenShake.current.y = 0;
      }

      if (flashAlpha.current > 0) {
        flashAlpha.current = Math.max(0, flashAlpha.current - dt * 2.2);
      }

      // SHIP FLOODING LINKED TO AUTHORITATIVE HEALTH
      const damageRatio = Math.max(0, Math.min(1.0, 1 - (currentHp / maxHp)));
      const isHpDepleted = currentHp <= 0;
      const isSubmergedState = isHpDepleted && (phase === 'sinking' || phase === 'despawning');

      // Ship only plunges deep when currentHp <= 0!
      const targetWaterY = isSubmergedState
        ? waterLevel + 230
        : waterLevel + damageRatio * 130;

      const bowRatio = 1 - (bowHp / (maxHp * 0.3));
      const sternRatio = 1 - (sternHp / (maxHp * 0.3));

      const targetAngle = s.isSplit
        ? -0.28 - (isSubmergedState ? 0.3 : 0.1)
        : (bowRatio - sternRatio) * 0.32;

      s.vy += (targetWaterY - s.y) * 1.8 * dt;
      s.vy *= 0.94;
      s.y += s.vy * dt * 45;

      s.vAngle += (targetAngle - s.angle) * 1.5 * dt;
      s.vAngle *= 0.92;
      s.angle += s.vAngle * dt * 40;

      if (s.isSplit) {
        const stern = s.stern;
        const sternTargetY = isSubmergedState ? waterLevel + 240 : waterLevel + damageRatio * 140;
        const sternTargetAngle = 0.32 + (isSubmergedState ? 0.35 : 0.1);

        stern.vy += (sternTargetY - stern.y) * 1.6 * dt;
        stern.vy *= 0.94;
        stern.y += stern.vy * dt * 45;

        stern.vAngle += (sternTargetAngle - stern.angle) * 1.4 * dt;
        stern.vAngle *= 0.92;
        stern.angle += stern.vAngle * dt * 40;

        s.x += 12 * dt;
        stern.x -= 12 * dt;
      }

      // Update Active Weapons Animations
      for (let i = activeEffects.current.length - 1; i >= 0; i--) {
        const effect = activeEffects.current[i];
        effect.elapsed += dt * 1000;
        effect.progress = Math.min(1.0, effect.elapsed / effect.duration);

        if (effect.toolId === 'nuke') {
          const curY = effect.startY + (effect.targetY - effect.startY) * effect.progress;
          particles.current.push({
            x: effect.startX,
            y: curY,
            vx: (Math.random() - 0.5) * 1.5,
            vy: -Math.random() * 2,
            life: 1.0,
            maxLife: 0.5,
            size: 10,
            color: '#f97316',
            type: 'fire',
          });

          if (effect.progress >= 1.0 && !effect.detonated) {
            effect.detonated = true;
            flashAlpha.current = 1.0;
            soundManager.playExplosion(1.5);
            screenShake.current.trauma = 1.0;

            for (let p = 0; p < 150; p++) {
              const ang = Math.random() * Math.PI * 2;
              const spd = Math.random() * 18 + 5;
              particles.current.push({
                x: effect.targetX,
                y: effect.targetY,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd - 6,
                life: 1.0,
                maxLife: Math.random() * 1.6 + 0.8,
                size: Math.random() * 32 + 16,
                color: Math.random() > 0.4 ? '#ef4444' : '#f59e0b',
                type: 'fire',
              });
            }
          }
        } else if (effect.toolId === 'torpedo') {
          const curX = effect.startX + (effect.targetX - effect.startX) * effect.progress;
          particles.current.push({
            x: curX,
            y: effect.targetY,
            vx: 0,
            vy: -Math.random() * 1.5,
            life: 1.0,
            maxLife: 0.8,
            size: 5,
            color: 'rgba(255, 255, 255, 0.7)',
            type: 'bubble',
          });

          if (effect.progress >= 1.0 && !effect.detonated) {
            effect.detonated = true;
            soundManager.playExplosion(1.1);
            screenShake.current.trauma = 0.5;

            for (let g = 0; g < 90; g++) {
              particles.current.push({
                x: effect.targetX + (Math.random() - 0.5) * 30,
                y: waterLevel,
                vx: (Math.random() - 0.5) * 5,
                vy: -Math.random() * 18 - 8,
                life: 1.0,
                maxLife: Math.random() * 1.2 + 0.6,
                size: Math.random() * 10 + 4,
                color: '#e0f2fe',
                type: 'water',
              });
            }
          }
        }

        if (effect.progress >= 1.0) {
          activeEffects.current.splice(i, 1);
        }
      }

      // Update Particles
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt / p.maxLife;

        if (p.type === 'smoke') {
          p.size += dt * 10;
          p.vy -= dt * 1.5;
        } else if (p.type === 'water') {
          p.vy += dt * 35;
        }

        if (p.life <= 0) {
          particles.current.splice(i, 1);
        }
      }

      // RENDER CANVAS
      ctx.save();
      ctx.translate(screenShake.current.x, screenShake.current.y);

      // Sky
      let skyGrad = ctx.createLinearGradient(0, 0, 0, waterLevel);
      if (environment === 'sunset') {
        skyGrad.addColorStop(0, '#1e1b4b');
        skyGrad.addColorStop(0.4, '#831843');
        skyGrad.addColorStop(0.75, '#f97316');
        skyGrad.addColorStop(1, '#fed7aa');
      } else if (environment === 'storm') {
        skyGrad.addColorStop(0, '#090d16');
        skyGrad.addColorStop(0.5, '#1e293b');
        skyGrad.addColorStop(1, '#334155');
      } else if (environment === 'night') {
        skyGrad.addColorStop(0, '#020617');
        skyGrad.addColorStop(0.6, '#0f172a');
        skyGrad.addColorStop(1, '#1e293b');
      } else {
        skyGrad.addColorStop(0, '#0284c7');
        skyGrad.addColorStop(0.5, '#38bdf8');
        skyGrad.addColorStop(1, '#bae6fd');
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, waterLevel);

      // Sun/Moon
      ctx.save();
      if (environment === 'night' || environment === 'storm') {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(w * 0.82, 80, 28, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const sunGlow = ctx.createRadialGradient(w * 0.8, 90, 8, w * 0.8, 90, 75);
        sunGlow.addColorStop(0, 'rgba(254, 240, 138, 0.9)');
        sunGlow.addColorStop(0.5, 'rgba(251, 191, 36, 0.4)');
        sunGlow.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = sunGlow;
        ctx.beginPath();
        ctx.arc(w * 0.8, 90, 75, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Icebergs in background
      icebergs.current.forEach(ice => {
        ctx.save();
        ctx.translate(ice.x, ice.y);
        ctx.fillStyle = '#e0f2fe';
        ctx.beginPath();
        ctx.moveTo(-ice.width * 0.5, 0);
        ctx.lineTo(-ice.width * 0.2, -ice.height);
        ctx.lineTo(ice.width * 0.1, -ice.height * 0.85);
        ctx.lineTo(ice.width * 0.5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      // RENDER BIG SHIP
      const renderBigShipBody = (
        posX: number,
        posY: number,
        rot: number,
        sectionWidth: number,
        isSternPiece: boolean,
        isBowPiece: boolean
      ) => {
        ctx.save();
        ctx.translate(posX, posY);
        ctx.rotate(rot);
        ctx.globalAlpha = s.alpha;

        const halfW = sectionWidth / 2;

        // Bottom red-oxide hull
        ctx.fillStyle = ship.colorPalette.hullBottom;
        ctx.beginPath();
        if (isBowPiece) {
          ctx.moveTo(-halfW, 0);
          ctx.lineTo(halfW - 55, 0);
          ctx.lineTo(halfW, -35);
          ctx.lineTo(halfW - 15, -10);
          ctx.lineTo(-halfW, 26);
        } else if (isSternPiece) {
          ctx.moveTo(-halfW, -25);
          ctx.lineTo(halfW, 0);
          ctx.lineTo(halfW, 26);
          ctx.lineTo(-halfW + 30, 26);
        } else {
          ctx.moveTo(-halfW, -25);
          ctx.lineTo(-halfW + 30, 26);
          ctx.lineTo(halfW - 55, 26);
          ctx.lineTo(halfW, -35);
          ctx.lineTo(halfW - 15, 0);
          ctx.lineTo(-halfW, 0);
        }
        ctx.closePath();
        ctx.fill();

        // Top Hull Plating
        ctx.fillStyle = ship.colorPalette.hullTop;
        ctx.beginPath();
        ctx.moveTo(-halfW, -42);
        ctx.lineTo(halfW, -42);
        ctx.lineTo(halfW - 8, 0);
        ctx.lineTo(-halfW + 15, 0);
        ctx.closePath();
        ctx.fill();

        // Gold Stripe
        ctx.strokeStyle = ship.colorPalette.accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-halfW, -40);
        ctx.lineTo(halfW, -40);
        ctx.stroke();

        // White Superstructure Promenade Decks (3 TIERS)
        const deckStart = isSternPiece ? -halfW + 30 : -halfW + 60;
        const deckEnd = isBowPiece ? halfW - 55 : halfW - 30;
        const deckW = Math.max(30, deckEnd - deckStart);

        ctx.fillStyle = ship.colorPalette.superstructure;
        ctx.fillRect(deckStart, -75, deckW, 34);
        ctx.fillRect(deckStart + 25, -95, deckW - 50, 22);
        ctx.fillRect(deckStart + deckW - 75, -112, 45, 18);

        ctx.fillStyle = ship.colorPalette.deck;
        ctx.fillRect(deckStart - 15, -77, deckW + 30, 5);
        ctx.fillRect(deckStart + 15, -97, deckW - 30, 4);

        // Illuminated Portholes
        ctx.fillStyle = '#fef08a';
        const numPortholes = Math.floor(deckW / 18);
        for (let p = 0; p < numPortholes; p++) {
          ctx.fillRect(deckStart + 10 + p * 18, -66, 7, 6);
          ctx.fillRect(deckStart + 10 + p * 18, -54, 7, 6);
        }

        // Towering Funnels
        if (!s.isSplit || isBowPiece) {
          const funnelsToDraw = s.isSplit ? Math.ceil(ship.funnelCount / 2) : ship.funnelCount;
          const funnelSpacing = (deckW - 60) / (ship.funnelCount + 1);

          for (let f = 0; f < funnelsToDraw; f++) {
            const fx = deckStart + 30 + (f + 1) * funnelSpacing;
            const fy = -145;
            const fw = 22;
            const fh = 50;

            ctx.fillStyle = ship.colorPalette.funnels;
            ctx.fillRect(fx - fw / 2, fy, fw, fh);

            ctx.fillStyle = ship.colorPalette.funnelTop;
            ctx.fillRect(fx - fw / 2, fy, fw, 15);

            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(fx - fw / 2 - 2, fy + 8);
            ctx.lineTo(fx - fw / 2 - 2, fy + fh);
            ctx.stroke();

            if (phase === 'playing' && Math.random() < 0.35) {
              particles.current.push({
                x: posX + fx,
                y: posY + fy - 5,
                vx: -1.5 + (Math.random() - 0.5) * 0.5,
                vy: -Math.random() * 2.5 - 1.5,
                life: 1.0,
                maxLife: 1.2,
                size: 12,
                color: 'rgba(71, 85, 105, 0.45)',
                type: 'smoke',
              });
            }
          }
        }

        // Turrets
        if (ship.hasTurrets) {
          ctx.fillStyle = '#334155';
          if (isBowPiece || !s.isSplit) {
            ctx.fillRect(halfW - 80, -56, 36, 16);
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(halfW - 50, -48);
            ctx.lineTo(halfW - 10, -48);
            ctx.stroke();
          }
          if (isSternPiece || !s.isSplit) {
            ctx.fillRect(-halfW + 50, -56, 36, 16);
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(-halfW + 50, -48);
            ctx.lineTo(-halfW + 10, -48);
            ctx.stroke();
          }
        }

        // Lifeboats
        ctx.fillStyle = '#ffffff';
        const numLifeboats = Math.floor(deckW / 35);
        for (let b = 0; b < numLifeboats; b++) {
          ctx.beginPath();
          ctx.ellipse(deckStart + 20 + b * 35, -100, 11, 5, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Masts
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2.5;
        if (isBowPiece || !s.isSplit) {
          ctx.beginPath();
          ctx.moveTo(halfW - 60, -42);
          ctx.lineTo(halfW - 60, -160);
          ctx.stroke();
          ctx.fillStyle = '#64748b';
          ctx.fillRect(halfW - 66, -135, 12, 8);
        }
        if (isSternPiece || !s.isSplit) {
          ctx.beginPath();
          ctx.moveTo(-halfW + 60, -42);
          ctx.lineTo(-halfW + 60, -150);
          ctx.stroke();
        }

        // Propellers
        if (isSternPiece || !s.isSplit) {
          ctx.fillStyle = '#d97706';
          ctx.beginPath();
          ctx.arc(-halfW + 18, 16, 10, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      };

      if (s.isSplit) {
        renderBigShipBody(s.stern.x, s.stern.y, s.stern.angle, s.stern.width, true, false);
        renderBigShipBody(s.x, s.y, s.angle, s.width, false, true);
      } else {
        renderBigShipBody(s.x, s.y, s.angle, s.width, false, false);
      }

      // Render Cargo Boxes
      cargoBoxes.current.forEach(box => {
        ctx.save();
        if (box.inWater) {
          ctx.translate(box.x, box.y);
          ctx.rotate(box.angle);
        } else {
          ctx.translate(s.x + box.x, s.y + box.y);
          ctx.rotate(s.angle);
        }
        ctx.fillStyle = box.color;
        ctx.fillRect(-12, -9, 24, 18);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-12, -9, 24, 18);
        ctx.restore();
      });

      // RENDER WATER
      const oceanGrad = ctx.createLinearGradient(0, waterLevel, 0, h);
      oceanGrad.addColorStop(0, 'rgba(12, 74, 110, 0.90)');
      oceanGrad.addColorStop(0.3, 'rgba(3, 105, 161, 0.95)');
      oceanGrad.addColorStop(1, '#02182b');

      ctx.fillStyle = oceanGrad;
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, waterLevel);

      const timeSec = currentTime * 0.003;
      for (let x = 0; x <= w; x += 15) {
        const waveY =
          waterLevel +
          Math.sin(x * 0.012 + timeSec) * 7 +
          Math.sin(x * 0.025 - timeSec * 1.5) * 4;
        ctx.lineTo(x, waveY);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // Wave foam
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 15) {
        const waveY =
          waterLevel +
          Math.sin(x * 0.012 + timeSec) * 7 +
          Math.sin(x * 0.025 - timeSec * 1.5) * 4;
        if (x === 0) ctx.moveTo(x, waveY);
        else ctx.lineTo(x, waveY);
      }
      ctx.stroke();

      // Particles
      particles.current.forEach(p => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Weapon flights
      activeEffects.current.forEach(eff => {
        ctx.save();
        if (eff.toolId === 'nuke') {
          const curY = eff.startY + (eff.targetY - eff.startY) * eff.progress;
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(eff.startX - 6, curY - 30, 12, 36);
        } else if (eff.toolId === 'torpedo') {
          const curX = eff.startX + (eff.targetX - eff.startX) * eff.progress;
          ctx.fillStyle = '#06b6d4';
          ctx.fillRect(curX - 16, eff.targetY - 5, 32, 10);
        }

        if (eff.playerName) {
          ctx.fillStyle = eff.playerColor || '#38bdf8';
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`⚡ ${eff.playerName}`, eff.targetX, eff.targetY - 30);
        }
        ctx.restore();
      });

      if (flashAlpha.current > 0.01) {
        ctx.save();
        ctx.globalAlpha = flashAlpha.current;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      // Crew cursors
      Object.entries(remoteCursors).forEach(([pid, cur]) => {
        if (pid === myPlayerId) return;
        ctx.save();
        ctx.translate(cur.x, cur.y);

        ctx.strokeStyle = cur.color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = cur.color;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(cur.name, 0, 28);
        ctx.restore();
      });

      // Local crosshair
      if (activeToolId && mousePos && phase === 'playing') {
        ctx.save();
        ctx.translate(mousePos.x, mousePos.y);

        const currentTool = TOOLS_DATABASE.find(t => t.id === activeToolId);
        const crosshairColor = currentTool ? currentTool.color : '#38bdf8';

        ctx.strokeStyle = crosshairColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-32, 0);
        ctx.lineTo(-12, 0);
        ctx.moveTo(12, 0);
        ctx.lineTo(32, 0);
        ctx.moveTo(0, -32);
        ctx.lineTo(0, -12);
        ctx.moveTo(0, 12);
        ctx.lineTo(0, 32);
        ctx.stroke();

        ctx.fillStyle = crosshairColor;
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(currentTool ? currentTool.name.toUpperCase() : 'TARGET', 0, 38);

        ctx.restore();
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    ship,
    currentHp,
    maxHp,
    bowHp,
    sternHp,
    activeToolId,
    mousePos,
    phase,
    environment,
    remoteCursors,
    myPlayerId,
  ]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const x = (e.clientX - rect.left) * dpr;
    const y = (e.clientY - rect.top) * dpr;

    setMousePos({ x, y });
    onUpdateCursor(x, y, activeToolId || undefined);
  };

  const handleMouseLeave = () => {
    setMousePos(null);
  };

  return (
    <div className="relative w-full h-full flex-1 min-h-[500px] overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="w-full h-full block cursor-crosshair touch-none"
      />
    </div>
  );
};
