import asyncio
import main
import latex_studio

async def test_db():
    print("Testing DB connection...")
    pool = await main.get_db()
    if pool:
        latex_studio.set_db_pool(pool)
        async with pool.acquire() as conn:
            await latex_studio.init_latex_tables(conn)
            print("[OK] latex tables initialized successfully.")
            tables = await conn.fetch("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'latex_%'")
            print("Found tables:", [t["table_name"] for t in tables])
            
            # Check projects table count
            p_count = await conn.fetchval("SELECT COUNT(*) FROM latex_projects")
            print(f"Total projects in DB: {p_count}")
            f_count = await conn.fetchval("SELECT COUNT(*) FROM latex_project_files")
            print(f"Total files in DB: {f_count}")
    else:
        print("[ERROR] Database pool could not be initialized. Check SUPABASE_URL / DATABASE_URL in .env")

if __name__ == "__main__":
    asyncio.run(test_db())

