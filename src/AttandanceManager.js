// src/AttendanceManager.js
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

function AttendanceManager({ eventId }) {
  const [attendance, setAttendance] = useState([]);

  useEffect(() => {
    fetchAttendance();
  }, [eventId]);

  const fetchAttendance = async () => {
    const q = query(
      collection(db, 'attendance'),
      where('eventId', '==', eventId)
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setAttendance(data);
  };

  return (
    <div>
      <h3>Attendance Records</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>User ID</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Time</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {attendance.map(record => (
            <tr key={record.id}>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>{record.userId}</td>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                {record.timestamp?.toDate().toLocaleString()}
              </td>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>{record.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}