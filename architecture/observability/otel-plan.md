# OpenTelemetry Implementation Plan

**Version:** 1.0
**Author:** Agent C — System Architect
**Date:** 2025-09-19

## Overview

This document defines the OpenTelemetry instrumentation strategy for the Bingo Platform, focusing on critical performance monitoring, distributed tracing, and operational observability to meet the <200ms draw-to-UI latency requirements.

**Performance Targets:**
- Draw → UI propagation: <200ms average, <300ms P95
- Claim validation: <100ms server-side processing
- Player join: <500ms from PIN to game entry
- Reconnection: <3 seconds for full state sync

---

## 1. Key Spans & Instrumentation

### 1.1 Critical User Journeys

#### Player Join Flow

**Root Span:** `bingo.player.join`
```typescript
interface PlayerJoinSpan {
  operationName: 'bingo.player.join';
  tags: {
    'bingo.game.id': string;
    'bingo.game.pin': string;
    'bingo.player.nickname': string;
    'bingo.game.status': string;
    'bingo.player.count': number;
  };
  duration: number;  // Target: <500ms
}
```

**Child Spans:**
- `bingo.game.lookup` (by PIN)
- `bingo.player.validate` (nickname uniqueness)
- `bingo.card.generate` (HMAC-signed card)
- `bingo.jwt.create` (session token)
- `bingo.session.establish` (WebSocket)
- `bingo.state.sync` (initial game state)

#### Number Draw & Broadcast

**Root Span:** `bingo.draw.execute`
```typescript
interface DrawExecuteSpan {
  operationName: 'bingo.draw.execute';
  tags: {
    'bingo.game.id': string;
    'bingo.draw.sequence': number;
    'bingo.draw.letter': string;
    'bingo.draw.number': number;
    'bingo.draw.mode': 'manual' | 'auto';
    'bingo.player.count': number;
  };
  duration: number;  // Target: <200ms total
}
```

**Child Spans:**
- `bingo.rng.generate` (cryptographic number generation)
- `bingo.draw.persist` (database write)
- `bingo.broadcast.prepare` (event serialization)
- `bingo.broadcast.fanout` (Redis pub/sub)
- `bingo.websocket.send` (per-connection delivery)

#### Claim Validation Flow

**Root Span:** `bingo.claim.validate`
```typescript
interface ClaimValidateSpan {
  operationName: 'bingo.claim.validate';
  tags: {
    'bingo.game.id': string;
    'bingo.player.id': string;
    'bingo.claim.pattern': string;
    'bingo.claim.timestamp': string;
    'bingo.claim.result': 'accepted' | 'denied' | 'superseded';
    'bingo.claim.simultaneous': boolean;
  };
  duration: number;  // Target: <100ms
}
```

**Child Spans:**
- `bingo.card.verify` (HMAC signature check)
- `bingo.pattern.check` (pattern validation)
- `bingo.marks.validate` (mark verification)
- `bingo.concurrency.resolve` (simultaneous claim handling)
- `bingo.result.broadcast` (claim result fanout)

### 1.2 Infrastructure Operations

#### Database Operations

**Spans:**
- `bingo.db.game.read`
- `bingo.db.game.write`
- `bingo.db.player.read`
- `bingo.db.player.write`
- `bingo.db.draw.write`
- `bingo.db.claim.write`
- `bingo.db.audit.write`

**Standard Tags:**
```typescript
interface DatabaseSpanTags {
  'db.system': 'postgresql';
  'db.name': string;
  'db.operation': 'select' | 'insert' | 'update' | 'delete';
  'db.table': string;
  'db.rows_affected'?: number;
  'db.statement'?: string;  // Sanitized query
}
```

#### Cache Operations

**Spans:**
- `bingo.cache.get`
- `bingo.cache.set`
- `bingo.cache.delete`
- `bingo.pubsub.publish`
- `bingo.pubsub.subscribe`

**Standard Tags:**
```typescript
interface CacheSpanTags {
  'cache.system': 'redis';
  'cache.operation': 'get' | 'set' | 'del' | 'pub' | 'sub';
  'cache.key': string;
  'cache.hit': boolean;
  'cache.size'?: number;
}
```

### 1.3 Business Logic Spans

#### Game Orchestration

**Spans:**
- `bingo.orchestrator.create_game`
- `bingo.orchestrator.start_game`
- `bingo.orchestrator.draw_number`
- `bingo.orchestrator.validate_claim`
- `bingo.orchestrator.apply_penalty`

