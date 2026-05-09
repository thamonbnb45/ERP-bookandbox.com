const xlsx = require('xlsx');

const workbook = xlsx.readFile('../BCD Strategy - Finance - HR สำเนา/bookandbox_Gap_Analysis.xlsx');
console.log("Sheet names:", workbook.SheetNames);
const sheet = workbook.Sheets['Gap Analysis'];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
console.log("Headers:");
console.log(data[0]);
console.log(data[1]);
console.log(data[2]);
