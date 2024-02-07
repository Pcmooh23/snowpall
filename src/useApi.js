import { useContext, useCallback } from 'react';
import { SnowPallContext } from './components/SnowPallContext';

export function useApi() {
    const { baseUrl, setAccessToken } = useContext(SnowPallContext);

    // Helper function to get the current access token from combinedToken
    const getAccessToken = () => {
        const combinedToken = localStorage.getItem('combinedToken');
        return combinedToken ? combinedToken.split(':')[1] : null;
    };

    const refreshToken = useCallback(async () => {
        try {
            const response = await fetch(`${baseUrl}/refresh-token`, {
                method: 'POST',
                credentials: 'include', // Ensures cookies are sent and received, including the refresh token if needed
            });

            if (response.ok) {
                const { accessToken: newAccessToken } = await response.json();
                const userId = localStorage.getItem('combinedToken').split(':')[0]; // Extract user ID from the existing combinedToken
                const newCombinedToken = `${userId}:${newAccessToken}`; // Create a new combinedToken
                localStorage.setItem('combinedToken', newCombinedToken); // Update local storage with the new combinedToken
                setAccessToken(newAccessToken); // Update context with the new access token
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
        const accessToken = getAccessToken(); // Get the current access token from combinedToken
        const authOptions = {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${accessToken}`,
            },
            credentials: 'include',
        };

        let response = await fetch(`${baseUrl}${url}`, authOptions);

        if (response.status === 401 && !skipRefresh) {
            const newAccessToken = await refreshToken();
            if (newAccessToken) {
                authOptions.headers['Authorization'] = `Bearer ${newAccessToken}`; // Update the authorization header with the new access token
                response = await fetch(`${baseUrl}${url}`, authOptions); // Retry the request with the new token
            }
        }

        return response;
    }, [baseUrl, refreshToken]);

    const logout = useCallback(async () => {
        const response = await customFetch('/logout', { method: 'POST' }, true);

        if (response.ok) {
            setAccessToken(null);
            localStorage.removeItem('combinedToken'); // Clear the combinedToken from local storage on logout
        } else {
            throw new Error('Logout failed');
        }
    }, [customFetch, setAccessToken]);

    return { customFetch, logout };
}
