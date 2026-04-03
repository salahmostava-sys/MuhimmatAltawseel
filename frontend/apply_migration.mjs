import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = 'https://plxpehtkabmfkdlgjyin.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DsREdF2_ZWvhXBERzBU-Bg_8CLIU5pj';

async function applyMigration() {
  try {
    const migrationPath = join(__dirname, '../supabase/migrations/20260404000000_remove_company_id_from_platform_accounts.sql');
    const sql = readFileSync(migrationPath, 'utf-8');
    
    console.log('🚀 Applying migration: remove_company_id_from_platform_accounts...\n');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`[${i + 1}/${statements.length}] Executing...`);
      
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ query: statement })
        });
        
        if (!response.ok) {
          const error = await response.text();
          console.log(`   ⚠️  Warning: ${error.substring(0, 100)}`);
          errorCount++;
        } else {
          console.log(`   ✅ Success`);
          successCount++;
        }
      } catch (err) {
        console.log(`   ⚠️  Error: ${err.message}`);
        errorCount++;
      }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Completed: ${successCount} successful, ${errorCount} warnings/errors`);
    console.log(`${'='.repeat(60)}\n`);
    
    if (errorCount === 0) {
      console.log('🎉 Migration applied successfully!\n');
      console.log('Next step: Run "npm run gen:types" to update TypeScript types\n');
    } else {
      console.log('⚠️  Some statements had warnings. Please verify in Supabase Dashboard.\n');
    }
    
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

applyMigration();
