# Grafana Dashboards Specification

**Version:** 1.0
**Author:** Agent C — System Architect
**Date:** 2025-09-19

## Overview

This document defines comprehensive Grafana dashboard specifications for the Bingo Platform, providing real-time visibility into business KPIs, system performance, security posture, and operational health.

**Dashboard Categories:**
- **Executive KPI Dashboard:** Business metrics and high-level system health
- **Performance Dashboard:** Latency, throughput, and SLA monitoring
- **Security Dashboard:** Threat detection, rate limiting, and compliance
- **Operations Dashboard:** Infrastructure health and troubleshooting
- **Game Analytics Dashboard:** Game-specific metrics and player behavior

---

## 1. Executive KPI Dashboard

**Target Audience:** Business stakeholders, venue operators, executives
**Refresh Rate:** 30 seconds
**Time Range:** Last 24 hours with drill-down to 7 days

### 1.1 Top-Level KPIs (Single Stat Panels)

```yaml
# Active Players (Large Number)
query: sum(bingo_players_connected)
unit: "players"
color: green (>500), yellow (200-500), red (<200)
thresholds: [200, 500, 1000]
sparkline: enabled

# Active Games
query: sum(bingo_games_active{status=~"open|active"})
unit: "games"
color: blue
sparkline: enabled

# Games Completed Today
query: increase(bingo_games_created_total[24h])
unit: "games"
color: green
compare_previous: 24h

# System Uptime
query: min(bingo_uptime_percent)
unit: "percent"
color: green (>99), yellow (95-99), red (<95)
thresholds: [95, 99]

# Average Game Duration
query: histogram_quantile(0.5, bingo_game_duration_seconds_bucket)
unit: "minutes"
color: blue
compare_previous: 24h

# Player Satisfaction (Completion Rate)
query: bingo_games_completion_rate
unit: "percent"
color: green (>85), yellow (70-85), red (<70)
thresholds: [70, 85]
```

### 1.2 Business Trends (Time Series)

```yaml
# Player Activity Over Time
Title: "Player Activity (24h)"
Queries:
  - name: "Connected Players"
    query: sum(bingo_players_connected)
    color: blue
  - name: "New Joins/Hour"
    query: increase(bingo_players_total[1h])
    color: green
Y-Axis: "Players"
Alert Lines: [800, 1000] # Capacity thresholds

# Game Performance
Title: "Game Throughput"
Queries:
  - name: "Games/Hour"
    query: increase(bingo_games_created_total[1h])
    color: purple
  - name: "Completions/Hour"
    query: increase(bingo_games_completed_total[1h])
    color: green
Y-Axis: "Games"

# Revenue Indicators (if applicable)
Title: "Revenue Trends"
Queries:
  - name: "Revenue/Hour"
    query: increase(bingo_revenue_total[1h])
    color: gold
  - name: "Avg Revenue/Game"
    query: bingo_revenue_per_game
    color: orange
Y-Axis: "Currency"
```

### 1.3 Geographic/Venue Distribution (World Map)

```yaml
# Player Distribution by Location
Title: "Active Players by Location"
Query: sum by (venue_location) (bingo_players_connected)
Map Type: World Map
Color Scale: Green to Red (0 to max players)
Tooltip: "Location: {venue_location}, Players: {value}"
```

### 1.4 Health Status (Status Panel)

```yaml
# System Health Matrix
Title: "System Health Status"
Services:
  - name: "API"
    query: bingo_uptime_percent{component="api"}
    thresholds: [95, 99]
  - name: "WebSocket"
    query: bingo_uptime_percent{component="websocket"}
    thresholds: [95, 99]
  - name: "Database"
    query: bingo_uptime_percent{component="database"}
    thresholds: [99, 99.5]
  - name: "Cache"
    query: bingo_uptime_percent{component="cache"}
    thresholds: [95, 99]
Colors: Red (Down), Yellow (Degraded), Green (Healthy)
```

---

## 2. Performance Dashboard

**Target Audience:** DevOps, SRE, Performance Engineers
**Refresh Rate:** 15 seconds
**Time Range:** Last 1 hour with drill-down to 24 hours

