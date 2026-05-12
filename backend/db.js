/**
 * db.js — Supabase-Compatible PostgreSQL Adapter
 * 
 * ให้ syntax เหมือน Supabase client เดิม:
 *   db.from('table').select('*').eq('col', val).single()
 *   db.from('table').insert([{...}]).select('id')
 *   db.from('table').update({...}).eq('id', val)
 * 
 * แต่ข้างในใช้ pg (node-postgres) ต่อตรงกับ Railway PostgreSQL
 */

const { Pool } = require('pg');

let pool;

function initDB() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('❌ [DB] Missing DATABASE_URL');
        return null;
    }
    pool = new Pool({
        connectionString,
        ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
    });
    pool.on('error', (err) => console.error('❌ [DB] Pool error:', err.message));
    console.log('✅ [DB] PostgreSQL pool initialized');
    return pool;
}

function getPool() {
    if (!pool) initDB();
    return pool;
}

// ══════════════════════════════════════════
// Query Builder (Supabase-compatible chain API)
// ══════════════════════════════════════════
class QueryBuilder {
    constructor(table) {
        this._table = table;
        this._operation = null; // 'select', 'insert', 'update', 'delete', 'upsert'
        this._selectCols = '*';
        this._insertData = null;
        this._updateData = null;
        this._upsertData = null;
        this._upsertConflict = null;
        this._wheres = [];
        this._orderBy = [];
        this._limitVal = null;
        this._offsetVal = null;
        this._isSingle = false;
        this._isHead = false;
        this._isCount = false;
        this._returnSelect = null;
        this._gteFilters = [];
        this._lteFilters = [];
        this._inFilters = [];
        this._neqFilters = [];
        this._likeFilters = [];
        this._ilikeFilters = [];
    }

    // ── SELECT ──
    select(cols, opts) {
        this._operation = this._operation || 'select';
        if (opts && opts.count === 'exact') this._isCount = true;
        if (opts && opts.head) this._isHead = true;
        if (this._operation === 'insert' || this._operation === 'update' || this._operation === 'upsert') {
            this._returnSelect = cols || '*';
        } else {
            this._selectCols = cols || '*';
        }
        return this;
    }

    // ── INSERT ──
    insert(rows) {
        this._operation = 'insert';
        this._insertData = Array.isArray(rows) ? rows : [rows];
        return this;
    }

    // ── UPDATE ──
    update(data) {
        this._operation = 'update';
        this._updateData = data;
        return this;
    }

    // ── DELETE ──
    delete() {
        this._operation = 'delete';
        return this;
    }

    // ── UPSERT ──
    upsert(rows, opts) {
        this._operation = 'upsert';
        this._upsertData = Array.isArray(rows) ? rows : [rows];
        this._upsertConflict = opts?.onConflict || null;
        return this;
    }

    // ── FILTERS ──
    eq(col, val) { this._wheres.push({ col, op: '=', val }); return this; }
    neq(col, val) { this._neqFilters.push({ col, val }); return this; }
    gt(col, val) { this._wheres.push({ col, op: '>', val }); return this; }
    gte(col, val) { this._gteFilters.push({ col, val }); return this; }
    lt(col, val) { this._wheres.push({ col, op: '<', val }); return this; }
    lte(col, val) { this._lteFilters.push({ col, val }); return this; }
    like(col, val) { this._likeFilters.push({ col, val }); return this; }
    ilike(col, val) { this._ilikeFilters.push({ col, val }); return this; }
    in(col, vals) { this._inFilters.push({ col, vals }); return this; }
    is(col, val) { this._wheres.push({ col, op: 'IS', val: val === null ? 'NULL' : val }); return this; }

    // ── MODIFIERS ──
    single() { this._isSingle = true; this._limitVal = 1; return this; }
    maybeSingle() { this._isSingle = true; this._limitVal = 1; return this; }
    limit(n) { this._limitVal = n; return this; }
    range(from, to) { this._offsetVal = from; this._limitVal = to - from + 1; return this; }
    order(col, opts) { this._orderBy.push({ col, asc: opts?.ascending !== false }); return this; }

    // ── BUILD WHERE CLAUSE ──
    _buildWhere(params) {
        const conditions = [];
        for (const w of this._wheres) {
            if (w.op === 'IS') {
                conditions.push(`"${w.col}" IS ${w.val}`);
            } else {
                params.push(w.val);
                conditions.push(`"${w.col}" ${w.op} $${params.length}`);
            }
        }
        for (const f of this._gteFilters) {
            params.push(f.val);
            conditions.push(`"${f.col}" >= $${params.length}`);
        }
        for (const f of this._lteFilters) {
            params.push(f.val);
            conditions.push(`"${f.col}" <= $${params.length}`);
        }
        for (const f of this._neqFilters) {
            params.push(f.val);
            conditions.push(`"${f.col}" != $${params.length}`);
        }
        for (const f of this._likeFilters) {
            params.push(f.val);
            conditions.push(`"${f.col}" LIKE $${params.length}`);
        }
        for (const f of this._ilikeFilters) {
            params.push(f.val);
            conditions.push(`"${f.col}" ILIKE $${params.length}`);
        }
        for (const f of this._inFilters) {
            params.push(f.vals);
            conditions.push(`"${f.col}" = ANY($${params.length})`);
        }
        return conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
    }

    // ── EXECUTE ──
    async then(resolve, reject) {
        try {
            const result = await this._execute();
            resolve(result);
        } catch (e) {
            if (reject) reject(e);
            else resolve({ data: null, error: e, count: null });
        }
    }