#### Security Operations

**Spans:**
- `bingo.auth.validate_jwt`
- `bingo.rate_limit.check`
- `bingo.hmac.verify`
- `bingo.audit.log`
- `bingo.security.analyze`

---

## 2. Trace Context Propagation

### 2.1 HTTP Request Tracing

**Middleware Implementation:**

```typescript
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { Request, Response, NextFunction } from 'express';

interface TracingMiddlewareConfig {
  serviceName: string;
  ignoreRoutes: string[];
  captureRequestBody: boolean;
  captureResponseBody: boolean;
}

function createTracingMiddleware(config: TracingMiddlewareConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const tracer = trace.getTracer(config.serviceName);

    const span = tracer.startSpan(`${req.method} ${req.route?.path || req.path}`, {
      kind: SpanKind.SERVER,
      attributes: {
        'http.method': req.method,
        'http.url': req.url,
        'http.scheme': req.protocol,
        'http.host': req.get('host'),
        'http.user_agent': req.get('user-agent'),
        'bingo.request.id': req.headers['x-request-id'],
        'bingo.player.id': req.user?.playerId,
        'bingo.game.id': req.params.gameId
      }
    });

    // Propagate trace context
    const activeContext = trace.setSpan(context.active(), span);

    context.with(activeContext, () => {
      // Capture request body for critical operations
      if (config.captureRequestBody && shouldCaptureBody(req)) {
        span.setAttributes({
          'http.request.body': JSON.stringify(req.body)
        });
      }

      // Response handling
      res.on('finish', () => {
        span.setAttributes({
          'http.status_code': res.statusCode,
          'http.response.size': res.get('content-length')
        });

        if (res.statusCode >= 400) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: `HTTP ${res.statusCode}`
          });
        }

        span.end();
      });

      next();
    });
  };
}
```

### 2.2 WebSocket Connection Tracing

**Socket.IO Instrumentation:**

```typescript
import { trace, context } from '@opentelemetry/api';
import { Socket } from 'socket.io';

function instrumentSocketIO(io: SocketIOServer) {
  const tracer = trace.getTracer('bingo-websocket');

  io.use((socket: Socket, next) => {
    // Create connection span
    const connectionSpan = tracer.startSpan('websocket.connection', {
      attributes: {
        'ws.namespace': socket.nsp.name,
        'ws.socket.id': socket.id,
        'bingo.player.id': socket.handshake.auth.playerId,
        'bingo.game.id': socket.handshake.auth.gameId,
        'ws.client.ip': socket.handshake.address
      }
    });

    // Store span in socket context
    socket.data.connectionSpan = connectionSpan;
    socket.data.traceContext = trace.setSpan(context.active(), connectionSpan);

    next();
  });

  // Instrument event handlers
  io.on('connection', (socket: Socket) => {
    socket.onAny((eventName: string, ...args: any[]) => {
      const eventSpan = tracer.startSpan(`websocket.event.${eventName}`, {
        parent: socket.data.connectionSpan,
        attributes: {
          'ws.event.name': eventName,
          'ws.event.args_count': args.length,
          'bingo.player.id': socket.data.playerId
        }
      });

      context.with(trace.setSpan(context.active(), eventSpan), () => {
        // Event will be processed in this context
        eventSpan.end();
      });
    });

    socket.on('disconnect', (reason: string) => {
      socket.data.connectionSpan.setAttributes({
        'ws.disconnect.reason': reason
      });
      socket.data.connectionSpan.end();
    });
  });
}
```

### 2.3 Inter-Service Context Propagation

**Redis Pub/Sub Tracing:**

