'use client';

import { useState, useEffect, useRef } from 'react';
import { Form, InputGroup, Button, Badge } from 'react-bootstrap';
import { FaSearch, FaFilter, FaHistory, FaTimes, FaCaretDown, FaCaretUp } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { debounce } from '../../lib/utils';

export default function SearchBar({ placeholder = "Search phone, email, website, or wallet..." }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [filters, setFilters] = useState({
    type: 'all',
    riskLevel: 'all',
    dateRange: 'all'
  });
  const [recentSearches, setRecentSearches] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const router = useRouter();
  const inputRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    // Load recent searches
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }

    // Close suggestions when clicking outside
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'phone', label: 'Phone Number' },
    { value: 'email', label: 'Email Address' },
    { value: 'website', label: 'Website URL' },
    { value: 'social', label: 'Social Media' },
    { value: 'wallet', label: 'Crypto Wallet' }
  ];

  const riskLevels = [
    { value: 'all', label: 'All Risk Levels' },
    { value: 'critical', label: 'Critical (81-100)' },
    { value: 'high', label: 'High (51-80)' },
    { value: 'medium', label: 'Medium (21-50)' },
    { value: 'low', label: 'Low (0-20)' }
  ];

  const dateRanges = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' }
  ];

  const handleSearch = async (searchQuery = query) => {
    if (!searchQuery.trim()) return;

    // Save to recent searches
    const updated = [
      { query: searchQuery, type: filters.type, timestamp: new Date().toISOString() },
      ...recentSearches.filter(item => item.query !== searchQuery)
    ].slice(0, 5);
    
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));

    // Navigate to search results
    const params = new URLSearchParams({
      q: searchQuery,
      ...(filters.type !== 'all' && { type: filters.type }),
      ...(filters.riskLevel !== 'all' && { risk: filters.riskLevel }),
      ...(filters.dateRange !== 'all' && { date: filters.dateRange })
    });

    router.push(`/search?${params.toString()}`);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleRecentSearch = (recent) => {
    setQuery(recent.query);
    setFilters(prev => ({ ...prev, type: recent.type || 'all' }));
    handleSearch(recent.query);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const clearFilters = () => {
    setFilters({
      type: 'all',
      riskLevel: 'all',
      dateRange: 'all'
    });
  };

  const debouncedSearch = debounce(async (value) => {
    if (value.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    
    // Simulate API call for suggestions
    setTimeout(() => {
      const mockSuggestions = [
        { id: 1, text: `"${value}" - Phone number`, type: 'phone' },
        { id: 2, text: `"${value}" - Email address`, type: 'email' },
        { id: 3, text: `"${value}" - Website`, type: 'website' },
        { id: 4, text: `Reports containing "${value}"`, type: 'report' }
      ];
      setSuggestions(mockSuggestions);
      setIsSearching(false);
    }, 300);
  }, 300);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(true);
    debouncedSearch(value);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const activeFiltersCount = Object.values(filters).filter(value => value !== 'all').length;

  return (
    <div className="search-container position-relative" ref={searchRef}>
      <InputGroup className="mb-0">
        <Form.Control
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          onFocus={() => setShowSuggestions(true)}
          className="search-input py-3 border-end-0"
          style={{ borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}
        />
        
        <Button
          variant={activeFiltersCount > 0 ? "primary" : "outline-secondary"}
          className={`filter-button border-start-0 rounded-0 d-flex align-items-center ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
          style={{ 
            borderTopRightRadius: '0',
            borderBottomRightRadius: '0'
          }}
        >
          <FaFilter className="me-1" />
          {showFilters ? <FaCaretUp size={12} /> : <FaCaretDown size={12} />}
          {activeFiltersCount > 0 && (
            <Badge bg="light" text="dark" pill className="ms-1">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
        
        <Button 
          variant="primary" 
          onClick={() => handleSearch()}
          disabled={!query.trim()}
          className="search-button px-4"
          style={{ 
            borderTopRightRadius: '12px',
            borderBottomRightRadius: '12px'
          }}
        >
          {isSearching ? (
            <span className="spinner-border spinner-border-sm" role="status" />
          ) : (
            <FaSearch />
          )}
        </Button>
      </InputGroup>

      {/* Filter Options - Always visible when showFilters is true */}
      {showFilters && (
        <div className="filters-dropdown mt-2 p-4 rounded shadow-sm border bg-white">
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0 fw-semibold">Search Filters</h6>
              <Button
                variant="link"
                size="sm"
                onClick={clearFilters}
                className="text-decoration-none p-0"
              >
                <FaTimes className="me-1" /> Clear All
              </Button>
            </div>
            
            <div className="mb-4">
              <label className="form-label small text-muted mb-2 d-block">Search Type</label>
              <div className="d-flex flex-wrap gap-2">
                {searchTypes.map(type => (
                  <Button
                    key={type.value}
                    size="sm"
                    variant={filters.type === type.value ? "primary" : "outline-secondary"}
                    className={`filter-chip ${filters.type === type.value ? 'active' : ''}`}
                    onClick={() => setFilters({...filters, type: type.value})}
                  >
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label small text-muted mb-2 d-block">Risk Level</label>
              <div className="d-flex flex-wrap gap-2">
                {riskLevels.map(risk => (
                  <Button
                    key={risk.value}
                    size="sm"
                    variant={filters.riskLevel === risk.value ? "warning" : "outline-warning"}
                    className={`filter-chip ${filters.riskLevel === risk.value ? 'active' : ''}`}
                    onClick={() => setFilters({...filters, riskLevel: risk.value})}
                  >
                    {risk.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="mb-0">
              <label className="form-label small text-muted mb-2 d-block">Date Range</label>
              <div className="d-flex flex-wrap gap-2">
                {dateRanges.map(date => (
                  <Button
                    key={date.value}
                    size="sm"
                    variant={filters.dateRange === date.value ? "info" : "outline-info"}
                    className={`filter-chip ${filters.dateRange === date.value ? 'active' : ''}`}
                    onClick={() => setFilters({...filters, dateRange: date.value})}
                  >
                    {date.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="d-flex justify-content-between align-items-center pt-3 border-top">
            <small className="text-muted">
              {activeFiltersCount > 0 
                ? `${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''} active`
                : 'No filters selected'
              }
            </small>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setShowFilters(false);
                if (query.trim()) handleSearch();
              }}
              className="rounded-pill px-4"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && (suggestions.length > 0 || recentSearches.length > 0) && (
        <div className="suggestions-dropdown position-absolute top-100 start-0 end-0 bg-white border rounded shadow-lg mt-2 z-3">
          {/* Recent Searches */}
          {recentSearches.length > 0 && query.length === 0 && (
            <div className="p-3 border-bottom">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <small className="text-muted d-flex align-items-center">
                  <FaHistory className="me-2" /> Recent Searches
                </small>
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={clearRecentSearches}
                  className="p-0 text-decoration-none text-muted"
                >
                  Clear all
                </Button>
              </div>
              <div className="d-flex flex-column gap-2">
                {recentSearches.map((recent, index) => (
                  <Button
                    key={index}
                    variant="outline-light"
                    className="suggestion-item text-start text-dark p-3 d-flex justify-content-between align-items-center"
                    onClick={() => handleRecentSearch(recent)}
                  >
                    <div className="d-flex align-items-center">
                      <div className="suggestion-icon me-3">
                        <FaHistory className="text-muted" />
                      </div>
                      <div>
                        <div className="fw-medium">{recent.query}</div>
                        <small className="text-muted">
                          {searchTypes.find(t => t.value === recent.type)?.label}
                        </small>
                      </div>
                    </div>
                    <FaSearch className="text-primary opacity-75" />
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Search Suggestions */}
          {suggestions.length > 0 && (
            <div className="p-3">
              <small className="text-muted mb-3 d-block">Suggestions</small>
              {suggestions.map(suggestion => (
                <Button
                  key={suggestion.id}
                  variant="outline-light"
                  className="suggestion-item text-start text-dark p-3 w-100 d-flex justify-content-between align-items-center"
                  onClick={() => {
                    const searchText = suggestion.text.split('"')[1] || suggestion.text;
                    setQuery(searchText);
                    handleSearch(searchText);
                  }}
                >
                  <div className="d-flex align-items-center">
                    <div className="suggestion-icon me-3">
                      <FaSearch className="text-muted" />
                    </div>
                    <div>
                      <div className="fw-medium">{suggestion.text}</div>
                    </div>
                  </div>
                  <Badge bg="light" text="dark" className="filter-badge">
                    {suggestion.type}
                  </Badge>
                </Button>
              ))}
            </div>
          )}

          {/* No Results */}
          {query.length >= 2 && suggestions.length === 0 && recentSearches.length === 0 && (
            <div className="p-4 text-center">
              <FaSearch className="text-muted mb-2" size={24} />
              <p className="text-muted mb-0">No suggestions found</p>
              <small className="text-muted">Try searching for something else</small>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .search-container {
          max-width: 100%;
        }
        
        .search-input {
          border-radius: 12px !important;
          border: 1px solid #dee2e6;
          transition: all 0.3s ease;
        }
        
        .search-input:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 0.25rem rgba(102, 126, 234, 0.15);
          outline: none;
        }
        
        /* FIXED FILTER BUTTON STYLING */
        .filter-button {
          transition: all 0.3s ease !important;
          background: #f8f9fa !important;
          border: 1px solid #dee2e6 !important;
          border-left: none !important;
          color: #6c757d !important;
        }
        
        .filter-button:hover {
          background: #e9ecef !important;
          border-color: #ced4da !important;
          color: #495057 !important;
        }
        
        .filter-button.active {
          background: #667eea !important;
          border-color: #667eea !important;
          color: white !important;
        }
        
        .filter-button.active:hover {
          background: #5a6fd8 !important;
          border-color: #5a6fd8 !important;
          color: white !important;
        }
        
        .search-button {
          border-radius: 12px !important;
          transition: all 0.3s ease;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
        }
        
        .search-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        
        .search-button:disabled {
          opacity: 0.6;
        }
        
        .filters-dropdown {
          border: 1px solid #e9ecef;
          animation: fadeIn 0.2s ease;
        }
        
        .filter-chip {
          border-radius: 20px !important;
          padding: 0.375rem 1rem;
          transition: all 0.2s ease;
          border: 1px solid #dee2e6;
        }
        
        .filter-chip:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .filter-chip.active {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        
        .suggestions-dropdown {
          border: 1px solid #e9ecef;
          max-height: 400px;
          overflow-y: auto;
          animation: slideDown 0.2s ease;
        }
        
        .suggestion-item {
          border-radius: 10px !important;
          border: 1px solid transparent;
          transition: all 0.2s ease;
          margin-bottom: 4px;
        }
        
        .suggestion-item:hover {
          background: #f8f9fa !important;
          border-color: #dee2e6;
          transform: translateX(4px);
        }
        
        .suggestion-item:last-child {
          margin-bottom: 0;
        }
        
        .suggestion-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8f9fa;
          border-radius: 8px;
        }
        
        .filter-badge {
          border-radius: 12px;
          padding: 0.25rem 0.75rem;
          font-weight: 500;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* Mobile Responsiveness */
        @media (max-width: 768px) {
          .search-input {
            padding: 0.75rem 1rem !important;
            font-size: 1rem;
          }
          
          .filter-button,
          .search-button {
            padding: 0.75rem 1rem !important;
          }
          
          .filter-button span {
            display: none;
          }
          
          .filter-button .badge {
            position: absolute;
            top: -5px;
            right: -5px;
          }
          
          .filters-dropdown {
            padding: 1.5rem !important;
            margin-left: -12px;
            margin-right: -12px;
            border-radius: 0 0 16px 16px !important;
            border-left: none;
            border-right: none;
          }
          
          .suggestions-dropdown {
            margin-left: -12px;
            margin-right: -12px;
            border-radius: 0 0 16px 16px !important;
            border-left: none;
            border-right: none;
          }
          
          .filter-chip {
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
          }
          
          .suggestion-item {
            padding: 1rem !important;
          }
        }
        
        @media (max-width: 576px) {
          .search-container {
            width: 100%;
          }
          
          .input-group {
            flex-wrap: nowrap;
          }
          
          .search-input {
            flex: 1;
            min-width: 0;
          }
          
          .filter-button,
          .search-button {
            width: auto;
            flex-shrink: 0;
          }
          
          .filter-chip {
            padding: 0.375rem 0.75rem;
            font-size: 0.8125rem;
          }
        }
        
        @media (max-width: 375px) {
          .search-input::placeholder {
            font-size: 0.875rem;
          }
          
          .filter-button,
          .search-button {
            padding: 0.75rem 0.75rem !important;
          }
        }
      `}</style>
    </div>
  );
}