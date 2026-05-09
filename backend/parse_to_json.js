const xlsx = require('xlsx');
const fs = require('fs');

const workbook = xlsx.readFile('../BCD Strategy - Finance - HR สำเนา/bookandbox_jobgrade_2569.xlsx');
const employeesSheet = workbook.Sheets['วิเคราะห์พนักงาน'];
const rows = xlsx.utils.sheet_to_json(employeesSheet, { header: 1 });

// The data starts at row 2 (0-indexed)
const headers = rows[1];
const dataRows = rows.slice(2);

const employees = [];
dataRows.forEach((row, i) => {
  if (!row[1]) return; // empty row
  
  // Column mapping based on previous log:
  // 1: Nickname, 2: Position, 3: Dept, 4: Division, 5: PersonalLevel, 6: JobGrade, 7: BaseSalary, 8: Extra, 9: Total, 10: Min, 11: Mid, 12: Max, 13: Status
  
  employees.push({
    id: `EMP-${(i+1).toString().padStart(3, '0')}`,
    nickname: row[1],
    position: row[2],
    department: row[3],
    division: row[4],
    personalLevel: row[5],
    jobGrade: row[6],
    baseSalary: row[7],
    totalIncome: row[9] || row[7],
    gradeMin: row[10],
    gradeMid: row[11],
    gradeMax: row[12],
    status: row[13]
  });
});

fs.writeFileSync('../bookandbox-hub/employees_data.json', JSON.stringify(employees, null, 2));
console.log("Exported " + employees.length + " employees to JSON.");