```typescript
import { trace, context, propagation } from '@opentelemetry/api';

class TracedRedisClient {
  async publish(channel: string, message: any): Promise<void> {
    const span = trace.getActiveSpan();
    const traceContext = {};

    // Inject trace context into message
    propagation.inject(context.active(), traceContext);

    const wrappedMessage = {
      ...message,
      _trace: traceContext,
      _timestamp: Date.now()
    };

    const publishSpan = trace.getTracer('bingo-redis').startSpan('redis.publish', {
      parent: span,
      attributes: {
        'redis.channel': channel,
        'redis.message.size': JSON.stringify(wrappedMessage).length
      }
    });

    try {
      await this.redisClient.publish(channel, JSON.stringify(wrappedMessage));
      publishSpan.end();
    } catch (error) {
      publishSpan.recordException(error);
      publishSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      publishSpan.end();
      throw error;
    }
  }

  onMessage(channel: string, handler: (message: any) => void): void {
    this.redisClient.subscribe(channel);

    this.redisClient.on('message', (receivedChannel: string, data: string) => {
      if (receivedChannel !== channel) return;

      const message = JSON.parse(data);
      const traceContext = message._trace || {};

      // Extract and activate trace context
      const parentContext = propagation.extract(context.active(), traceContext);

      const messageSpan = trace.getTracer('bingo-redis').startSpan('redis.message.handle', {
        parent: trace.getSpan(parentContext),
        attributes: {
          'redis.channel': channel,
          'redis.message.latency': Date.now() - message._timestamp
        }
      });

      context.with(trace.setSpan(parentContext, messageSpan), () => {
        try {
          handler(message);
          messageSpan.end();
        } catch (error) {
          messageSpan.recordException(error);
          messageSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
          messageSpan.end();
        }
      });
    });
  }
}
```

---

## 3. Sampling Strategy

### 3.1 Adaptive Sampling Configuration

**Sampling Rules:**

```typescript
interface SamplingRule {
  serviceName: string;
  operationName: string;
  samplingRate: number;
  maxTracesPerSecond?: number;
  conditions?: {
    attributes?: Record<string, any>;
    duration?: { min?: number; max?: number };
    status?: 'ok' | 'error';
  };
}

const SAMPLING_RULES: SamplingRule[] = [
  // Critical user journeys - always sample
  {
    serviceName: 'bingo-api',
    operationName: 'bingo.player.join',
    samplingRate: 1.0
  },
  {
    serviceName: 'bingo-api',
    operationName: 'bingo.draw.execute',
    samplingRate: 1.0
  },
  {
    serviceName: 'bingo-api',
    operationName: 'bingo.claim.validate',
    samplingRate: 1.0
  },

  // High-frequency operations - adaptive sampling
  {
    serviceName: 'bingo-websocket',
    operationName: 'websocket.event.*',
    samplingRate: 0.1,
    maxTracesPerSecond: 100
  },
  {
    serviceName: 'bingo-api',
    operationName: 'bingo.player.mark',
    samplingRate: 0.05,
    maxTracesPerSecond: 50
  },

  // Error traces - always sample
  {
    serviceName: '*',
    operationName: '*',
    samplingRate: 1.0,
    conditions: {
      status: 'error'
    }
  },

  // Slow operations - always sample
  {
    serviceName: '*',
    operationName: '*',
    samplingRate: 1.0,
    conditions: {
      duration: { min: 1000 } // > 1 second
    }
  },

  // Security events - always sample
  {
    serviceName: 'bingo-api',
    operationName: 'bingo.security.*',
    samplingRate: 1.0
  },
  {
    serviceName: 'bingo-api',
    operationName: 'bingo.rate_limit.*',
    samplingRate: 1.0
  },

  // Default sampling for other operations
  {
    serviceName: '*',
    operationName: '*',
    samplingRate: 0.01 // 1%
  }
];
```

**Dynamic Sampling Adjustment:**

