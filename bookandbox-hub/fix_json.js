const fs = require('fs');

const data = JSON.parse(fs.readFileSync('./employees_data_with_manager.json', 'utf8'));
const fixedData = data.filter(e => e.id !== 'EMP-001');

fs.writeFileSync('./employees_data_with_manager.json', JSON.stringify(fixedData, null, 2));

const rawData = JSON.parse(fs.readFileSync('./employees_data.json', 'utf8'));
const fixedRawData = rawData.filter(e => e.id !== 'EMP-001');
fs.writeFileSync('./employees_data.json', JSON.stringify(fixedRawData, null, 2));

console.log("Fixed JSON data.");
