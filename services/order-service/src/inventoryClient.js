import axios from 'axios';
    
export const updateInventory = async (orderData) => {
    try {
        const url = `${process.env.INVENTORY_SERVICE_INTERNAL_URL}/api/inventory-service/update-stock`;
        
        console.log(`[Order Service] 📡 Calling Inventory at: ${url}`);
        const response = await axios.post(url, orderData, {
            timeout: 2000 
        });
        return response.data;
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            return { 
                status: 'timeout', 
                message: 'Inventory service is taking too long. Order queued for retry.' 
            };
        }
        throw error;
    }
};


