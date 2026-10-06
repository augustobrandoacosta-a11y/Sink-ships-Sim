import http from 'http';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { SHIPS_DATABASE } from './src/data/ships.ts';
import { ShipId, ToolId, Player, ChatMessage, WeaponEvent, MultiplayerGameState } from './src/types/game.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

interface ClientConnection {
  ws: WebSocket;
  playerId: string;
  room: string;
}

const clients = new Map<WebSocket, ClientConnection>();

interface RoomData {
  state: MultiplayerGameState;
  chat: ChatMessage[];
  lastStrikeTime: number;
}

const rooms = new Map<string, RoomData>();

// Simulated AI Bot Crew Members
const BOTS: Player[] = [
  {
    id: 'bot_vance',
    name: 'Cmdr Vance [BOT]',
    color: '#38bdf8',
    score: 0,
    damageDealt: 0,
  },
  {
    id: 'bot_ripley',
    name: 'Ensign Ripley [BOT]',
    color: '#34d399',
    score: 0,
    damageDealt: 0,
  },
  {
    id: 'bot_holt',
    name: 'Gunner Holt [BOT]',
    color: '#f59e0b',
    score: 0,
    damageDealt: 0,
  },
  {
    id: 'bot_drake',
    name: 'Captain Drake [BOT]',
    color: '#c084fc',
    score: 0,
    damageDealt: 0,
  },
];

function getOrCreateRoom(roomId: string): RoomData {
  let room = rooms.get(roomId);
  if (!room) {
    const initialVotes: Record<string, number> = {};
    SHIPS_DATABASE.forEach(s => {
      initialVotes[s.id] = 10;
    });

    const defaultShip = SHIPS_DATABASE[0];

    const initialPlayers: Record<string, Player> = {};
    BOTS.forEach(b => {
      initialPlayers[b.id] = { ...b, score: 0, damageDealt: 0 };
    });

    const state: MultiplayerGameState = {
      phase: 'voting',
      selectedShipId: defaultShip.id,
      currentHp: defaultShip.maxHp,
      maxHp: defaultShip.maxHp,
      bowHp: Math.round(defaultShip.maxHp * 0.3),
      midHp: Math.round(defaultShip.maxHp * 0.4),
      sternHp: Math.round(defaultShip.maxHp * 0.3),
      floodBow: 0,
      floodMid: 0,
      floodStern: 0,
      isSplit: false,
      votes: initialVotes,
      votingTimeLeft: 14,
      despawnCountdown: 6,
      players: initialPlayers,
      elapsedSeconds: 0,
    };

    room = {
      state,
      chat: [
        {
          id: 'sys-welcome',
          senderId: 'system',
          senderName: 'HQ Dispatch',
          senderColor: '#38bdf8',
          text: 'Demolition network online. Taskforce bots deployed! Vote for target vessel.',
          timestamp: Date.now(),
          isSystem: true,
        },
      ],
      lastStrikeTime: Date.now(),
    };

    rooms.set(roomId, room);
  }
  return room;
}

