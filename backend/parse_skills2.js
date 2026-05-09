const xlsx = require('xlsx');

const workbook = xlsx.readFile('../BCD Strategy - Finance - HR สำเนา/bookandbox_Gap_Analysis.xlsx');
const sheet = workbook.Sheets['Gap Analysis'];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
console.log("Row 3:");
console.log(data[3]);
console.log("Row 4:");
console.log(data[4]);
console.log("Row 5:");
console.log(data[5]);
