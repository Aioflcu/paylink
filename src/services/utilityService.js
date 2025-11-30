import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

const purchaseUtility = async (data) => {
  try {
    const purchaseFunction = httpsCallable(functions, 'purchaseUtility');
    const result = await purchaseFunction(data);
    return result.data;
  } catch (error) {
    console.error('Utility purchase error:', error);
    throw error;
  }
};

export default {
  purchaseUtility,
};
