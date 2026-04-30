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

async function startScraper() {
    console.log("🚀 เปิดบราว์เซอร์...");
    const browser = await puppeteer.launch({
        headless: false, defaultViewport: null,
        userDataDir: './user_data', args: ['--window-size=1400,900']
    });
    const page = await browser.newPage();

    // === Intercept ALL JSON responses to discover chat IDs + capture messages ===
    page.on('response', async (response) => {
        try {
            const url = response.url();
            if (!url.includes('chat.line.biz')) return;
            const ct = response.headers()['content-type'] || '';
            if (!ct.includes('json')) return;
            const json = JSON.parse(await response.text());

            // Discover chat IDs from ANY API response
            const findIds = (obj) => {
                const str = JSON.stringify(obj);
                const matches = str.match(/U[a-f0-9]{32}/gi) || [];
                matches.forEach(id => discoveredChatIds.add(id));
            };
            findIds(json);

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
            allData[chatId].push(...realMsgs);
            totalMessages += realMsgs.length;

            fs.writeFileSync(path.join(DATA_DIR, `${chatId}.json`), JSON.stringify(allData[chatId], null, 2));
            console.log(`  ✅ +${realMsgs.length} [${chatId.substring(0,12)}] | รวม: ${totalChats} แชท, ${totalMessages} ข้อความ`);
        } catch (e) { /* ignore */ }
    });

    await page.goto('https://chat.line.biz/');
    console.log("\n=========================================");
    console.log("  1. ล็อกอิน → เลือก Bookandbox.com → เข้าแชท");
    console.log("  2. คลิกแชทคนแรกที่ต้องการ");
    console.log("  3. กลับมากด ENTER");
    console.log("=========================================\n");

    rl.question('กด ENTER เพื่อเริ่ม... ', async () => {
        console.log("\n🤖 Phase 1: เลื่อนรายชื่อเพื่อค้นหา Chat IDs (30 วินาที)...\n");

        const BASE = page.url().split('/chat/')[0];
        const OA_MATCH = BASE.match(/U[a-f0-9]+/i);
        const OA_ID = OA_MATCH ? OA_MATCH[0] : '';

        // Scroll sidebar for 30 seconds to discover chat IDs
        for (let i = 0; i < 20; i++) {
            await page.mouse.move(120, 400);
            await page.mouse.wheel({ deltaY: 800 });
            await sleep(1500);
            const count = [...discoveredChatIds].filter(id => id !== OA_ID).length;
            process.stdout.write(`\r  📋 ค้นพบ ${count} Chat IDs...`);
        }

        // Filter out OA ID
        discoveredChatIds.delete(OA_ID);
        const chatIds = [...discoveredChatIds];
        console.log(`\n\n✅ Phase 1 เสร็จ! ค้นพบ ${chatIds.length} แชท`);

        if (chatIds.length === 0) {
            console.log("⚠️ ไม่พบ Chat ID ใหม่ ลองเลื่อนรายชื่อด้วยมือแล้วรันใหม่");
            rl.close();
            return;
        }

        console.log(`\n🤖 Phase 2: เปิดแชททีละคน (${chatIds.length} คน)...\n`);

        for (let i = 0; i < chatIds.length; i++) {
            const chatId = chatIds[i];
            console.log(`⏳ [${i+1}/${chatIds.length}] ${chatId.substring(0,16)}...`);
            try {
                await page.goto(`${BASE}/chat/${chatId}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
            } catch (e) { /* timeout ok */ }

            // Check if we hit a 404 page
            const currentUrl = page.url();
            if (currentUrl.includes('/error') || currentUrl.includes('404')) {
                console.log(`  ⏭️ ข้าม (ไม่ใช่แชทจริง)`);
                continue; // Skip this ID
            }

            await sleep(2500);
        }

        console.log(`\n🎉 เสร็จสิ้น! ${totalChats} แชท, ${totalMessages} ข้อความ`);
        console.log(`📁 เซฟไว้ที่: ${DATA_DIR}`);
        rl.close();
    });
}

startScraper();
