import React, { useState, useRef, useEffect, useContext } from 'react';
import { CircleUserRound, Cog, History, HelpCircle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SnowPallContext } from './SnowPallContext';
import { useApi } from '../useApi';

const MainHeader = () => {

    const { setUserId, loginName, setLoginName, setAccessToken } = useContext(SnowPallContext);
    const { logout } = useApi(); // Use the logout function from the custom hook
    const navigate = useNavigate();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [activeItem, setActiveItem] = useState('');
    const dropdownRef = useRef(null);

    const handleLogout = async () => {
        try {
            await logout(); // Call the logout function from useApi
            console.log('User logged out successfully');
            setUserId(null); // Clear user-specific state
            setAccessToken(null); // Also clear access token from context
            localStorage.removeItem('combinedToken'); // Remove the token from local storage if you're using it
            navigate('/'); // Redirect to login page
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    useEffect(() => {
        // Set up click outside listener
        function handleClickOutside(event) {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setIsDropdownOpen(false);
            setActiveItem('');
          }
        }
        document.addEventListener("mousedown", handleClickOutside);
      
        // Retrieve and set the user's name from localStorage
        const storedUserName = localStorage.getItem('currentUserName');
        if (storedUserName) {
          setLoginName(storedUserName);
        }
      
        // Cleanup function for removing the click outside listener
        return () => document.removeEventListener("mousedown", handleClickOutside);
      }, [dropdownRef]); // This effect depends on dropdownRef
      
    const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

  return (
    <>
     <header className='main-header'>
        <h1 className='navbar-header'>SnowPall</h1>
          <div className='right-header-area'>
            <ul>
                <li className='about header-list-item'>
                    <a className={`about-anchor ${activeItem === 'about' ? 'active' : ''}`} onClick={() => setActiveItem('about')} href="#">
                        About
                    </a>
                </li>
                <li className={`notifications header-list-item ${activeItem === 'notifications' ? 'active' : ''}`} onClick={() => setActiveItem('notifications')}>
                    Notifications
                </li>
                <li className={`user header-list-item ${activeItem === 'account' ? 'active' : ''}`} onClick={() => {toggleDropdown(); setActiveItem('account')}} ref={dropdownRef}>
                    Account
                    {isDropdownOpen && (
                        <div className='dropdown-menu'>
                            <div className='dropdown-menu-top'>
                                <p className='username'>{loginName}</p>
                                <div className='dropdown-bar'></div>
                            </div>
                            <ul className='dropdown-links'>
                                <li className='profile list-item'>
                                    <a className='profile anchor' href='#'>
                                        <CircleUserRound className='dropdown-icon'/>
                                        <p>Profile</p>
                                    </a>
                                </li>
                                <li className='history list-item'>
                                    <a className='history anchor' href='#'>
                                        <History className='dropdown-icon'/>
                                        <p>History</p>
                                    </a>
                                </li>
                                <li className='help list-item'>
                                    <a className='help anchor' href='#'>
                                        <HelpCircle className='dropdown-icon'/>
                                        <p>Help</p>
                                    </a>
                                </li>
                                <li className='settings list-item'>
                                    <a className='settings anchor' href='#'>
                                        <Cog className='dropdown-icon'/>
                                        <p>Settings</p>
                                    </a>
                                </li>
                            </ul>
                            <div className='dropdown-menu-bottom'>
                                <div className='dropdown-bar'></div>
                                <div className='dropdown-bottom' onClick={handleLogout}>
                                    <LogOut className='dropdown-icon'/>
                                    <button className='dropdown-exit' style={{ all: 'unset' }}>Log Out</button>
                                </div>
                            </div>
                        </div>
                    )}
                </li>
            </ul>
          </div>
      </header>
    </>
  )
}

export default MainHeader;