### 2.1 Critical SLA Monitoring

```yaml
# Draw Latency (CRITICAL: <200ms)
Title: "Draw → UI Propagation Latency"
Queries:
  - name: "P50"
    query: histogram_quantile(0.5, bingo_draw_propagation_duration_ms_bucket)
    color: blue
  - name: "P95"
    query: histogram_quantile(0.95, bingo_draw_propagation_duration_ms_bucket)
    color: orange
  - name: "P99"
    query: histogram_quantile(0.99, bingo_draw_propagation_duration_ms_bucket)
    color: red
Y-Axis: "Milliseconds"
Alert Lines: [200, 300] # Target and threshold
Target: <200ms avg, <300ms P95

# Claim Validation Latency (TARGET: <100ms)
Title: "Claim Validation Performance"
Queries:
  - name: "P95 Validation Time"
    query: histogram_quantile(0.95, bingo_claim_validation_duration_ms_bucket)
    color: green
  - name: "Claims/Second"
    query: rate(bingo_claims_total[1m])
    color: purple
    y-axis: right
Alert Lines: [100, 150]

# Player Join Performance (TARGET: <500ms)
Title: "Player Join Latency"
Queries:
  - name: "P95 Join Time"
    query: histogram_quantile(0.95, bingo_player_join_duration_ms_bucket)
    color: teal
  - name: "Joins/Minute"
    query: rate(bingo_players_total[1m]) * 60
    color: yellow
    y-axis: right
Alert Lines: [500, 750]
```

### 2.2 API Performance

```yaml
# API Response Times by Endpoint
Title: "API Endpoint Performance"
Query: histogram_quantile(0.95, api_request_duration_ms_bucket{route!~"/health|/metrics"})
Group By: route
Legend: "{{route}} P95"
Y-Axis: "Milliseconds"
Sort: "Descending"

# API Throughput
Title: "API Request Rate"
Queries:
  - name: "Total RPS"
    query: sum(rate(api_requests_total[1m]))
    color: blue
  - name: "Error Rate %"
    query: sum(rate(api_requests_total{status_code=~"4..|5.."}[1m])) / sum(rate(api_requests_total[1m])) * 100
    color: red
    y-axis: right
Y-Axis Left: "Requests/Second"
Y-Axis Right: "Error Percentage"

# API Status Code Distribution
Title: "HTTP Status Codes (1h)"
Query: increase(api_requests_total[1h])
Group By: status_code
Visualization: Pie Chart
Colors: Green (2xx), Yellow (3xx), Orange (4xx), Red (5xx)
```

### 2.3 WebSocket Performance

```yaml
# WebSocket Connection Health
Title: "WebSocket Connections"
Queries:
  - name: "Active Connections"
    query: sum(socket_connections_active)
    color: blue
  - name: "Connections/Second"
    query: rate(socket_connections_total[1m])
    color: green
    y-axis: right
  - name: "Disconnections/Second"
    query: rate(socket_disconnections_total[1m])
    color: red
    y-axis: right
Alert Lines: [800, 1000] # Connection capacity

# Event Broadcast Performance
Title: "Event Fanout Latency"
Query: histogram_quantile(0.95, socket_event_fanout_duration_ms_bucket)
Group By: event_type
Y-Axis: "Milliseconds"
Target: <50ms for critical events

# Message Queue Health
Title: "WebSocket Message Queues"
Queries:
  - name: "Queue Size"
    query: sum(socket_message_queue_size)
    color: orange
  - name: "Messages/Second"
    query: sum(rate(socket_events_sent_per_second[1m]))
    color: blue
    y-axis: right
Alert: Queue size > 1000
```

### 2.4 Infrastructure Performance

