-- HR Schema (001)

CREATE TABLE IF NOT EXISTS job_grades (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,         
  group_name VARCHAR(50),                   
  level INTEGER,                            
  sample_position TEXT,
  salary_min INTEGER,
  salary_mid INTEGER,
  salary_p75 INTEGER,
  salary_max INTEGER
);

CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE,
  name_th VARCHAR(100),
  name_en VARCHAR(100),
  parent_id INTEGER REFERENCES departments(id),
  head_id UUID -- will reference employees later
);

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_no VARCHAR(10) UNIQUE NOT NULL,  
  nickname VARCHAR(50) NOT NULL,            
  full_name_th VARCHAR(200) NOT NULL,
  full_name_en VARCHAR(200),
  position VARCHAR(200),
  department VARCHAR(100),
  job_grade VARCHAR(10) REFERENCES job_grades(code),
  hire_date DATE,
  termination_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  manager_id UUID REFERENCES employees(id), 
  email VARCHAR(200),
  phone VARCHAR(20),
  line_id VARCHAR(100),
  photo_url TEXT,
  birth_date DATE,
  national_id VARCHAR(20),  
  address TEXT,
  emergency_contact JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key now that employees table exists
ALTER TABLE departments ADD CONSTRAINT fk_dept_head FOREIGN KEY (head_id) REFERENCES employees(id);

CREATE TABLE IF NOT EXISTS compensations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id),
  effective_date DATE NOT NULL,
  base_salary INTEGER NOT NULL,
  other_income INTEGER DEFAULT 0,
  bonus_target INTEGER,
  reason TEXT,
  approved_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Basic Seed Data for Job Grades
INSERT INTO job_grades (code, group_name, level) VALUES
('จ3', 'จัดการ', 11),
('จ2', 'จัดการ', 10),
('จ1', 'จัดการ', 9),
('บ3', 'บังคับบัญชา', 8),
('บ2', 'บังคับบัญชา', 7),
('บ1', 'บังคับบัญชา', 6),
('ป5', 'ปฏิบัติการ', 5),
('ป4', 'ปฏิบัติการ', 4),
('ป3', 'ปฏิบัติการ', 3),
('ป2', 'ปฏิบัติการ', 2),
('ป1', 'ปฏิบัติการ', 1)
ON CONFLICT (code) DO NOTHING;

-- Basic Seed Data for Departments
INSERT INTO departments (code, name_th) VALUES
('EXEC', 'ผู้บริหาร'),
('HR', 'ทรัพยากรบุคคล'),
('ACCT', 'บัญชีและการเงิน'),
('SALES', 'ขายและการตลาด'),
('PROD', 'ฝ่ายผลิต'),
('IT', 'IT และ AI'),
('QC', 'ตรวจสอบคุณภาพ'),
('LOG', 'จัดส่ง')
ON CONFLICT (code) DO NOTHING;
