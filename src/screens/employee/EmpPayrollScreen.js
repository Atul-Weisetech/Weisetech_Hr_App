import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AuthContext } from '../../state/AuthContext';
import { AppStoreContext } from '../../state/AppStore';

export default function EmpPayrollScreen() {
  const { user } = useContext(AuthContext);
  const { payrolls } = useContext(AppStoreContext);

  const myPayrolls = payrolls.filter(p => p.employeeId === user.id);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>My Payslips</Text>

      {myPayrolls.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>💰</Text>
          <Text style={styles.emptyTitle}>No payslips yet</Text>
          <Text style={styles.emptySubtitle}>
            Your payslips will appear here once generated.
          </Text>
        </View>
      ) : (
        myPayrolls.map(p => {
          const net = p.basic + p.allowance - p.deduction;
          return (
            <View key={p.id} style={styles.payCard}>
              {/* Card Header */}
              <View style={styles.payHeader}>
                <View>
                  <Text style={styles.payMonth}>{p.month}</Text>
                  <Text style={styles.payId}>{p.id}</Text>
                </View>
                <View style={styles.netBadge}>
                  <Text style={styles.netAmount}>
                    ₹{net.toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.netLabel}>Net Pay</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Breakdown */}
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Basic</Text>
                  <Text style={styles.breakdownValue}>
                    ₹{p.basic.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.breakdownSep} />
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Allowance</Text>
                  <Text style={[styles.breakdownValue, { color: '#16a34a' }]}>
                    +₹{p.allowance.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.breakdownSep} />
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Deduction</Text>
                  <Text style={[styles.breakdownValue, { color: '#dc2626' }]}>
                    -₹{p.deduction.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#f3f4f6' },
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
  emptyIcon:     { fontSize: 44, marginBottom: 12 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 6 },
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
  payId:    { fontSize: 12, color: '#9ca3af', marginTop: 3 },

  netBadge: {
    backgroundColor: '#fff1f2',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  netAmount: { fontSize: 20, fontWeight: '900', color: '#e11d48' },
  netLabel:  { fontSize: 11, color: '#fb7185', fontWeight: '600', marginTop: 2 },

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
  breakdownItem:  { flex: 1, alignItems: 'center' },
  breakdownSep:   { width: 1, height: 36, backgroundColor: '#f3f4f6' },
  breakdownLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginBottom: 5 },
  breakdownValue: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
});