```yaml
# Database Performance
Title: "Database Performance"
Queries:
  - name: "Query P95 (ms)"
    query: histogram_quantile(0.95, db_query_duration_ms_bucket)
    color: purple
  - name: "Queries/Second"
    query: sum(rate(db_queries_per_second[1m]))
    color: green
    y-axis: right
  - name: "Active Connections"
    query: db_connections_active
    color: blue
    y-axis: right

# Cache Performance
Title: "Redis Cache Performance"
Queries:
  - name: "Hit Rate %"
    query: cache_hit_rate * 100
    color: green
  - name: "Operations/Second"
    query: sum(rate(cache_operations_total[1m]))
    color: blue
    y-axis: right
  - name: "Memory Usage %"
    query: (cache_memory_used_bytes / cache_memory_max_bytes) * 100
    color: orange
    y-axis: right
Alert Lines: [80, 95] # Memory thresholds
```

---

## 3. Security Dashboard

**Target Audience:** Security team, Operations, Compliance
**Refresh Rate:** 30 seconds
**Time Range:** Last 4 hours with drill-down to 24 hours

### 3.1 Security Overview

```yaml
# Security Status (Single Stats)
Security Violations (24h):
  query: increase(security_violations_total[24h])
  color: red (>10), yellow (1-10), green (0)
  threshold: [1, 10]

Active Penalties:
  query: sum(security_penalties_active)
  color: orange

Rate Limit Blocks (1h):
  query: increase(rate_limit_blocks_total[1h])
  color: yellow (>5), red (>20)

Disqualified Players (24h):
  query: increase(security_disqualifications_total[24h])
  color: red
```

### 3.2 Authentication & Authorization

```yaml
# Authentication Success Rate
Title: "Authentication Health"
Queries:
  - name: "Success Rate %"
    query: sum(rate(auth_attempts_total{result="success"}[5m])) / sum(rate(auth_attempts_total[5m])) * 100
    color: green
  - name: "Failed Attempts/Min"
    query: sum(rate(auth_attempts_total{result="failure"}[1m])) * 60
    color: red
    y-axis: right
Alert: Success rate < 95% or failures > 10/min

# JWT Token Operations
Title: "JWT Token Health"
Query: increase(auth_jwt_operations_total[1h])
Group By: operation, result
Visualization: Stacked Bar Chart
Colors: Green (success), Red (failure)

# Permission Denials by Endpoint
Title: "Authorization Failures"
Query: increase(auth_permission_denied_total[1h])
Group By: endpoint
Visualization: Table
Sort: Descending
Columns: [Endpoint, Denials, Required Permission]
```

### 3.3 Rate Limiting & Abuse

```yaml
# Rate Limiting Overview
Title: "Rate Limiting Activity"
Queries:
  - name: "Blocks Applied"
    query: increase(rate_limit_blocks_total[1h])
    color: red
  - name: "Violations"
    query: increase(rate_limit_violations_total[1h])
    color: orange
  - name: "Total Evaluations"
    query: increase(rate_limit_hits_total[1h])
    color: blue
Y-Axis: "Count (1h)"

# Rate Limiting by Operation
Title: "Rate Limits by Operation"
Query: increase(rate_limit_violations_total[1h])
Group By: operation
Visualization: Horizontal Bar Chart
Sort: Descending

# Client Behavior Analysis
Title: "Suspicious Activity Detection"
Queries:
  - name: "High Risk Players"
    query: count(security_risk_score > 75)
    color: red
  - name: "Medium Risk Players"
    query: count(security_risk_score > 50 and security_risk_score <= 75)
    color: orange
  - name: "Low Risk Players"
    query: count(security_risk_score <= 50)
    color: green
Visualization: Donut Chart
```

### 3.4 Security Events Timeline

```yaml
# Security Events Over Time
Title: "Security Events Timeline"
Queries:
  - name: "Card Tampering"
    query: increase(security_violations_total{type="card_tampering"}[5m])
    color: red
  - name: "Suspicious Behavior"
    query: increase(security_violations_total{type="suspicious_behavior"}[5m])
    color: orange
  - name: "Rate Limit Abuse"
    query: increase(security_violations_total{type="abuse_detection"}[5m])
    color: yellow
Visualization: Time Series
Stack: true

# Security Alerts Dashboard
Title: "Active Security Alerts"
Query: security_alerts_total{status="open"}
Group By: severity, type
Visualization: Table
Columns: [Alert Type, Severity, Count, Last Occurrence]
Sort: Severity DESC, Count DESC
```

