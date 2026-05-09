const xlsx = require('xlsx');
const fs = require('fs');

const workbook = xlsx.readFile('../BCD Strategy - Finance - HR สำเนา/bookandbox_Gap_Analysis.xlsx');
const sheet = workbook.Sheets['Gap Analysis'];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

const compHeaders = data[2]; // row index 2

const skillsData = [];

// Data starts at row index 3
for (let i = 3; i < data.length; i += 3) {
  const expRow = data[i];
  const actRow = data[i + 1] || [];
  
  if (!expRow || !expRow[1]) continue;

  const employee = {
    id: `EMP-${(i).toString().padStart(3, '0')}`,
    level: expRow[0],
    name: expRow[1],
    position: expRow[2],
    department: expRow[3],
    competencies: []
  };

  // Competency columns start from index 5
  for (let col = 5; col <= 30; col++) {
    const compName = compHeaders[col] ? compHeaders[col].replace(/\n/g, ' ').trim() : `Unknown-${col}`;
    if (!compName || compName === 'Unknown-undefined') continue;

    let expectation = expRow[col] !== undefined ? Number(expRow[col]) : 0;
    
    // Simulate actual scores if empty (for demo purposes)
    let actual = actRow[col] !== undefined ? Number(actRow[col]) : 0;
    if (isNaN(actual) || actual === 0) {
       actual = Math.max(1, expectation - Math.floor(Math.random() * 3)); // Randomly 0-2 levels below expectation
    }

    const gap = expectation - actual;

    // Categories
    let category = "Core";
    if (compName.startsWith('FC')) {
       category = "Functional";
    }

    employee.competencies.push({
      code: compName.split(' ')[0],
      name: compName.substring(compName.indexOf(' ') + 1),
      category: category,
      expectation: expectation,
      actual: actual,
      gap: gap,
      needs_training: gap > 0
    });
  }
  
  skillsData.push(employee);
}

fs.writeFileSync('../bookandbox-hub/skills_data.json', JSON.stringify(skillsData, null, 2));
console.log("Exported " + skillsData.length + " employees skills data.");
