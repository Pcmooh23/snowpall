import { useContext, useCallback } from 'react';
import { SnowPallContext } from './components/SnowPallContext';

export function useApi() {
    const { baseUrl, accessToken, setAccessToken } = useContext(SnowPallContext);

    const refreshToken = useCallback(async () => {
        try {
            const response = await fetch(`${baseUrl}/refresh-token`, {
                method: 'POST',
                credentials: 'include', // Necessary for cookies to be sent and received
            });

            if (response.ok) {
                const { accessToken: newAccessToken } = await response.json();
                setAccessToken(newAccessToken);
                return newAccessToken;
            }
        } catch (error) {
            console.error('Error refreshing token:', error);
        }
        return null;
    }, [baseUrl, setAccessToken]);

    const customFetch = useCallback(async (url, options = {}) => {
        const authOptions = {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${accessToken}`,
            },
            credentials: 'include', // Necessary for cookies to be sent and received
        };

        let response = await fetch(`${baseUrl}${url}`, authOptions);

        // If access token was expired or invalid
        if (response.status === 401) {
            const newAccessToken = await refreshToken();
            if (newAccessToken) {
                authOptions.headers['Authorization'] = `Bearer ${newAccessToken}`;
                response = await fetch(`${baseUrl}${url}`, authOptions);
            }
        }

        return response;
    }, [baseUrl, accessToken, refreshToken]);

    return { customFetch };
}
