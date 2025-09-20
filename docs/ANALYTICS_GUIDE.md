# Analytics Guide

## Overview

The Bingo platform includes a comprehensive analytics system designed for privacy-first telemetry and insights. This system tracks gameplay events, user interactions, and system performance while respecting user privacy and consent choices.

## Architecture

### Components

1. **Client SDK** (`apps/shared/analytics/`)
   - Lightweight TypeScript library (~8KB gzipped)
   - Automatic batching and offline queue
   - IndexedDB storage with localStorage fallback
   - Privacy controls and DNT respect

2. **Ingestion API** (`/analytics/events`)
   - Rate-limited endpoint (60 req/min per IP)
   - Optional HMAC authentication
   - Schema validation
   - Event deduplication

3. **Storage**
   - **Raw Events**: PostgreSQL `analytics_events_raw` table
   - **Rollups**: Hourly aggregations in `analytics_rollups_hourly`
   - **Retention**: 14 days raw, 90 days rollups (configurable)

4. **Dashboards**
   - **Live Ops**: Real-time game metrics
   - **Gameplay**: Player behavior analytics

## Quick Start

### Client-Side Implementation

#### Initialize Analytics

```typescript
import { analytics } from '@shared/analytics';

// Initialize on app boot
analytics.init({
  baseUrl: import.meta.env.VITE_API_BASE,
  app: 'player', // or 'console', 'screen'
  env: 'offline', // or 'cloud'
  flushInterval: 5000, // ms
  maxBatch: 50,
  enabled: true,
  debug: import.meta.env.DEV
});
```

#### Set Context

```typescript
// After player joins
analytics.setContext({
  gameId: 'g_abc123',
  playerId: 'p_def456',
  cardId: 'c_ghi789',
  sessionId: 's_jkl012'
});
```

#### Track Events

```typescript
// Use helper functions
import { trackGameEvent, trackCardEvent } from '@shared/analytics';

trackGameEvent.opened(gameId, playerId);
trackCardEvent.mark(position, number, allowed);

// Or track directly
analytics.track('custom.event', {
  property1: 'value1',
  property2: 123
});
```

### Server-Side Implementation

```typescript
import { trackGame, trackClaim } from '../services/analytics';

// In your route handlers
trackGame.created(gameId, createdBy);
trackClaim.result(gameId, playerId, cardId, valid, rank);
```

## Event Taxonomy

### Core Events

| Event | Description | Key Properties |
|-------|-------------|----------------|
| `game.created` | New game started | createdBy |
| `game.opened` | Player joins game | - |
| `game.paused` | Game paused | pausedBy, reason |
| `game.autodraw.toggled` | Auto-draw changed | enabled, intervalMs |
| `draw.next` | Number drawn | seq, value, latencyMs |
| `card.mark` | Player marks number | position, number, allowed |
| `claim.submitted` | Bingo claim made | pattern, positions |
| `claim.result` | Claim validated | valid, rank, reason |
| `penalty.applied` | False claim penalty | type, strikes, cooldownMs |

### Connection Events

| Event | Description | Key Properties |
|-------|-------------|----------------|
| `socket.connect` | WebSocket connected | transport, reconnection |
| `socket.disconnect` | Connection lost | reason |
| `socket.reconnect` | Reconnection attempt | attempt, delayMs |
| `resume.success` | Game state resumed | - |
| `resume.fail` | Resume failed | reason |

### PWA Events

| Event | Description | Key Properties |
|-------|-------------|----------------|
| `pwa.install` | App installed | - |
| `pwa.offline.hydrate` | Offline data loaded | fromCache, itemCount |

## Privacy & Compliance

### User Controls

#### Opt-Out Toggle

```typescript
// In settings UI
analytics.setOptOut(true); // Disables tracking
analytics.setOptOut(false); // Re-enables tracking
```

#### Check Privacy Status

```typescript
const settings = analytics.getPrivacySettings();
console.log(settings);
// { optOut: false, dnt: false, consentGiven: true }
```

### Do Not Track (DNT)

The SDK automatically respects the browser's DNT setting:

```typescript
// Detected automatically from:
navigator.doNotTrack === '1'
```

### Data Redaction

Sensitive fields are automatically redacted:

- Tokens, secrets, passwords
- API keys, auth credentials  
- Full IP addresses (truncated to /24)

Never include:
- Real names or usernames
- Email addresses
- Payment information
- Device identifiers

### Data Retention

Configure in environment:

```bash
ANALYTICS_RETENTION_DAYS_RAW=14      # Raw events
ANALYTICS_RETENTION_DAYS_ROLLUP=90   # Aggregations
```

### GDPR Compliance

#### Data Deletion

```bash
# Delete all data for a player
pnpm analytics:delete --playerId p_abc123

# Delete by date range
pnpm analytics:delete --before "2024-01-01"
```

#### Data Export

```bash
# Export player's data
pnpm analytics:export --playerId p_abc123 --format json
```

## Configuration

### Environment Variables

```bash
# Core settings
ANALYTICS_ENABLED=true
ANALYTICS_HMAC_KEY=your-secret-key  # Optional

# Sampling (0.0 to 1.0)
ANALYTICS_SAMPLING_API_REQUEST=0.1  # Sample 10% of API requests

# Retention
ANALYTICS_RETENTION_DAYS_RAW=14
ANALYTICS_RETENTION_DAYS_ROLLUP=90

# Service identity
SERVICE_ENV=offline  # offline | cloud
SERVICE_NAME=api     # api | realtime
```

