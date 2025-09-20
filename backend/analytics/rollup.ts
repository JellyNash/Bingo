import { PrismaClient } from '@prisma/client';
import { parseArgs } from 'node:util';

const prisma = new PrismaClient();

interface RollupMetric {
  bucket: Date;
  metric: string;
  value: bigint;
  dim: Record<string, any>;
}

/**
 * Truncate timestamp to hour boundary
 */
function bucketize(ts: Date): Date {
  const bucket = new Date(ts);
  bucket.setMinutes(0, 0, 0);
  return bucket;
}

/**
 * Main rollup function
 */
async function runRollup(sinceHours: number = 1): Promise<void> {
  const sinceDate = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
  
  console.log(`[Rollup] Starting rollup since ${sinceDate.toISOString()}`);

  try {
    // Query raw events and aggregate metrics
    const rows = await prisma.$queryRaw<RollupMetric[]>`
      WITH raw AS (
        SELECT
          date_trunc('hour', ts) AS bucket,
          name,
          app,
          env,
          (props->>'valid')::boolean AS valid,
          (props->>'seq')::int AS seq,
          (props->>'strikes')::int AS strikes,
          1 AS cnt
        FROM "analytics_events_raw"
        WHERE ts >= ${sinceDate}
      ),
      metrics AS (
        -- Game metrics
        SELECT bucket, 'games.created' AS metric, 
               SUM(cnt) AS value, 
               jsonb_build_object('app', app, 'env', env) AS dim
        FROM raw WHERE name = 'game.created'
        GROUP BY bucket, app, env
        
        UNION ALL
        
        SELECT bucket, 'games.opened' AS metric,
               SUM(cnt) AS value,
               jsonb_build_object('app', app, 'env', env) AS dim
        FROM raw WHERE name = 'game.opened'
        GROUP BY bucket, app, env
        
        UNION ALL
        
        -- Draw metrics
        SELECT bucket, 'draws.total' AS metric,
               SUM(cnt) AS value,
               jsonb_build_object('app', app, 'env', env) AS dim
        FROM raw WHERE name = 'draw.next'
        GROUP BY bucket, app, env
        
        UNION ALL
        
        SELECT bucket, 'draws.max_seq' AS metric,
               MAX(seq) AS value,
               jsonb_build_object('env', env) AS dim
        FROM raw WHERE name = 'draw.next' AND seq IS NOT NULL
        GROUP BY bucket, env
        
        UNION ALL
        
        -- Card mark metrics
        SELECT bucket, 'marks.total' AS metric,
               SUM(cnt) AS value,
               jsonb_build_object('app', app, 'env', env) AS dim
        FROM raw WHERE name = 'card.mark'
        GROUP BY bucket, app, env
        
        UNION ALL
        
        -- Claim metrics
        SELECT bucket, 'claims.submitted' AS metric,
               SUM(cnt) AS value,
               jsonb_build_object('app', app, 'env', env) AS dim
        FROM raw WHERE name = 'claim.submitted'
        GROUP BY bucket, app, env
        
        UNION ALL
        
        SELECT bucket, 'claims.valid' AS metric,
               SUM(cnt) AS value,
               jsonb_build_object('app', app, 'env', env) AS dim
        FROM raw WHERE name = 'claim.result' AND valid = true
        GROUP BY bucket, app, env
        
        UNION ALL
        
        SELECT bucket, 'claims.invalid' AS metric,
               SUM(cnt) AS value,
               jsonb_build_object('app', app, 'env', env) AS dim
        FROM raw WHERE name = 'claim.result' AND valid = false
        GROUP BY bucket, app, env
        
        UNION ALL
        
        -- Penalty metrics
        SELECT bucket, 'penalties.applied' AS metric,
               SUM(cnt) AS value,
               jsonb_build_object('env', env) AS dim
        FROM raw WHERE name = 'penalty.applied'
        GROUP BY bucket, env
        
        UNION ALL
        
        SELECT bucket, 'penalties.total_strikes' AS metric,
               SUM(strikes) AS value,
               jsonb_build_object('env', env) AS dim
        FROM raw WHERE name = 'penalty.applied' AND strikes IS NOT NULL
        GROUP BY bucket, env
        
        UNION ALL
        
        -- Connection metrics
        SELECT bucket, 'connections.total' AS metric,
               SUM(cnt) AS value,
               jsonb_build_object('app', app, 'env', env) AS dim
        FROM raw WHERE name = 'socket.connect'
        GROUP BY bucket, app, env
        
        UNION ALL
        
        SELECT bucket, 'disconnections.total' AS metric,
               SUM(cnt) AS value,
               jsonb_build_object('app', app, 'env', env) AS dim
        FROM raw WHERE name = 'socket.disconnect'
        GROUP BY bucket, app, env
        
        UNION ALL
        
        SELECT bucket, 'reconnections.total' AS metric,
               SUM(cnt) AS value,
               jsonb_build_object('app', app, 'env', env) AS dim
        FROM raw WHERE name = 'socket.reconnect'
        GROUP BY bucket, app, env
        
        UNION ALL
        
        -- API metrics (sampled)
        SELECT bucket, 'api.requests' AS metric,
               SUM(cnt) AS value,
               jsonb_build_object('env', env) AS dim
        FROM raw WHERE name = 'api.request'
        GROUP BY bucket, env
      )
      SELECT bucket, metric, value::bigint, dim FROM metrics
      ORDER BY bucket, metric
    `;

    console.log(`[Rollup] Processing ${rows.length} metrics`);

    // Upsert metrics into rollup table
    for (const row of rows) {
      try {
        await prisma.analyticsRollupHourly.upsert({
          where: {
            bucket_metric_dim: {
              bucket: row.bucket,
              metric: row.metric,
              dim: row.dim
            }
          },
          update: {
            value: row.value
          },
          create: {
            bucket: row.bucket,
            metric: row.metric,
            value: row.value,
            dim: row.dim
          }
        });
      } catch (err) {
        // Handle unique constraint violations gracefully
        console.warn(`[Rollup] Failed to upsert metric ${row.metric}:`, err);
      }
    }

    console.log('[Rollup] Aggregation complete');

    // Clean up old data based on retention policy
    await cleanupOldData();
    
  } catch (err) {
    console.error('[Rollup] Error during aggregation:', err);
    throw err;
  }
}

