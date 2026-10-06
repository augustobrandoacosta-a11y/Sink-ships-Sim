import { useEffect, useRef, useState, useCallback } from 'react';
import { Player, ChatMessage, WeaponEvent, MultiplayerGameState, ToolId, ShipSpec } from '../types/game';
import { SHIPS_DATABASE } from '../data/ships';

export function useMultiplayer() {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [remoteWeaponEvents, setRemoteWeaponEvents] = useState<WeaponEvent[]>([]);
  const [gameState, setGameState] = useState<MultiplayerGameState>({
    phase: 'voting',
    selectedShipId: 'titanic',
    currentHp: 2500,
    maxHp: 2500,
    bowHp: 750,
    midHp: 1000,
    sternHp: 750,
    floodBow: 0,
    floodMid: 0,
    floodStern: 0,
    isSplit: false,
    votes: {},
    votingTimeLeft: 14,
    despawnCountdown: 6,
    players: {},
    elapsedSeconds: 0,
  });

  // Track remote cursors
  const [remoteCursors, setRemoteCursors] = useState<Record<string, { x: number; y: number; activeToolId?: ToolId; name: string; color: string }>>({});

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    let socket: WebSocket;
    let reconnectTimer: NodeJS.Timeout;

    const connect = () => {
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case 'init':
              setMyPlayerId(data.playerId);
              setGameState(data.state);
              setPlayers(data.state.players || {});
              setChatMessages(data.chat || []);
              break;

            case 'player:joined':
              setPlayers(prev => ({
                ...prev,
                [data.player.id]: data.player,
              }));
              break;

            case 'player:updated':
              setPlayers(prev => ({
                ...prev,
                [data.player.id]: data.player,
              }));
              break;

            case 'player:left':
              setPlayers(prev => {
                const next = { ...prev };
                delete next[data.playerId];
                return next;
              });
              setRemoteCursors(prev => {
                const next = { ...prev };
                delete next[data.playerId];
                return next;
              });
              break;

            case 'player:cursor_moved':
              if (data.playerId !== myPlayerId) {
                setRemoteCursors(prev => ({
                  ...prev,
                  [data.playerId]: {
                    ...data.cursor,
                    name: players[data.playerId]?.name || 'Crew',
                    color: players[data.playerId]?.color || '#38bdf8',
                  },
                }));
              }
              break;

            case 'chat:message':
              setChatMessages(prev => [...prev.slice(-49), data.message]);
              break;

            case 'vote:updated':
              setGameState(prev => ({
                ...prev,
                votes: data.votes,
              }));
              break;

            case 'timer:tick':
              setGameState(prev => ({
                ...prev,
                votingTimeLeft: data.timeLeft,
              }));
              break;

            case 'game:started':
              setGameState(data.state);
              break;

            case 'weapon:fired':
              setRemoteWeaponEvents(prev => [...prev.slice(-15), data.event]);
              setGameState(prev => ({
                ...prev,
                currentHp: data.state.currentHp,
                bowHp: data.state.bowHp,
                midHp: data.state.midHp,
                sternHp: data.state.sternHp,
                isSplit: data.state.isSplit,
                floodBow: data.state.floodBow,
                floodMid: data.state.floodMid,
                floodStern: data.state.floodStern,
                players: data.state.players || prev.players,
              }));
              break;

            case 'ship:sunk':
              setGameState(data.state);
              break;

            case 'ship:despawning':
              setGameState(prev => ({
                ...prev,
                phase: 'despawning',
                despawnCountdown: data.countdown,
              }));
              break;

            case 'despawn:tick':
              setGameState(prev => ({
                ...prev,
                despawnCountdown: data.countdown,
              }));
              break;

            case 'game:revote':
              setGameState(data.state);
              break;
          }
        } catch (err) {
          console.error('Error parsing ws packet:', err);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        reconnectTimer = setTimeout(connect, 2000);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const send = useCallback((msg: object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const castVote = useCallback((shipId: string, boost: number = 10) => {
    send({ type: 'vote:cast', shipId, boost });
  }, [send]);

  const skipVote = useCallback((forceShipId?: string) => {
    send({ type: 'vote:skip', forceShipId });
  }, [send]);

  const fireWeapon = useCallback((params: {
    toolId: ToolId;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    damage: number;
  }) => {
    send({ type: 'weapon:fire', ...params });
  }, [send]);

  const despawnShipNow = useCallback(() => {
    send({ type: 'ship:despawn_now' });
  }, [send]);

  const sendChat = useCallback((text: string) => {
    send({ type: 'chat:send', text });
  }, [send]);

  const updateProfile = useCallback((name: string, color?: string) => {
    send({ type: 'player:update_profile', name, color });
  }, [send]);

  const updateCursor = useCallback((x: number, y: number, activeToolId?: ToolId) => {
    send({ type: 'player:cursor', x, y, activeToolId });
  }, [send]);

  return {
    isConnected,
    myPlayerId,
    players,
    chatMessages,
    gameState,
    remoteWeaponEvents,
    remoteCursors,
    castVote,
    skipVote,
    fireWeapon,
    despawnShipNow,
    sendChat,
    updateProfile,
    updateCursor,
  };
}
