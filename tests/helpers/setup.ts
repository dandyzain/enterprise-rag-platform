// Unit / route tests run against the in-memory store with no external AI providers.
// (The Postgres integration test opts in via TEST_DATABASE_URL.)
delete process.env.DATABASE_URL;
delete process.env.OPENAI_API_KEY;
delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.KV_REST_API_URL;
process.env.SEED_DEMO_KB = "false";
process.env.AUTH_SECRET = "test-secret-test-secret-test-secret-0123456789";