```typescript
class AdaptiveSampler {
  private rules: Map<string, SamplingRule> = new Map();
  private traceCounts: Map<string, number> = new Map();
  private lastReset: number = Date.now();

  constructor(rules: SamplingRule[]) {
    rules.forEach(rule => {
      const key = `${rule.serviceName}:${rule.operationName}`;
      this.rules.set(key, rule);
    });
  }

  shouldSample(serviceName: string, operationName: string, attributes: any): boolean {
    const rule = this.findMatchingRule(serviceName, operationName, attributes);
    if (!rule) return false;

    // Always sample errors and slow operations
    if (attributes['otel.status_code'] === 'ERROR' ||
        attributes['duration'] > 1000) {
      return true;
    }

    // Check rate limits
    if (rule.maxTracesPerSecond) {
      const key = `${serviceName}:${operationName}`;
      const currentCount = this.traceCounts.get(key) || 0;

      // Reset counters every second
      const now = Date.now();
      if (now - this.lastReset > 1000) {
        this.traceCounts.clear();
        this.lastReset = now;
      }

      if (currentCount >= rule.maxTracesPerSecond) {
        return false;
      }

      this.traceCounts.set(key, currentCount + 1);
    }

    // Probability-based sampling
    return Math.random() < rule.samplingRate;
  }

  private findMatchingRule(serviceName: string, operationName: string, attributes: any): SamplingRule | null {
    // Try exact match first
    let key = `${serviceName}:${operationName}`;
    let rule = this.rules.get(key);
    if (rule) return rule;

    // Try wildcard patterns
    for (const [ruleKey, ruleValue] of this.rules.entries()) {
      const [ruleService, ruleOperation] = ruleKey.split(':');

      if ((ruleService === '*' || ruleService === serviceName) &&
          (ruleOperation === '*' || this.matchesPattern(ruleOperation, operationName))) {

        // Check additional conditions
        if (this.matchesConditions(ruleValue.conditions, attributes)) {
          return ruleValue;
        }
      }
    }

    return null;
  }

  private matchesPattern(pattern: string, operationName: string): boolean {
    if (pattern.endsWith('*')) {
      return operationName.startsWith(pattern.slice(0, -1));
    }
    return pattern === operationName;
  }

  private matchesConditions(conditions: any, attributes: any): boolean {
    if (!conditions) return true;

    if (conditions.attributes) {
      for (const [key, value] of Object.entries(conditions.attributes)) {
        if (attributes[key] !== value) return false;
      }
    }

    if (conditions.duration) {
      const duration = attributes['duration'] || 0;
      if (conditions.duration.min && duration < conditions.duration.min) return false;
      if (conditions.duration.max && duration > conditions.duration.max) return false;
    }

    if (conditions.status && attributes['otel.status_code'] !== conditions.status.toUpperCase()) {
      return false;
    }

    return true;
  }
}
```

### 3.2 Environment-Specific Sampling

**Configuration by Environment:**

```typescript
const ENVIRONMENT_SAMPLING = {
  development: {
    defaultSamplingRate: 1.0,  // Sample everything in dev
    maxTracesPerSecond: 1000,
    enableDebugSpans: true
  },

  staging: {
    defaultSamplingRate: 0.5,  // 50% sampling in staging
    maxTracesPerSecond: 500,
    enableDebugSpans: true
  },

  production: {
    defaultSamplingRate: 0.01, // 1% baseline sampling
    maxTracesPerSecond: 100,
    enableDebugSpans: false,
    adaptiveSampling: true
  }
};
```

---

## 4. Performance Monitoring

### 4.1 Critical Performance Spans

**SLA Monitoring Spans:**

```typescript
const SLA_SPANS = {
  'bingo.draw.execute': {
    target: 200,      // 200ms target
    threshold: 300,   // 300ms P95 threshold
    alerting: true
  },
  'bingo.claim.validate': {
    target: 100,
    threshold: 150,
    alerting: true
  },
  'bingo.player.join': {
    target: 500,
    threshold: 750,
    alerting: true
  },
  'bingo.broadcast.fanout': {
    target: 50,       // 50ms fanout target
    threshold: 100,
    alerting: true
  }
};

// Automatic SLA violation detection
function instrumentSLAMonitoring(span: Span) {
  const operationName = span.name;
  const sla = SLA_SPANS[operationName];

  if (!sla) return;

  span.end = ((originalEnd) => {
    return function(this: Span, endTime?: number) {
      const duration = (endTime || Date.now()) - this.startTime;

      // Add SLA attributes
      this.setAttributes({
        'sla.target': sla.target,
        'sla.threshold': sla.threshold,
        'sla.exceeded': duration > sla.threshold,
        'sla.ratio': duration / sla.target
      });

      // Alert on SLA violations
      if (sla.alerting && duration > sla.threshold) {
        this.addEvent('sla.violation', {
          'violation.duration': duration,
          'violation.threshold': sla.threshold,
          'violation.severity': duration > sla.threshold * 2 ? 'critical' : 'warning'
        });
      }

      return originalEnd.call(this, endTime);
    };
  })(span.end);
}
```

### 4.2 Custom Metrics Integration

**Span-to-Metrics Bridge:**

