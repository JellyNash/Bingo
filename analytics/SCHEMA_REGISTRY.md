# Analytics Schema Registry

## Overview

This registry manages the event schemas for the Bingo analytics system. All events are versioned and follow strict backward compatibility rules.

## Current Version: v1

### Event Catalog

#### Gameplay Events
- `game.created` - New game instance created
- `game.opened` - Player joins a game
- `game.paused` - Game paused by console operator
- `game.autodraw.toggled` - Auto-draw feature toggled
- `draw.next` - New number drawn
- `card.mark` - Player marks a number (client-side)
- `card.mark.server` - Server validates mark
- `claim.submitted` - Player submits bingo claim
- `claim.result` - Claim validation result
- `penalty.applied` - False claim penalty applied

#### Connectivity Events  
- `socket.connect` - WebSocket connection established
- `socket.disconnect` - WebSocket connection lost
- `socket.reconnect` - Reconnection attempt
- `resume.success` - Game state successfully resumed
- `resume.fail` - Game state resume failed

#### PWA Events
- `pwa.install` - PWA installed to device
- `pwa.offline.hydrate` - Offline data loaded from cache

#### System Events
- `api.request` - API endpoint called (sampled)
- `realtime.emit` - Real-time event broadcasted

## Schema Structure

All events extend the common base schema (`_common.json`) which includes:
- `id`: UUID v4 for idempotency
- `ts`: Client timestamp (ms since epoch)
- `app`: Source application
- `name`: Event name from manifest
- `gameId`, `playerId`, `cardId`: Game context
- `sessionId`: Session identifier
- `env`: offline | cloud
- `ctx`: Stable context (UA, versions)
- `props`: Event-specific properties

## Versioning Rules

### Compatible Changes (No Version Bump)
- Adding optional properties to `props`
- Adding new events to manifest
- Expanding enum values (additive only)
- Adjusting descriptions/documentation

### Breaking Changes (Requires New Version)
- Removing or renaming properties
- Changing property types
- Making optional properties required
- Removing events from manifest
- Changing validation rules (min/max)

## Adding New Events

1. **Add to Manifest**: Update `schema/v1/manifest.json`
2. **Create Schema File**: Add `schema/v1/[event.name].json`
3. **Update Clients**: Add tracking calls in relevant apps
4. **Update Rollups**: Add aggregation logic if needed
5. **Document**: Update this registry with event description

## Migration Process

When creating v2:
1. Copy entire v1 directory to v2
2. Make breaking changes in v2 schemas
3. Update manifest version
4. Support both versions in ingestion endpoint
5. Migrate clients gradually
6. Sunset v1 after all clients upgraded

## Privacy Considerations

### Never Include
- Authentication tokens
- Passwords or secrets
- Full IP addresses (truncate to /24)
- Player real names
- Email addresses
- Phone numbers
- Payment information

### Pseudonymization
- Use `playerId` hash instead of username
- Use `sessionId` instead of device ID
- Truncate user agents to browser/version

## Retention Policy

- **Raw Events**: 14 days (configurable)
- **Hourly Rollups**: 90 days (configurable)
- **Daily Rollups**: 1 year
- **Monthly Summaries**: Indefinite

## GDPR Compliance

- Honor `navigator.doNotTrack`
- Provide opt-out mechanism
- Support data deletion requests
- No PII in event properties
- Audit log for data access

## Testing Events

Test events can be sent with `app: "test"` and will be:
- Accepted by ingestion
- Excluded from rollups
- Auto-deleted after 1 hour

## Contact

For schema changes or questions:
- Create PR with schema updates
- Tag #analytics team for review
- Run validation suite before merge