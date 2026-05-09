const fs = require('fs');

const employees = JSON.parse(fs.readFileSync('./employees_data.json', 'utf8'));
const prodEmployees = employees.filter(e => e.department === 'ผลิต' || e.department === 'พิมพ์');

const workloadData = [];
const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];

prodEmployees.forEach(emp => {
  const station = emp.position.includes('พิมพ์') ? 'Printing (พิมพ์)' : 
                  emp.position.includes('ตัด') ? 'Cutting (ตัด)' :
                  emp.position.includes('หลังพิมพ์') ? 'Finishing (หลังพิมพ์)' : 'General (ทั่วไป)';
                  
  const employeeWorkload = {
    id: emp.id,
    name: emp.nickname || emp.full_name_th,
    position: emp.position,
    station: station,
    workload: {}
  };
  
  days.forEach(day => {
    // Generate random workload percentage between 0 and 130
    // Make finishing have higher workload usually
    let base = Math.floor(Math.random() * 80) + 20; 
    if (station === 'Finishing (หลังพิมพ์)' && Math.random() > 0.5) base += 40;
    if (station === 'Printing (พิมพ์)' && Math.random() > 0.7) base += 50;
    
    // Add some 0s for leaves
    if (Math.random() > 0.9) base = 0;
    
    employeeWorkload.workload[day] = base > 150 ? 150 : base;
  });
  
  workloadData.push(employeeWorkload);
});

fs.writeFileSync('./workload_data.json', JSON.stringify(workloadData, null, 2));
console.log("Workload data generated.");
