const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'erp.db');
const db = new sqlite3.Database(dbPath);

console.log("Setting up Advanced Database Schema V2 (Analytics & TIering)...");

db.serialize(() => {
    // 1. Employee Table
    db.run(`
        CREATE TABLE IF NOT EXISTS employee (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            role TEXT NOT NULL
        )
    `);

    // 2. Customer Table
    db.run(`
        CREATE TABLE IF NOT EXISTS customer (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            contact_person TEXT,
            credit_limit REAL DEFAULT 0,
            balance REAL DEFAULT 0
        )
    `);

    // 3. Product Table
    db.run(`
        CREATE TABLE IF NOT EXISTS product (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            base_price REAL NOT NULL
        )
    `);

    // 4. Job Order Table
    db.run(`
        CREATE TABLE IF NOT EXISTS job_order (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER,
            product_id INTEGER,
            quantity INTEGER,
            total_price REAL,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(customer_id) REFERENCES customer(id),
            FOREIGN KEY(product_id) REFERENCES product(id)
        )
    `);

    // 5. [NEW] Lead Contact Table (To map LINE Users)
    db.run(`
        CREATE TABLE IF NOT EXISTS lead_contact (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            line_user_id TEXT UNIQUE NOT NULL,
            original_name TEXT,
            erp_alias_name TEXT,
            tags TEXT DEFAULT '[]',
            sales_status TEXT DEFAULT 'i',  -- 'i' = info, 'q' = quote/opportunity
            customer_id INTEGER NULL,       -- Link to actual customer table to track C1-C5
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(customer_id) REFERENCES customer(id)
        )
    `);

    // 6. [NEW] Chat Message Table
    db.run(`
        CREATE TABLE IF NOT EXISTS chat_message (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lead_id INTEGER NOT NULL,
            sender TEXT NOT NULL,
            type TEXT NOT NULL,
            text_content TEXT,
            media_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(lead_id) REFERENCES lead_contact(id)
        )
    `);

    // Basic Seeding
    db.get("SELECT COUNT(*) as count FROM lead_contact", (err, row) => {
        if (row && row.count === 0) {
            // Seed Employees
            const insertEmp = db.prepare("INSERT INTO employee (name, role) VALUES (?, ?)");
            insertEmp.run("คุณณัฐวุฒิ", "ceo");
            insertEmp.run("สมชาย ไดคัท", "production");
            insertEmp.run("สมศรี บัญชี", "accounting");
            insertEmp.finalize();

            // Seed Customers
            const insertCust = db.prepare("INSERT INTO customer (name, contact_person, credit_limit) VALUES (?, ?, ?)");
            // Cust 1: แสนสิริ
            insertCust.run("บริษัท แสนสิริ จำกัด", "คุณกิ๊ก", 100000); 
            // Cust 2: ร้านกาแฟนายใจ
            insertCust.run("ร้านกาแฟนายใจ", "คุณใจ", 5000);
            insertCust.finalize();

            // Seed Products
            const insertProd = db.prepare("INSERT INTO product (name, type, base_price) VALUES (?, ?, ?)");
            insertProd.run("ใบปลิว A4", "leaflet", 0.8);
            insertProd.run("โบรชัวร์ พับ 3", "brochure", 2.5);
            insertProd.run("กล่องอาร์ตการ์ด 250g", "box", 5.0);
            insertProd.finalize();

            // Seed Job Orders (To generate Tiers automatically later)
            const insertJob = db.prepare("INSERT INTO job_order (customer_id, product_id, quantity, total_price, status) VALUES (?, ?, ?, ?, ?)");
            // Cust 1 (Sansiri) History: Total = 120,000 (C5 Tier)
            insertJob.run(1, 3, 20000, 100000, "completed"); 
            insertJob.run(1, 1, 25000, 20000, "completed");
            // Cust 2 (Cafe Naijai) History: Total = 6,000 (C2 Tier)
            insertJob.run(2, 2, 2400, 6000, "completed");
            insertJob.finalize();

            // Seed Leads and Link to Customers
            const insertLead = db.prepare("INSERT INTO lead_contact (line_user_id, original_name, erp_alias_name, tags, sales_status, customer_id) VALUES (?, ?, ?, ?, ?, ?)");
            
            // Lead 1: Linked to Customer 1 (C5)
            insertLead.run("U00f03f25438e107662c8d4d964fdecf8", "Kik LINE", "คุณกิ๊ก (จัดซื้อ แสนสิริ)", '["VIP", "ลูกค้าหลัก"]', "q", 1);
            
            // Lead 2: A brand new info prospect (Not a customer yet)
            insertLead.run("Uabcde12345", "Nong May", "น้องเมย์ สนใจกล่อง", '["ด่วน", "ส่งแบบแล้ว"]', "i", null);
            
            // Lead 3: Linked to Cafe Naijai (C2 Tier)
            insertLead.run("Ucafe999", "CafeNaijai", "คุณใจ ร้านกาแฟ", '[]', "q", 2);
            insertLead.finalize();

            // Seed chats
            const insertChat = db.prepare("INSERT INTO chat_message (lead_id, sender, type, text_content) VALUES (?, ?, ?, ?)");
            insertChat.run(1, "client", "text", "คุณณัฐวุฒิคะ รอบนี้อยากผลิตกล่องเพิ่มค่ะ ขอสเปกไซส์กล่องเหมือนเดิม 50,000 ใบค่ะ");
            insertChat.run(1, "admin", "text", "ยินดีครับคุณกิ๊ก ประวัติเดิมมีอยู่แล้ว เดี๋ยวปั่นใบเสนอราคาให้นะครับ");
            
            insertChat.run(2, "client", "text", "รับทำใบปลิวแจกหน้าโรงเรียนไหมคะ?");
            insertChat.run(2, "admin", "text", "รับครับคุณเมย์ ส่งแบบมาประเมินได้เลยครับ");
            insertChat.finalize();

            console.log("Database seeded successfully with Tiering constraints!");
        } else {
            console.log("Database tables verified.");
        }
    });

});
