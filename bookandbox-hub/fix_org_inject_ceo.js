const fs = require('fs');

const employees = JSON.parse(fs.readFileSync('./employees_data.json', 'utf8'));

// Inject CEO
const ceo = {
  id: "EMP-CEO",
  nickname: "ภูมิพัฒน์",
  position: "CEO",
  department: "ผู้บริหาร",
  jobGrade: "Top",
  manager_id: null
};

employees.push(ceo);

// Custom rank function
const getRank = (grade) => {
  if (!grade) return 0;
  if (grade === "Top") return 100;
  if (grade.startsWith('G') || grade.startsWith('จ')) return 30 + parseInt(grade.replace(/\D/g,'')||0);
  if (grade.startsWith('S') || grade.startsWith('บ')) return 20 + parseInt(grade.replace(/\D/g,'')||0);
  if (grade.startsWith('O') || grade.startsWith('ป')) return 10 + parseInt(grade.replace(/\D/g,'')||0);
  return 0;
};

employees.forEach(emp => {
  if (emp.id === ceo.id) return;
  
  const myRank = getRank(emp.jobGrade);
  
  // Find others in the SAME department with a HIGHER rank
  const deptEmps = employees.filter(e => e.department === emp.department && e.id !== emp.id);
  const potentialManagers = deptEmps.filter(e => getRank(e.jobGrade) > myRank);
  
  if (potentialManagers.length > 0) {
    // Report to the highest rank person in the same department
    potentialManagers.sort((a,b) => getRank(b.jobGrade) - getRank(a.jobGrade));
    emp.manager_id = potentialManagers[0].id;
  } else {
    // If I am the highest rank in my department, I report to the CEO
    emp.manager_id = ceo.id;
  }
});

fs.writeFileSync('./employees_data_with_manager.json', JSON.stringify(employees, null, 2));
console.log("Injected CEO and fixed manager_id.");
