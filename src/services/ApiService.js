import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const axiosInstance = axios.create({
  baseURL: API_URL,
});

// Add a request interceptor to add the JWT token to headers
axiosInstance.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

class ApiService {
  // Authentication
  static async signUp(username, email, password) {
    const response = await axiosInstance.post('/auth/register', { username, email, password });
    return response.data;
  }

  static async signIn(email, password) {
    const response = await axiosInstance.post('/auth/login', { email, password });
    return response.data;
  }

  static async getCurrentUser() {
    const response = await axiosInstance.get('/auth/profile');
    return response.data;
  }

  // Users
  static async getUsers(search = '') {
    const response = await axiosInstance.get(`/users?search=${search}`);
    return response.data;
  }

  static async updateUserStatus(status) {
    const response = await axiosInstance.put('/users/status', { status });
    return response.data;
  }

  // Friends
  static async getFriends() {
    const response = await axiosInstance.get('/friends');
    return response.data;
  }

  static async sendFriendRequest(receiverId) {
    const response = await axiosInstance.post('/friends/request', { receiverId });
    return response.data;
  }

  static async getFriendRequests() {
    const response = await axiosInstance.get('/friends/requests');
    return response.data;
  }

  static async updateFriendRequest(requestId, status) {
    const response = await axiosInstance.put('/friends/request', { requestId, status });
    return response.data;
  }

  // Chats
  static async getUserChats() {
    const response = await axiosInstance.get('/chats');
    return response.data;
  }

  static async accessChat(userId) {
    const response = await axiosInstance.post('/chats', { userId });
    return response.data;
  }

  static async createGroupChat(name, users) {
    const response = await axiosInstance.post('/chats/group', { name, users: JSON.stringify(users) });
    return response.data;
  }

  // Messages
  static async sendMessage(chatId, content, type = 'text') {
    const response = await axiosInstance.post('/messages', { chatId, content, type });
    return response.data;
  }

  static async getChatMessages(chatId) {
    const response = await axiosInstance.get(`/messages/${chatId}`);
    return response.data;
  }
}

export default ApiService;
