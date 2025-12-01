-- Script para criar usuário admin inicial
-- Execute isso no Supabase SQL Editor ou usando psql

-- 1. Criar primeiro admin (substitua o email)
INSERT INTO users (email, role, full_name)
VALUES ('admin@marisa.care', 'admin', 'Administrador')
ON CONFLICT (email) 
DO UPDATE SET role = 'admin';

-- 2. Verificar usuários
SELECT id, email, role, created_at 
FROM users 
ORDER BY created_at DESC;

-- 3. Para promover um usuário existente a admin
-- UPDATE users SET role = 'admin' WHERE email = 'seu-email@marisa.care';

-- 4. Para criar múltiplos admins
-- INSERT INTO users (email, role, full_name) VALUES
--   ('admin1@marisa.care', 'admin', 'Admin 1'),
--   ('admin2@marisa.care', 'admin', 'Admin 2')
-- ON CONFLICT (email) DO NOTHING;