/**
 * Clean up old data based on retention policy
 */
async function cleanupOldData(): Promise<void> {
  const rawRetentionDays = Number(process.env.ANALYTICS_RETENTION_DAYS_RAW || '14');
  const rollupRetentionDays = Number(process.env.ANALYTICS_RETENTION_DAYS_ROLLUP || '90');

  const rawCutoff = new Date(Date.now() - rawRetentionDays * 24 * 60 * 60 * 1000);
  const rollupCutoff = new Date(Date.now() - rollupRetentionDays * 24 * 60 * 60 * 1000);

  try {
    // Delete old raw events
    const deletedRaw = await prisma.analyticsEventRaw.deleteMany({
      where: {
        ts: {
          lt: rawCutoff
        }
      }
    });

    if (deletedRaw.count > 0) {
      console.log(`[Rollup] Deleted ${deletedRaw.count} raw events older than ${rawRetentionDays} days`);
    }

    // Delete old rollups
    const deletedRollups = await prisma.analyticsRollupHourly.deleteMany({
      where: {
        bucket: {
          lt: rollupCutoff
        }
      }
    });

    if (deletedRollups.count > 0) {
      console.log(`[Rollup] Deleted ${deletedRollups.count} rollups older than ${rollupRetentionDays} days`);
    }
  } catch (err) {
    console.error('[Rollup] Error during cleanup:', err);
    // Don't throw - cleanup is not critical
  }
}

/**
 * Generate summary statistics
 */
async function generateSummary(): Promise<void> {
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const summary = await prisma.$queryRaw<any[]>`
    SELECT
      metric,
      SUM(value) AS total,
      AVG(value) AS avg,
      MAX(value) AS max,
      MIN(value) AS min,
      COUNT(*) AS data_points
    FROM "analytics_rollups_hourly"
    WHERE bucket >= ${last24h}
    GROUP BY metric
    ORDER BY metric
  `;

  console.log('\n=== Analytics Summary (Last 24h) ===');
  for (const row of summary) {
    console.log(`${row.metric}:`);
    console.log(`  Total: ${row.total}`);
    console.log(`  Avg: ${Math.round(row.avg)}`);
    console.log(`  Max: ${row.max}`);
    console.log(`  Min: ${row.min}`);
    console.log(`  Data Points: ${row.data_points}`);
  }
}

// Main execution
if (require.main === module) {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      since: {
        type: 'string',
        short: 's',
        default: '1'
      },
      summary: {
        type: 'boolean',
        default: false
      }
    }
  });

  const sinceHours = parseInt(values.since as string, 10) || 1;

  console.log(`[Rollup] Starting analytics rollup for the last ${sinceHours} hour(s)`);

  runRollup(sinceHours)
    .then(async () => {
      if (values.summary) {
        await generateSummary();
      }
      console.log('[Rollup] Complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Rollup] Failed:', err);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}

export { runRollup, cleanupOldData, generateSummary };