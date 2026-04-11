INSERT INTO user_permissions (user_id, permission)
SELECT id, 'view_finance'
FROM auth.users
ON CONFLICT DO NOTHING;
