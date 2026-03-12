import React, { useContext, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import { AppStoreContext } from '../state/AppStore';

function formatMoney(amount) {
  const n = Number(amount) || 0;
  return `₹${n.toLocaleString('en-IN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })}`;
}

function formatMonthLabel(month) {
  // month is "YYYY-MM"
  const [year, m] = month.split('-');
  const index = Number(m) - 1;
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const safeIndex = index >= 0 && index < monthNames.length ? index : 0;
  return `${monthNames[safeIndex]} ${year}`;
}

export default function ManagePayrollScreen() {
  const { payrolls } = useContext(AppStoreContext);

  const groupedByMonth = useMemo(() => {
    const groups = payrolls.reduce((acc, item) => {
      if (!acc[item.month]) acc[item.month] = [];
      acc[item.month].push(item);
      return acc;
    }, {});

    const months = Object.keys(groups).sort().reverse();
    return months.map(key => ({ month: key, items: groups[key] }));
  }, [payrolls]);

  return (
    <Screen>
      <Card style={styles.topBarCard}>
        <View style={styles.topBarRow}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryTopBtn,
              pressed && styles.primaryTopBtnPressed,
            ]}
          >
            <Text style={styles.primaryTopBtnText}>Generate Payroll</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.primaryTopBtn,
              pressed && styles.primaryTopBtnPressed,
            ]}
          >
            <Text style={styles.primaryTopBtnText}>Generate All Payrolls</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.primaryTopBtn,
              pressed && styles.primaryTopBtnPressed,
            ]}
          >
            <Text style={styles.primaryTopBtnText}>Add Payment</Text>
          </Pressable>
        </View>
      </Card>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {groupedByMonth.map(group => (
          <Card key={group.month} style={styles.monthCard}>
            <View style={styles.monthHeaderRow}>
              <Text style={styles.monthTitle}>{formatMonthLabel(group.month)}</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.publishAllBtn,
                  pressed && styles.publishAllBtnPressed,
                ]}
              >
                <Text style={styles.publishAllText}>Publish All</Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tableScrollContent}
            >
              <View style={styles.tableWrapper}>
                <View style={styles.tableHeaderRow}>
                  {[
                    'Serial No',
                    'Employee Name',
                    'Amount',
                    'Date',
                    'Payment Mode',
                    'Actions',
                  ].map(key => (
                    <Text
                      key={key}
                      style={[
                        styles.th,
                        key === 'Serial No' && styles.colSerial,
                        key === 'Employee Name' && styles.colEmployee,
                        key === 'Amount' && styles.colAmount,
                        key === 'Date' && styles.colDate,
                        key === 'Payment Mode' && styles.colPayment,
                        key === 'Actions' && styles.colActions,
                      ]}
                      numberOfLines={1}
                    >
                      {key}
                    </Text>
                  ))}
                </View>

                {group.items.map((item, index) => {
                  const net =
                    (item.basic || 0) + (item.allowance || 0) - (item.deduction || 0);

                  return (
                    <View key={item.id} style={styles.tableRow}>
                      <Text style={[styles.td, styles.colSerial]} numberOfLines={1}>
                        {index + 1}
                      </Text>
                      <Text style={[styles.td, styles.colEmployee]} numberOfLines={1}>
                        {item.employeeName}
                      </Text>
                      <Text style={[styles.td, styles.colAmount]} numberOfLines={1}>
                        {formatMoney(net)}
                      </Text>
                      <Text style={[styles.td, styles.colDate]} numberOfLines={1}>
                        01 {formatMonthLabel(group.month)}
                      </Text>
                      <Text style={[styles.td, styles.colPayment]} numberOfLines={1}>
                        NEFT
                      </Text>
                      <View style={[styles.colActions, styles.actionsCell]}>
                        {['Edit', 'Delete', 'Published', 'Manage Breakdown'].map(label => (
                          <Pressable
                            key={label}
                            style={({ pressed }) => [
                              styles.actionBtn,
                              label === 'Published' && styles.actionBtnMuted,
                              pressed && styles.actionBtnPressed,
                            ]}
                          >
                            <Text
                              style={[
                                styles.actionText,
                                label === 'Published' && styles.actionTextMuted,
                              ]}
                              numberOfLines={1}
                            >
                              {label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBarCard: {
    marginBottom: 12,
  },
  topBarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  primaryTopBtn: {
    backgroundColor: '#be123c',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 4,
  },
  primaryTopBtnPressed: {
    opacity: 0.85,
  },
  primaryTopBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  scrollContent: {
    paddingBottom: 16,
    gap: 16,
  },
  monthCard: {
    paddingBottom: 12,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  publishAllBtn: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  publishAllBtnPressed: {
    opacity: 0.85,
  },
  publishAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  tableWrapper: {
    minWidth: 700,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    paddingVertical: 8,
  },
  th: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111827',
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  td: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    paddingHorizontal: 8,
  },
  colSerial: {
    width: 70,
  },
  colEmployee: {
    flex: 1.4,
  },
  colAmount: {
    width: 110,
  },
  colDate: {
    width: 130,
  },
  colPayment: {
    width: 120,
  },
  colActions: {
    width: 210,
  },
  actionsCell: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    gap: 6,
  },
  actionBtn: {
    backgroundColor: '#be123c',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  actionBtnMuted: {
    backgroundColor: '#e5e7eb',
  },
  actionBtnPressed: {
    opacity: 0.9,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  actionTextMuted: {
    color: '#111827',
  },
  tableScrollContent: {
    paddingRight: 8,
  },
});

