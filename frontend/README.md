# Inprompt AI - Frontend 🛡️

**Inprompt AI** is a real-time security gateway for Large Language Models (LLMs), designed to detect and block adversarial prompts, hallucinations, and policy violations before they reach your AI model.

This repository contains the **Frontend** application, built with **React**, **Vite**, and **Tailwind CSS**.

![Inprompt AI Dashboard](https://github.com/BIBHU78150/llm-security-gateway-frontend/raw/main/public/screenshot.png) <!-- Ideally update this later -->

## 🚀 Features

### **User Experience**
-   **Real-Time Scanning**: Interactive prompt testing interface with instant feedback.
-   **Risk Scoring**: Visual risk scores (0-100%) and detailed threat explanations.
-   **History Log**: Personal scan history persistence via Supabase.
-   **Mobile Reponsive**: Fully optimized for mobile devices with responsive layouts.
-   **Secure Login**: Email & Google OAuth authentication via Supabase.

### **Admin Capabilities**
-   **Admin Dashboard**: Aggregated system-wide statistics (Total Requests, Safe vs Unsafe).
-   **Live Monitoring**: Watch incoming requests in real-time.
-   **User Management**: View active users and **Block/Unblock** access instantly.
-   **Threat Analysis**: Visual charts (Pie/Bar) showing top threat vectors.

## 🛠️ Tech Stack

-   **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Icons**: [Lucide React](https://lucide.dev/)
-   **Charts**: [Recharts](https://recharts.org/)
-   **State/Auth**: [Supabase JS](https://supabase.com/)
-   **Routing**: React Router DOM

## 📦 Installation & Setup

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/BIBHU78150/llm-security-gateway-frontend.git
    cd llm-security-gateway-frontend
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Environment Configuration**
    Create a `.env` file in the root directory:
    ```bash
    VITE_API_URL=https://your-backend-url.hf.space
    VITE_SUPABASE_URL=your-supabase-project-url
    VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
    ```
    *(Note: For production, set these variables in your Vercel Project Settings)*

4.  **Run Development Server**
    ```bash
    npm run dev
    ```
    Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

## 🚢 Deployment (Vercel)

This project is optimized for **Vercel**.

1.  Push your code to GitHub.
2.  Import the project in Vercel.
3.  Add the **Environment Variables** (`VITE_API_URL`, etc.) in Vercel Settings.
4.  Deploy! 🚀

## 🔒 Admin Access

The Admin Panel is a restricted area for monitoring and control.
-   **URL**: `/admin/login`
-   **Credentials**: Defined by your Backend Environment Variable (`ADMIN_PASSWORD`).
-   **Default ID**: `admin`

## 🤝 Contributing

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---
**Inprompt AI** - Securing the future of LLMs.
