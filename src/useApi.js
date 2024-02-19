import { useContext, useCallback } from 'react';
import { SnowPallContext } from './components/SnowPallContext';

export function useApi() {
   const { baseUrl, setAccessToken } = useContext(SnowPallContext);

   const getAccessToken = () => {
       const userId = localStorage.getItem('currentUserId');
       return userId ? localStorage.getItem(`${userId}_accessToken`) : null;
   };

   const refreshToken = useCallback(async () => {
       try {
           const response = await fetch(`${baseUrl}/refresh-token`, {
               method: 'POST',
               credentials: 'include', 
           });

           if (response.ok) {
               const { newAccessToken } = await response.json();
               const userId = localStorage.getItem('currentUserId');
               localStorage.setItem(`${userId}_accessToken`, newAccessToken); 
               setAccessToken(newAccessToken); 
               return newAccessToken;
           } else {
               console.error('Failed to refresh token. Please log in again.');
           }
       } catch (error) {
           console.error('Error refreshing token:', error);
       }
       return null;
   }, [baseUrl, setAccessToken]);

   const customFetch = useCallback(async (url, options = {}, skipRefresh = false) => {
       const accessToken = getAccessToken();
       const authOptions = {
           ...options,
           headers: {
               ...options.headers,
               'Authorization': `Bearer ${accessToken}`,
           },
           credentials: 'include',
       };

       let response = await fetch(`${baseUrl}${url}`, authOptions);

       if (response.status === 403 && !skipRefresh) {
           const newAccessToken = await refreshToken();
           if (newAccessToken) {
               authOptions.headers['Authorization'] = `Bearer ${newAccessToken}`; 
               response = await fetch(`${baseUrl}${url}`, authOptions); 
           }
       }

       return response;
   }, [baseUrl, refreshToken]);

   const logout = useCallback(async () => {
       const response = await customFetch('/logout', { method: 'POST' }, true);

       if (response.ok) {
           setAccessToken(null);
           const userId = localStorage.getItem('currentUserId');
           localStorage.removeItem(`${userId}_accessToken`);
           localStorage.removeItem('currentUserId');
           localStorage.removeItem('currentUserName'); 
       } else {
           throw new Error('Logout failed');
       }
   }, [customFetch, setAccessToken]);

   return { customFetch, logout };
}