import React, { useState, useEffect } from 'react';

const CookieBanner: React.FC = () => {
    const [showBanner, setShowBanner] = useState(false);
    
    useEffect(() => {
        // Check if user already accepted cookies
        const cookiesAccepted = localStorage.getItem('cookiesAccepted');
        if (!cookiesAccepted) {
            setShowBanner(true);
        }
    }, []);
    
    const acceptCookies = () => {
        localStorage.setItem('cookiesAccepted', 'true');
        setShowBanner(false);
    };
    
    if (!showBanner) return null;
    
    return (
        <div className="cookie-banner">
            <p>We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.</p>
            <button onClick={acceptCookies}>Accept</button>
        </div>
    );
};

export default CookieBanner;