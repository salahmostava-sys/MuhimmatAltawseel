import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = 'https://plxpehtkabmfkdlgjyin.supabase.co';
const SUPABASE_KEY = 'sb_publishable_DsREdF2_ZWvhXBERzBU-Bg_8CLIU5pj';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function executeSqlStatements() {
  const migrationPath = join(process.cwd(), '../supabase/migrations/20260404000000_remove_company_id_from_platform_accounts.sql');
  const sql = readFileSync(migrationPath, 'utf-8');
  
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Applying Migration: Remove company_id from Platform Accounts ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && s.length > 10);
  
  console.log(`📝 Found ${statements.length} SQL statements\n`);
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 60).replace(/\n/g, ' ');
    
    console.log(`[${i + 1}/${statements.length}] ${preview}...`);
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt });
      
      if (error) {
        if (error.message.includes('does not exist')) {
          console.log('   ⚠️  Already removed (OK)');
        } else {
          console.log(`   ❌ Error: ${error.message}`);
        }
      } else {
        console.log('   ✅ Success');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`   ⚠️  ${message}`);
    }
  }
  
  console.log('\n' + '='.repeat(64));
  console.log('✅ Migration process completed!');
  console.log('='.repeat(64) + '\n');
  console.log('Next step: npm run gen:types\n');
}

executeSqlStatements().catch(console.error);
