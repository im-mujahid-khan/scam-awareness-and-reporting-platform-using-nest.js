'use client';

import { Button } from 'react-bootstrap';
import { FaGoogle, FaFacebook, FaApple } from 'react-icons/fa';

export default function SocialLoginButtons({ onSocialLogin }) {
  const socialProviders = [
    { 
      id: 'google', 
      name: 'Google', 
      icon: <FaGoogle />, 
      color: '#DB4437',
      bgColor: 'white',
      textColor: '#DB4437'
    },
    { 
      id: 'facebook', 
      name: 'Facebook', 
      icon: <FaFacebook />, 
      color: '#4267B2',
      bgColor: '#4267B2',
      textColor: 'white'
    },
    { 
      id: 'apple', 
      name: 'Apple', 
      icon: <FaApple />, 
      color: '#000000',
      bgColor: '#000000',
      textColor: 'white'
    }
  ];

  return (
    <div className="d-grid gap-3">
      {socialProviders.map((provider) => (
        <Button
          key={provider.id}
          variant="outline-secondary"
          size="lg"
          className="d-flex align-items-center justify-content-center py-2"
          onClick={() => onSocialLogin(provider.id)}
          style={{ 
            backgroundColor: provider.bgColor,
            color: provider.textColor,
            borderColor: provider.color,
            borderWidth: '2px'
          }}
        >
          <span className="me-3">{provider.icon}</span>
          Continue with {provider.name}
        </Button>
      ))}
    </div>
  );
}