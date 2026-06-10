import React, { useContext, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthContext } from '../../state/AuthContext';
import { AppStoreContext } from '../../state/AppStore';
import hrApi from '../../api/hrApi';
import { classifyAsDeduction, downloadPayslip } from '../../utils/payslipDownload';

export default function EmpPayrollScreen() {
  const { user } = useContext(AuthContext);
  const { payrolls } = useContext(AppStoreContext);
  const [breakdownsByPayrollId, setBreakdownsByPayrollId] = useState({});

  const myEmployeeId = String(user.employeeId || user.id);
  const myPayrolls = payrolls
    .filter(p => String(p.employeeId) === myEmployeeId)
    .sort((a, b) => {
      const aTime = new Date(a.payrollDate || `${a.month}-01` || 0).getTime();
      const bTime = new Date(b.payrollDate || `${b.month}-01` || 0).getTime();
      return aTime - bTime;
    });


  useEffect(() => {
    let alive = true;

    const loadBreakdowns = async () => {
      if (!myEmployeeId) return;

      try {
        const { data } = await hrApi.get(`/payrolls/employee/${myEmployeeId}/breakdowns`);
        const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

        const grouped = rows.reduce((acc, row) => {
          const key = String(row.fk_payroll_id || row.payroll_id || '');
          if (!key) return acc;
          if (!acc[key]) acc[key] = [];
          acc[key].push(row);
          return acc;
        }, {});

        if (alive) setBreakdownsByPayrollId(grouped);
      } catch (e) {
        if (alive) setBreakdownsByPayrollId({});
      }
    };

    loadBreakdowns();
    return () => {
      alive = false;
    };
  }, [myEmployeeId]);

  const summaryByPayrollId = useMemo(() => {
    const out = {};
    Object.entries(breakdownsByPayrollId).forEach(([payrollId, rows]) => {
      const sums = rows.reduce(
        (acc, row) => {
          const amount = Number(row?.amount || 0);
          if (classifyAsDeduction(row)) acc.deduction += amount;
          else acc.allowance += amount;
          return acc;
        },
        { allowance: 0, deduction: 0 },
      );
      out[payrollId] = sums;
    });
    return out;
  }, [breakdownsByPayrollId]);

  const onDownloadPayslip = payslip =>
    downloadPayslip(payslip, {
      myEmployeeId,
      userName: user?.name,
      userRole: user?.role,
      breakdownsByPayrollId,
    });

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>My Payslips</Text>

      {myPayrolls.length === 0 ? (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons
            name="cash-multiple"
            size={44}
            color="#9ca3af"
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyTitle}>No payslips yet</Text>
          <Text style={styles.emptySubtitle}>
            Your payslips will appear here once generated.
          </Text>
        </View>
      ) : (
        myPayrolls.map(p => {
          const basic = Number(p.basic || 0);
          const summary = summaryByPayrollId[String(p.id)];
          const allowance = Number(summary?.allowance ?? p.allowance ?? 0);
          const deduction = Number(summary?.deduction ?? p.deduction ?? 0);
          const net = basic + allowance - deduction;

          return (
            <View key={p.id} style={styles.payCard}>
              <View style={styles.payHeader}>
                <View>
                  <Text style={styles.payMonth}>{p.month}</Text>
                </View>
                <View style={styles.netBadge}>
                  <Text style={styles.netAmount}>Rs {net.toLocaleString('en-IN')}</Text>
                  <Text style={styles.netLabel}>Net Pay</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.breakdownRow}>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Basic</Text>
                  <Text style={styles.breakdownValue}>Rs {basic.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.breakdownSep} />
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Allowance</Text>
                  <Text style={[styles.breakdownValue, { color: '#16a34a' }]}>
                    +Rs {allowance.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.breakdownSep} />
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Deduction</Text>
                  <Text style={[styles.breakdownValue, { color: '#dc2626' }]}>
                    -Rs {deduction.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.downloadBtn}
                activeOpacity={0.85}
                onPress={() => onDownloadPayslip(p)}
              >
                <MaterialCommunityIcons name="download" size={18} color="#ffffff" />
                <Text style={styles.downloadBtnText}>Download</Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 20, paddingBottom: 32 },

  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 20,
  },

  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: { marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },

  payCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  payHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  payMonth: { fontSize: 17, fontWeight: '800', color: '#0f172a' },

  netBadge: {
    backgroundColor: '#fff1f2',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  netAmount: { fontSize: 20, fontWeight: '900', color: '#e11d48' },
  netLabel: { fontSize: 11, color: '#fb7185', fontWeight: '600', marginTop: 2 },

  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginBottom: 16,
  },

  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownItem: { flex: 1, alignItems: 'center' },
  breakdownSep: { width: 1, height: 36, backgroundColor: '#f3f4f6' },
  breakdownLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginBottom: 5 },
  breakdownValue: { fontSize: 15, fontWeight: '800', color: '#0f172a' },

  downloadBtn: {
    marginTop: 14,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  downloadBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
});