    async _execute() {
        const p = getPool();
        if (!p) return { data: null, error: { message: 'Database not connected' }, count: null };
        const params = [];

        try {
            // ── SELECT ──
            if (this._operation === 'select' || !this._operation) {
                if (this._isCount && this._isHead) {
                    let sql = `SELECT COUNT(*) as count FROM "${this._table}"`;
                    sql += this._buildWhere(params);
                    const r = await p.query(sql, params);
                    return { data: null, error: null, count: parseInt(r.rows[0].count) };
                }

                let sql = `SELECT ${this._selectCols === '*' ? '*' : this._selectCols.split(',').map(c => `"${c.trim()}"`).join(',')} FROM "${this._table}"`;
                sql += this._buildWhere(params);
                for (const o of this._orderBy) {
                    sql += ` ORDER BY "${o.col}" ${o.asc ? 'ASC' : 'DESC'}`;
                }
                if (this._limitVal !== null) sql += ` LIMIT ${this._limitVal}`;
                if (this._offsetVal !== null) sql += ` OFFSET ${this._offsetVal}`;

                const r = await p.query(sql, params);
                if (this._isSingle) {
                    return { data: r.rows[0] || null, error: r.rows.length === 0 ? { code: 'PGRST116', message: 'No rows found' } : null };
                }
                return { data: r.rows, error: null, count: r.rowCount };
            }

            // ── INSERT ──
            if (this._operation === 'insert') {
                const rows = this._insertData;
                if (!rows || rows.length === 0) return { data: null, error: { message: 'No data to insert' } };

                const cols = Object.keys(rows[0]);
                const allValues = [];
                const valueSets = [];

                for (const row of rows) {
                    const placeholders = [];
                    for (const col of cols) {
                        allValues.push(row[col] !== undefined ? row[col] : null);
                        placeholders.push(`$${allValues.length}`);
                    }
                    valueSets.push(`(${placeholders.join(',')})`);
                }

                const retCols = this._returnSelect ? (this._returnSelect === '*' ? '*' : this._returnSelect.split(',').map(c => `"${c.trim()}"`).join(',')) : '*';
                const sql = `INSERT INTO "${this._table}" (${cols.map(c => `"${c}"`).join(',')}) VALUES ${valueSets.join(',')} RETURNING ${retCols}`;

                const r = await p.query(sql, allValues);
                return { data: this._isSingle ? (r.rows[0] || null) : r.rows, error: null };
            }

            // ── UPDATE ──
            if (this._operation === 'update') {
                const setCols = Object.keys(this._updateData);
                const setParts = [];
                for (const col of setCols) {
                    params.push(this._updateData[col]);
                    setParts.push(`"${col}" = $${params.length}`);
                }
                let sql = `UPDATE "${this._table}" SET ${setParts.join(',')}`;
                sql += this._buildWhere(params);
                if (this._returnSelect) sql += ` RETURNING ${this._returnSelect === '*' ? '*' : this._returnSelect}`;

                const r = await p.query(sql, params);
                return { data: r.rows, error: null };
            }

            // ── DELETE ──
            if (this._operation === 'delete') {
                let sql = `DELETE FROM "${this._table}"`;
                sql += this._buildWhere(params);
                const r = await p.query(sql, params);
                return { data: r.rows, error: null };
            }

            // ── UPSERT ──
            if (this._operation === 'upsert') {
                const rows = this._upsertData;
                if (!rows || rows.length === 0) return { data: null, error: { message: 'No data to upsert' } };

                const cols = Object.keys(rows[0]);
                const allValues = [];
                const valueSets = [];

                for (const row of rows) {
                    const placeholders = [];
                    for (const col of cols) {
                        allValues.push(row[col] !== undefined ? row[col] : null);
                        placeholders.push(`$${allValues.length}`);
                    }
                    valueSets.push(`(${placeholders.join(',')})`);
                }

                const conflict = this._upsertConflict || 'id';
                const updateParts = cols.filter(c => c !== conflict).map(c => `"${c}" = EXCLUDED."${c}"`);

                let sql = `INSERT INTO "${this._table}" (${cols.map(c => `"${c}"`).join(',')}) VALUES ${valueSets.join(',')}`;
                sql += ` ON CONFLICT ("${conflict}") DO UPDATE SET ${updateParts.join(',')}`;
                sql += ' RETURNING *';

                const r = await p.query(sql, allValues);
                return { data: r.rows, error: null };
            }

        } catch (e) {
            console.error(`❌ [DB] ${this._operation} on ${this._table}:`, e.message);
            return { data: null, error: { message: e.message, code: e.code } };
        }
    }
}

// ══════════════════════════════════════════
// Supabase-compatible client interface
// ══════════════════════════════════════════
const db = {
    from(table) {
        return new QueryBuilder(table);
    },

    // rpc support (for exec_sql etc)
    async rpc(funcName, params) {
        const p = getPool();
        if (!p) return { data: null, error: { message: 'Database not connected' } };
        
        try {
            if (funcName === 'exec_sql') {
                const sqlToRun = params?.query || params?.sql_string || '';
                if (sqlToRun) {
                    await p.query(sqlToRun);
                }
                return { data: null, error: null };
            }
            // Generic RPC: try to call as SQL function
            const paramKeys = Object.keys(params || {});
            const paramVals = paramKeys.map(k => params[k]);
            const placeholders = paramVals.map((_, i) => `$${i + 1}`).join(',');
            const sql = `SELECT * FROM "${funcName}"(${placeholders})`;
            const r = await p.query(sql, paramVals);
            return { data: r.rows, error: null };
        } catch (e) {
            console.error(`❌ [DB] rpc ${funcName}:`, e.message);
            return { data: null, error: { message: e.message } };
        }
    },

    // Direct query access (for migrations etc)
    async query(sql, params) {
        const p = getPool();
        if (!p) throw new Error('Database not connected');
        return p.query(sql, params);
    },

    getPool,
    initDB
};

module.exports = db;
