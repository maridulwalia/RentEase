import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Star, Clock, Shield, Users, ChevronRight, BookOpen, Smartphone, Wrench, Camera, ArrowRight } from 'lucide-react';
import { itemsAPI } from '../services/api';

const HomePage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [featuredItems, setFeaturedItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsResponse, categoriesResponse] = await Promise.all([
          itemsAPI.getItems({ limit: 8, sortBy: 'rating', sortOrder: 'desc' }),
          itemsAPI.getCategories()
        ]);
        
        setFeaturedItems(itemsResponse.data?.data?.items || []);
        setCategories((categoriesResponse.data?.data?.categories || []).slice(0, 6));
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/items?keyword=${encodeURIComponent(searchTerm)}`);
    }
  };

  const categoryIcons: { [key: string]: React.ReactNode } = {
    books: <BookOpen className="h-6 w-6" />,
    electronics: <Smartphone className="h-6 w-6" />,
    gadgets: <Smartphone className="h-6 w-6" />,
    tools: <Wrench className="h-6 w-6" />,
    photography: <Camera className="h-6 w-6" />,
  };

  return (
    <div className="min-h-[calc(100vh-80px)] pt-20">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-16 md:py-24 px-4 sm:px-6 lg:px-8">
        {/* Glow orbs */}
        <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-accent-500/[0.07] rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-[200px] right-[10%] w-[300px] h-[300px] bg-cyan-500/[0.04] rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-accent-500/10 border border-accent-500/15 mb-8 animate-fade-in text-sm font-medium text-accent-400 tracking-wide uppercase">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />
              India's Premier Peer-to-Peer Rental Marketplace
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] mb-6 animate-fade-up">
              Rent Anything,
              <br />
              <span className="gradient-text">Share Everything</span>
            </h1>

            <p className="text-base md:text-xl text-dark-400 max-w-2xl mx-auto mb-10 animate-fade-up delay-100 leading-relaxed">
              Unlock a world of possibilities without the commitment of ownership.
              Rent cameras, gadgets, tools, and more directly from your community.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto animate-fade-up delay-200">
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative group">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-dark-400 h-5 w-5 group-focus-within:text-accent-400 transition-colors" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="What do you need? e.g. DSLR Camera, Drill..."
                    className="input-dark !h-14 !pl-12 !rounded-2xl shadow-inner border-dark-700 bg-dark-900/50 focus:bg-dark-950 text-base"
                  />
                </div>
                <button
                  type="submit"
                  className="btn-accent !px-8 !h-14 !rounded-2xl text-base shadow-lg shadow-accent-500/20 w-full sm:w-auto"
                >
                  Search
                </button>
              </form>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-20 glass-card p-6 md:p-8 max-w-4xl mx-auto animate-fade-up delay-300">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { value: '10K+', label: 'Active Users' },
                { value: '5K+', label: 'Items Listed' },
                { value: '₹2M+', label: 'Transactions' },
                { value: '4.8/5', label: 'Average Rating' },
              ].map((s, i) => (
                <div key={i} className="text-center relative">
                  {i > 0 && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-10 bg-dark-700/50 hidden md:block" />}
                  <div className="text-2xl md:text-3xl font-bold text-white mb-1">{s.value}</div>
                  <div className="text-xs text-dark-500 uppercase tracking-widest">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-dark-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-4">
              Why Choose RentEase?
            </h2>
            <p className="text-lg text-dark-400 max-w-2xl mx-auto">
              Experience the safest, smartest, and most seamless way to rent everyday items.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: 'Secure & Safe', desc: 'Verified identities and secure payment holds ensure total peace of mind.' },
              { icon: Clock, title: 'Instant Booking', desc: 'Skip the wait. Book instantly and coordinate effortless handovers.' },
              { icon: Users, title: 'Community Driven', desc: 'Connect locally. Build trust within your neighborhood network.' },
              { icon: Star, title: 'Premium Quality', desc: 'Every listed item is community-reviewed and quality assured.' }
            ].map((feature, i) => (
              <div key={i} className="glass-card-hover p-8 group">
                <div className="w-14 h-14 rounded-2xl bg-accent-500/10 border border-accent-500/15 flex items-center justify-center mb-6 group-hover:bg-accent-500/20 group-hover:border-accent-500/30 transition-all duration-400">
                  <feature.icon className="h-6 w-6 text-accent-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-dark-400 leading-relaxed text-sm">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ─────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-dark-900/30 border-y border-dark-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-3">
              Explore Top Categories
            </h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category: any) => (
              <Link
                key={category._id}
                to={`/items?category=${category._id}`}
                className="glass-card-hover p-6 text-center group flex flex-col items-center justify-center min-h-[140px]"
              >
                <div className="w-12 h-12 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center mb-4 group-hover:bg-accent-500/15 group-hover:border-accent-500/20 transition-all duration-300">
                  <div className="text-dark-300 group-hover:text-accent-400 transition-colors">
                    {categoryIcons[category._id] || <BookOpen className="h-5 w-5" />}
                  </div>
                </div>
                <h3 className="font-semibold text-white capitalize text-sm mb-1">{category._id}</h3>
                <p className="text-xs text-dark-500">{category.count} items</p>
              </Link>
            ))}
            {categories.length === 0 && !isLoading && (
               <div className="col-span-full py-10 text-center text-dark-500 border border-dark-800 rounded-xl bg-dark-900/30">
                 No categories found. Start listing items today!
               </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Featured Items ─────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-2">
                Featured Listings
              </h2>
              <p className="text-dark-400">
                Highly-rated gear available for rent right now.
              </p>
            </div>
            <Link
              to="/items"
              className="text-accent-400 hover:text-accent-300 font-medium text-sm flex items-center gap-1 group"
            >
              Explore All 
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="glass-card h-[380px] animate-pulse">
                  <div className="h-48 bg-dark-800 rounded-t-[15px]"></div>
                  <div className="p-5 space-y-4">
                    <div className="h-4 bg-dark-800 w-3/4 rounded"></div>
                    <div className="h-4 bg-dark-800 w-1/2 rounded"></div>
                    <div className="h-8 bg-dark-800 w-1/3 rounded mt-4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredItems.map((item: any) => (
                <Link
                  key={item._id}
                  to={`/items/${item._id}`}
                  className="glass-card group overflow-hidden flex flex-col"
                >
                  <div className="relative h-48 overflow-hidden bg-dark-900 border-b border-dark-800">
                    <img
                      src={item.images?.[0] || 'https://images.pexels.com/photos/230544/pexels-photo-230544.jpeg'}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3 tag tag-accent backdrop-blur-md bg-dark-950/60 border-dark-700/50">
                      <Star className="h-3 w-3 fill-accent-400 text-accent-400" />
                      <span className="font-bold text-white">{item.rating?.average?.toFixed(1) || '0.0'}</span>
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-semibold text-white mb-1 truncate text-lg">
                      {item.title}
                    </h3>
                    <p className="text-xs text-dark-400 capitalize mb-4 flex-1">
                      {item.location?.city}, {item.location?.state}
                    </p>
                    <div className="mt-auto flex items-end justify-between pt-4 border-t border-dark-800">
                      <div className="text-dark-500 text-xs">Daily Rate</div>
                      <div className="text-lg font-bold text-accent-400">
                        ₹{item.dailyPrice}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              {featuredItems.length === 0 && (
                <div className="col-span-full py-16 text-center border border-dark-800 rounded-2xl border-dashed">
                  <div className="w-16 h-16 bg-dark-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <ShoppingBag className="h-8 w-8 text-dark-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No Items Found</h3>
                  <p className="text-dark-400">Be the first to list an item on RentEase.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-dark-800">
        <div className="max-w-4xl mx-auto relative">
          <div className="absolute inset-0 bg-accent-500/[0.05] rounded-3xl blur-[80px] pointer-events-none" />
          <div className="relative glass-card p-12 md:p-16 text-center overflow-hidden border-accent-500/20 shadow-2xl shadow-accent-500/10">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-500/50 to-transparent" />
            
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-6">
              Turn your unused items into <span className="text-accent-400">passive income.</span>
            </h2>
            <p className="text-lg text-dark-300 max-w-2xl mx-auto mb-10 leading-relaxed">
              Join thousands of smart individuals sharing resources and building community capital on RentEase today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/register" className="btn-accent text-sm w-full sm:w-auto">
                Sign Up Now
              </Link>
              <Link to="/items" className="btn-ghost text-sm w-full sm:w-auto">
                Explore Rentals
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;