function broadcastToRoom(roomId: string, message: object) {
  const payload = JSON.stringify(message);
  for (const [ws, client] of clients.entries()) {
    if (client.room === roomId && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

// Global Room Ticker
setInterval(() => {
  for (const [roomId, room] of rooms.entries()) {
    const s = room.state;

    // 1. VOTING PHASE
    if (s.phase === 'voting') {
      // Bots periodically vote
      if (Math.random() < 0.45) {
        const randomBot = BOTS[Math.floor(Math.random() * BOTS.length)];
        const randomShip = SHIPS_DATABASE[Math.floor(Math.random() * SHIPS_DATABASE.length)];
        const voteBoost = Math.floor(Math.random() * 4) + 2;
        s.votes[randomShip.id] = (s.votes[randomShip.id] || 0) + voteBoost;

        broadcastToRoom(roomId, {
          type: 'vote:updated',
          votes: s.votes,
          voterId: randomBot.id,
          votedShipId: randomShip.id,
        });

        if (Math.random() < 0.2) {
          const botQuotes = [
            `Voting for ${randomShip.name}, let's send it to the bottom!`,
            `Locking votes on ${randomShip.name}!`,
            `Readying ordnance for ${randomShip.name}!`,
            `${randomShip.name} is the prime target!`,
          ];
          const text = botQuotes[Math.floor(Math.random() * botQuotes.length)];
          const chatMsg: ChatMessage = {
            id: `bot_chat_${Date.now()}`,
            senderId: randomBot.id,
            senderName: randomBot.name,
            senderColor: randomBot.color,
            text,
            timestamp: Date.now(),
          };
          room.chat.push(chatMsg);
          broadcastToRoom(roomId, { type: 'chat:message', message: chatMsg });
        }
      }

      if (s.votingTimeLeft > 0) {
        s.votingTimeLeft -= 1;
        broadcastToRoom(roomId, { type: 'timer:tick', timeLeft: s.votingTimeLeft });
      } else {
        // Natural timer expiry: find strictly highest voted ship using identical sort
        const sorted = [...SHIPS_DATABASE].sort((a, b) => (s.votes[b.id] || 0) - (s.votes[a.id] || 0));
        const winner = sorted[0] || SHIPS_DATABASE[0];
        startPlayingPhase(roomId, room, winner.id);
      }
    } 
    // 2. PLAYING PHASE
    else if (s.phase === 'playing') {
      s.elapsedSeconds += 1;

      // BOT WEAPON ATTACKS: Every ~3-4s, a bot launches a strike
      if (Math.random() < 0.40 && s.currentHp > 0) {
        const bot = BOTS[Math.floor(Math.random() * BOTS.length)];
        const botTools: ToolId[] = ['torpedo', 'airstrike', 'iceberg', 'split', 'kraken'];
        const chosenTool = botTools[Math.floor(Math.random() * botTools.length)];
        const damageValues: Record<ToolId, number> = {
          nuke: 1500,
          torpedo: 400,
          split: 600,
          iceberg: 350,
          airstrike: 300,
          kraken: 550,
        };
        const damage = damageValues[chosenTool] || 350;

        const targetX = 350 + Math.random() * 500;
        const targetY = 440 + Math.random() * 50;

        const actualDmg = Math.min(s.currentHp, damage);
        s.currentHp = Math.max(0, s.currentHp - actualDmg);

        if (chosenTool === 'split' && !s.isSplit) {
          s.isSplit = true;
          s.floodBow = Math.max(0.4, s.floodBow);
          s.floodStern = Math.max(0.4, s.floodStern);
        }

        const botPlayerObj = s.players[bot.id];
        if (botPlayerObj) {
          botPlayerObj.damageDealt += actualDmg;
          botPlayerObj.score += actualDmg * 3 + 150;
        }

        const event: WeaponEvent = {
          id: `bot_weap_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          playerId: bot.id,
          playerName: bot.name,
          playerColor: bot.color,
          toolId: chosenTool,
          startX: chosenTool === 'torpedo' ? 50 : targetX,
          startY: chosenTool === 'torpedo' ? targetY : 0,
          targetX,
          targetY,
          damage: actualDmg,
          timestamp: Date.now(),
        };

        broadcastToRoom(roomId, {
          type: 'weapon:fired',
          event,
          state: {
            currentHp: s.currentHp,
            bowHp: s.bowHp,
            midHp: s.midHp,
            sternHp: s.sternHp,
            isSplit: s.isSplit,
            floodBow: s.floodBow,
            floodMid: s.floodMid,
            floodStern: s.floodStern,
            players: s.players,
          },
        });
      }

      // STRICT SINKING CONDITION: Only transition to sinking if currentHp is STRICTLY 0
      if (s.currentHp <= 0 && s.phase === 'playing') {
        s.phase = 'sinking';
        s.despawnCountdown = 8; // 8 seconds dramatic plunge into ocean floor
        broadcastToRoom(roomId, {
          type: 'ship:sunk',
          state: s,
        });

        room.chat.push({
          id: `sys-${Date.now()}`,
          senderId: 'system',
          senderName: 'HQ Dispatch',
          senderColor: '#ef4444',
          text: 'Vessel hull integrity collapsed to 0 HP! Plunging to seabed!',
          timestamp: Date.now(),
          isSystem: true,
        });
        broadcastToRoom(roomId, { type: 'chat:message', message: room.chat[room.chat.length - 1] });
      }
    } 
    // 3. SINKING PHASE
    else if (s.phase === 'sinking') {
      s.despawnCountdown -= 1;
      if (s.despawnCountdown <= 1) {
        s.phase = 'despawning';
        s.despawnCountdown = 5;
        broadcastToRoom(roomId, {
          type: 'ship:despawning',
          countdown: s.despawnCountdown,
        });
      }
    } 
    // 4. DESPAWNING PHASE
    else if (s.phase === 'despawning') {
      s.despawnCountdown -= 1;
      broadcastToRoom(roomId, {
        type: 'despawn:tick',
        countdown: s.despawnCountdown,
      });

      if (s.despawnCountdown <= 0) {
        resetToVoting(roomId, room);
      }
    }
  }
}, 1000);

function startPlayingPhase(roomId: string, room: RoomData, forcedShipId?: ShipId) {
  const s = room.state;
  let topShipId: ShipId = 'titanic';

  if (forcedShipId) {
    topShipId = forcedShipId;
  } else {
    // Sort strictly to ensure exact leader is chosen
    const sorted = [...SHIPS_DATABASE].sort((a, b) => (s.votes[b.id] || 0) - (s.votes[a.id] || 0));
    topShipId = sorted[0]?.id || 'titanic';
  }

  const chosenShip = SHIPS_DATABASE.find(item => item.id === topShipId) || SHIPS_DATABASE[0];

  s.phase = 'playing';
  s.selectedShipId = chosenShip.id;
  s.maxHp = chosenShip.maxHp;
  s.currentHp = chosenShip.maxHp;
  s.bowHp = Math.round(chosenShip.maxHp * 0.3);
  s.midHp = Math.round(chosenShip.maxHp * 0.4);
  s.sternHp = Math.round(chosenShip.maxHp * 0.3);
  s.floodBow = 0;
  s.floodMid = 0;
  s.floodStern = 0;
  s.isSplit = false;
  s.elapsedSeconds = 0;

  broadcastToRoom(roomId, {
    type: 'game:started',
    ship: chosenShip,
    state: s,
  });

  room.chat.push({
    id: `sys-${Date.now()}`,
    senderId: 'system',
    senderName: 'HQ Dispatch',
    senderColor: '#f59e0b',
    text: `VOTING CLOSED! Target vessel [${chosenShip.name}] spawned in waters! Open fire!`,
    timestamp: Date.now(),
    isSystem: true,
  });
  broadcastToRoom(roomId, { type: 'chat:message', message: room.chat[room.chat.length - 1] });
}

function resetToVoting(roomId: string, room: RoomData) {
  const s = room.state;
  s.phase = 'voting';
  s.votingTimeLeft = 15;
  s.despawnCountdown = 6;
  s.isSplit = false;
  s.elapsedSeconds = 0;

  const defaultShip = SHIPS_DATABASE[0];
  s.maxHp = defaultShip.maxHp;
  s.currentHp = defaultShip.maxHp; // Reset health so it is never 0 during voting!
  s.bowHp = Math.round(defaultShip.maxHp * 0.3);
  s.midHp = Math.round(defaultShip.maxHp * 0.4);
  s.sternHp = Math.round(defaultShip.maxHp * 0.3);

  // Reset bots scores for new round
  BOTS.forEach(b => {
    if (s.players[b.id]) {
      s.players[b.id].score = 0;
      s.players[b.id].damageDealt = 0;
    }
  });

  // Fresh balanced votes
  const freshVotes: Record<string, number> = {};
  SHIPS_DATABASE.forEach(ship => {
    freshVotes[ship.id] = 10;
  });
  s.votes = freshVotes;

  broadcastToRoom(roomId, {
    type: 'game:revote',
    state: s,
  });

  room.chat.push({
    id: `sys-${Date.now()}`,
    senderId: 'system',
    senderName: 'HQ Dispatch',
    senderColor: '#10b981',
    text: 'Wreckage cleared from waters. Voting opened for next vessel!',
    timestamp: Date.now(),
    isSystem: true,
  });
  broadcastToRoom(roomId, { type: 'chat:message', message: room.chat[room.chat.length - 1] });
}

wss.on('connection', (ws) => {
  const playerId = `p_${Math.random().toString(36).substring(2, 9)}`;
  const defaultRoom = 'global';
  const room = getOrCreateRoom(defaultRoom);

  const colors = ['#38bdf8', '#fbbf24', '#f87171', '#34d399', '#c084fc', '#fb923c'];
  const playerColor = colors[Math.floor(Math.random() * colors.length)];
  const humanCount = Object.keys(room.state.players).filter(id => !id.startsWith('bot_')).length + 1;
  const playerName = `Commander #${humanCount}`;

  const player: Player = {
    id: playerId,
    name: playerName,
    color: playerColor,
    score: 0,
    damageDealt: 0,
  };

  room.state.players[playerId] = player;
  clients.set(ws, { ws, playerId, room: defaultRoom });

  ws.send(JSON.stringify({
    type: 'init',
    playerId,
    player,
    state: room.state,
    chat: room.chat,
  }));

  broadcastToRoom(defaultRoom, {
    type: 'player:joined',
    player,
    playerCount: Object.keys(room.state.players).length,
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      const client = clients.get(ws);
      if (!client) return;
      const currentRoom = getOrCreateRoom(client.room);
      const s = currentRoom.state;

      switch (msg.type) {
        case 'player:update_profile': {
          if (currentRoom.state.players[client.playerId]) {
            currentRoom.state.players[client.playerId].name = msg.name || currentRoom.state.players[client.playerId].name;
            currentRoom.state.players[client.playerId].color = msg.color || currentRoom.state.players[client.playerId].color;
            broadcastToRoom(client.room, {
              type: 'player:updated',
              player: currentRoom.state.players[client.playerId],
            });
          }
          break;
        }

        case 'player:cursor': {
          if (currentRoom.state.players[client.playerId]) {
            currentRoom.state.players[client.playerId].cursor = {
              x: msg.x,
              y: msg.y,
              activeToolId: msg.activeToolId,
            };
            broadcastToRoom(client.room, {
              type: 'player:cursor_moved',
              playerId: client.playerId,
              cursor: currentRoom.state.players[client.playerId].cursor,
            });
          }
          break;
        }

        case 'chat:send': {
          const sender = currentRoom.state.players[client.playerId];
          const newChat: ChatMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            senderId: client.playerId,
            senderName: sender ? sender.name : 'Crew',
            senderColor: sender ? sender.color : '#38bdf8',
            text: String(msg.text).substring(0, 150),
            timestamp: Date.now(),
          };
          currentRoom.chat.push(newChat);
          if (currentRoom.chat.length > 50) currentRoom.chat.shift();
          broadcastToRoom(client.room, {
            type: 'chat:message',
            message: newChat,
          });
          break;
        }

        case 'vote:cast': {
          const shipId = msg.shipId;
          if (s.phase === 'voting' && shipId) {
            s.votes[shipId] = (s.votes[shipId] || 0) + (msg.boost || 10);
            broadcastToRoom(client.room, {
              type: 'vote:updated',
              votes: s.votes,
              voterId: client.playerId,
              votedShipId: shipId,
            });
          }
          break;
        }

        case 'vote:skip': {
          if (s.phase === 'voting') {
            startPlayingPhase(client.room, currentRoom, msg.forceShipId);
          }
          break;
        }

        case 'weapon:fire': {
          if (s.phase !== 'playing') return;

          const { toolId, startX, startY, targetX, targetY, damage } = msg;
          const playerObj = s.players[client.playerId];

          const actualDmg = Math.min(s.currentHp, damage);
          s.currentHp = Math.max(0, s.currentHp - actualDmg);

          const halfW = 450;
          const relX = targetX - 600;
          if (relX > halfW * 0.2) {
            s.bowHp = Math.max(0, s.bowHp - actualDmg);
            s.floodBow = Math.min(1.0, s.floodBow + (actualDmg / (s.maxHp * 0.3)) * 0.8);
          } else if (relX < -halfW * 0.2) {
            s.sternHp = Math.max(0, s.sternHp - actualDmg);
            s.floodStern = Math.min(1.0, s.floodStern + (actualDmg / (s.maxHp * 0.3)) * 0.8);
          } else {
            s.midHp = Math.max(0, s.midHp - actualDmg);
            s.floodMid = Math.min(1.0, s.floodMid + (actualDmg / (s.maxHp * 0.4)) * 0.8);
            if ((s.midHp <= 0 || toolId === 'split') && !s.isSplit) {
              s.isSplit = true;
              s.floodBow = Math.max(0.4, s.floodBow);
              s.floodStern = Math.max(0.4, s.floodStern);
            }
          }

          if (playerObj) {
            playerObj.damageDealt += actualDmg;
            playerObj.score += actualDmg * 3 + (toolId === 'nuke' ? 500 : 100);
          }

          const weaponEvent: WeaponEvent = {
            id: `weap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            playerId: client.playerId,
            playerName: playerObj ? playerObj.name : 'Crew',
            playerColor: playerObj ? playerObj.color : '#38bdf8',
            toolId,
            startX,
            startY,
            targetX,
            targetY,
            damage: actualDmg,
            timestamp: Date.now(),
          };

          broadcastToRoom(client.room, {
            type: 'weapon:fired',
            event: weaponEvent,
            state: {
              currentHp: s.currentHp,
              bowHp: s.bowHp,
              midHp: s.midHp,
              sternHp: s.sternHp,
              isSplit: s.isSplit,
              floodBow: s.floodBow,
              floodMid: s.floodMid,
              floodStern: s.floodStern,
              players: s.players,
            },
          });
          break;
        }

        case 'ship:despawn_now': {
          if (s.phase === 'sinking' || s.phase === 'despawning') {
            resetToVoting(client.room, currentRoom);
          }
          break;
        }
      }
    } catch (err) {
      console.error('Error handling ws message:', err);
    }
  });

  ws.on('close', () => {
    const client = clients.get(ws);
    if (client) {
      const currentRoom = rooms.get(client.room);
      if (currentRoom) {
        delete currentRoom.state.players[client.playerId];
        broadcastToRoom(client.room, {
          type: 'player:left',
          playerId: client.playerId,
          playerCount: Object.keys(currentRoom.state.players).length,
        });
      }
      clients.delete(ws);
    }
  });
});

const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, () => {
    console.log(`Ship Destructor 2D Server running on http://localhost:${PORT}`);
  });
}

startServer();
