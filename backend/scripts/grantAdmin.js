#!/usr/bin/env node
const supabaseAdmin = require('../supabaseAdmin');

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: node grantAdmin.js <userId>');
  process.exit(1);
}

(async () => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ is_admin: true })
      .eq('id', userId);

    if (error) throw error;

    console.log('Success. Updated profile:', data);
    process.exit(0);
  } catch (err) {
    console.error('Error updating profile:', err.message || err);
    process.exit(1);
  }
})();
