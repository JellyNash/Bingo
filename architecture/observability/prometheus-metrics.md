# Prometheus Metrics Specification

**Version:** 1.0
**Author:** Agent C — System Architect
**Date:** 2025-09-19

## Overview

This document defines the comprehensive Prometheus metrics for the Bingo Platform, focusing on business KPIs, performance monitoring, and operational observability to support the <200ms draw-to-UI latency requirements and 1000+ concurrent player capacity.

**Metric Categories:**
- **Business Metrics:** Game performance, player engagement, revenue indicators
- **Performance Metrics:** Latency, throughput, resource utilization
- **Infrastructure Metrics:** System health, database performance, cache efficiency
- **Security Metrics:** Rate limiting, authentication, abuse detection

---

## 1. Business & Game Metrics

### 1.1 Game Statistics

```prometheus
# Active games by status
bingo_games_active{status="lobby"|"open"|"active"|"paused"|"completed"}
# TYPE gauge
# HELP Number of games in each status

# Total games created
bingo_games_created_total
# TYPE counter
# HELP Total number of games created since startup

# Game completion rate
bingo_games_completion_rate
# TYPE gauge
# HELP Percentage of games that reach completion (0-1)

# Game duration distribution
bingo_game_duration_seconds_bucket{le="60"|"120"|"300"|"600"|"1200"|"3600"|"+Inf"}
# TYPE histogram
# HELP Game duration from start to completion in seconds

# Average players per game
bingo_game_players_avg
# TYPE gauge
# HELP Average number of players per active game

# Game throughput
bingo_games_per_minute
# TYPE gauge
# HELP Games completed per minute (rolling 5-minute window)
```

### 1.2 Player Metrics

```prometheus
# Current player connections
bingo_players_connected{game_id="*"}
# TYPE gauge
# HELP Number of currently connected players per game

# Total unique players
bingo_players_total
# TYPE counter
# HELP Total unique players since startup

# Player join rate
bingo_player_joins_per_minute
# TYPE gauge
# HELP Player joins per minute (rolling 5-minute window)

# Player retention during game
bingo_player_retention_rate{phase="early"|"mid"|"late"}
# TYPE gauge
# HELP Player retention rate by game phase (0-1)

# Player reconnection success rate
bingo_player_reconnection_success_rate
# TYPE gauge
# HELP Percentage of successful player reconnections (0-1)

# Player engagement score
bingo_player_engagement_score{percentile="50"|"75"|"90"|"95"|"99"}
# TYPE gauge
# HELP Player engagement score percentiles (marks per minute)
```

### 1.3 Claim & Draw Metrics

```prometheus
# Draw frequency
bingo_draws_per_minute{game_id="*",mode="manual"|"auto"}
# TYPE gauge
# HELP Number draws per minute by game and mode

# Total draws executed
bingo_draws_total{mode="manual"|"auto"}
# TYPE counter
# HELP Total number draws executed

# Claim submissions
bingo_claims_total{result="accepted"|"denied"|"superseded"}
# TYPE counter
# HELP Total claims by result type

# Claim success rate
bingo_claim_success_rate
# TYPE gauge
# HELP Percentage of valid claims (accepted + superseded) / total

# False claim rate
bingo_false_claim_rate{percentile="50"|"75"|"90"|"95"}
# TYPE gauge
# HELP False claim rate percentiles by player

# Simultaneous claims frequency
bingo_simultaneous_claims_per_game
# TYPE histogram
# HELP Number of simultaneous claims per winning pattern

# Numbers remaining distribution
bingo_numbers_remaining{bucket="0-10"|"11-25"|"26-50"|"51-75"}
# TYPE histogram
# HELP Distribution of numbers remaining when game completes
```

---

## 2. Performance Metrics

### 2.1 Critical Latency Metrics

