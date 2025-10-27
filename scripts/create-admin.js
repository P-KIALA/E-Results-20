import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const supabaseUrl = 'https://binuiiupqphkbhudlwco.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Password hashing function
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function createAdmin() {
  try {
    console.log('🔍 Checking if users already exist...');
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('id', { count: 'exact' });

    if (checkError) throw checkError;

    if (existingUsers && existingUsers.length > 0) {
      console.log('⚠️  Users already exist. Skipping admin creation.');
      process.exit(0);
    }

    const email = 'paracletkiala15@gmail.com';
    const password = 'Admin@1234';

    console.log('🔐 Hashing password...');
    const passwordHash = hashPassword(password);

    console.log('📝 Creating admin user...');
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        role: 'admin',
      })
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', user.email);
    console.log('🔑 Role:', user.role);
    console.log('\n🎉 You can now login with:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
}

createAdmin();
