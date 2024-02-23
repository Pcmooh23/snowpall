import React from 'react'

const accuWeatherApiKey = process.env.REACT_APP_ACCUWEATHER_API_KEY;

export const getLocationKeyFromZipcode = async (userZipcode) => {
    const url = `https://dataservice.accuweather.com/locations/v1/postalcodes/US/search?apikey=${accuWeatherApiKey}&q=${userZipcode}`;
    try {
        const locationResponse = await fetch(url);
        if (!locationResponse.ok) {
            throw new Error('Failed to get location data');
        }
        const locationData = await locationResponse.json();
        const locationKey = locationData[0]?.Key;
        console.log(locationKey);
        return locationKey;
      
    } catch (error) {
        console.error("Error fetching location key: ", error);
        throw error;
    }
}

export const getWeatherForecast = async (locationKey) => {
    const url = `https://dataservice.accuweather.com/forecasts/v1/hourly/12hour/${locationKey}?apikey=${accuWeatherApiKey}`;
    try {
        const forecastResponse = await fetch(url);
        if (!forecastResponse.ok) {
            throw new Error('Failed to get forecast data');
        }
        const forecastData = await forecastResponse.json();

        // Process the forecast data
        const weatherDetails = forecastData.map(hourlyData => {
            return {
                hasPrecipitation: hourlyData.HasPrecipitation || false,
                precipitationType: hourlyData.PrecipitationType || 'None',
                precipitationIntensity: hourlyData.PrecipitationIntensity || 'Light',
                precipitationProbability: hourlyData.PrecipitationProbability || 0,
                temperature: hourlyData.Temperature.Value || 0
            };
        });

        return weatherDetails; // This will be an array of objects with the weather details for each hour
    } catch (error) {
        console.error("Error fetching forecast: ", error);
        throw error;
    }
};

export const SnowPall_Pricing_Model = (temp, precipitation_type, precipitation_intensity, job_size) => {
  
    const base_price = 15;
    let weather_multiplier = 1.0;
 
    if (precipitation_type === 'Snow' && temp <= 32) {
        if (precipitation_intensity === 'moderate') {
            weather_multiplier = 1.3;
        } else if (precipitation_intensity === 'heavy') {
            weather_multiplier = 1.5;
        }
        // If light, weather_multiplier remains 1.0
    }
 
    let size_multiplier = 1.0; 
 
    if (job_size === 'small') {
        size_multiplier = size_multiplier;
    } else if (job_size === 'medium') {
        size_multiplier = 1.2;
    } else if (job_size === 'large') {
        size_multiplier = 1.5;
    } else if (job_size === 'x-large') {
        size_multiplier = 2.0;
    }
 
    const final_price = base_price * weather_multiplier * size_multiplier;
 
    return final_price;
}
