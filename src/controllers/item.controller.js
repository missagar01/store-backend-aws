import { getStoreIndentItems } from "../services/item.service.js";

export async function getItems(req, res) {
  try {
    const result = await getStoreIndentItems();
    
    // Return empty array if no items found
    if (!result?.data?.length) {
      return res.json({ 
        success: true, 
        data: [],
        message: "No active store indent items found"
      });
    }

    return res.json(result);
  } catch (err) {
    console.error('[getItems] Controller error:', err);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to fetch store indent items"
    });
  }
}