---

## 4. Operations Dashboard

**Target Audience:** DevOps, SRE, Support Engineers
**Refresh Rate:** 15 seconds
**Time Range:** Last 2 hours with drill-down to 24 hours

### 4.1 System Health

```yaml
# Service Uptime Matrix
Title: "Service Availability"
Services:
  - API Server
  - WebSocket Server
  - Database
  - Redis Cache
  - Message Queue
Metrics:
  - Uptime %: bingo_uptime_percent{component="$service"}
  - Response Time: avg_response_time{service="$service"}
  - Error Rate: error_rate{service="$service"}
Visualization: Status Panel
Colors: Green (healthy), Yellow (degraded), Red (down)

# Resource Utilization
Title: "System Resources"
Queries:
  - name: "CPU %"
    query: process_cpu_usage_percent
    color: blue
  - name: "Memory %"
    query: (process_memory_usage_bytes{type="rss"} / process_memory_max_bytes) * 100
    color: green
  - name: "Disk I/O"
    query: rate(process_disk_io_bytes[1m])
    color: purple
    y-axis: right
Alert Lines: [80, 95] # Resource thresholds
```

### 4.2 Error Tracking

```yaml
# Error Rate Trends
Title: "Error Rates by Component"
Queries:
  - name: "API Errors"
    query: sum(rate(api_requests_total{status_code=~"5.."}[5m])) / sum(rate(api_requests_total[5m]))
    color: red
  - name: "WebSocket Errors"
    query: rate(socket_connection_errors_total[5m])
    color: orange
  - name: "Database Errors"
    query: rate(db_query_errors_total[5m])
    color: purple
  - name: "Cache Errors"
    query: rate(cache_operations_total{result="error"}[5m])
    color: yellow
Y-Axis: "Errors/Second"

# Top Errors (Table)
Title: "Top Error Messages (1h)"
Query: topk(10, increase(error_log_total[1h]))
Group By: error_message, component
Columns: [Component, Error Message, Count, First Seen, Last Seen]
Sort: Count DESC
```

### 4.3 Capacity Planning

```yaml
# Connection Capacity
Title: "Connection Utilization"
Queries:
  - name: "WebSocket Connections"
    query: (sum(socket_connections_active) / 1000) * 100
    color: blue
  - name: "Database Connections"
    query: (db_connections_active / db_connections_max) * 100
    color: green
  - name: "Cache Connections"
    query: (cache_connections_active / cache_connections_max) * 100
    color: orange
Y-Axis: "Utilization %"
Alert Lines: [80, 95]

# Growth Projections
Title: "Capacity Growth Trends"
Queries:
  - name: "Daily Peak Players"
    query: max_over_time(sum(bingo_players_connected)[1d])
    color: blue
  - name: "Daily Peak Games"
    query: max_over_time(sum(bingo_games_active)[1d])
    color: green
Time Range: 30 days
Trend Lines: enabled
```

### 4.4 Troubleshooting

```yaml
# Recent Incidents
Title: "Incident Timeline"
Query: incident_events{status!="resolved"}
Group By: severity, component
Visualization: Timeline
Time Field: timestamp
Description Field: description

# Performance Anomalies
Title: "Performance Anomaly Detection"
Queries:
  - name: "Latency Spikes"
    query: histogram_quantile(0.95, api_request_duration_ms_bucket) > 2 * histogram_quantile(0.95, api_request_duration_ms_bucket offset 1h)
    color: red
  - name: "Throughput Drops"
    query: sum(rate(api_requests_total[5m])) < 0.8 * sum(rate(api_requests_total[5m] offset 1h))
    color: orange
Visualization: Binary State (0/1)
```

---

## 5. Game Analytics Dashboard

**Target Audience:** Product managers, Game designers, Business analysts
**Refresh Rate:** 60 seconds
**Time Range:** Last 24 hours with drill-down to 7 days

### 5.1 Game Performance

