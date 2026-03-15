<h1 align="center">FinTrack AI — Intelligent Financial Analytics Platform</h1>

<div align="center">
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white"/>
  <img src="https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white"/>
  <img src="https://img.shields.io/badge/Scikit--Learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=black"/>
  <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white"/>
  <img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens"/>
</div>

---

## 📌 Overview
FinTrack AI is a full-stack financial analytics platform engineered to automate personal finance management through machine learning and predictive analytics. It combines a RESTful Flask backend with AI-driven insights to provide automated categorization, anomaly detection, and balance forecasting.

---

## 🧠 Machine Learning Features
* **Automated Categorization:** Uses `TfidfVectorizer` and **KNN** to dynamically assign categories to transactions.
* **Anomaly Detection:** Implements **Isolation Forest** to flag statistically significant spending outliers.
* **Time-Series Forecasting:** Integrates **ARIMA** (`statsmodels`) to project future balances based on historical net flow.
* **Generative AI Assistant:** Leverages the **Google Gemini API** for context-aware financial advice.

---

## 🔐 Security & Architecture
* **Authentication:** Stateless sessions via **JWT** (`flask-jwt-extended`).
* **MFA:** Secure account access via **TOTP** (Time-Based One-Time Passwords) using `pyotp`.
* **Data Privacy:** Cryptographic hashing with **bcrypt** and relational data management via **SQLAlchemy**.

---

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone [https://github.com/baldyachty/FinTrack-AI.git](https://github.com/baldyachty/FinTrack-AI.git)
cd FinTrack-AI
```

### 2. Set Up Environment
```bash
cd FinTrack-AI/fintrack_backend
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory:
```env
SECRET_KEY=your_secret_key
JWT_SECRET_KEY=your_jwt_secret
GEMINI_API_KEY=your_api_key
MAIL_USERNAME=your_email
MAIL_PASSWORD=your_app_password
```

### 4. Database & Launch
```bash
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
flask run
```

---

## 📡 API Endpoints (Quick Reference)

| Method | Endpoint | Function |
| :--- | :--- | :--- |
| `POST` | `/auth/register` | Register + setup 2FA |
| `POST` | `/auth/login` | JWT Authentication |
| `POST` | `/transactions` | Log & auto-categorize |
| `GET` | `/analytics/forecast` | Get 6-month projections |
| `POST` | `/ai/assistant` | Query the Gemini AI |

---

**Maintained by [baldyachty](https://github.com/baldyachty)**
