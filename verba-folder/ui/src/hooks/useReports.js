// hooks/useReports.js
import { useState, useEffect } from 'react';

export function useReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3001/api/reports')  // ensure this is the right port!
      .then(res => res.json())
      .then(data => {
        setReports(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch reports:', err);
        setLoading(false);
      });
  }, []);

  return { reports, loading };
}
