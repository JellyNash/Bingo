# Socket.IO Events Catalog

**Version:** 1.0
**Author:** Agent C — System Architect
**Date:** 2025-09-19

## Overview

This document defines the complete Socket.IO event catalog for real-time communication in the Bingo Platform. The system uses namespaces for logical separation and rooms for game-specific isolation.

**Performance Targets:**
- Draw → UI propagation: <200ms average
- Event fanout: <50ms for 1000 concurrent connections
- Reconnection: <3 seconds with state sync

---

## Namespaces & Rooms

### Namespaces

#### `/game` Namespace
**Purpose:** Core gameplay events for players and displays
**Roles:** `player`, `display`
**Authentication:** JWT required with `gameId` claim

#### `/admin` Namespace
**Purpose:** GameMaster administrative operations
**Roles:** `gamemaster`, `admin`
**Authentication:** JWT required with `gamemaster` scope

#### `/system` Namespace
**Purpose:** System monitoring and health events
**Roles:** `monitor`, `ops`
**Authentication:** System token required

### Room Structure

```
/game
├── game:{gameId}:players     // All players in game
├── game:{gameId}:displays    // Big-screen displays
└── player:{playerId}         // Individual player events

/admin
├── game:{gameId}:admin      // GameMaster console
└── admin:global             // System-wide admin events

/system
└── monitoring               // Health and metrics
```

---

## Authentication & Connection

### Initial Handshake

**Event:** `connection`
**Direction:** Client → Server
**Namespace:** All

```typescript
interface ConnectionAuth {
  token: string;        // JWT session token
  clientId?: string;    // Optional client identifier
  userAgent?: string;   // Client user agent
  version?: string;     // Client app version
}
```

**Response Events:**
- `auth:success` - Authentication successful
- `auth:error` - Authentication failed
- `auth:expired` - Token expired, reauthentication required

### Authentication Success

**Event:** `auth:success`
**Direction:** Server → Client

```typescript
interface AuthSuccessPayload {
  sessionId: string;
  playerId?: string;    // For player connections
  gameId?: string;      // For game-scoped connections
  role: 'player' | 'gamemaster' | 'display' | 'admin';
  permissions: string[];
  expiresAt: string;    // ISO timestamp
  serverTime: string;   // Server timestamp for sync
}
```

### Disconnection & Reconnection

**Event:** `disconnect`
**Direction:** Client ↔ Server

```typescript
interface DisconnectPayload {
  reason: string;
  resumeToken?: string;  // For reconnection
  lastEventId?: string;  // For event replay
}
```

**Event:** `reconnect:request`
**Direction:** Client → Server

```typescript
interface ReconnectRequest {
  resumeToken: string;
  lastEventId?: string;
  clientTime: string;
}
```

---

## Core Game Events

### Number Draw Events

#### Draw Announcement

**Event:** `draw:announced`
**Direction:** Server → Room (`game:{gameId}:players`, `game:{gameId}:displays`)
**Frequency:** Every 5-20 seconds during active game

```typescript
interface DrawAnnouncedPayload {
  drawId: string;
  gameId: string;
  sequence: number;        // Draw order (1, 2, 3, ...)
  letter: 'B' | 'I' | 'N' | 'G' | 'O';
  number: number;          // 1-75
  timestamp: string;       // ISO timestamp
  drawnBy: string;         // 'AUTO' or GameMaster ID
  totalDrawn: number;      // Total numbers drawn so far
  remaining: number[];     // Remaining numbers in pool
}
```

**Reliability:** Critical event, requires acknowledgment from clients

#### Draw History Update

**Event:** `draw:history`
**Direction:** Server → Room
**Trigger:** On player join or reconnection

```typescript
interface DrawHistoryPayload {
  gameId: string;
  draws: Array<{
    sequence: number;
    letter: string;
    number: number;
    timestamp: string;
  }>;
  currentSequence: number;
}
```

### Game State Events

#### Game Status Update

**Event:** `game:status`
**Direction:** Server → Room
**Trigger:** Status changes (OPEN, ACTIVE, PAUSED, COMPLETED)

```typescript
interface GameStatusPayload {
  gameId: string;
  status: 'LOBBY' | 'OPEN' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  timestamp: string;
  metadata?: {
    pausedBy?: string;
    reason?: string;
    autoDrawEnabled?: boolean;
    autoDrawInterval?: number;
  };
}
```

#### Game Configuration Update

**Event:** `game:config`
**Direction:** Server → Room

```typescript
interface GameConfigPayload {
  gameId: string;
  config: {
    autoDrawInterval: number;    // 5-20 seconds
    autoDrawEnabled: boolean;
    allowLateJoin: boolean;
    winnerLimit: number;
    maxPlayers: number;
  };
  updatedBy: string;            // GameMaster ID
  timestamp: string;
}
```

### Player Events

#### Player Joined

**Event:** `player:joined`
**Direction:** Server → Room (`game:{gameId}:players`, `game:{gameId}:displays`)

```typescript
interface PlayerJoinedPayload {
  gameId: string;
  player: {
    id: string;
    nickname: string;
    joinedAt: string;
  };
  totalPlayers: number;
  maxPlayers: number;
}
```

#### Player Left

**Event:** `player:left`
**Direction:** Server → Room

```typescript
interface PlayerLeftPayload {
  gameId: string;
  playerId: string;
  nickname: string;
  reason: 'disconnect' | 'kicked' | 'voluntary';
  timestamp: string;
  totalPlayers: number;
}
```

#### Player State Sync

**Event:** `player:state`
**Direction:** Server → Client (`player:{playerId}`)
**Trigger:** Reconnection, game join, significant state changes

```typescript
interface PlayerStatePayload {
  playerId: string;
  gameId: string;
  status: 'ACTIVE' | 'COOLDOWN' | 'DISQUALIFIED' | 'LEFT';
  strikes: number;
  cooldownUntil?: string;      // ISO timestamp
  isDisqualified: boolean;
  bingoCard: {
    id: string;
    numbers: number[][];       // 5x5 grid
    marks: Record<string, boolean>;
  };
  eligiblePatterns: string[];  // Patterns player can claim
  lastSeenAt: string;
}
```

### Claim Events

#### Claim Submitted

**Event:** `claim:submitted`
**Direction:** Server → Room (`game:{gameId}:displays`, GameMaster)
**Note:** Not sent to other players to prevent claim rushing

```typescript
interface ClaimSubmittedPayload {
  claimId: string;
  gameId: string;
  playerId: string;
  playerNickname: string;
  pattern: string;
  timestamp: string;
  sequence: number;            // For ordering simultaneous claims
}
```

#### Claim Result

**Event:** `claim:result`
**Direction:** Server → Multiple targets

**To claiming player:** `player:{playerId}`
```typescript
interface ClaimResultPlayerPayload {
  claimId: string;
  status: 'ACCEPTED' | 'DENIED' | 'SUPERSEDED';
  isWinner: boolean;
  winPosition?: number;        // 1st, 2nd place, etc.
  message: string;             // User-friendly message
  denialReason?: string;
  timestamp: string;
  celebrationCue?: {
    type: 'confetti' | 'winner_sound';
    duration: number;
  };
}
```

**To all players/displays:** `game:{gameId}:players`, `game:{gameId}:displays`
```typescript
interface ClaimResultBroadcastPayload {
  claimId: string;
  gameId: string;
  winner?: {
    playerId: string;
    nickname: string;
    pattern: string;
    winPosition: number;
  };
  gameStatus: 'ACTIVE' | 'COMPLETED';
  timestamp: string;
  celebrationCue?: {
    type: 'winner_announcement' | 'game_complete';
    playerName?: string;
    pattern?: string;
  };
}
```

### Penalty Events

#### Penalty Applied

**Event:** `penalty:applied`
**Direction:** Server → Client (`player:{playerId}`)

```typescript
interface PenaltyAppliedPayload {
  penaltyId: string;
  playerId: string;
  type: 'FALSE_CLAIM' | 'RATE_LIMIT' | 'SUSPICIOUS' | 'MANUAL' | 'AUTO_STRIKE';
  reason: string;
  severity: number;            // Strike count
  appliedBy: string;           // 'SYSTEM' or GameMaster ID
  cooldownDuration?: number;   // Milliseconds
  cooldownUntil?: string;      // ISO timestamp
  totalStrikes: number;
  isDisqualified: boolean;
  message: string;             // User-friendly explanation
  timestamp: string;
}
```

