import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Star,
  MapPin,
  Shield,
  User,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Heart,
  Share2
} from 'lucide-react';
import { itemsAPI, bookingsAPI, reviewsAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';

const ItemDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [item, setItem] = useState<any>(null);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [bookingData, setBookingData] = useState({
    startDate: '',
    endDate: '',
    message: ''
  });
  const [isBooking, setIsBooking] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (id) {
      fetchItemDetails();
      fetchReviews();
    }
  }, [id]);

  const fetchItemDetails = async () => {
    try {
      const response = await itemsAPI.getItemById(id!);
      console.log('Fetched item:', response.data);
      const fetched = response.data.data.item;
      setItem({
        ...fetched,
        rating: fetched?.rating || { average: 0, count: 0 }
      });
    } catch (error) {
      console.error('Error fetching item:', error);
      navigate('/items');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await reviewsAPI.getItemReviews(id!, { limit: 10 });
      setReviews(response.data.data.reviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const calculateTotalCost = () => {
    if (!bookingData.startDate || !bookingData.endDate || !item) {
      return { days: 0, rentalCost: 0, deposit: 0, total: 0 };
    }

    const start = new Date(bookingData.startDate);
    const end = new Date(bookingData.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (days <= 0) return { days: 0, rentalCost: 0, deposit: 0, total: 0 };

    const rentalCost = days * (item.dailyPrice || 0);
    const deposit = ((item.itemValue || 0) * (item.depositPercentage || 0)) / 100;

    return { days, rentalCost, deposit, total: rentalCost + deposit };
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!bookingData.startDate || !bookingData.endDate) {
      alert('Please select booking dates');
      return;
    }

  const costs = calculateTotalCost();
    if (costs.days <= 0) {
      alert('End date must be after start date');
      return;
    }

    try {
      setIsBooking(true);
      await bookingsAPI.createBooking({
        itemId: id,
        startDate: bookingData.startDate,
        endDate: bookingData.endDate,
        message: bookingData.message,
        totalAmount: costs.total,
        rentalAmount: costs.rentalCost,
        depositAmount: costs.deposit
      });
      
      alert('Booking request sent successfully!');
      navigate('/bookings');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error creating booking');
    } finally {
      setIsBooking(false);
    }
  };

  const nextImage = () => {
    if (item?.images) {
      setCurrentImageIndex((prev) =>
        prev === item.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  // Favorites (local wishlist)
  useEffect(() => {
    if (!item?._id) return;
    try {
      const raw = localStorage.getItem('favorite-items');
      const ids: string[] = raw ? JSON.parse(raw) : [];
      setIsFavorite(ids.includes(item._id));
    } catch {}
  }, [item?._id]);

  const toggleFavorite = () => {
    if (!item?._id) return;
    try {
      const raw = localStorage.getItem('favorite-items');
      const ids: string[] = raw ? JSON.parse(raw) : [];
      let next: string[];
      if (ids.includes(item._id)) {
        next = ids.filter(idVal => idVal !== item._id);
        setIsFavorite(false);
      } else {
        next = [...ids, item._id];
        setIsFavorite(true);
      }
      localStorage.setItem('favorite-items', JSON.stringify(next));
    } catch {}
  };


  const prevImage = () => {
    if (item?.images) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? item.images.length - 1 : prev - 1
      );
    }
  };

  // Fix image path backslashes
  // Get the filename from the path stored in DB
  const fileName = item?.images?.[currentImageIndex]?.split('\\').pop(); // 'images-1758777185431-735152577.jpg'

  const imageUrl = fileName
  ? `/uploads/items/${fileName}`
  : 'https://images.pexels.com/photos/230544/pexels-photo-230544.jpeg';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-96 bg-gray-200 rounded-lg"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Item not found</h1>
          <Link to="/items" className="text-blue-600 hover:text-blue-700">
            Browse other items
          </Link>
        </div>
      </div>
    );
  }

  // Normalize rating to ensure public visibility even when not set yet
  if (!item.rating) {
    item.rating = { average: 0, count: 0 };
  }

  const costs = calculateTotalCost();
  const isOwner = user?._id === item?.owner?._id;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <Link 
            to="/items" 
            className="text-blue-600 hover:text-blue-700 flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Items
          </Link>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative">
              <img
                src={imageUrl}
                alt={item.title}
                className="w-full h-96 object-cover rounded-lg"
              />
              
              {item.images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
                    aria-label="Previous image"
                    title="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
                    aria-label="Next image"
                    title="Next image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
              
              <div className="absolute top-4 right-4 flex space-x-2">
                <button
                  onClick={toggleFavorite}
                  className="bg-white p-2 rounded-full shadow-md hover:bg-gray-50"
                  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart className={`h-5 w-5 ${isFavorite ? 'text-red-500 fill-current' : 'text-gray-600'}`} />
                </button>
                <button className="bg-white p-2 rounded-full shadow-md hover:bg-gray-50" aria-label="Share item" title="Share item">
                  <Share2 className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>
            
            {/* Thumbnail Images */}
            {item.images.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto">
                {item.images.map((image: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                      index === currentImageIndex ? 'border-blue-500' : 'border-gray-200'
                    }`}
                  >
                    <img
                      src={`/uploads/items/${image.split('\\').pop()}`}
                      alt={`${item.title} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Item Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{item.title}</h1>
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center bg-yellow-50 px-3 py-1.5 rounded-lg">
                  <Star className="h-5 w-5 text-yellow-400 fill-current" />
                  <span className="ml-1 text-sm font-semibold text-gray-700">
                    {item.rating?.average?.toFixed(1) || '0.0'} ({item.rating?.count || 0} reviews)
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-1" />
                  {item.location.city}, {item.location.state}
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-3xl font-bold text-blue-600">₹{item.dailyPrice}</span>
                  <span className="text-gray-600 ml-1">per day</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  item.availability?.isAvailable 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {item.availability?.isAvailable ? 'Available' : 'Not Available'}
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600 leading-relaxed">{item.description}</p>
            </div>

            {/* Item Details */}
            <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-gray-200">
              <div>
                <span className="text-sm text-gray-500">Category</span>
                <p className="font-medium capitalize">{item.category}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Item Value</span>
                <p className="font-medium">₹{(item.itemValue || 0).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Security Deposit</span>
                <p className="font-medium">₹{(((item.itemValue || 0) * (item.depositPercentage || 0)) / 100).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Condition</span>
                <p className="font-medium capitalize">{item.condition}</p>
              </div>
            </div>

            {/* Owner Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Owner Information</h3>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  {item.owner?.profileImage ? (
                    <img 
                      src={item.owner.profileImage} 
                      alt={item.owner?.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.owner?.name}</p>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="ml-1 text-sm text-gray-600">
                      {(item.owner?.rating?.average ?? 0).toFixed(1)} ({item.owner?.rating?.count ?? 0} reviews)
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600" aria-label="Call owner" title="Call owner">
                    <Phone className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600" aria-label="Email owner" title="Email owner">
                    <Mail className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Form */}
        {!isOwner && item.availability?.isAvailable && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Book This Item</h2>
            <form onSubmit={handleBooking} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={bookingData.startDate}
                    onChange={(e) => setBookingData(prev => ({ ...prev, startDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Start date"
                    title="Start date"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={bookingData.endDate}
                    onChange={(e) => setBookingData(prev => ({ ...prev, endDate: e.target.value }))}
                    min={bookingData.startDate || new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="End date"
                    title="End date"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message to Owner (Optional)
                </label>
                <textarea
                  value={bookingData.message}
                  onChange={(e) => setBookingData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Tell the owner about your rental needs..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Cost Breakdown */}
              {costs.days > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Cost Breakdown</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Rental ({costs.days} days × ₹{item.dailyPrice})</span>
                      <span>₹{costs.rentalCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Security Deposit</span>
                      <span>₹{costs.deposit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-medium text-lg border-t pt-1">
                      <span>Total</span>
                      <span>₹{costs.total.toLocaleString()}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    <Shield className="h-3 w-3 inline mr-1" />
                    Security deposit will be refunded after item return
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isBooking || !isAuthenticated}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-colors"
              >
                {isBooking ? 'Sending Request...' : 'Send Booking Request'}
              </button>
            </form>
          </div>
        )}

        {/* Reviews Section and Complaints entry point */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Reviews</h2>
          <div className="mb-4 text-sm">
            <span className="text-gray-600 mr-2">Have an issue with this listing?</span>
            <Link to="/complaints" className="text-blue-600 hover:text-blue-700 underline">File a complaint</Link>
          </div>

          {/* Note about reviews */}
          {!isOwner && isAuthenticated && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> To submit a review, please go to your completed bookings and use the review button there. 
                Reviews can only be submitted for completed bookings.
              </p>
            </div>
          )}
          
          {reviews.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No reviews yet. Be the first to review this item!</p>
          ) : (
            <div className="space-y-6">
              {reviews.map((review: any) => (
                <div key={review._id} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      {review.reviewer.profileImage ? (
                        <img 
                          src={review.reviewer.profileImage} 
                          alt={review.reviewer.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="font-medium text-gray-600">
                          {review.reviewer.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">{review.reviewer.name}</p>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating 
                                    ? 'text-yellow-400 fill-current' 
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                            <span className="ml-2 text-sm text-gray-600">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-600">{review.comment}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItemDetailPage;