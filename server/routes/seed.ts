import { RequestHandler } from 'express';
import { supabase } from '../lib/supabase';
import { hashPassword } from '../lib/auth';

export const createInitialAdmin: RequestHandler = async (req, res) => {
  try {
    // Check if any users exist
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('id', { count: 'exact' });

    if (checkError) throw checkError;

    if (existingUsers && existingUsers.length > 0) {
      return res.status(409).json({
        error: 'Users already exist. Initial admin can only be created once.',
      });
    }

    const { email = 'admin@whatsdeliver.local', password = 'Admin@123' } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Create initial admin user
    const passwordHash = hashPassword(password);

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

    res.status(201).json({
      message: 'Initial admin user created successfully',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      credentials: {
        email,
        password: '(use the password you provided)',
      },
    });
  } catch (error) {
    console.error('Error creating initial admin:', error);
    res.status(500).json({ error: 'Failed to create initial admin' });
  }
};