#### Penalty Cleared

**Event:** `penalty:cleared`
**Direction:** Server → Client (`player:{playerId}`)

```typescript
interface PenaltyClearedPayload {
  penaltyId: string;
  playerId: string;
  clearedBy: string;           // GameMaster ID
  reason: string;
  newStrikeCount: number;
  isReinstated: boolean;       // If previously disqualified
  message: string;
  timestamp: string;
}
```

---

## Administrative Events

### GameMaster Console Events

#### Player List Update

**Event:** `admin:players`
**Direction:** Server → Client (`game:{gameId}:admin`)
**Trigger:** Player joins, leaves, status changes

```typescript
interface AdminPlayersPayload {
  gameId: string;
  players: Array<{
    id: string;
    nickname: string;
    status: string;
    strikes: number;
    isDisqualified: boolean;
    cooldownUntil?: string;
    lastSeen: string;
    connectionStatus: 'connected' | 'disconnected';
  }>;
  totalCount: number;
  activeCount: number;
  disqualifiedCount: number;
}
```

#### Claims Queue

**Event:** `admin:claims`
**Direction:** Server → Client (`game:{gameId}:admin`)

```typescript
interface AdminClaimsPayload {
  gameId: string;
  pendingClaims: Array<{
    id: string;
    playerId: string;
    playerNickname: string;
    pattern: string;
    timestamp: string;
    isValid: boolean;
    validationDetails: {
      markedPositions: string[];
      requiredPositions: string[];
      missingPositions: string[];
    };
  }>;
  recentClaims: Array<{
    id: string;
    playerId: string;
    playerNickname: string;
    status: string;
    timestamp: string;
  }>;
}
```

#### Game Statistics

**Event:** `admin:stats`
**Direction:** Server → Client (`game:{gameId}:admin`)
**Frequency:** Every 30 seconds during active game

```typescript
interface AdminStatsPayload {
  gameId: string;
  statistics: {
    playerCount: number;
    activeConnections: number;
    totalDraws: number;
    totalClaims: number;
    averageClaimTime: number;    // Milliseconds
    falseClaimRate: number;      // Percentage
    totalStrikes: number;
    disqualifiedPlayers: number;
    gameUptime: number;          // Seconds since start
    lastDrawLatency: number;     // Milliseconds
  };
  timestamp: string;
}
```

---

## Display Events

### Big-Screen Events

#### Display Configuration

**Event:** `display:config`
**Direction:** Server → Client (`game:{gameId}:displays`)

```typescript
interface DisplayConfigPayload {
  gameId: string;
  config: {
    showPlayerList: boolean;
    showDrawHistory: boolean;
    showClaimQueue: boolean;
    theme: 'default' | 'dark' | 'high_contrast';
    animations: boolean;
    autoScroll: boolean;
  };
  updatedBy: string;
  timestamp: string;
}
```

#### Media Cues

**Event:** `media:cue`
**Direction:** Server → Client (`game:{gameId}:displays`)

```typescript
interface MediaCuePayload {
  gameId: string;
  cue: {
    type: 'draw_sound' | 'claim_accepted' | 'claim_denied' | 'winner_fanfare' | 'game_complete';
    trigger: 'immediate' | 'delayed';
    delay?: number;              // Milliseconds
    duration?: number;           // Milliseconds
    volume?: number;             // 0.0 - 1.0
    metadata?: {
      playerName?: string;
      pattern?: string;
      drawValue?: string;
    };
  };
  timestamp: string;
}
```

---

## System Events

### Health & Monitoring

#### System Health

**Event:** `system:health`
**Direction:** Server → Client (`monitoring`)
**Frequency:** Every 60 seconds

