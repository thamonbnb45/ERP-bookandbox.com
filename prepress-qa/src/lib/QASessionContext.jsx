import { createContext, useContext, useState } from 'react';

const QASessionContext = createContext(null);

export const useQASession = () => {
  const ctx = useContext(QASessionContext);
  if (!ctx) throw new Error('useQASession must be used within QASessionProvider');
  return ctx;
};

/**
 * เก็บ state ของการตรวจ QA ไว้ตลอด จนกว่าจะกดปุ่ม "เสร็จสิ้น"
 * ป้องกันข้อมูลหายเมื่อเปลี่ยนหน้า
 */
export const QASessionProvider = ({ children }) => {
  const [session, setSession] = useState(null);

  const saveSession = (data) => {
    setSession({
      ...data,
      savedAt: new Date().toISOString(),
    });
  };

  const clearSession = () => {
    setSession(null);
  };

  const hasActiveSession = session !== null;

  return (
    <QASessionContext.Provider value={{ session, saveSession, clearSession, hasActiveSession }}>
      {children}
    </QASessionContext.Provider>
  );
};
