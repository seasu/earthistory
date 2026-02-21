
import { getPool } from "../db.js";

type TopicType = "category" | "page" | "topic";

export class TopicService {
    // Save a topic and its children to the database
    static async saveTopicHierarchy(
        parentName: string,
        childrenNames: string[],
        lang: string = "en"
    ): Promise<void> {
        const pool = getPool();
        if (!pool) return; // Dev mode or no DB

        try {
            // 1. Upsert Parent Topic
            // We use a CTE or two queries. Simple way: insert parent, get ID.
            let parentId: string | null = null;

            const parentRes = await pool.query(`
        INSERT INTO topics (name, language, type)
        VALUES ($1, $2, 'topic')
        ON CONFLICT (name, language) DO UPDATE SET updated_at = NOW()
        RETURNING id
      `, [parentName, lang]);

            if (parentRes.rows.length > 0) {
                parentId = parentRes.rows[0].id;
            } else {
                // If ON CONFLICT DO UPDATE didn't return (older pg versions sometimes), fetch it
                const fetchRes = await pool.query(`SELECT id FROM topics WHERE name = $1 AND language = $2`, [parentName, lang]);
                if (fetchRes.rows.length > 0) parentId = fetchRes.rows[0].id;
            }

            if (!parentId) return;

            // 2. Insert Children with Parent Reference (parameterized to prevent SQL injection)
            for (const childName of childrenNames) {
                await pool.query(`
          INSERT INTO topics (name, language, type, parent_id)
          VALUES ($1, $2, 'topic', $3)
          ON CONFLICT (name, language) DO NOTHING
        `, [childName, lang, parentId]);
            }

            console.log(`Saved topic hierarchy: ${parentName} -> ${childrenNames.length} children`);

        } catch (error) {
            console.error("Error saving topic hierarchy:", error);
            // Don't throw, just log. Non-critical.
        }
    }

    // Find topics in DB (for future autocomplete or cache check)
    static async findTopic(name: string, lang: string): Promise<any | null> {
        const pool = getPool();
        if (!pool) return null;

        try {
            const res = await pool.query(`SELECT * FROM topics WHERE name = $1 AND language = $2`, [name, lang]);
            return res.rows[0] || null;
        } catch (error) {
            console.error("Error finding topic:", error);
            return null;
        }
    }

    // Get children suggestions from DB
    static async getChildren(parentId: number): Promise<string[]> {
        const pool = getPool();
        if (!pool) return [];

        try {
            const res = await pool.query(`SELECT name FROM topics WHERE parent_id = $1 LIMIT 10`, [parentId]);
            return res.rows.map(row => row.name);
        } catch (error) {
            return [];
        }
    }
}
