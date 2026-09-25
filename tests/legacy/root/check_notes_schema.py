import asyncio, asyncpg

async def check():
    pool = await asyncpg.create_pool('postgresql://postgres.dhhxeyomimjxdhwbubag:Muktadir2530%40%23@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?ssl=require')
    async with pool.acquire() as conn:
        cols = await conn.fetch("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'global_vault_notes'
            ORDER BY ordinal_position
        """)
        print("Columns in global_vault_notes:")
        for c in cols:
            print(f"  {c['column_name']}: {c['data_type']}")
        rows = await conn.fetch("SELECT id, source, title, user_id, raw_text, created_at FROM global_vault_notes ORDER BY id DESC LIMIT 5")
        print("\nLatest rows:")
        for r in rows:
            print(dict(r))
    await pool.close()

if __name__ == '__main__':
    asyncio.run(check())