```yaml
# Game Completion Funnel
Title: "Game Completion Funnel"
Queries:
  - name: "Games Created"
    query: increase(bingo_games_created_total[24h])
    color: blue
  - name: "Games Started"
    query: increase(bingo_games_started_total[24h])
    color: green
  - name: "Games Completed"
    query: increase(bingo_games_completed_total[24h])
    color: purple
  - name: "Games Abandoned"
    query: increase(bingo_games_abandoned_total[24h])
    color: red
Visualization: Funnel Chart
Conversion Rates: calculated

# Average Game Metrics
Title: "Game Duration Analysis"
Queries:
  - name: "Avg Duration (min)"
    query: histogram_quantile(0.5, bingo_game_duration_seconds_bucket) / 60
    color: blue
  - name: "Avg Draws to Win"
    query: histogram_quantile(0.5, bingo_game_length_draws_bucket)
    color: green
  - name: "Avg Players per Game"
    query: bingo_game_players_avg
    color: orange
Visualization: Single Stat with Trend
```

### 5.2 Player Behavior

```yaml
# Player Engagement
Title: "Player Engagement Metrics"
Queries:
  - name: "Marks per Minute"
    query: bingo_player_engagement_score{percentile="50"}
    color: blue
  - name: "Claims per Game"
    query: avg(bingo_claims_per_game)
    color: green
  - name: "False Claim Rate %"
    query: bingo_false_claim_rate{percentile="50"} * 100
    color: red
Time Range: 7 days
Compare Previous: enabled

# Player Retention
Title: "Player Retention Analysis"
Queries:
  - name: "Early Game (0-25%)"
    query: bingo_player_retention_rate{phase="early"}
    color: green
  - name: "Mid Game (25-75%)"
    query: bingo_player_retention_rate{phase="mid"}
    color: blue
  - name: "Late Game (75-100%)"
    query: bingo_player_retention_rate{phase="late"}
    color: purple
Y-Axis: "Retention Rate (0-1)"
Target Lines: [0.8, 0.9] # Retention targets
```

### 5.3 Pattern Analytics

```yaml
# Winning Pattern Distribution
Title: "Popular Winning Patterns"
Query: increase(bingo_pattern_popularity[7d])
Group By: pattern
Visualization: Pie Chart
Sort: Descending
Labels: Pattern name and percentage

# Pattern Difficulty Analysis
Title: "Time to Pattern Completion"
Query: histogram_quantile(0.5, bingo_time_to_pattern_completion_bucket)
Group By: pattern
Visualization: Bar Chart
Y-Axis: "Minutes to Completion"
Sort: Ascending
```

### 5.4 Fair Play Monitoring

```yaml
# Draw Distribution Fairness
Title: "Number Draw Distribution"
Queries:
  - name: "B (1-15)"
    query: bingo_draw_distribution_count{letter="B"}
    color: red
  - name: "I (16-30)"
    query: bingo_draw_distribution_count{letter="I"}
    color: orange
  - name: "N (31-45)"
    query: bingo_draw_distribution_count{letter="N"}
    color: yellow
  - name: "G (46-60)"
    query: bingo_draw_distribution_count{letter="G"}
    color: green
  - name: "O (61-75)"
    query: bingo_draw_distribution_count{letter="O"}
    color: blue
Visualization: Stacked Bar Chart
Expected Line: 20% per letter (fairness check)

# RNG Quality Metrics
Title: "Random Number Generation Quality"
Queries:
  - name: "Distribution Variance"
    query: bingo_draw_distribution_variance
    color: blue
  - name: "Chi-Square Test"
    query: bingo_rng_chi_square_value
    color: green
  - name: "Entropy Score"
    query: bingo_rng_entropy_score
    color: purple
Y-Axis: "Quality Score"
Target: Fair distribution thresholds
```

---

## 6. Alert Integration

### 6.1 Dashboard Alert Rules

```yaml
# Critical Performance Alerts
Dashboard: Performance
Panels:
  - "Draw Latency P95 > 300ms"
  - "Claim Validation P95 > 150ms"
  - "API Error Rate > 5%"
  - "WebSocket Connections > 900"

# Security Alerts
Dashboard: Security
Panels:
  - "Security Violations > 10/hour"
  - "Authentication Failure Rate > 10%"
  - "High Risk Players > 50"

# Business Alerts
Dashboard: KPI
Panels:
  - "Active Players < 100"
  - "Game Completion Rate < 70%"
  - "System Uptime < 99%"
```

