import process from 'node:process';                                                                                             
    import { drizzle } from 'drizzle-orm/node-postgres';                                                                            
    import { migrate } from 'drizzle-orm/node-postgres/migrator';                                                                   
    import pg from 'pg';                                                                                                            
                                                                                                                                                                                                        
    const pool = new pg.Pool({                                                                                                      
      connectionString:                                                                                                             
        process.env.DATABASE_URL ??                                                                                                 
        'postgresql://postgres:password123@localhost:5432/bookmarked_dev',                                                          
    });                                                                                                                             
                                                                                                                                                                                                                                   
    const db = drizzle(pool);                                                                                                       
                                                                                                                                    
    async function runMigrations(): Promise<void> {                                                                                 
      console.log('🔄 Running pending database migrations...');                                                                     
                                                                                                                                    
      // 3. Apply all SQL files in the migrations folder                                                                            
      await migrate(db, { migrationsFolder: './database/migrations' });                                                                      
                                                                                                                                    
      console.log('✅ Migrations applied successfully!');                                                                           
                                                                                                                                    
      // 4. Always close the pool when finished so the process can exit                                                             
      await pool.end();                                                                                                             
    }                                                                                                                               
                                                                                                                                    
    runMigrations().catch(async (error) => {                                                                                        
      console.error('❌ Migration failed:', error);                                                                                 
      await pool.end();                                                                                                             
      process.exit(1);
    });