```typescript
interface SystemHealthPayload {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;              // Seconds
  activeGames: number;
  totalPlayers: number;
  activeConnections: number;
  memoryUsage: {
    used: number;              // MB
    free: number;              // MB
    percentage: number;
  };
  cpuUsage: number;            // Percentage
  latencyStats: {
    drawBroadcast: {
      p50: number;
      p95: number;
      p99: number;
    };
    claimValidation: {
      p50: number;
      p95: number;
      p99: number;
    };
  };
}
```

#### Performance Metrics

**Event:** `system:metrics`
**Direction:** Server → Client (`monitoring`)
**Frequency:** Every 30 seconds

```typescript
interface SystemMetricsPayload {
  timestamp: string;
  metrics: {
    websocketConnections: number;
    redisConnections: number;
    databaseConnections: number;
    requestsPerMinute: number;
    errorRate: number;           // Percentage
    averageResponseTime: number; // Milliseconds
    activeNamespaces: Record<string, number>;
    eventCounts: {
      draws: number;
      claims: number;
      penalties: number;
      joins: number;
    };
  };
}
```

---

## Error Events

### Connection Errors

**Event:** `error:connection`
**Direction:** Server → Client

```typescript
interface ConnectionErrorPayload {
  code: string;
  message: string;
  retryable: boolean;
  retryAfter?: number;         // Seconds
  timestamp: string;
}
```

### Game Errors

**Event:** `error:game`
**Direction:** Server → Client

```typescript
interface GameErrorPayload {
  gameId: string;
  code: string;
  message: string;
  action: 'retry' | 'reload' | 'redirect';
  timestamp: string;
}
```

### Rate Limit Errors

**Event:** `error:rate_limit`
**Direction:** Server → Client

```typescript
interface RateLimitErrorPayload {
  code: 'RATE_LIMITED';
  message: string;
  retryAfter: number;          // Seconds
  limit: number;
  remaining: number;
  resetTime: string;           // ISO timestamp
  timestamp: string;
}
```

---

## Client-to-Server Events (Optional)

**Note:** Most operations use REST API for reliability. WebSocket events are primarily server-to-client for real-time updates.

### Heartbeat

**Event:** `ping`
**Direction:** Client → Server
**Frequency:** Every 30 seconds

```typescript
interface PingPayload {
  clientTime: string;          // ISO timestamp
  connectionId: string;
}
```

**Response:** `pong`
```typescript
interface PongPayload {
  serverTime: string;
  clientTime: string;
  latency: number;             // Round-trip time in ms
}
```

### Event Acknowledgment

**Event:** `ack`
**Direction:** Client → Server
**Purpose:** Acknowledge receipt of critical events

```typescript
interface AckPayload {
  eventId: string;
  eventType: string;
  timestamp: string;
}
```

---

## Reliability & Error Handling

### Message Ordering
- Draw events use sequence numbers for ordering
- Claim events include microsecond timestamps
- Critical events require client acknowledgment

### Reconnection Strategy
1. Client reconnects with resume token
2. Server validates token and replays missed events
3. State synchronization ensures consistency
4. Maximum replay window: 30 minutes

### Event Replay
- Critical events stored in Redis for replay
- Events expire after 30 minutes
- Replay includes sequence numbers for ordering

### Failed Delivery
- Critical events retry up to 3 times
- Non-critical events are best-effort
- Client disconnection triggers cleanup timers

---

## Rate Limiting

### Connection Limits
- Maximum 5 connections per IP per game
- Authentication attempts: 10 per minute per IP
- Connection establishment: 20 per minute per IP

### Event Rate Limits
- Ping events: 2 per second per connection
- Acknowledgments: 100 per minute per connection
- Administrative events: 60 per minute per GameMaster

---

## Security Considerations

### Authentication
- All connections require valid JWT tokens
- Tokens expire after 30 minutes
- Token refresh available via REST API

### Authorization
- Role-based access to namespaces
- Player events scoped to specific player
- GameMaster events require admin scope

### Data Validation
- All incoming events validated against schemas
- Invalid events logged and rejected
- Malformed data triggers security alerts

---

**Document Status:** Complete and ready for implementation
**Next Review:** Post-MVP based on operational feedback
**Dependencies:** OpenAPI specification, Prisma schema, Security framework