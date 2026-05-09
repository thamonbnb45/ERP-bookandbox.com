const xlsx = require('xlsx');

const workbook = xlsx.readFile('../BCD Strategy - Finance - HR สำเนา/bookandbox_jobgrade_2569.xlsx');
console.log("Sheet names:", workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
  console.log(`\n--- Sheet: ${sheetName} ---`);
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
  console.log(data.slice(0, 3)); // show first 3 rows
});
