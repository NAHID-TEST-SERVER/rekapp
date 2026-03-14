import React, { useState, useEffect } from 'react';
import { Package, Eye, X } from 'lucide-react';
import { toBanglaNumber, formatPrice, formatDate } from '../../utils';
import { motion, AnimatePresence } from 'motion/react';

export default function OrderHistory({ userData, orders = [], initialFilter = null }: { userData: any, orders?: any[], initialFilter?: string | null }) {
  const [filter, setFilter] = useState<string | null>(initialFilter);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  useEffect(() => {
    if (selectedOrder) {
      const updatedOrder = orders.find(o => o.id === selectedOrder.id);
      if (!updatedOrder) {
        setSelectedOrder(null);
      } else {
        setSelectedOrder(updatedOrder);
      }
    }
  }, [orders]);

  const filteredOrders = orders.filter(order => {
    if (filter === 'running') return order.status !== 'delivered' && order.status !== 'Delivered' && order.status !== 'ডেলিভার্ড';
    if (filter === 'delivered') return order.status === 'delivered' || order.status === 'Delivered' || order.status === 'ডেলিভার্ড';
    return true;
  });

  const getStatusText = (status: string) => {
    switch(status) {
      case 'pending': return 'পেন্ডিং';
      case 'processing': return 'প্রক্রিয়াধীন';
      case 'shipped': return 'শিপড';
      case 'delivered': return 'ডেলিভার্ড';
      case 'cancelled': return 'বাতিল';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'delivered': return 'bg-green-100 text-green-600';
      case 'cancelled': return 'bg-red-100 text-red-600';
      default: return 'bg-orange-100 text-orange-600';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">অর্ডার ইতিহাস</h3>
        <div className="flex gap-2">
          <button 
            onClick={() => setFilter(null)}
            className={`px-3 py-1 text-xs rounded-full font-bold transition-colors ${filter === null ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            সব
          </button>
          <button 
            onClick={() => setFilter('running')}
            className={`px-3 py-1 text-xs rounded-full font-bold transition-colors ${filter === 'running' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            চলমান
          </button>
          <button 
            onClick={() => setFilter('delivered')}
            className={`px-3 py-1 text-xs rounded-full font-bold transition-colors ${filter === 'delivered' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            ডেলিভার্ড
          </button>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">কোনো অর্ডার পাওয়া যায়নি</p>
        </div>
      ) : (
        <div className="w-[95%] mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-7 gap-2 p-2 bg-gray-50 text-[10px] font-bold text-gray-500 uppercase border-b border-gray-100">
            <div className="col-span-1">নং</div>
            <div className="col-span-2">অর্ডার আইডি</div>
            <div className="col-span-1">তারিখ</div>
            <div className="col-span-1">মোট</div>
            <div className="col-span-1 text-center">স্ট্যাটাস</div>
            <div className="col-span-1 text-right">অ্যাকশন</div>
          </div>
          <div className="divide-y divide-gray-50">
            {filteredOrders.map((order, index) => (
              <div key={order.id} className="grid grid-cols-7 gap-2 items-center px-2 py-2 hover:bg-gray-50 transition-colors text-[11px]">
                <div className="col-span-1 text-gray-400 font-mono">{toBanglaNumber(index + 1)}</div>
                <div className="col-span-2 font-bold text-gray-800 truncate">{order.id.slice(0, 8).toUpperCase()}</div>
                <div className="col-span-1 text-gray-600">{formatDate(order.createdAt)}</div>
                <div className="col-span-1 font-bold text-primary">{formatPrice(order.totalAmount || order.total)}</div>
                <div className="col-span-1 text-center">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </div>
                <div className="col-span-1 text-right">
                  <button 
                    onClick={() => setSelectedOrder(order)}
                    className="p-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors inline-flex"
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg">অর্ডার বিস্তারিত</h3>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 bg-white hover:bg-gray-100 rounded-full transition-colors shadow-sm"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">অর্ডার আইডি</p>
                    <p className="font-mono font-bold text-gray-800">{selectedOrder.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">তারিখ</p>
                    <p className="text-sm font-bold text-gray-800">{formatDate(selectedOrder.createdAt)}</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">স্ট্যাটাস</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(selectedOrder.status)}`}>
                      {getStatusText(selectedOrder.status)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">পেমেন্ট মেথড</span>
                    <span className="text-sm font-bold text-gray-800 uppercase">{selectedOrder.paymentMethod || 'COD'}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="font-bold text-gray-800">মোট মূল্য</span>
                    <span className="font-bold text-primary text-lg">{formatPrice(selectedOrder.totalAmount || selectedOrder.total)}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm mb-3 text-gray-800">অর্ডারকৃত আইটেম</h4>
                  <div className="space-y-3">
                    {selectedOrder.items?.map((item: any, i: number) => (
                      <div key={i} className="flex gap-3 items-center border border-gray-100 p-2 rounded-xl">
                        <img src={item.productImage} alt={item.productName} className="w-12 h-12 object-cover rounded-lg bg-gray-50" />
                        <div className="flex-1">
                          <p className="text-xs font-bold text-gray-800 line-clamp-1">{item.productName}</p>
                          <p className="text-[10px] text-gray-500">পরিমাণ: {toBanglaNumber(item.quantity)}</p>
                        </div>
                        <p className="text-sm font-bold text-primary">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedOrder.shippingAddress && (
                  <div>
                    <h4 className="font-bold text-sm mb-2 text-gray-800">ডেলিভারি ঠিকানা</h4>
                    <div className="bg-gray-50 p-3 rounded-xl text-xs text-gray-600 space-y-1">
                      <p><span className="font-bold">নাম:</span> {selectedOrder.shippingAddress.name}</p>
                      <p><span className="font-bold">মোবাইল:</span> {selectedOrder.shippingAddress.mobile}</p>
                      <p><span className="font-bold">ঠিকানা:</span> {selectedOrder.shippingAddress.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