```typescript
import { metrics } from '@opentelemetry/api';

class SpanMetricsBridge {
  private readonly meter = metrics.getMeter('bingo-spans');
  private readonly durationHistogram = this.meter.createHistogram('span_duration_ms', {
    description: 'Span duration in milliseconds'
  });
  private readonly countCounter = this.meter.createCounter('span_count', {
    description: 'Total number of spans'
  });

  onSpanEnd(span: Span) {
    const duration = span.endTime - span.startTime;
    const attributes = {
      operation: span.name,
      service: span.resource.attributes['service.name'],
      status: span.status.code === SpanStatusCode.OK ? 'ok' : 'error',
      game_id: span.attributes['bingo.game.id'],
      player_count: span.attributes['bingo.player.count']
    };

    this.durationHistogram.record(duration, attributes);
    this.countCounter.add(1, attributes);

    // Record SLA compliance
    const sla = SLA_SPANS[span.name];
    if (sla) {
      this.meter.createGauge('sla_compliance_ratio').record(
        duration <= sla.target ? 1 : 0,
        attributes
      );
    }
  }
}
```

---

## 5. Implementation Configuration

### 5.1 OpenTelemetry SDK Setup

**Node.js Configuration:**

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'bingo-platform',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.VERSION || '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    'bingo.component': process.env.COMPONENT_NAME || 'api'
  }),

  traceExporter: new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces'
  }),

  metricReader: new PrometheusExporter({
    port: parseInt(process.env.METRICS_PORT || '9090'),
    endpoint: '/metrics'
  }),

  instrumentations: [
    new HttpInstrumentation({
      ignoreIncomingRequestHook: (req) => {
        return req.url?.includes('/health') || req.url?.includes('/metrics');
      }
    }),
    new ExpressInstrumentation(),
    new RedisInstrumentation(),
    new PrismaInstrumentation()
  ],

  sampler: new AdaptiveSampler(SAMPLING_RULES)
});

sdk.start();
```

### 5.2 WebSocket Instrumentation

**Socket.IO Plugin:**

```typescript
import { Instrumentation } from '@opentelemetry/instrumentation';
import { InstrumentationConfig } from '@opentelemetry/instrumentation';

class SocketIOInstrumentation extends Instrumentation {
  constructor(config: InstrumentationConfig = {}) {
    super('socket.io', '1.0.0', config);
  }

  init() {
    return [
      new InstrumentationNodeModuleDefinition<any>(
        'socket.io',
        ['>=4.0.0'],
        (moduleExports) => {
          return this.wrapSocketIO(moduleExports);
        }
      )
    ];
  }

  private wrapSocketIO(socketIO: any) {
    const instrumentation = this;

    return function wrappedSocketIO(...args: any[]) {
      const io = socketIO.apply(this, args);
      instrumentation.instrumentServer(io);
      return io;
    };
  }

  private instrumentServer(io: any) {
    const tracer = this.tracer;

    // Wrap connection handler
    const originalUse = io.use.bind(io);
    io.use = function(fn: any) {
      return originalUse((socket: any, next: any) => {
        const span = tracer.startSpan('websocket.middleware');
        context.with(trace.setSpan(context.active(), span), () => {
          fn(socket, (err?: any) => {
            if (err) {
              span.recordException(err);
              span.setStatus({ code: SpanStatusCode.ERROR });
            }
            span.end();
            next(err);
          });
        });
      });
    };
  }
}
```

---

## 6. Deployment & Operations

### 6.1 Trace Export Configuration

**Production Export Setup:**

```yaml
# docker-compose.yml
version: '3.8'
services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # Jaeger UI
      - "14268:14268"  # Jaeger collector
    environment:
      - COLLECTOR_OTLP_ENABLED=true
      - SPAN_STORAGE_TYPE=elasticsearch
      - ES_SERVER_URLS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.17.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
```

### 6.2 Trace Retention & Storage

**Retention Policies:**

```typescript
const TRACE_RETENTION = {
  // Critical business traces
  'bingo.player.join': '30d',
  'bingo.claim.validate': '30d',
  'bingo.draw.execute': '30d',

  // Security traces
  'bingo.security.*': '90d',
  'bingo.rate_limit.*': '30d',

  // Performance traces
  'bingo.broadcast.*': '7d',
  'websocket.*': '7d',

  // Error traces
  '*[status=error]': '30d',

  // Default retention
  '*': '7d'
};
```

---

**Document Status:** Complete and ready for implementation
**Dependencies:** Prometheus metrics specification, Grafana dashboards
**Integration Points:** REST API, WebSocket server, Database layer, Redis cache
**Performance Impact:** <1% overhead with optimized sampling