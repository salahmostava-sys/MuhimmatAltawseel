import { supabase } from './services/supabase/client';

async function checkTables() {
  const { error } = await supabase.from('app_monthly_activations').select('*').limit(1);
  if (error) {
    process.stderr.write(`Table app_monthly_activations error: ${error.message}\n`);
  } else {
    process.stdout.write('Table app_monthly_activations exists.\n');
  }

  const { error: targetError } = await supabase.from('app_targets').select('*').limit(1);
  if (targetError) {
    process.stderr.write(`Table app_targets error: ${targetError.message}\n`);
  } else {
    process.stdout.write('Table app_targets exists.\n');
  }
}

checkTables();
