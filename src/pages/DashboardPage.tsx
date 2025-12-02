import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Package, Star, DollarSign, Eye, Edit, Trash2, CheckCircle, XCircle, Clock, TrendingUp, Calendar, CreditCard, History, Wallet, CalendarPlus } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { itemsAPI, bookingsAPI, authAPI } from '../services/api';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user,fetchProfile } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [myItems, setMyItems] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [walletAmount, setWalletAmount] = useState('');
  const [isAddingWallet, setIsAddingWallet] = useState(false);
  const [extendRentalModal, setExtendRentalModal] = useState<{
    isOpen: boolean;
    item: any | null;
    booking: any | null;
  }>({ isOpen: false, item: null, booking: null });
  const [newEndDate, setNewEndDate] = useState('');
  const [stats, setStats] = useState({
    totalItems: 0,
    activeBookings: 0,
    totalEarnings: 0,
    pendingRequests: 0
  });

  useEffect(() => {
    if (!user) return;
    fetchDashboardData();
  }, [user]);

  // Refresh data when user returns to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        fetchDashboardData();
      }
    };

    const handleFocus = () => {
      if (user) {
        fetchDashboardData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      // console.log("Token being used:", sessionStorage.getItem("auth-storage"));

      const [itemsResponse, bookingsResponse, allBookingsResponse, requestsResponse] = await Promise.all([
        itemsAPI.getUserItems(),
        bookingsAPI.getUserBookings({ type: 'borrower' }),
        bookingsAPI.getUserBookings({ type: 'all' }),
        bookingsAPI.getUserBookings({ type: 'lender', status: 'pending' })
      ]);

      // console.log("Items response:", itemsResponse.data);

      setMyItems(itemsResponse.data.data.items);
      setMyBookings(bookingsResponse.data.data.bookings);
      setAllBookings(allBookingsResponse.data.data.bookings);
      setRequests(requestsResponse.data.data.bookings);

      const totalItems = itemsResponse.data.data.items.length;
      const activeBookings = bookingsResponse.data.data.bookings.filter(
        (booking: any) => booking.status === 'active'
      ).length;
      const totalEarnings = user?.stats?.totalEarnings || 0;
      const pendingRequests = requestsResponse.data.data.bookings.length;

      setStats({ totalItems, activeBookings, totalEarnings, pendingRequests });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookingAction = async (bookingId: string, action: 'approve' | 'reject') => {
    try {
      await bookingsAPI.updateBookingStatus(bookingId, {
        status: action === 'approve' ? 'approved' : 'rejected'
      });
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error updating booking:', error);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'items', label: 'My Items', icon: Package },
    { id: 'bookings', label: 'My Bookings', icon: Calendar },
    { id: 'history', label: 'Rental History', icon: History },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'requests', label: 'Requests', icon: Clock }
  ];

  const handleEditItem = (itemId: string) => {
    navigate(`/add-item?edit=${itemId}`);
  };

  const handleDeleteItem = async (itemId: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this item? This action cannot be undone.');
    if (!confirmDelete) return;
    try {
      await itemsAPI.deleteItem(itemId);
      fetchDashboardData();
      await fetchProfile();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete item');
    }
  };

  const handleExtendRental = (item: any) => {
    if (item.rentalStatus?.isRented) {
      setExtendRentalModal({
        isOpen: true,
        item: item,
        booking: item.rentalStatus.currentBooking
      });
      setNewEndDate(item.rentalStatus.rentedUntil);
    }
  };

  const handleExtendRentalSubmit = async () => {
    if (!extendRentalModal.booking || !newEndDate) return;

    try {
      await itemsAPI.extendRental({
        bookingId: extendRentalModal.booking._id,
        newEndDate: newEndDate
      });

      alert('Rental period extended successfully!');
      setExtendRentalModal({ isOpen: false, item: null, booking: null });
      setNewEndDate('');
      await fetchProfile();
      fetchDashboardData(); // Refresh data
    } catch (error: any) {
      console.error('Error extending rental:', error);
      alert(error.response?.data?.message || 'Error extending rental');
    }
  };

  const handleAddToWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAmount || parseFloat(walletAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      setIsAddingWallet(true);
      await authAPI.addToWallet({ amount: parseFloat(walletAmount) });
      await fetchProfile();
      setWalletAmount('');
      fetchDashboardData(); // Refresh to get updated balance
      alert(`₹${walletAmount} added to your wallet successfully!`);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to add money to wallet');
    } finally {
      setIsAddingWallet(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.name}!</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Wallet Balance</p>
                <p className="text-2xl font-bold text-green-600">₹{user?.wallet?.balance?.toLocaleString() || 0}</p>
                <button
                  onClick={() => setActiveTab('wallet')}
                  className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                >
                  Manage Wallet
                </button>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">My Items</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalItems}</p>
                <button
                  onClick={() => setActiveTab('items')}
                  className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                >
                  Manage Items
                </button>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">My Bookings</p>
                <p className="text-2xl font-bold text-purple-600">{stats.activeBookings}</p>
                <button
                  onClick={() => setActiveTab('bookings')}
                  className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                >
                  Manage Bookings
                </button>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                <p className="text-2xl font-bold text-orange-600">₹{stats.totalEarnings.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/add-item"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Plus className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">List New Item</p>
                <p className="text-sm text-gray-600">Add an item to rent out</p>
              </div>
            </Link>

            <Link
              to="/items"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Package className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Browse Items</p>
                <p className="text-sm text-gray-600">Find items to rent</p>
              </div>
            </Link>

            <Link
              to="/bookings"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Calendar className="h-8 w-8 text-orange-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">View All Bookings and Rentals</p>
                <p className="text-sm text-gray-600">Manage your rentals</p>
              </div>
            </Link>

            <Link
              to="/profile"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Star className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Update Profile</p>
                <p className="text-sm text-gray-600">Manage your account</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    {tab.label}
                    {tab.id === 'requests' && stats.pendingRequests > 0 && (
                      <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                        {stats.pendingRequests}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                  <div className="space-y-4">
                    {myBookings.slice(0, 3).map((booking: any) => (
                      <div key={booking._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <img
                            src={booking.item.images[0] || 'https://images.pexels.com/photos/230544/pexels-photo-230544.jpeg'}
                            alt={booking.item.title}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{booking.item.title}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                            booking.status === 'active' ? 'bg-blue-100 text-blue-800' :
                              booking.status === 'approved' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                          }`}>
                          {booking.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* My Items Tab */}
            {activeTab === 'items' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">My Items ({myItems.length})</h3>
                  <Link
                    to="/add-item"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Link>
                </div>

                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    ))}
                  </div>
                ) : myItems.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No items listed yet</h3>
                    <p className="text-gray-600 mb-6">Start earning by listing your first item</p>
                    <Link
                      to="/add-item"
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      List Your First Item
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myItems.map((item: any) => (
                      <div key={item._id} className="bg-gray-50 rounded-lg overflow-hidden">
                        <img
                          src={item.images[0] || 'https://images.pexels.com/photos/230544/pexels-photo-230544.jpeg'}
                          alt={item.title}
                          className="w-full h-48 object-cover"
                        />
                        <div className="p-4">
                          <h4 className="font-medium text-gray-900 mb-2">{item.title}</h4>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-lg font-bold text-blue-600">₹{item.dailyPrice}/day</span>
                            <div className="flex items-center">
                              <Star className="h-4 w-4 text-yellow-400 fill-current" />
                              <span className="text-sm text-gray-600 ml-1">
                                {item.rating.average.toFixed(1)} ({item.rating.count})
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.rentalStatus?.isRented
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                              }`}>
                              {item.rentalStatus?.isRented ? 'Rented' : 'Available'}
                            </span>
                            <div className="flex space-x-2">
                              <Link
                                to={`/items/${item._id}`}
                                className="p-1 text-gray-400 hover:text-blue-600"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                              {item.rentalStatus?.isRented && (
                                <button
                                  onClick={() => handleExtendRental(item)}
                                  className="p-1 text-gray-400 hover:text-purple-600"
                                  title="Extend rental"
                                >
                                  <CalendarPlus className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleEditItem(item._id)}
                                className="p-1 text-gray-400 hover:text-green-600"
                                title="Edit item"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item._id)}
                                className="p-1 text-gray-400 hover:text-red-600"
                                title="Delete item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* My Bookings Tab */}
            {activeTab === 'bookings' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">My Bookings ({myBookings.length})</h3>
                  <Link
                    to="/bookings"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    View All Bookings
                  </Link>
                </div>

                {isLoading ? (
                  <div className="space-y-4">

                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse p-4 border border-gray-200 rounded-lg">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    ))}
                  </div>
                ) : myBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
                    <p className="text-gray-600 mb-6">Start renting items from the community</p>
                    <Link
                      to="/items"
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Browse Items
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myBookings.map((booking: any) => (
                      <div key={booking._id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <img
                              src={booking.item.images[0] || 'https://images.pexels.com/photos/230544/pexels-photo-230544.jpeg'}
                              alt={booking.item.title}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                            <div>
                              <h4 className="font-medium text-gray-900">{booking.item.title}</h4>
                              <p className="text-sm text-gray-600">
                                {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                              </p>
                              <p className="text-sm text-gray-600">
                                Owner: {booking.lender.name}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                                booking.status === 'active' ? 'bg-blue-100 text-blue-800' :
                                  booking.status === 'approved' ? 'bg-yellow-100 text-yellow-800' :
                                    booking.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-800'
                              }`}>
                              {booking.status}
                            </span>
                            <p className="text-sm text-gray-600 mt-1">
                              ₹{(booking.totalAmount || booking.pricing?.totalAmount || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Wallet Tab */}
            {activeTab === 'wallet' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-6">Wallet Management</h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Add Money */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <CreditCard className="h-5 w-5 mr-2" />
                      Add Money to Wallet
                    </h4>
                    <form onSubmit={handleAddToWallet} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Amount (₹)
                        </label>
                        <input
                          type="number"
                          value={walletAmount}
                          onChange={(e) => setWalletAmount(e.target.value)}
                          placeholder="Enter amount"
                          min="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isAddingWallet || !walletAmount}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                        {isAddingWallet ? 'Adding...' : 'Add to Wallet'}
                      </button>
                    </form>
                  </div>

                  {/* Transaction History */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {user?.wallet?.transactions?.length === 0 ? (
                        <p className="text-gray-600 text-center py-4">No transactions yet</p>
                      ) : (
                        user?.wallet?.transactions?.slice(-10).reverse().map((transaction: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-white rounded-lg">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{transaction.description}</p>
                              <p className="text-xs text-gray-500">{new Date(transaction.date).toLocaleDateString()}</p>
                            </div>
                            <span className={`text-sm font-semibold ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                              }`}>
                              {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Rental History Tab */}
            {activeTab === 'history' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-6">Complete Rental History</h3>

                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse p-4 border border-gray-200 rounded-lg">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    ))}
                  </div>
                ) : allBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No rental history</h3>
                    <p className="text-gray-600">Your rental activities will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allBookings.map((booking: any) => (
                      <div key={booking._id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <img
                              src={booking.item?.images?.[0] || 'https://images.pexels.com/photos/230544/pexels-photo-230544.jpeg'}
                              alt={booking.item?.title}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                            <div>
                              <h4 className="font-medium text-gray-900">{booking.item?.title}</h4>
                              <p className="text-sm text-gray-600">
                                {booking.borrower?._id === user?._id ? 'You rented from' : 'You rented to'} {booking.borrower?._id === user?._id ? booking.lender?.name : booking.borrower?.name}
                              </p>
                              <p className="text-sm text-gray-600">
                                {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                                booking.status === 'active' ? 'bg-blue-100 text-blue-800' :
                                  booking.status === 'approved' ? 'bg-yellow-100 text-yellow-800' :
                                    booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-800'
                              }`}>
                              {booking.status}
                            </span>
                            <p className="text-sm text-gray-600 mt-1">
                              ₹{booking.pricing?.totalAmount?.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Requests Tab */}
            {activeTab === 'requests' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-6">
                  Booking Requests ({requests.length})
                </h3>

                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse p-4 border border-gray-200 rounded-lg">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    ))}
                  </div>
                ) : requests.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No pending requests</h3>
                    <p className="text-gray-600">New booking requests will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requests.map((request: any) => (
                      <div key={request._id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <img
                              src={request.item.images[0] || 'https://images.pexels.com/photos/230544/pexels-photo-230544.jpeg'}
                              alt={request.item.title}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                            <div>
                              <h4 className="font-medium text-gray-900">{request.item.title}</h4>
                              <p className="text-sm text-gray-600">
                                Requested by: {request.borrower.name}
                              </p>
                              <p className="text-sm text-gray-600">
                                {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                              </p>
                              {request.totalAmount && (
                                <p className="text-sm font-medium text-green-600">
                                  ₹{request.totalAmount.toLocaleString()}
                                </p>
                              )}

                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleBookingAction(request._id, 'approve')}
                              className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleBookingAction(request._id, 'reject')}
                              className="flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </button>
                          </div>
                        </div>
                        {request.message && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">
                              <strong>Message:</strong> {request.message}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Extend Rental Modal */}
      {extendRentalModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Extend Rental Period
            </h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Item: {extendRentalModal.item?.title}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Current rental ends: {new Date(extendRentalModal.booking?.endDate).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Rented by: {extendRentalModal.booking?.borrower?.name}
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New End Date
              </label>
              <input
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="New end date for rental extension"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setExtendRentalModal({ isOpen: false, item: null, booking: null })}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExtendRentalSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Extend Rental
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
