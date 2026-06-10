import { Alert, Platform } from 'react-native';
import { PAYSLIP_BACKGROUND_SVG } from '../screens/employee/payslipBackgroundSvg';

const moneyInr = value =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatPayDate = input => {
  if (!input) return '-';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-IN', { month: 'short' });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

const normalizeMonthLabel = month => {
  if (!month) return '-';
  const text = String(month);
  const parsed = new Date(`${text}-01`);
  if (Number.isNaN(parsed.getTime())) return text;
  return parsed.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
};

const escapeHtml = value =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const classifyAsDeduction = row => {
  const category = Number(row?.category);
  if (category === 2) return true;
  if (category === 1) return false;

  const isEarning = row?.is_earning;
  if (isEarning === 0 || isEarning === false || isEarning === '0') return true;
  if (isEarning === 1 || isEarning === true || isEarning === '1') return false;

  const type = String(row?.type || '').toLowerCase();
  return /(pf|tds|tax|esi|loan|advance|penalty|deduction)/.test(type);
};

const buildPayslipHtml = ({
  employeeName,
  userRole,
  month,
  payrollDate,
  paymentMode,
  gross,
  deductionTotal,
  net,
  earningsRows,
  deductionRows,
}) => {
  const monthLabel = normalizeMonthLabel(month);
  const payDate = formatPayDate(payrollDate);
  const bgSvgUri = `data:image/svg+xml;utf8,${encodeURIComponent(PAYSLIP_BACKGROUND_SVG)}`;

  const maxRows = Math.max(earningsRows.length, deductionRows.length, 2);
  const rowHtml = Array.from({ length: maxRows })
    .map((_, idx) => {
      const e = earningsRows[idx];
      const d = deductionRows[idx];
      return `
        <tr>
          <td>${escapeHtml(e?.label || '')}</td>
          <td class="amount">${escapeHtml(e ? moneyInr(e.amount) : '')}</td>
          <td>${escapeHtml(d?.label || '')}</td>
          <td class="amount">${escapeHtml(d ? moneyInr(d.amount) : '')}</td>
        </tr>
      `;
    })
    .join('');

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        html, body { width: 100%; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; color: #111; background: #ffffff; }
        .page {
          width: 100%; min-height: 100%; box-sizing: border-box;
          padding: 16px 16px 20px; background: #ffffff; position: relative;
        }
        .bg-art { position: absolute; top: 10px; left: 10px; width: 95%; opacity: 0.12; z-index: 0; }
        .content { position: relative; z-index: 1; }
        .topRow {
          display: flex; justify-content: space-between; align-items: flex-start;
          gap: 14px; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 16px;
        }
        .brandLeft { font-size: 11px; line-height: 1.35; color: #6b7280; }
        .brandRight { text-align: right; }
        .brandRight .company { font-size: 15px; font-weight: 800; letter-spacing: 0.2px; }
        .brandRight .addr { margin-top: 3px; font-size: 10.5px; color: #6b7280; line-height: 1.35; }
        .title { text-align: center; margin: 4px 0 14px; }
        .title h1 { margin: 0; font-size: 22px; letter-spacing: 0.5px; font-weight: 900; }
        .title p { margin: 6px 0 0; font-size: 13px; color: #374151; }
        .box { border: 1px solid #d1d5db; margin-top: 12px; }
        .boxHead { background: #f8fafc; border-bottom: 1px solid #d1d5db; padding: 7px 10px; font-size: 12px; font-weight: 700; }
        .infoGrid { width: 100%; border-collapse: collapse; }
        .infoGrid td { border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; padding: 8px 10px; font-size: 12px; }
        .infoGrid td:nth-child(2n) { border-right: none; font-weight: 700; }
        .headTable, .mainTable { width: 100%; border-collapse: collapse; }
        .headTable th { text-align: left; background: #f8fafc; border-bottom: 1px solid #d1d5db; padding: 8px 10px; font-size: 12px; }
        .mainTable td { border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; padding: 8px 10px; font-size: 12px; }
        .mainTable td:last-child { border-right: none; }
        .amount { text-align: right; font-weight: 700; }
        .summaryRow td { font-size: 18px; font-weight: 800; padding: 10px; }
        .summaryRow .amount { font-size: 18px; }
        .netBlock { margin-top: 14px; border: 1px solid #d1d5db; border-radius: 8px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: flex-end; }
        .netLeft .label { font-size: 11px; color: #374151; font-weight: 700; }
        .netLeft .sub { font-size: 11px; color: #6b7280; margin-top: 5px; }
        .netRight { font-size: 22px; font-weight: 900; }
        .signature { margin-top: 28px; display: flex; justify-content: space-between; align-items: flex-end; color: #6b7280; font-size: 11px; }
        .sigLine { width: 150px; border-top: 2px solid #111; margin-bottom: 6px; }
        .signName { color: #111; font-weight: 700; margin-bottom: 4px; }
        .centerNote { text-align: center; line-height: 1.4; }
        .rightMonth { font-weight: 700; color: #9ca3af; }
      </style>
    </head>
    <body>
      <div class="page">
        <img class="bg-art" src="${bgSvgUri}" alt="background" />
        <div class="content">
          <div class="topRow">
            <div class="brandLeft">Salary Statement</div>
            <div class="brandRight">
              <div class="company">EZ INFOWAYS PRIVATE LIMITED</div>
              <div class="addr">B-501 RUDRA PLAZA NR. PATEL PAN HOUSE JUDGES BUNGLOWS CHAR RASTA BODAKDEV, AHMEDABAD</div>
              <div class="addr">Gujarat, India - 380054 | +1 647 768-6933 | info@weisetech.com</div>
            </div>
          </div>
          <div class="title">
            <h1>SALARY SLIP</h1>
            <p>Pay Period: <b>${escapeHtml(monthLabel)}</b></p>
          </div>
          <div class="box">
            <div class="boxHead">EMPLOYEE INFORMATION</div>
            <table class="infoGrid">
              <tr>
                <td>Name</td><td>${escapeHtml(employeeName || 'Employee')}</td>
                <td>Designation</td><td>${escapeHtml(userRole || 'Employee')}</td>
              </tr>
              <tr>
                <td>Pay Date</td><td>${escapeHtml(payDate)}</td>
                <td>Mode of Payment</td><td>${escapeHtml(paymentMode || 'N/A')}</td>
              </tr>
            </table>
          </div>
          <div class="box" style="margin-top: 14px;">
            <table class="headTable">
              <tr>
                <th style="width: 34%;">Earnings</th>
                <th style="width: 16%; text-align: right;">Amount</th>
                <th style="width: 34%;">Deductions</th>
                <th style="width: 16%; text-align: right;">Amount</th>
              </tr>
            </table>
            <table class="mainTable">
              ${rowHtml}
              <tr class="summaryRow">
                <td>Gross Salary</td>
                <td class="amount">${escapeHtml(moneyInr(gross))}</td>
                <td>Deductions</td>
                <td class="amount">${escapeHtml(moneyInr(deductionTotal))}</td>
              </tr>
            </table>
          </div>
          <div class="netBlock">
            <div class="netLeft">
              <div class="label">NET PAYABLE AMOUNT</div>
              <div class="sub">Generated from payroll components</div>
            </div>
            <div class="netRight">${escapeHtml(moneyInr(net))}</div>
          </div>
          <div class="signature">
            <div>
              <div class="sigLine"></div>
              <div class="signName">Authorized Signature</div>
              <div>EZ INFOWAYS PRIVATE LIMITED</div>
            </div>
            <div class="centerNote">
              <div>This is a system generated report.</div>
              <div>Generated on ${escapeHtml(formatPayDate(new Date()))}</div>
            </div>
            <div class="rightMonth">${escapeHtml(monthLabel)}</div>
          </div>
        </div>
      </div>
    </body>
  </html>
  `;
};

/**
 * Generate and open a payslip PDF.
 * @param {object} payslip - normalized payroll row
 * @param {object} opts
 * @param {string} opts.myEmployeeId
 * @param {string} opts.userName
 * @param {string} opts.userRole
 * @param {object} opts.breakdownsByPayrollId - { [payrollId]: breakdownRow[] }
 */
export async function downloadPayslip(payslip, { myEmployeeId, userName, userRole, breakdownsByPayrollId = {} }) {
  try {
    if (Platform.OS === 'web') {
      Alert.alert('Not available on web', 'Payslip download is available on Android/iOS only.');
      return;
    }

    const pdfModule = require('react-native-html-to-pdf');
    const FileViewer = require('react-native-file-viewer');
    const generatePDF = pdfModule.generatePDF || pdfModule.default?.generatePDF || pdfModule.convert;
    if (!generatePDF) throw new Error('PDF generator method not found.');

    const basic = Number(payslip.basic || 0);
    const breakdownRows = breakdownsByPayrollId[String(payslip.id)] || [];
    const allowanceFromBreakdown = breakdownRows
      .filter(r => !classifyAsDeduction(r))
      .reduce((s, r) => s + Number(r.amount || 0), 0);
    const deductionFromBreakdown = breakdownRows
      .filter(r => classifyAsDeduction(r))
      .reduce((s, r) => s + Number(r.amount || 0), 0);

    const allowance = allowanceFromBreakdown || Number(payslip.allowance ?? 0);
    const deduction = deductionFromBreakdown || Number(payslip.deduction ?? 0);
    const gross = basic + allowance;
    const net = gross - deduction;

    const earningsRows = [{ label: 'Base Salary', amount: basic }];
    const deductionRows = [];

    breakdownRows.forEach(row => {
      const amount = Number(row?.amount || 0);
      if (amount <= 0) return;
      const label = String(row?.type || '').trim() || 'Payroll Component';
      if (classifyAsDeduction(row)) deductionRows.push({ label, amount });
      else earningsRows.push({ label, amount });
    });

    if (earningsRows.length === 1 && allowance > 0) {
      earningsRows.push({ label: 'Allowance', amount: allowance });
    }
    if (deductionRows.length === 0 && deduction > 0) {
      deductionRows.push({ label: 'Deduction', amount: deduction });
    }

    const html = buildPayslipHtml({
      employeeName: payslip.employeeName || userName || 'Employee',
      userRole: userRole || 'Employee',
      month: payslip.month,
      payrollDate: payslip.payrollDate ? String(payslip.payrollDate).slice(0, 10) : '-',
      paymentMode: payslip.paymentMode || 'N/A',
      gross,
      deductionTotal: deduction,
      net,
      earningsRows,
      deductionRows,
    });

    const monthKey = String(payslip.month || 'Month').replace(/[^\w-]/g, '_');
    const dateKey = String(payslip.payrollDate || '').replace(/[^\d]/g, '') || 'nodate';
    const employeeKey = String(payslip.employeeId || myEmployeeId || 'emp').replace(/[^\w-]/g, '_');
    const fileName = `Payslip_${employeeKey}_${monthKey}_${dateKey}_${String(payslip.id || '0')}_${Date.now()}`;

    const result = await generatePDF({
      html,
      fileName,
      directory: Platform.OS === 'ios' ? 'Documents' : 'Download',
      width: 612,
      height: 792,
    });

    const filePath = result?.filePath || '';
    if (!filePath) throw new Error('Unable to resolve generated PDF path.');

    await FileViewer.open(filePath, { showOpenWithDialog: true, showAppsSuggestions: true });
  } catch {
    Alert.alert('Download failed', 'Could not generate payslip. Please try again.');
  }
}
