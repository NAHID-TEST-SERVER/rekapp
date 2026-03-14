export function removeUndefined(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  }

  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, removeUndefined(value)])
    );
  }

  return obj;
}

export function sanitizeProducts(cartItems: any[]) {
  return (cartItems || []).map((item) => ({
    id: String(item.id || ""),
    productName: String(item.productName || item.name || ""),
    productPrice: Number(item.productPrice || item.price || 0),
    quantity: Number(item.quantity || 1)
  }));
}

export function sanitizeAddress(selectedAddress: any) {
  if (typeof selectedAddress === 'string') {
    return selectedAddress;
  }
  return String(selectedAddress?.fullAddress || selectedAddress?.label || "");
}
