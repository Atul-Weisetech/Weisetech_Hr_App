export const employees = [
  {
    id: 'EMP-001',
    name: 'Rajvi Gajjar',
    department: 'Engineering',
    role: 'Employee',
    email: 'rajvi@company.com',
    status: 'Active',
    salary: '₹40,000.00',
    deductions: '₹1,000.00',
    joiningDate: '01 January 2025',
  },
  {
    id: 'EMP-002',
    name: 'Atul Sengar',
    department: 'HR',
    role: 'Employee',
    email: 'atul@gmail.com',
    status: 'Active',
    salary: '₹32,000.00',
    deductions: '₹2,000.00',
    joiningDate: '28 January 2026',
  },
  {
    id: 'EMP-003',
    name: 'Om Gajjar',
    department: 'Finance',
    role: 'Employee',
    email: 'omgajjar41@gmail.com',
    status: 'Inactive',
    salary: '₹50,000.00',
    deductions: '₹1,500.00',
    joiningDate: '06 November 2025',
  },
];

export const initialLeaveRequests = [
  {
    id: 'LR-101',
    employeeId: 'EMP-001',
    employeeName: 'Rajvi Gajjar',
    type: 'Sick',
    from: '2026-02-10',
    to: '2026-02-12',
    status: 'Pending',
  },
  {
    id: 'LR-102',
    employeeId: 'EMP-002',
    employeeName: 'Atul Sengar',
    type: 'Casual',
    from: '2026-02-15',
    to: '2026-02-15',
    status: 'Approved',
  },
];

export const initialWfhRequests = [
  {
    id: 'WFH-201',
    employeeId: 'EMP-003',
    employeeName: 'Om Gajjar',
    from: '2026-02-20',
    to: '2026-02-22',
    reason: 'Home maintenance',
    status: 'Pending',
  },
  {
    id: 'WFH-202',
    employeeId: 'EMP-001',
    employeeName: 'Rajvi Gajjar',
    from: '2026-02-23',
    to: '2026-02-23',
    reason: 'Medical appointment',
    status: 'Rejected',
  },
];

export const initialPayrolls = [
  {
    id: 'PAY-301',
    employeeId: 'EMP-001',
    employeeName: 'Rajvi Gajjar',
    month: '2026-01',
    basic: 40000,
    allowance: 5000,
    deduction: 2000,
  },
  {
    id: 'PAY-302',
    employeeId: 'EMP-002',
    employeeName: 'Atul Sengar',
    month: '2026-01',
    basic: 35000,
    allowance: 4000,
    deduction: 1500,
  },
];

export const initialNotifications = [
  {
    id: 'NOTIF-001',
    employeeId: 'EMP-001',
    title: 'Leave Request Submitted',
    message: 'Your Sick leave request for Feb 10–12 is pending approval.',
    type: 'leave',
    read: false,
    date: '2026-02-10',
  },
  {
    id: 'NOTIF-002',
    employeeId: 'EMP-002',
    title: 'Leave Approved',
    message: 'Your Casual leave request for Feb 15 has been approved.',
    type: 'leave',
    read: true,
    date: '2026-02-15',
  },
  {
    id: 'NOTIF-003',
    employeeId: 'EMP-001',
    title: 'WFH Request Rejected',
    message: 'Your WFH request for Feb 23 has been rejected.',
    type: 'wfh',
    read: false,
    date: '2026-02-23',
  },
  {
    id: 'NOTIF-004',
    employeeId: 'EMP-002',
    title: 'Performance Warning Issued',
    message: 'A Medium severity warning has been issued: Late arrivals.',
    type: 'warning',
    read: false,
    date: '2026-02-05',
  },
  {
    id: 'NOTIF-005',
    employeeId: 'EMP-001',
    title: 'Payroll Generated',
    message: 'Your payslip for January 2026 has been generated. Net: ₹43,000.',
    type: 'payroll',
    read: true,
    date: '2026-01-31',
  },
  {
    id: 'NOTIF-006',
    employeeId: 'EMP-002',
    title: 'Payroll Generated',
    message: 'Your payslip for January 2026 has been generated. Net: ₹37,500.',
    type: 'payroll',
    read: false,
    date: '2026-01-31',
  },
];

export const initialWarnings = [
  {
    id: 'WARN-401',
    employeeId: 'EMP-002',
    employeeName: 'Atul Sengar',
    reason: 'Late arrivals',
    date: '2026-02-05',
    severity: 'Medium',
  },
  {
    id: 'WARN-402',
    employeeId: 'EMP-003',
    employeeName: 'Om Gajjar',
    reason: 'Missed deadlines',
    date: '2026-02-12',
    severity: 'High',
  },
];

