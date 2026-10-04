import { pool } from './src/database/db.js';

async function fixDb() {
  try {
    const resSec = await pool.query("SELECT id FROM securities WHERE symbol = 'RELIANCE'");
    if (resSec.rowCount === 0) {
      console.log("No RELIANCE security found.");
      return;
    }
    const secId = resSec.rows[0].id;
    
    // Assign transactions to Reliance
    const res = await pool.query("UPDATE investment_transactions SET security_id = $1 WHERE security_id IS NULL AND transaction_type IN ('BUY', 'SELL', 'SIP', 'DIVIDEND')", [secId]);
    
    console.log(`Updated ${res.rowCount} transactions to use RELIANCE!`);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

fixDb();
