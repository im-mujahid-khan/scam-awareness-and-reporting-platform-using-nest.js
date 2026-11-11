'use client';

import { Button, Dropdown, Form } from 'react-bootstrap';
import { 
  FaFilter, 
  FaFire, 
  FaNewspaper, 
  FaUsers, 
  FaGlobeAmericas,
  FaCalendarAlt,
  FaStar
} from 'react-icons/fa';
import { useState } from 'react';

export default function FeedFilters() {
  const [activeFilter, setActiveFilter] = useState('top');

  const filterOptions = [
    { id: 'top', label: 'Top Posts', icon: <FaFire />, color: 'danger' },
    { id: 'recent', label: 'Most Recent', icon: <FaNewspaper />, color: 'primary' },
    { id: 'network', label: 'My Network', icon: <FaUsers />, color: 'success' },
    { id: 'regional', label: 'Regional', icon: <FaGlobeAmericas />, color: 'info' },
    { id: 'trending', label: 'Trending', icon: <FaStar />, color: 'warning' },
  ];

  const categoryOptions = [
    'All Categories',
    'Tech Support Scams',
    'Phishing',
    'Investment Fraud', 
    'Romance Scams',
    'Lottery Scams',
    'Crypto Scams',
    'Job Scams',
    'Government Impersonation'
  ];

  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  return (
    <div className="feed-filters mb-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        {/* Main Filter Buttons */}
        <div className="d-flex flex-wrap gap-2 mb-2 mb-md-0">
          {filterOptions.map((filter) => (
            <Button
              key={filter.id}
              variant={activeFilter === filter.id ? filter.color : 'outline-' + filter.color}
              size="sm"
              className="d-flex align-items-center"
              onClick={() => setActiveFilter(filter.id)}
            >
              <span className="me-2">{filter.icon}</span>
              {filter.label}
            </Button>
          ))}
        </div>

        {/* Category Dropdown */}
        <Dropdown className="mb-2 mb-md-0">
          <Dropdown.Toggle variant="outline-secondary" size="sm" className="d-flex align-items-center">
            <FaFilter className="me-2" />
            {selectedCategory}
          </Dropdown.Toggle>
          <Dropdown.Menu>
            {categoryOptions.map((category) => (
              <Dropdown.Item 
                key={category}
                active={selectedCategory === category}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>
      </div>

      {/* Date Range Filter */}
      <div className="d-flex align-items-center gap-3 bg-light p-3 rounded">
        <small className="fw-bold text-muted">Time Range:</small>
        <div className="d-flex flex-wrap gap-2">
          <Button 
            variant="outline-secondary" 
            size="sm"
            active={true}
          >
            Last 24h
          </Button>
          <Button variant="outline-secondary" size="sm">
            This Week
          </Button>
          <Button variant="outline-secondary" size="sm">
            This Month
          </Button>
          <Button variant="outline-secondary" size="sm">
            All Time
          </Button>
        </div>
        
        <div className="ms-auto d-flex align-items-center gap-2">
          <FaCalendarAlt className="text-muted" />
          <Form.Select size="sm" style={{ width: 'auto' }}>
            <option>Sort by: Newest First</option>
            <option>Most Reported</option>
            <option>Highest Risk</option>
            <option>Most Comments</option>
          </Form.Select>
        </div>
      </div>
    </div>
  );
}