const fs = require('fs');

const employees = JSON.parse(fs.readFileSync('./employees_data.json', 'utf8'));

// Find CEO or GM
const execs = employees.filter(e => e.department === 'ผู้บริหาร');
const ceo = execs.find(e => e.position.toLowerCase().includes('ceo') || e.position.toLowerCase().includes('managing')) || execs[0];

// Basic logic to assign manager:
// 1. If you are CEO, you have no manager.
// 2. If you are Exec (not CEO), you report to CEO.
// 3. If you are top grade in a Department (e.g., จ1-จ3), you report to GM/CEO.
// 4. If you are lower grade, you report to the highest grade person in your department.

employees.forEach(emp => {
  if (emp.id === ceo?.id) {
    emp.manager_id = null;
    return;
  }
  
  if (emp.department === 'ผู้บริหาร') {
    emp.manager_id = ceo.id;
    return;
  }
  
  // Find highest grade in the same department
  // Job grades are like G1, G2, G3 (management), S1, S2, S3 (Supervisor), O1, O2... (Operations)
  // Let's just find the person with the highest JobGrade string or specifically 'จ', 'บ', 'ป'
  const deptEmps = employees.filter(e => e.department === emp.department && e.id !== emp.id);
  
  // Custom rank function
  const getRank = (grade) => {
    if (!grade) return 0;
    if (grade.startsWith('G') || grade.startsWith('จ')) return 30 + parseInt(grade.replace(/\D/g,'')||0);
    if (grade.startsWith('S') || grade.startsWith('บ')) return 20 + parseInt(grade.replace(/\D/g,'')||0);
    if (grade.startsWith('O') || grade.startsWith('ป')) return 10 + parseInt(grade.replace(/\D/g,'')||0);
    return 0;
  };

  const myRank = getRank(emp.jobGrade);
  
  // Find someone in same dept with higher rank
  const potentialManagers = deptEmps.filter(e => getRank(e.jobGrade) > myRank);
  
  if (potentialManagers.length > 0) {
    // Sort by rank descending
    potentialManagers.sort((a,b) => getRank(b.jobGrade) - getRank(a.jobGrade));
    emp.manager_id = potentialManagers[0].id;
  } else {
    // Top of department reports to CEO or GM
    emp.manager_id = ceo?.id || null;
  }
});

fs.writeFileSync('./employees_data_with_manager.json', JSON.stringify(employees, null, 2));
console.log("Added manager_id to " + employees.length + " employees.");
