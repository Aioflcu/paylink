class LoginInsightsService {
  static async cleanupOldRecords(daysOld = 90) {
    try {
      const { db } = await import('../firebase');
      const { collection, query, where, getDocs, deleteDoc } = await import('firebase/firestore');

      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      const loginHistoryRef = collection(db, 'loginHistory');

      // Firestore doesn't support delete queries directly, so we need to fetch and delete individually
      // In production, this should be done with Cloud Functions for better performance
      const oldRecordsQuery = query(
        loginHistoryRef,
        where('timestamp', '<', cutoffDate)
      );

      const querySnapshot = await getDocs(oldRecordsQuery);
      let deletedCount = 0;

      const deletePromises = querySnapshot.docs.map(async (doc) => {
        await deleteDoc(doc.ref);
        deletedCount++;
      });

      await Promise.all(deletePromises);

      console.log(`Cleaned up ${deletedCount} old login records`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up login records:', error);
      return 0;
    }
  }
}

export default LoginInsightsService;
