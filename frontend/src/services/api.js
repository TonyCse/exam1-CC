// src/services/api.js
import axios from 'axios';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api`;

export const fetchProducts = () => axios.get(`${API_BASE_URL}/products`);

export const createOrder = (orderData) => {
    const token = localStorage.getItem('token');
    return axios.post(`${API_BASE_URL}/orders`, orderData, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
};
