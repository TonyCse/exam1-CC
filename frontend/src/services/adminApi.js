// src/services/adminApi.js
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL;

export const getOrders = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_BASE_URL}/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response;
  } catch (error) {
    console.error("Erreur lors de la recupération des commandes :", error);
    throw error;
  }
};

export const getProducts = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_BASE_URL}/products`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response;
  } catch (error) {
    console.error("Erreur lors de la recupération des produits :", error);
    throw error;
  }
};

export const updateOrderStatus = async (orderId, status) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.put(
      `${API_BASE_URL}/orders/${orderId}/status`,
      { status },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response;
  } catch (error) {
    console.error("Erreur lors de la mise à jour du statut de la commande :", error);
    throw error;
  }
};

export const validateOrder = async (orderId) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.put(
      `${API_BASE_URL}/orders/${orderId}/validate`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response;
  } catch (error) {
    console.error("Erreur lors de la validation de la commande :", error);
    throw error;
  }
};

export const updateProductStock = async (productId, stock) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.put(
      `${API_BASE_URL}/products/${productId}/stock`,
      { stock },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response;
  } catch (error) {
    console.error("Erreur lors de la mise à jour du stock :", error);
    throw error;
  }
};
