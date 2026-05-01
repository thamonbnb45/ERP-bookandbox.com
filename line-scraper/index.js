const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const DATA_DIR = path.join(__dirname, 'line_data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const allData = {};
let totalMessages = 0;
let totalChats = 0;
const discoveredChatIds = new Set();
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Load existing scraped IDs
const existingIds = new Set(
    fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''))
);
console.log(`📂 มีข้อมูลเดิมแล้ว: ${existingIds.size} แชท`);

async function startScraper() {
    console.log("🚀 เปิดบราว์เซอร์...");
    const browser = await puppeteer.launch({
        headless: false, defaultViewport: null,
        userDataDir: './user_data', args: ['--window-size=1400,900']
    });
    const page = await browser.newPage();

    // Track message count per chat for deep-scroll detection
    const msgCountByChatId = {};

    // === Intercept ALL JSON responses ===
    page.on('response', async (response) => {
        try {
            const url = response.url();
            if (!url.includes('chat.line.biz')) return;
            const ct = response.headers()['content-type'] || '';
            if (!ct.includes('json')) return;
            const json = JSON.parse(await response.text());

            // Discover chat IDs
            const str = JSON.stringify(json);
            const matches = str.match(/U[a-f0-9]{32}/gi) || [];
            matches.forEach(id => discoveredChatIds.add(id));

            // Save real chat messages
            let msgs = null;
            if (Array.isArray(json)) msgs = json;
            else if (json.messages) msgs = json.messages;
            else if (json.items) msgs = json.items;
            else if (json.list) msgs = json.list;

            if (!msgs || msgs.length === 0) return;
            const realMsgs = msgs.filter(m => m.source && m.source.chatId);
            if (realMsgs.length === 0) return;

            const chatId = realMsgs[0].source.chatId;
            if (!allData[chatId]) { allData[chatId] = []; totalChats++; }
            
            // Deduplicate by message ID
            const existingMsgIds = new Set(allData[chatId].map(m => m.message?.id).filter(Boolean));
            const newMsgs = realMsgs.filter(m => !m.message?.id || !existingMsgIds.has(m.message.id));
            
            if (newMsgs.length > 0) {
                allData[chatId].push(...newMsgs);
                totalMessages += newMsgs.length;
                msgCountByChatId[chatId] = (msgCountByChatId[chatId] || 0) + newMsgs.length;
                fs.writeFileSync(path.join(DATA_DIR, `${chatId}.json`), JSON.stringify(allData[chatId], null, 2));
            }
        } catch (e) { /* ignore */ }
    });

    await page.goto('https://chat.line.biz/');
    console.log("\n=========================================");
    console.log("  🔥 DEEP SCRAPER — ดูดข้อความย้อนหลังทั้งหมด");
    console.log("=========================================");
    console.log("  1. ล็อกอิน → เลือก Bookandbox.com → เข้าแชท");
    console.log("  2. ⚡ เลื่อนรายชื่อลงล่างๆๆๆ ยิ่งเยอะยิ่งดี!");
    console.log("  3. คลิกแชทคนไหนก็ได้ 1 คน");
    console.log("  4. กลับมากด ENTER");
    console.log("=========================================\n");

    rl.question('กด ENTER เพื่อเริ่ม... ', async () => {
        const BASE = page.url().split('/chat/')[0];
        const OA_MATCH = BASE.match(/U[a-f0-9]+/i);
        const OA_ID = OA_MATCH ? OA_MATCH[0] : '';

        // Phase 1: เลื่อนหา Chat IDs — 3 นาที
        console.log("\n🤖 Phase 1: เลื่อนรายชื่อค้นหา Chat IDs (3 นาที)...\n");
        for (let i = 0; i < 150; i++) {
            await page.mouse.move(120, 400);
            await page.mouse.wheel({ deltaY: 1200 });
            await sleep(1200);
            const count = [...discoveredChatIds].filter(id => id !== OA_ID).length;
            const newCount = [...discoveredChatIds].filter(id => id !== OA_ID && !existingIds.has(id)).length;
            const remaining = Math.max(0, 180 - Math.floor(i * 1.2));
            process.stdout.write(`\r  📋 ค้นพบ ${count} IDs (ใหม่ ${newCount}) | เหลือ ${remaining}วิ...   `);
        }

        discoveredChatIds.delete(OA_ID);
        const allIds = [...discoveredChatIds];
        const newIds = allIds.filter(id => !existingIds.has(id));

        console.log(`\n\n✅ Phase 1 เสร็จ!`);
        console.log(`  📊 ค้นพบทั้งหมด: ${allIds.length} | 🆕 ใหม่: ${newIds.length} | 🔄 มีแล้ว: ${allIds.length - newIds.length}`);

        if (allIds.length === 0) {
            console.log("⚠️ ไม่พบ Chat ID ลองเลื่อนรายชื่อด้วยมือแล้วรันใหม่");
            rl.close();
            return;
        }

        // Process new IDs first
        const orderedIds = [...newIds, ...allIds.filter(id => existingIds.has(id))];
        console.log(`\n🤖 Phase 2: DEEP SCRAPE — เปิดแชท + เลื่อนขึ้นจนหมด (${orderedIds.length} คน)...\n`);

        let skipped = 0;
        for (let i = 0; i < orderedIds.length; i++) {
            const chatId = orderedIds[i];
            const isNew = !existingIds.has(chatId);
            process.stdout.write(`${isNew ? '🆕' : '🔄'} [${i+1}/${orderedIds.length}] ${chatId.substring(0,16)}...`);
            
            // Reset message counter for this chat
            msgCountByChatId[chatId] = 0;
            
            try {
                await page.goto(`${BASE}/chat/${chatId}`, { waitUntil: 'domcontentloaded', timeout: 12000 });
            } catch (e) { /* timeout ok */ }

            // Check for 404
            const currentUrl = page.url();
            if (currentUrl.includes('/error') || currentUrl.includes('404')) {
                console.log(` ⏭️ ข้าม`);
                skipped++;
                continue;
            }

            await sleep(2000); // Wait for initial messages to load

            // === DEEP SCROLL: เลื่อนขึ้นจนหมดข้อความ ===
            let noNewMsgCount = 0;
            let scrollAttempts = 0;
            const maxScrolls = 50; // Max 50 scroll attempts per chat (~1 min per chat max)
            let prevMsgCount = msgCountByChatId[chatId] || 0;

            while (scrollAttempts < maxScrolls) {
                scrollAttempts++;
                
                // Scroll to top of chat area
                try {
                    await page.evaluate(() => {
                        // Try multiple selectors for chat message area
                        const selectors = [
                            '[class*="messageList"]', '[class*="chat-content"]',
                            '[role="log"]', '[class*="scroll"]', 
                            'main', '.chat-area', '#chat-area'
                        ];
                        for (const sel of selectors) {
                            const el = document.querySelector(sel);
                            if (el && el.scrollHeight > el.clientHeight) {
                                el.scrollTop = 0;
                                return;
                            }
                        }
                        // Fallback: scroll the whole page
                        window.scrollTo(0, 0);
                    });
                } catch(e) {}
                
                await sleep(1500);
                
                const currentMsgCount = msgCountByChatId[chatId] || 0;
                if (currentMsgCount === prevMsgCount) {
                    noNewMsgCount++;
                    if (noNewMsgCount >= 3) break; // No new messages for 3 attempts → done
                } else {
                    noNewMsgCount = 0;
                    prevMsgCount = currentMsgCount;
                }
                
                process.stdout.write(`\r${isNew ? '🆕' : '🔄'} [${i+1}/${orderedIds.length}] ${chatId.substring(0,16)}... ↑${scrollAttempts} (${currentMsgCount} msgs)    `);
            }

            const finalCount = msgCountByChatId[chatId] || 0;
            console.log(`\r${isNew ? '🆕' : '🔄'} [${i+1}/${orderedIds.length}] ${chatId.substring(0,16)}... ✅ ${finalCount} ข้อความ (scroll ${scrollAttempts}x)    `);
        }

        console.log(`\n${'═'.repeat(50)}`);
        console.log(`🎉 DEEP SCRAPE เสร็จสิ้น!`);
        console.log(`  📊 ${totalChats} แชท, ${totalMessages} ข้อความ`);
        console.log(`  ⏭️ ข้าม: ${skipped}`);
        console.log(`  📁 เซฟไว้ที่: ${DATA_DIR}`);
        console.log(`\n💡 รัน "node migrate.js" เพื่อ import เข้า DB`);
        console.log(`${'═'.repeat(50)}`);
        rl.close();
    });
}

startScraper();
