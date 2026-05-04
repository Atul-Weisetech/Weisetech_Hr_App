import React, { useContext, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { AuthContext } from '../../state/AuthContext';
import { AppStoreContext } from '../../state/AppStore';

const TYPE_ICONS = {
  leave: 'Leave',
  wfh: 'WFH',
  payroll: 'Payroll',
  warning: 'Warn',
  performance_warning: 'Warn',
  birthday: 'BDay',
};

const TYPE_COLORS = {
  leave: '#fff1f2',
  wfh: '#f0fdf4',
  payroll: '#fefce8',
  warning: '#fff7ed',
  performance_warning: '#fff7ed',
  birthday: '#eff6ff',
};

export default function EmpNotificationScreen() {
  const { user } = useContext(AuthContext);
  const {
    notificationsByEmployee,
    refreshNotifications,
    markNotificationRead,
  } = useContext(AppStoreContext);

  const employeeId = String(user.employeeId || user.id);
  const notifications = useMemo(
    () => notificationsByEmployee[employeeId] || [],
    [notificationsByEmployee, employeeId],
  );

  useEffect(() => {
    refreshNotifications(employeeId);
  }, [employeeId, refreshNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications],
  );

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => markNotificationRead(n.id, employeeId)));
    await refreshNotifications(employeeId);
  };

  const markRead = async id => {
    await markNotificationRead(id, employeeId);
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.pageTitle}>Notifications</Text>
          {unreadCount > 0 && <Text style={styles.unreadCount}>{unreadCount} unread</Text>}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptySubtitle}>No notifications for you.</Text>
        </View>
      ) : (
        notifications.map(n => (
          <TouchableOpacity
            key={n.id}
            style={[styles.notifCard, !n.read && styles.unreadCard]}
            onPress={() => markRead(n.id)}
            activeOpacity={0.8}
          >
            <View style={[styles.iconCircle, { backgroundColor: TYPE_COLORS[n.type] || '#f3f4f6' }]}>
              <Text style={styles.notifIcon}>{TYPE_ICONS[n.type] || 'Info'}</Text>
            </View>

            <View style={styles.notifBody}>
              <View style={styles.notifTopRow}>
                <Text style={styles.notifTitle}>{n.title}</Text>
                {!n.read && <View style={styles.dot} />}
              </View>
              <Text style={styles.notifMessage}>{n.message}</Text>
              <Text style={styles.notifDate}>{n.date}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 20, paddingBottom: 32 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  unreadCount: { fontSize: 13, color: '#e11d48', fontWeight: '600', marginTop: 3 },
  markAllBtn: {
    backgroundColor: '#fff1f2',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 4,
  },
  markAllText: { color: '#e11d48', fontWeight: '700', fontSize: 12 },
  emptyCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#9ca3af' },
  notifCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  unreadCard: { borderLeftWidth: 3, borderLeftColor: '#e11d48' },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifIcon: { fontSize: 12, fontWeight: '800', color: '#334155' },
  notifBody: { flex: 1 },
  notifTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  notifTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e11d48', marginLeft: 8 },
  notifMessage: { fontSize: 13, color: '#6b7280', lineHeight: 19, marginBottom: 5 },
  notifDate: { fontSize: 11, color: '#9ca3af' },
});