```prometheus
# Draw to UI propagation latency (CRITICAL SLA: <200ms)
bingo_draw_propagation_duration_ms{percentile="50"|"75"|"90"|"95"|"99"}
# TYPE histogram
# HELP Time from draw execution to client UI update
bingo_draw_propagation_duration_ms_bucket{le="50"|"100"|"150"|"200"|"300"|"500"|"1000"|"+Inf"}

# Claim validation latency (TARGET: <100ms)
bingo_claim_validation_duration_ms{percentile="50"|"75"|"90"|"95"|"99"}
# TYPE histogram
# HELP Time to validate and respond to claim submission
bingo_claim_validation_duration_ms_bucket{le="25"|"50"|"75"|"100"|"150"|"250"|"500"|"+Inf"}

# Player join latency (TARGET: <500ms)
bingo_player_join_duration_ms{percentile="50"|"75"|"90"|"95"|"99"}
# TYPE histogram
# HELP Time from PIN submission to game entry
bingo_player_join_duration_ms_bucket{le="100"|"250"|"500"|"750"|"1000"|"2000"|"+Inf"}

# Reconnection latency (TARGET: <3000ms)
bingo_player_reconnect_duration_ms{percentile="50"|"75"|"90"|"95"|"99"}
# TYPE histogram
# HELP Time to fully reconnect and sync state
bingo_player_reconnect_duration_ms_bucket{le="500"|"1000"|"2000"|"3000"|"5000"|"10000"|"+Inf"}
```

### 2.2 API Performance

```prometheus
# HTTP request duration
api_request_duration_ms{method="GET"|"POST"|"PUT"|"DELETE",route,status_code}
# TYPE histogram
# HELP HTTP request duration by method, route, and status
api_request_duration_ms_bucket{le="10"|"25"|"50"|"100"|"250"|"500"|"1000"|"2500"|"5000"|"+Inf"}

# HTTP requests total
api_requests_total{method,route,status_code}
# TYPE counter
# HELP Total HTTP requests by method, route, and status

# HTTP request rate
api_requests_per_second{method,route}
# TYPE gauge
# HELP HTTP requests per second (rolling 1-minute window)

# HTTP error rate
api_error_rate{route}
# TYPE gauge
# HELP HTTP error rate (4xx+5xx) percentage by route (0-1)

# Request payload size
api_request_size_bytes{method,route}
# TYPE histogram
# HELP HTTP request payload size in bytes

# Response payload size
api_response_size_bytes{method,route,status_code}
# TYPE histogram
# HELP HTTP response payload size in bytes
```

### 2.3 WebSocket Performance

```prometheus
# Active WebSocket connections
socket_connections_active{namespace="/game"|"/admin"|"/system"}
# TYPE gauge
# HELP Number of active WebSocket connections by namespace

# WebSocket connection duration
socket_connection_duration_seconds{namespace,disconnect_reason}
# TYPE histogram
# HELP WebSocket connection duration until disconnect

# Event broadcast latency
socket_event_fanout_duration_ms{event_type,connection_count_bucket}
# TYPE histogram
# HELP Time to broadcast event to all subscribers
socket_event_fanout_duration_ms_bucket{le="10"|"25"|"50"|"100"|"250"|"500"|"+Inf"}

# Events sent per second
socket_events_sent_per_second{namespace,event_type}
# TYPE gauge
# HELP WebSocket events sent per second by type

# Events received per second
socket_events_received_per_second{namespace,event_type}
# TYPE gauge
# HELP WebSocket events received per second by type

# Connection errors
socket_connection_errors_total{namespace,error_type}
# TYPE counter
# HELP WebSocket connection errors by type

# Message queue size
socket_message_queue_size{namespace}
# TYPE gauge
# HELP Pending messages in WebSocket send queue
```

---

## 3. Infrastructure Metrics

### 3.1 Database Performance

```prometheus
# Database query duration
db_query_duration_ms{operation="select"|"insert"|"update"|"delete",table}
# TYPE histogram
# HELP Database query execution time by operation and table
db_query_duration_ms_bucket{le="1"|"5"|"10"|"25"|"50"|"100"|"250"|"500"|"1000"|"+Inf"}

# Database queries per second
db_queries_per_second{operation,table}
# TYPE gauge
# HELP Database queries per second by operation and table

# Database connection pool
db_connections_active
# TYPE gauge
# HELP Number of active database connections

db_connections_idle
# TYPE gauge
# HELP Number of idle database connections

db_connections_max
# TYPE gauge
# HELP Maximum database connections allowed

# Database query errors
db_query_errors_total{operation,table,error_type}
# TYPE counter
# HELP Database query errors by operation, table, and error type

# Database transaction duration
db_transaction_duration_ms{table}
# TYPE histogram
# HELP Database transaction duration by primary table

# Row counts (for monitoring)
db_table_rows{table="games"|"players"|"draws"|"claims"|"audit_log"}
# TYPE gauge
# HELP Current row count by table (updated every 5 minutes)
```

### 3.2 Cache Performance

```prometheus
# Redis operations
cache_operations_total{operation="get"|"set"|"del"|"pub"|"sub",result="hit"|"miss"|"success"|"error"}
# TYPE counter
# HELP Cache operations by type and result

# Cache operation duration
cache_operation_duration_ms{operation}
# TYPE histogram
# HELP Cache operation duration by type
cache_operation_duration_ms_bucket{le="1"|"5"|"10"|"25"|"50"|"100"|"+Inf"}

# Cache hit rate
cache_hit_rate{key_prefix}
# TYPE gauge
# HELP Cache hit rate by key prefix (0-1)

# Cache memory usage
cache_memory_used_bytes
# TYPE gauge
# HELP Redis memory usage in bytes

cache_memory_max_bytes
# TYPE gauge
# HELP Redis maximum memory limit in bytes

# Cache connections
cache_connections_active
# TYPE gauge
# HELP Number of active Redis connections

# Pub/sub metrics
cache_pubsub_channels_active
# TYPE gauge
# HELP Number of active pub/sub channels

cache_pubsub_subscribers{channel_pattern}
# TYPE gauge
# HELP Number of subscribers by channel pattern

cache_pubsub_messages_per_second{channel_pattern}
# TYPE gauge
# HELP Pub/sub messages per second by channel pattern
```

### 3.3 System Resources

```prometheus
# Memory usage
process_memory_usage_bytes{type="rss"|"heap_used"|"heap_total"|"external"}
# TYPE gauge
# HELP Process memory usage by type

# CPU usage
process_cpu_usage_percent
# TYPE gauge
# HELP Process CPU usage percentage (0-100)

# Event loop lag
nodejs_eventloop_lag_seconds{percentile="50"|"75"|"90"|"95"|"99"}
# TYPE histogram
# HELP Node.js event loop lag in seconds

# Garbage collection
nodejs_gc_duration_seconds{gc_type="scavenge"|"mark_sweep"|"incremental_marking"}
# TYPE histogram
# HELP Garbage collection duration by type

# File descriptors
process_open_fds
# TYPE gauge
# HELP Number of open file descriptors

# Network connections
process_network_connections{state="established"|"listen"|"time_wait"}
# TYPE gauge
# HELP Network connections by state
```

---

## 4. Security & Rate Limiting Metrics

### 4.1 Authentication & Authorization

```prometheus
# Authentication attempts
auth_attempts_total{result="success"|"failure",method="jwt"|"session"}
# TYPE counter
# HELP Authentication attempts by result and method

# JWT token operations
auth_jwt_operations_total{operation="create"|"verify"|"refresh"|"revoke",result="success"|"failure"}
# TYPE counter
# HELP JWT token operations by type and result

# Authentication errors
auth_errors_total{error_type="invalid_token"|"expired_token"|"missing_token"|"invalid_signature"}
# TYPE counter
# HELP Authentication errors by type

# Session duration
auth_session_duration_seconds{user_type="player"|"gamemaster"|"admin"}
# TYPE histogram
# HELP User session duration by type

# Permission check failures
auth_permission_denied_total{endpoint,required_permission}
# TYPE counter
# HELP Permission check failures by endpoint and permission
```

### 4.2 Rate Limiting

```prometheus
# Rate limit hits
rate_limit_hits_total{operation="player:mark"|"player:claim"|"player:join",result="allowed"|"blocked"}
# TYPE counter
# HELP Rate limit evaluations by operation and result

# Rate limit violations
rate_limit_violations_total{operation,client_type="ip"|"player"}
# TYPE counter
# HELP Rate limit violations by operation and client type

# Rate limit blocks applied
rate_limit_blocks_total{operation,duration_bucket="0-60s"|"1-10m"|"10m+"}
# TYPE counter
# HELP Rate limit blocks applied by operation and duration

# Current rate limit state
rate_limit_tokens_available{operation,client_id}
# TYPE gauge
# HELP Available tokens in rate limit bucket

# Rate limit recovery time
rate_limit_recovery_duration_seconds{operation}
# TYPE histogram
# HELP Time for rate limit to fully recover
```

### 4.3 Security Events

```prometheus
# Security violations
security_violations_total{type="card_tampering"|"timing_manipulation"|"suspicious_behavior"|"abuse_detection"}
# TYPE counter
# HELP Security violations by type

# Penalty applications
security_penalties_total{type="false_claim"|"rate_limit"|"suspicious"|"manual",severity="1"|"2"|"3"}
# TYPE counter
# HELP Penalties applied by type and severity

# Player disqualifications
security_disqualifications_total{reason="strikes"|"abuse"|"manual"}
# TYPE counter
# HELP Player disqualifications by reason

# Security alerts generated
security_alerts_total{severity="low"|"medium"|"high"|"critical",status="open"|"resolved"}
# TYPE counter
# HELP Security alerts by severity and status

# Behavioral risk scores
security_risk_score{percentile="50"|"75"|"90"|"95"|"99"}
# TYPE gauge
# HELP Player behavioral risk score percentiles (0-100)
```

---

## 5. Business Intelligence Metrics

### 5.1 Operational KPIs

```prometheus
# Revenue indicators (if applicable)
bingo_revenue_per_game{currency}
# TYPE gauge
# HELP Average revenue per completed game

# Player lifetime value
bingo_player_ltv{percentile="50"|"75"|"90"|"95"}
# TYPE gauge
# HELP Player lifetime value percentiles

# Game completion funnel
bingo_funnel_conversion_rate{stage="join"|"first_mark"|"first_claim"|"completion"}
# TYPE gauge
# HELP Conversion rate through game funnel stages (0-1)

# Peak concurrent players
bingo_peak_concurrent_players{time_window="1h"|"6h"|"24h"}
# TYPE gauge
# HELP Peak concurrent players in time window

# Average game revenue
bingo_avg_revenue_per_game{game_type="regular"|"tournament"}
# TYPE gauge
# HELP Average revenue per game by type
```

### 5.2 Operational Efficiency

```prometheus
# Resource utilization efficiency
bingo_resource_efficiency{resource="cpu"|"memory"|"network",utilization_bucket="0-50%"|"50-80%"|"80-95%"|"95%+"}
# TYPE histogram
# HELP Resource utilization efficiency distribution

# Cost per player
bingo_cost_per_player{cost_type="infrastructure"|"support"|"total"}
# TYPE gauge
# HELP Cost per active player by type

# System uptime
bingo_uptime_percent{component="api"|"websocket"|"database"|"cache"}
# TYPE gauge
# HELP System uptime percentage by component (0-1)

# Incident response time
bingo_incident_response_duration_minutes{severity="low"|"medium"|"high"|"critical"}
# TYPE histogram
# HELP Incident response time by severity

# Feature adoption rate
bingo_feature_adoption_rate{feature="auto_draw"|"reconnect"|"spectator_mode"}
# TYPE gauge
# HELP Feature adoption rate by feature (0-1)
```

