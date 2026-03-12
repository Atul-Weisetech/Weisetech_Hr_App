import React, { useContext } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import { AppStoreContext } from '../state/AppStore';

export default function ManageWfhScreen() {
  const { wfhRequests, updateWfhStatus } = useContext(AppStoreContext);

  return (
    <Screen>
      <Card style={{ marginBottom: 12 }}>
        <Text style={styles.title}>Manage Work From Home (WFH)</Text>
        <Text style={styles.subtitle}>Approve or reject WFH requests.</Text>
      </Card>

      <Card style={{ flex: 1 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tableScrollContent}
        >
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              {['Employee', 'From', 'To', 'Reason', 'Status', 'Actions'].map(
                h => (
                  <Text key={h} style={styles.th}>
                    {h}
                  </Text>
                ),
              )}
            </View>

            <FlatList
              data={wfhRequests}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <Text style={styles.td}>{item.employeeName}</Text>
                  <Text style={styles.td}>{item.from}</Text>
                  <Text style={styles.td}>{item.to}</Text>
                  <Text style={styles.td} numberOfLines={1}>
                    {item.reason}
                  </Text>
                  <StatusPill status={item.status} />
                  <View style={[styles.td, styles.actions]}>
                    <Pressable
                      onPress={() => updateWfhStatus(item.id, 'Approved')}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        styles.approve,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text style={styles.actionText}>Approve</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => updateWfhStatus(item.id, 'Rejected')}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        styles.reject,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text style={styles.actionText}>Reject</Text>
                    </Pressable>
                  </View>
                </View>
              )}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
            />
          </View>
        </ScrollView>
      </Card>
    </Screen>
  );
}

function StatusPill({ status }) {
  const isApproved = status === 'Approved';
  const isRejected = status === 'Rejected';

  return (
    <View
      style={[
        styles.statusPill,
        isApproved && styles.approvedPill,
        isRejected && styles.rejectedPill,
      ]}
    >
      <Text
        style={[
          styles.statusText,
          isApproved && styles.approvedText,
          isRejected && styles.rejectedText,
        ]}
      >
        {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  subtitle: { marginTop: 4, color: '#64748b', fontWeight: '600' },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  th: { flex: 1, fontWeight: '900', color: '#0f172a', fontSize: 12 },
  row: { flexDirection: 'row', paddingVertical: 12, alignItems: 'center' },
  td: { flex: 1, color: '#334155', fontWeight: '700', fontSize: 12 },
  actions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-start' },
  actionBtn: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  approve: { backgroundColor: '#16a34a' },
  reject: { backgroundColor: '#ef4444' },
  actionText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  sep: { height: 1, backgroundColor: '#f1f5f9' },
  tableScrollContent: {
    flexGrow: 1,
  },
  tableContainer: {
    minWidth: 720,
  },
  statusPill: {
    flex: 1,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: { fontSize: 11, fontWeight: '900', color: '#c2410c' },
  approvedPill: { backgroundColor: '#dcfce7' },
  approvedText: { color: '#15803d' },
  rejectedPill: { backgroundColor: '#fee2e2' },
  rejectedText: { color: '#b91c1c' },
});