### 6.2 Dashboard Notifications

```yaml
# Notification Channels
Slack:
  webhook: "${SLACK_WEBHOOK_URL}"
  channel: "#bingo-alerts"
  title: "Bingo Platform Alert"
  message: "{{range .Alerts}}{{.Annotations.summary}}{{end}}"

Email:
  to: ["ops@bingo-platform.com", "devops@bingo-platform.com"]
  subject: "Bingo Platform Alert - {{.GroupLabels.alertname}}"
  body: "Alert details and dashboard links"

PagerDuty:
  integration_key: "${PAGERDUTY_KEY}"
  severity: "{{.GroupLabels.severity}}"
  description: "{{.GroupLabels.alertname}}: {{.CommonAnnotations.summary}}"
```

---

## 7. Dashboard Variables & Templating

### 7.1 Global Variables

```yaml
# Environment Selection
Environment:
  type: query
  query: label_values(deployment_environment)
  default: production
  multi: false

# Time Range Quick Selectors
Time Range:
  options: ["5m", "15m", "1h", "6h", "24h", "7d"]
  default: "1h"

# Game Selection (for detailed analysis)
Game ID:
  type: query
  query: label_values(bingo_game_id)
  regex: "/^game_.*/"
  multi: true
  include_all: true

# Venue/Location Filter
Venue:
  type: query
  query: label_values(venue_location)
  multi: true
  include_all: true
  default: "All"
```

### 7.2 Dynamic Panels

```yaml
# Per-Game Performance (Repeated Panel)
Title: "Game Performance - $game_id"
Query: histogram_quantile(0.95, bingo_draw_propagation_duration_ms_bucket{game_id="$game_id"})
Repeat: game_id
Max Per Row: 4

# Per-Endpoint API Performance
Title: "API Endpoint - $endpoint"
Query: histogram_quantile(0.95, api_request_duration_ms_bucket{route="$endpoint"})
Repeat: endpoint
Filter: Top 10 by request volume
```

---

## 8. Implementation Notes

### 8.1 Dashboard Export/Import

```bash
# Export dashboard JSON
grafana-cli dashboards export "Bingo KPI Dashboard" > kpi-dashboard.json

# Import via API
curl -X POST \
  -H "Authorization: Bearer $GRAFANA_API_KEY" \
  -H "Content-Type: application/json" \
  -d @kpi-dashboard.json \
  "$GRAFANA_URL/api/dashboards/db"

# Bulk import for deployment
for dashboard in dashboards/*.json; do
  grafana-cli dashboards import "$dashboard"
done
```

### 8.2 Dashboard Organization

```yaml
# Folder Structure
Bingo Platform/
├── Executive/
│   └── KPI Dashboard
├── Operations/
│   ├── Performance Dashboard
│   ├── Operations Dashboard
│   └── Security Dashboard
└── Analytics/
    └── Game Analytics Dashboard

# Access Control
Executive: View only for executives and managers
Operations: Edit access for DevOps and SRE teams
Analytics: View access for product and analytics teams
```

### 8.3 Performance Optimization

```yaml
# Query Optimization
Cache Duration: 30 seconds for frequent queries
Max Data Points: 1440 (one per minute for 24h view)
Query Timeout: 30 seconds

# Dashboard Refresh
Auto Refresh: Configurable (15s, 30s, 1m, 5m)
Default: 30 seconds for operational dashboards
Browser Caching: Enabled for static panels

# Data Source Optimization
PromQL Optimization: Use recording rules for complex queries
Metric Retention: 7 days detailed, 30 days aggregated
Query Parallelization: Enabled for independent panels
```

---

**Document Status:** Complete and ready for implementation
**Dashboard Count:** 5 primary dashboards with 50+ panels total
**Estimated Setup Time:** 2-3 days for full implementation
**Dependencies:** Prometheus metrics, Grafana 8.0+, Alert Manager integration