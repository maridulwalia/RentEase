import { useState, useEffect } from 'react';
import { Star, MessageCircle, Flag } from 'lucide-react';
import { reviewsAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';

const ReviewsPage = () => {
  const { user } = useAuthStore();
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('given');

  useEffect(() => {
    fetchReviews();
  }, [activeTab]);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      if (activeTab === 'given') {
        const response = await reviewsAPI.getMyReviews();
        setReviews(response.data.data.reviews);
      } else {
        const response = await reviewsAPI.getUserReviews(user?._id || '');
        setReviews(response.data.data.reviews);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReportReview = async (reviewId: string, reason: string) => {
    try {
      await reviewsAPI.reportReview(reviewId, { reason });
      alert('Review reported successfully');
    } catch (error) {
      console.error('Error reporting review:', error);
      alert('Failed to report review');
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-2 text-sm text-gray-600">({rating})</span>
      </div>
    );
  };

  const tabs = [
    { id: 'given', label: 'Reviews Given' },
    { id: 'received', label: 'Reviews Received' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reviews</h1>
        <p className="text-gray-600">Manage your reviews and ratings</p>
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

      {/* Reviews List */}
      {isLoading ? (
        <div className="space-y-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews found</h3>
          <p className="text-gray-600">
            {activeTab === 'given' 
              ? "You haven't written any reviews yet." 
              : "You haven't received any reviews yet."
            }
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review: any) => (
            <div key={review._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  {/* Profile Image */}
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                    {activeTab === 'given' ? (
                      <img
                        src={review.reviewee?.profileImage || 'https://via.placeholder.com/48?text=U'}
                        alt={review.reviewee?.name || 'User'}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <img
                        src={review.reviewer?.profileImage || 'https://via.placeholder.com/48?text=U'}
                        alt={review.reviewer?.name || 'User'}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    )}
                  </div>

                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {activeTab === 'given' ? review.reviewee?.name : review.reviewer?.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {review.type === 'item' ? 'Item Review' : 'User Review'}
                        </p>
                      </div>
                      <div className="text-right">
                        {renderStars(review.rating)}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Item Info */}
                    {review.item && (
                      <div className="flex items-center mb-3 p-3 bg-gray-50 rounded-lg">
                        <img
                          src={review.item.images?.[0] || 'https://images.pexels.com/photos/230544/pexels-photo-230544.jpeg'}
                          alt={review.item.title}
                          className="w-12 h-12 object-cover rounded-lg mr-3"
                        />
                        <div>
                          <p className="font-medium text-gray-900">{review.item.title}</p>
                          <p className="text-sm text-gray-500">
                            Booking: {new Date(review.booking?.startDate).toLocaleDateString()} - {new Date(review.booking?.endDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Review Comment */}
                    {review.comment && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-3">
                        <p className="text-gray-700">{review.comment}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {activeTab === 'received' && (
                  <div className="ml-4">
                    <button
                      onClick={() => {
                        const reason = prompt('Why are you reporting this review?');
                        if (reason) {
                          handleReportReview(review._id, reason);
                        }
                      }}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Report Review"
                    >
                      <Flag className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {user && (
        <div className="mt-12 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Rating Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {user.rating.average.toFixed(1)}
              </div>
              <div className="flex justify-center mb-2">
                {renderStars(Math.round(user.rating.average))}
              </div>
              <p className="text-sm text-gray-600">Overall Rating</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {user.rating.count}
              </div>
              <p className="text-sm text-gray-600">Total Reviews</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {user.stats.itemsListed}
              </div>
              <p className="text-sm text-gray-600">Items Listed</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewsPage;