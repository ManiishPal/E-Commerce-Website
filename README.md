# MERN Stack E-Commerce Platform with ML Recommendation Engine

A full-stack E-Commerce application built on the **MERN (MongoDB, Express, React, Node.js)** stack, featuring a customer store frontend, a merchant admin dashboard, a REST API backend, and an item-item collaborative filtering Machine Learning recommendation engine.

---

## 🚀 Features

### 🛒 Customer Store Frontend (`/frontend`)
- **Product Browsing & Filtering**: Explore collections with categories, sub-categories, sorting, and live text search.
- **Product Details & Recommendations**: View detailed product specifications, multi-image view, size selection, and dynamic ML-driven recommended products.
- **Cart & Checkout**: Responsive shopping cart management with support for multiple payment gateways (**Stripe**, **Razorpay**, and **Cash on Delivery**).
- **User Authentication**: Secure signup and login powered by JWT tokens.
- **Order Management**: Track past orders and real-time delivery status.

### 🛡️ Merchant Admin Dashboard (`/admin`)
- **Product Management**: Add new products with multi-image Cloudinary uploads, price settings, category assignment, and best-seller tagging.
- **Inventory Listing**: View, filter, and remove products from the catalog.
- **Order Processing**: Monitor customer orders, update order status (Order Placed, Packing, Shipped, Out for delivery, Delivered), and inspect payment methods.

### ⚡ Backend API & Services (`/backend`)
- **RESTful Endpoints**: Express 5 application structure separating controllers, models, routes, and middleware.
- **Cloudinary Integration**: Multi-file image uploading and cloud storage via Multer and Cloudinary SDK.
- **Database Models**: MongoDB schema designs for Users, Products, Orders, User Interactions, and Product Similarity scores.
- **Payment Processing**: Integrated Stripe and Razorpay SDKs for online payment verification.

### 🤖 Machine Learning Recommendation Pipeline (`/backend/ml`)
- **Collaborative Filtering Engine**: Item-item recommendation algorithm calculating affinity scores based on user interactions:
  - Event types weighted by user intent (`view`: 1, `recommendation_click`: 2, `cart`: 4, `purchase`: 8).
  - Exponential time decay applied to prioritize recent user activity (30-day half-life decay function).
- **Training Pipeline**: Batch processing scripts to export user interactions, generate synthetic training data, and update item similarity scores in MongoDB.

---

## 🛠️ Tech Stack

- **Frontend & Admin**: React 19, Vite, React Router DOM (v7), Tailwind CSS, Axios, React Toastify
- **Backend API**: Node.js, Express.js (v5), Mongoose (MongoDB ORM), JWT, Bcrypt, Multer
- **Cloud & External Services**: Cloudinary (Image Hosting), Stripe & Razorpay (Payments), MongoDB Atlas
- **ML & Data Pipeline**: Node.js custom matrix similarity computation with exponential time-decay scoring

---

## 📁 Repository Structure

```text
e-commerce/
├── admin/                  # React Merchant Admin Portal (Vite + Tailwind)
│   ├── src/                # Components, Pages (Add, List, Orders), Assets
│   └── package.json
├── backend/                # Node.js Express REST API & ML Pipeline
│   ├── config/             # MongoDB & Cloudinary Configuration
│   ├── controllers/        # API Controller functions
│   ├── middleware/         # Auth & Admin JWT Middleware
│   ├── ml/                 # Recommendation Engine Scripts & Data Pipeline
│   ├── models/             # Mongoose Schemas (User, Product, Order, Interaction, Similarity)
│   ├── routes/             # Express API Routes
│   ├── server.js           # Server Entry Point
│   └── package.json
├── frontend/               # React Customer Storefront (Vite + Tailwind)
│   ├── src/                # Components, Contexts, Pages (Home, Collection, Product, Cart, etc.)
│   └── package.json
└── README.md               # Project Documentation
```

---

## 🚦 Getting Started

### Prerequisites

Ensure you have the following installed on your environment:
- **Node.js** (v18+ recommended)
- **npm** or **yarn**
- **MongoDB** instance (Local or MongoDB Atlas connection string)
- **Cloudinary** account (for image upload management)

---

### Environment Setup

#### 1. Backend (`/backend/.env`)

Create a `.env` file in the `backend/` directory with the following variables:

```env
PORT=4000
MONGODB_URI=your_mongodb_connection_string
CLOUDINARY_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_SECRET_KEY=your_cloudinary_secret_key
JWT_SECRET=your_jwt_secret_key
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_admin_password
STRIPE_SECRET_KEY=your_stripe_secret_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_KE_ID=your_razorpay_key_id
```

#### 2. Customer Frontend (`/frontend/.env`)

Create a `.env` file in the `frontend/` directory:

```env
VITE_BACKEND_URL=http://localhost:4000
```

#### 3. Admin Dashboard (`/admin/.env`)

Create a `.env` file in the `admin/` directory:

```env
VITE_BACKEND_URL=http://localhost:4000
```

---

## 🏃 Running the Application

### 1. Start the Backend Server

```bash
cd backend
npm install
npm run server
```
*The backend API will run at `http://localhost:4000`.*

### 2. Start the Customer Frontend

```bash
cd frontend
npm install
npm run dev
```
*The storefront client will run at `http://localhost:5173` (or the port specified by Vite).*

### 3. Start the Admin Dashboard

```bash
cd admin
npm install
npm run dev
```
*The admin dashboard will run at `http://localhost:5174` (or Vite assigned port).*

---

## 🧠 Training the Recommendation System

The recommendation engine computes product similarities based on stored interaction events.

Inside the `backend/` directory, you can run the following scripts:

- **Export real interaction logs**:
  ```bash
  npm run export:interactions
  ```
- **Train recommender model from interactions**:
  ```bash
  npm run train:recommender
  ```
- **Export & Train in one command**:
  ```bash
  npm run train:recommendations
  ```
- **Generate demo interaction dataset & train (for testing)**:
  ```bash
  npm run train:demo-recommendations
  ```

---

## 📜 Available Scripts Summary

| Directory | Command | Description |
|---|---|---|
| `backend` | `npm start` | Run server with standard Node.js |
| `backend` | `npm run server` | Run server in watch mode using Nodemon |
| `backend` | `npm run train:recommendations` | Export interactions and train recommendation model |
| `backend` | `npm run train:demo-recommendations` | Generate demo data and train recommendation model |
| `frontend` | `npm run dev` | Launch customer storefront dev server |
| `frontend` | `npm run build` | Build production bundle for storefront |
| `admin` | `npm run dev` | Launch admin portal dev server |
| `admin` | `npm run build` | Build production bundle for admin portal |

---

## 📄 License

This project is open-source and available under the [ISC License](backend/package.json).