### HMAC Authentication

Enable signature validation:

```bash
# Server
ANALYTICS_HMAC_KEY=shared-secret-key

# Client
analytics.init({
  hmacKey: 'shared-secret-key' // Same key
});
```

## Operations

### Database Migration

```bash
cd backend/api
pnpm prisma migrate dev --name analytics_init
```

### Rollup Job

```bash
# Manual run
pnpm analytics:rollup --since 24

# With summary
pnpm analytics:rollup --summary

# Schedule with cron
0 * * * * cd /app && pnpm analytics:rollup
```

### Monitoring

#### Check Queue Size

```typescript
const queueSize = await analytics.getQueueSize();
console.log(`${queueSize} events queued`);
```

#### View Dashboards

1. Open Grafana: http://localhost:3001
2. Import dashboards from `infra/grafana/dashboards/analytics/`
3. Select PostgreSQL data source

### Debugging

#### Enable Debug Mode

```typescript
analytics.init({
  debug: true // Logs all events
});
```

#### Check Failed Events

```sql
-- Events that failed validation
SELECT * FROM analytics_events_raw 
WHERE sig_valid = false 
ORDER BY created_at DESC 
LIMIT 10;
```

#### Verify Rollups

```sql
-- Check hourly metrics
SELECT metric, bucket, value, dim 
FROM analytics_rollups_hourly 
WHERE bucket >= NOW() - INTERVAL '1 day'
ORDER BY bucket DESC, metric;
```

## Performance

### Client Impact

- **Bundle size**: < 8KB gzipped
- **CPU overhead**: < 1% 
- **Memory**: ~200KB (with 50 event queue)
- **Network**: < 10KB/min typical

### Server Impact

- **Ingestion latency**: p95 < 50ms
- **Storage growth**: ~1GB/million events
- **Rollup time**: < 5s for 24h of data

### Optimization Tips

1. **Batch Events**: SDK auto-batches, but group related events
2. **Sample High-Volume**: Use sampling for noisy events
3. **Compress Old Data**: Archive rollups > 90 days
4. **Index Strategically**: Add indexes for common queries

## Troubleshooting

### Events Not Appearing

1. Check if analytics is enabled:
   ```bash
   echo $ANALYTICS_ENABLED  # Should be "true"
   ```

2. Verify endpoint is accessible:
   ```bash
   curl -X POST http://localhost:4000/analytics/events \
     -H "Content-Type: application/json" \
     -d '[{"id":"test","ts":0,"app":"test","name":"test"}]'
   ```

3. Check browser console for errors
4. Verify DNT/opt-out settings

### Rate Limiting

If seeing 429 errors:

1. Reduce flush frequency
2. Increase batch size
3. Implement exponential backoff
4. Check for event loops

### Storage Issues

If database is growing too fast:

1. Reduce retention period
2. Increase sampling rate
3. Run cleanup more frequently
4. Archive old rollups

## Testing

### Unit Tests

```bash
# Test SDK
pnpm test apps/shared/analytics

# Test ingestion
pnpm test backend/api/src/routes/analytics.ingest
```

### Integration Tests

```bash
# Run with local stack
pnpm test:integration tests/integration/analytics
```

### E2E Verification

```bash
# Start everything
make deploy-offline

# Generate test data
pnpm test:analytics:e2e

# Check dashboards
open http://localhost:3001
```

## Best Practices

### Event Design

1. **Be Specific**: `game.opened` not `game.event`
2. **Include Context**: Always set gameId, playerId
3. **Measure Latency**: Include timing information
4. **Version Schemas**: Use `props.v` for schema versions
5. **Document Events**: Update schema registry

### Implementation

1. **Initialize Early**: Set up analytics on app boot
2. **Set Context ASAP**: After authentication/join
3. **Track Key Moments**: User actions, not every render
4. **Handle Failures**: Analytics should never break app
5. **Test Privacy**: Verify opt-out works

### Security

1. **No PII**: Never track personal information
2. **Redact Tokens**: Auto-scrub auth data
3. **Validate Input**: Check event schemas
4. **Rate Limit**: Prevent abuse
5. **Audit Access**: Log who queries data

## Extending the System

### Adding New Events

1. Add to manifest: `analytics/schema/v1/manifest.json`
2. Create schema: `analytics/schema/v1/[event].json`
3. Add tracking: Update relevant code
4. Update rollups: Add to aggregation query
5. Document: Update this guide

### Custom Dashboards

1. Create JSON in `infra/grafana/dashboards/`
2. Use PostgreSQL datasource
3. Query rollups for performance
4. Share via export/import

### Alternative Storage

For cloud deployment:

```typescript
// Export to BigQuery
const exporter = new BigQueryExporter({
  dataset: 'analytics',
  table: 'events'
});

// Or ClickHouse
const exporter = new ClickHouseExporter({
  host: 'clickhouse.example.com',
  database: 'analytics'
});
```

## Support

For issues or questions:

1. Check this guide
2. Review schema registry
3. Inspect dashboards
4. Enable debug mode
5. Check server logs