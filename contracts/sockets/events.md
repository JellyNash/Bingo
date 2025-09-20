# Socket.IO Events Catalog

**Version:** 1.1
**Author:** Agent C — System Architect
**Date:** 2025-09-25

## Overview

The realtime hub exposes three Socket.IO namespaces — `/player`, `/screen`, and `/console` — backed by a shared Redis broker. All gameplay traffic is scoped to rooms named `game:{gameId}`. Clients authenticate during the Socket.IO handshake using the JWT issued by the REST API.

**Performance Targets**
- Draw → UI propagation: <200 ms average
- Event fan-out across namespaces: <50 ms for 1 000 subscribers
- Reconnection (including snapshot refresh): <3 s

---

## Connection & Authentication

### Handshake Payload

Each client must supply a bearer token during connection:

```ts
socket.io("/player", {
  auth: {
    token: "<session-jwt>"
  }
});
```

The JWT claims must include `gameId` and `role` (`player`, `screen`, or `gamemaster`). The hub verifies the token before joining rooms.

### Room Assignment

| Namespace | Joined Room | Notes |
|-----------|-------------|-------|
| `/player` | `game:{gameId}` | Individual players receive gameplay events and personal status updates. |
| `/screen` | `game:{gameId}` | Big-screen displays consume the same draw feed plus media cues. |
| `/console` | `game:{gameId}` | GameMaster console receives operational events (claims queue, state updates). |

Additional per-socket rooms (e.g. `player:{playerId}`) may be attached by the server for direct responses but are not required for fan-out.

---

## Redis Broker Payload

All backend services publish through a single Redis channel: `bingo:events`.

```json
{
  "room": "game:42",
  "event": "draw:next",
  "data": { "seq": 7, "value": 12 }
}
```

The realtime hub relays each message to every namespace: `io.of(ns).to(room).emit(event, data)` for `ns ∈ {"/player", "/screen", "/console"}`.

---

## Event Reference

### `draw:next`
- **Direction:** Server → Clients
- **Namespaces:** `/player`, `/screen`, `/console`
- **Payload:**
  ```ts
  interface DrawNextPayload {
    seq: number;   // 1-based draw sequence
    value: number; // bingo ball number 1–75
  }
  ```
- **Usage:** Broadcast whenever a new number is drawn (manual or auto). Clients append to history and highlight the current call.

### `claim:result`
- **Direction:** Server → Clients
- **Namespaces:** `/player`, `/screen`, `/console`
- **Payload:**
  ```ts
  interface ClaimResultPayload {
    cardId: string;
    playerId: string;
    nickname: string;
    result: 'approved' | 'denied';
    rank?: number;                // 1 for first winner, etc.
    pattern?: string;             // Winning pattern when approved
    reason?: string;              // Denial explanation when denied
    penalty?: {
      strikes: number;
      cooldownMs?: number;
    };
  }
  ```
- **Usage:** Notifies all clients when a Bingo claim is adjudicated. Consoles update the queue, screens trigger win or denial messaging, players show feedback and cooldown timers.

### `state:update`
- **Direction:** Server → Clients
- **Namespaces:** `/player`, `/screen`, `/console`
- **Payload:**
  ```ts
  interface StateUpdatePayload {
    status: 'LOBBY' | 'OPEN' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
    winners?: Array<{
      playerId: string;
      nickname: string;
      rank: number;
      pattern: string;
    }>;
    autoDrawEnabled?: boolean;
    autoDrawInterval?: number; // milliseconds
    updatedAt: string;          // ISO timestamp
  }
  ```
- **Usage:** Sent whenever the authoritative game status changes (open/start/pause/resume/complete) or when host toggles auto-draw configuration.

### `media:cue`
- **Direction:** Server → `/screen`
- **Payload:**
  ```ts
  interface MediaCuePayload {
    type: 'intro' | 'number' | 'bingo';
    value?: number;       // For number voice-over
    playerName?: string;  // For bingo celebration call-outs
  }
  ```
- **Usage:** Drives audiovisual elements on the big-screen client (e.g., intro roll, number call SFX, Bingo celebration).

### `console:log`
- **Direction:** Server → `/console`
- **Payload:**
  ```ts
  interface ConsoleLogPayload {
    level: 'info' | 'warn' | 'error';
    message: string;
    timestamp: string;
  }
  ```
- **Usage:** Optional operational log lines surfaced to the host UI for debugging.

---

## Recovery & Snapshot Strategy

Clients that reconnect should re-fetch `GET /games/{id}/snapshot` before listening for deltas. The realtime hub does not replay history; it only emits the live stream detailed above. Clients must debounce duplicate events using the `seq` value.

---

## Security Considerations

- JWT validation occurs on every connection attempt; invalid or expired tokens are rejected with a standard `Error('auth failed')` event.
- Namespace-level middleware enforces role-based access (e.g., `/console` requires `role === 'gamemaster'`).
- All events are read-only for clients in Phase 1; mutating actions continue to flow through the REST API with idempotency controls.
