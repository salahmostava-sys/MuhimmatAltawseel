import { supabase } from './services/supabase/client';

async function checkTables() {
  const { error } = await supabase.from('app_monthly_activations').select('*').limit(1);
  if (error) {
    console.error('Table app_monthly_activations error:', error.message);
  } else {
    console.log('Table app_monthly_activations exists.');
  }

  const { error: targetError } = await supabase.from('app_targets').select('*').limit(1);
  if (targetError) {
    console.error('Table app_targets error:', targetError.message);
  } else {
    console.log('Table app_targets exists.');
  }
}

checkTables();
