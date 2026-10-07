// Valores falsos: os testes não chamam serviços externos.
process.env.OPENAI_API_KEY = 'test-key';
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/postgres';
