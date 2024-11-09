import { useEffect, useState } from 'react';
import RobotsManager from '../services/robotsManager';

const useRobotsManager = () => {
  const [manager, setManager] = useState<RobotsManager | undefined>(undefined); // Adjust the type as needed
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const setupManager = async () => {
      try {
        setLoading(true);
        const mgr = await RobotsManager.getInstance();
        setManager(mgr);
      } catch (err) {
        setError('Failed to set up robots manager with error: ' + err);
      } finally {
        setLoading(false);
      }
    };

    setupManager();
  }, []); // Empty dependency array means this runs once on mount

  return { manager, loading, error };
};

export default useRobotsManager;
