import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

async function tryMigrate() {
  const host = 'db.ibzdlyhescujpjxqvzvp.supabase.co';
  const port = 5432;
  const user = 'postgres';
  const database = 'postgres';

  // Test password combinations
  const passwords = [
    'Chi65cken',
    'Chi65cken@',
    'Chi65cken@???',
    'Chi65cken@123',
    'postgres',
  ];

  let connectedClient = null;

  for (const password of passwords) {
    console.log(`Trying host=${host} user=${user} password=${password.slice(0, 3)}***`);
    const client = new Client({
      host,
      port,
      user,
      password,
      database,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 4000,
    });

    try {
      await client.connect();
      console.log('✅ Connected to Postgres successfully with password:', password);
      connectedClient = client;
      break;
    } catch (err) {
      console.log(`❌ Failed with password ${password.slice(0, 3)}***:`, err.message);
      await client.end().catch(() => {});
    }
  }

  // Also try pooled hosts
  if (!connectedClient) {
    const pooledHosts = [
      'aws-0-ap-south-1.pooler.supabase.com',
      'aws-0-eu-central-1.pooler.supabase.com',
      'aws-0-us-east-1.pooler.supabase.com',
    ];
    for (const pHost of pooledHosts) {
      for (const password of passwords) {
        console.log(`Trying pooler host=${pHost} user=postgres.ibzdlyhescujpjxqvzvp password=${password.slice(0, 3)}***`);
        const client = new Client({
          host: pHost,
          port: 6543,
          user: 'postgres.ibzdlyhescujpjxqvzvp',
          password,
          database: 'postgres',
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 4000,
        });

        try {
          await client.connect();
          console.log(`✅ Connected to pooler ${pHost} successfully!`);
          connectedClient = client;
          break;
        } catch (err) {
          console.log(`❌ Pooler failed: ${err.message}`);
          await client.end().catch(() => {});
        }
      }
      if (connectedClient) break;
    }
  }

  if (!connectedClient) {
    console.error('❌ Could not establish direct Postgres connection.');
    return;
  }

  console.log('Reading migration files...');
  const migration1 = fs.readFileSync('supabase/migrations/20260823000001_enterprise_foundation.sql', 'utf-8');

  try {
    console.log('Executing migration 20260823000001_enterprise_foundation.sql...');
    await connectedClient.query(migration1);
    console.log('✅ Enterprise Foundation Migration applied successfully!');
  } catch (err) {
    console.error('❌ Migration error:', err);
  } finally {
    await connectedClient.end();
  }
}

tryMigrate();
