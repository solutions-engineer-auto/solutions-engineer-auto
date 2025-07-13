import React from 'react';
import { Link } from 'react-router-dom';
import maxwellLogo from '../assets/maxwell.svg';

/**
 * A reusable header component for the application.
 * It displays the application logo and provides slots for other content.
 *
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - Content to be rendered in the middle of the header, next to the logo.
 * @param {React.ReactNode} props.actions - Content to be rendered on the right side of the header.
 * @returns {JSX.Element} The rendered header component.
 */
const Header = ({ children, actions }) => {
  return (
    <header className="glass-panel p-6 flex justify-between items-center mb-8 relative">
      {/* Left Content */}
      <div className="flex items-center gap-4">
        {children}
      </div>

      {/* Centered Logo */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <Link to="/accounts" className="logo-container">
          <img src={maxwellLogo} alt="Maxwell Logo" className="h-16 w-16" />
        </Link>
      </div>

      {/* Right Content */}
      <div className="flex items-center gap-4">
        {actions}
      </div>
    </header>
  );
};

export default Header; 