-- Replace legacy placeholder franchise label with siège.

UPDATE public.portal_users
SET franchise = '(siège)', updated_at = now()
WHERE franchise = 'Franchise A';