---

## 6. Custom Business Metrics

### 6.1 Game-Specific Analytics

```prometheus
# Pattern popularity
bingo_pattern_popularity{pattern="row"|"column"|"diagonal"|"four_corners"}
# TYPE counter
# HELP Winning pattern frequency

# Draw distribution fairness
bingo_draw_distribution_variance{letter="B"|"I"|"N"|"G"|"O"}
# TYPE gauge
# HELP Variance in draw distribution by letter (fairness check)

# Game length distribution
bingo_game_length_draws{bucket="0-20"|"21-40"|"41-60"|"61-75"}
# TYPE histogram
# HELP Game length in number of draws until completion

# Player skill indicators
bingo_player_skill_score{skill_level="novice"|"intermediate"|"expert"}
# TYPE histogram
# HELP Player skill score distribution

# Time to first claim
bingo_time_to_first_claim_seconds{percentile="25"|"50"|"75"|"90"}
# TYPE gauge
# HELP Time from game start to first claim submission
```

### 6.2 Venue-Specific Metrics

```prometheus
# Venue capacity utilization
bingo_venue_capacity_utilization{venue_type="small"|"medium"|"large"}
# TYPE gauge
# HELP Venue capacity utilization percentage (0-1)

# Equipment performance
bingo_equipment_performance{device_type="tablet"|"phone"|"desktop",performance_bucket="excellent"|"good"|"poor"}
# TYPE gauge
# HELP Device performance distribution

# Network quality indicators
bingo_network_quality{connection_type="wifi"|"cellular"|"ethernet",quality="excellent"|"good"|"poor"}
# TYPE gauge
# HELP Network connection quality distribution

# Offline mode usage
bingo_offline_mode_usage_percent
# TYPE gauge
# HELP Percentage of games running in offline mode (0-1)
```

---

## 7. Alerting Thresholds

### 7.1 Critical SLA Alerts

```yaml
# Critical latency violations
- alert: DrawLatencyHigh
  expr: histogram_quantile(0.95, bingo_draw_propagation_duration_ms_bucket) > 300
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Draw propagation latency P95 > 300ms"

- alert: ClaimValidationSlow
  expr: histogram_quantile(0.95, bingo_claim_validation_duration_ms_bucket) > 150
  for: 1m
  labels:
    severity: warning
  annotations:
    summary: "Claim validation P95 > 150ms"

- alert: PlayerJoinSlow
  expr: histogram_quantile(0.95, bingo_player_join_duration_ms_bucket) > 750
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "Player join P95 > 750ms"
```

### 7.2 Capacity Alerts

```yaml
- alert: HighPlayerLoad
  expr: sum(bingo_players_connected) > 800
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High player load approaching capacity"

- alert: WebSocketConnectionsHigh
  expr: sum(socket_connections_active) > 900
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "WebSocket connections approaching limit"

- alert: DatabaseConnectionsExhausted
  expr: db_connections_active / db_connections_max > 0.9
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Database connection pool nearly exhausted"
```

### 7.3 Security Alerts

```yaml
- alert: HighSecurityViolations
  expr: increase(security_violations_total[5m]) > 10
  for: 0s
  labels:
    severity: high
  annotations:
    summary: "High rate of security violations detected"

- alert: RateLimitBlocksIncreasing
  expr: increase(rate_limit_blocks_total[1m]) > 5
  for: 2m
  labels:
    severity: medium
  annotations:
    summary: "Increasing rate limit blocks may indicate abuse"
```

---

**Document Status:** Complete and ready for implementation
**Scraping Interval:** 15 seconds for performance metrics, 60 seconds for business metrics
**Retention:** 7 days high-resolution, 30 days aggregated, 1 year summary
**Dependencies:** OpenTelemetry instrumentation, Grafana dashboards