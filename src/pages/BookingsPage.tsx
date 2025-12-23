import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Star, MessageCircle, CheckCircle, XCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { bookingsAPI, reviewsAPI, complaintsAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';

const BookingsPage = () => {
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [reviewingBooking, setReviewingBooking] = useState<any>(null);
  const [reviewData, setReviewData] = useState({ type: 'item', rating: 5, comment: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [complainingBooking, setComplainingBooking] = useState<any>(null);
  const [complaintData, setComplaintData] = useState({ type: 'other', subject: '', description: '' });
  const [complaintEvidence, setComplaintEvidence] = useState<FileList | null>(null);
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [activeTab]);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const params = activeTab !== 'all' ? { status: activeTab } : {};
      const response = await bookingsAPI.getUserBookings(params);
      setBookings(response.data.data.bookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (bookingId: string, status: string, note?: string) => {
    try {
      await bookingsAPI.updateBookingStatus(bookingId, { status, note });
      fetchBookings();
      setSelectedBooking(null);
    } catch (error) {
      console.error('Error updating booking status:', error);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent, bookingId: string) => {
    e.preventDefault();
    try {
      setIsSubmittingReview(true);
      await reviewsAPI.createReview({
        bookingId,
        type: reviewData.type,
        rating: reviewData.rating,
        comment: reviewData.comment
      });
      setReviewData({ type: 'item', rating: 5, comment: '' });
      setReviewingBooking(null);
      fetchBookings();
      alert('Review submitted successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error submitting review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complainingBooking) return;
    
    try {
      setIsSubmittingComplaint(true);
      const formDataToSend = new FormData();
      
      // Determine defendant (the other party)
      const defendantId = complainingBooking.borrower._id === user?._id 
        ? complainingBooking.lender._id 
        : complainingBooking.borrower._id;
      
      formDataToSend.append('defendantId', defendantId);
      formDataToSend.append('bookingId', complainingBooking._id);
      formDataToSend.append('type', complaintData.type);
      formDataToSend.append('subject', complaintData.subject);
      formDataToSend.append('description', complaintData.description);
      
      if (complaintEvidence) {
        Array.from(complaintEvidence).forEach((file) => {
          formDataToSend.append('evidence', file);
        });
      }

      await complaintsAPI.createComplaint(formDataToSend);
      setComplaintData({ type: 'other', subject: '', description: '' });
      setComplaintEvidence(null);
      setComplainingBooking(null);
      fetchBookings();
      alert('Complaint filed successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error filing complaint');
    } finally {
      setIsSubmittingComplaint(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'active': return <AlertCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const tabs = [
    { id: 'all', label: 'All Bookings' },
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'active', label: 'Active' },
    { id: 'completed', label: 'Completed' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
        <p className="text-gray-600">Manage your rental bookings and requests</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Bookings List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-32 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
          <p className="text-gray-600 mb-6">You haven't made any bookings yet.</p>
          <a
            href="/items"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Items
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookings.map((booking: any) => (
            <div key={booking._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Item Image */}
              <div className="aspect-w-16 aspect-h-9">
                <img
                  src={booking.item.images?.[0] || 'https://images.pexels.com/photos/230544/pexels-photo-230544.jpeg'}
                  alt={booking.item.title}
                  className="w-full h-48 object-cover"
                />
              </div>

              <div className="p-6">
                {/* Status Badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                    {getStatusIcon(booking.status)}
                    <span className="ml-1 capitalize">{booking.status}</span>
                  </span>
                  <span className="text-sm text-gray-500">
                    {booking.borrower._id === user?._id ? 'Borrowing' : 'Lending'}
                  </span>
                </div>

                {/* Item Details */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{booking.item.title}</h3>
                
                {/* Dates */}
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>
                    {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                  </span>
                </div>

                {/* Duration & Price */}
                <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                  <span>{booking.pricing.totalDays} days</span>
                  <span className="font-semibold text-gray-900">₹{booking.pricing.totalAmount.toLocaleString()}</span>
                </div>

                {/* Other Party */}
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                    {booking.borrower._id === user?._id ? (
                      booking.lender.profileImage ? (
                        <img src={booking.lender.profileImage} alt={booking.lender.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <span className="text-xs font-medium">{booking.lender.name.charAt(0)}</span>
                      )
                    ) : (
                      booking.borrower.profileImage ? (
                        <img src={booking.borrower.profileImage} alt={booking.borrower.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <span className="text-xs font-medium">{booking.borrower.name.charAt(0)}</span>
                      )
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {booking.borrower._id === user?._id ? booking.lender.name : booking.borrower.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {booking.borrower._id === user?._id ? 'Lender' : 'Borrower'}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  {booking.status === 'pending' && booking.lender._id === user?._id && (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(booking._id, 'approved')}
                        className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(booking._id, 'cancelled')}
                        className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  
                  {booking.status === 'approved' && booking.lender._id === user?._id && (
                    <button
                      onClick={() => handleStatusUpdate(booking._id, 'active')}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                    >
                      Mark as Picked Up
                    </button>
                  )}
                  
                  {booking.status === 'active' && booking.lender._id === user?._id && (
                    <button
                      onClick={() => handleStatusUpdate(booking._id, 'completed')}
                      className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors"
                    >
                      Mark as Returned
                    </button>
                  )}
                  
                  {booking.status === 'completed' && (
                    <>
                      <button
                        onClick={() => {
                          // Set default review type based on user role
                          const isBorrower = booking.borrower._id === user?._id;
                          setReviewData({ 
                            type: isBorrower ? 'item' : 'user', 
                            rating: 5, 
                            comment: '' 
                          });
                          setReviewingBooking(booking);
                        }}
                        className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                      >
                        <Star className="h-4 w-4 inline mr-1" />
                        Review
                      </button>
                      <button
                        onClick={() => {
                          setComplaintData({ type: 'other', subject: '', description: '' });
                          setComplaintEvidence(null);
                          setComplainingBooking(booking);
                        }}
                        className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors"
                      >
                        <AlertTriangle className="h-4 w-4 inline mr-1" />
                        File Complaint
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => setSelectedBooking(booking)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                    title="View booking details"
                    aria-label="View booking details"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {reviewingBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Submit Review</h2>
                <button
                  onClick={() => {
                    setReviewingBooking(null);
                    setReviewData({ type: 'item', rating: 5, comment: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  title="Close review form"
                  aria-label="Close review form"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={(e) => handleSubmitReview(e, reviewingBooking._id)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Review Type
                  </label>
                  <select
                    value={reviewData.type}
                    onChange={(e) => setReviewData(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={reviewingBooking && reviewingBooking.borrower._id !== user?._id}
                  >
                    <option value="item">Review Item</option>
                    <option value="user">Review User</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    {reviewData.type === 'item' 
                      ? 'Review the item you rented (only borrowers can review items)' 
                      : 'Review the other user'}
                    {reviewingBooking && reviewingBooking.borrower._id !== user?._id && (
                      <span> - As a lender, you can only review the user.</span>
                    )}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rating
                  </label>
                  <select
                    value={reviewData.rating}
                    onChange={(e) => setReviewData(prev => ({ ...prev, rating: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {[5, 4, 3, 2, 1].map(r => (
                      <option key={r} value={r}>{r} {r === 1 ? '⭐' : r === 2 ? '⭐⭐' : r === 3 ? '⭐⭐⭐' : r === 4 ? '⭐⭐⭐⭐' : '⭐⭐⭐⭐⭐'}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comment (Optional)
                  </label>
                  <textarea
                    value={reviewData.comment}
                    onChange={(e) => setReviewData(prev => ({ ...prev, comment: e.target.value }))}
                    placeholder="Share your experience..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={500}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {reviewData.comment.length}/500 characters
                  </p>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setReviewingBooking(null);
                      setReviewData({ type: 'item', rating: 5, comment: '' });
                    }}
                    className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Complaint Modal */}
      {complainingBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">File a Complaint</h2>
                <button
                  onClick={() => {
                    setComplainingBooking(null);
                    setComplaintData({ type: 'other', subject: '', description: '' });
                    setComplaintEvidence(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  title="Close complaint form"
                  aria-label="Close complaint form"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Booking:</strong> {complainingBooking.item.title}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Against:</strong> {complainingBooking.borrower._id === user?._id 
                    ? complainingBooking.lender.name 
                    : complainingBooking.borrower.name}
                </p>
              </div>
              
              <form onSubmit={handleSubmitComplaint} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Complaint Type *
                  </label>
                  <select
                    value={complaintData.type}
                    onChange={(e) => setComplaintData(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="item_damage">Item Damage</option>
                    <option value="late_return">Late Return</option>
                    <option value="no_show">No Show</option>
                    <option value="inappropriate_behavior">Inappropriate Behavior</option>
                    <option value="payment_issue">Payment Issue</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={complaintData.subject}
                    onChange={(e) => setComplaintData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Brief description of the issue"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    maxLength={100}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {complaintData.subject.length}/100 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={complaintData.description}
                    onChange={(e) => setComplaintData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Provide detailed information about the complaint..."
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    maxLength={1000}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {complaintData.description.length}/1000 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Evidence (Optional)
                  </label>
                  <input
                    type="file"
                    title='Upload EVidence'
                    multiple
                    accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                    onChange={(e) => setComplaintEvidence(e.target.files)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Upload images, PDFs, or documents as evidence (up to 3 files)
                  </p>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setComplainingBooking(null);
                      setComplaintData({ type: 'other', subject: '', description: '' });
                      setComplaintEvidence(null);
                    }}
                    className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingComplaint}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmittingComplaint ? 'Filing...' : 'File Complaint'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Booking Details</h2>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Close booking details"
                  aria-label="Close booking details"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              {/* Booking details content would go here */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedBooking.item.title}</h3>
                  <p className="text-gray-600">Booking ID: {selectedBooking._id}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Start Date</p>
                    <p className="font-medium">{new Date(selectedBooking.startDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">End Date</p>
                    <p className="font-medium">{new Date(selectedBooking.endDate).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="text-2xl font-bold text-green-600">₹{selectedBooking.pricing.totalAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsPage;