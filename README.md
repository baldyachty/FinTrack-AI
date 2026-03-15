<h1 align="center">FinTrack AI: Intelligent Financial Analytics Platform</h1>

<div align="center">
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white" alt="Flask" />
  <img src="https://img.shields.io/badge/scikit--learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=black" alt="Scikit-Learn" />
  <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/JWT-Black?style=for-the-badge&logo=JSON%20web%20tokens" alt="JWT" />
</div>

<br/>

## 📌 Project Overview
FinTrack AI is a full-stack financial tracking system engineered to automate personal finance management through machine learning and predictive analytics. The architecture combines a robust RESTful Python/Flask backend with dynamic data visualization, offering users AI-driven insights, automated transaction categorization, and time-series balance forecasting.

## 🧠 Core Machine Learning & AI Features
* **Automated Categorization (NLP & KNN):** Utilizes `TfidfVectorizer` and a K-Nearest Neighbors (`KNeighborsClassifier`) model to parse unstructured transaction descriptions and dynamically assign them to financial categories.
* **Algorithmic Anomaly Detection:** Implements `IsolationForest` to monitor user spending patterns. It flags statistically significant outliers (top 5% of anomalies) in real-time by scaling and processing transaction amounts and encoded categories.
* **Time-Series Forecasting:** Integrates `statsmodels` (ARIMA model) to analyze historical net flow and project financial balances up to 6 months into the future.
* **Generative AI Assistant:** Incorporates the Google Gemini 2.5 Flash API via dynamic prompt engineering, providing a conversational interface grounded in the user's recent 30-day transaction context.

## ⚙️ System Architecture & Security
* **Stateless Authentication:** Implements secure user sessions utilizing JSON Web Tokens (`flask_jwt_extended`).
* **Multi-Factor Authentication (2FA):** Secures accounts using Time-Based One-Time Passwords (TOTP) via `pyotp`, alongside bcrypt-hashed 8-character backup recovery codes.
* **Password Management:** Employs `Flask-Bcrypt` for cryptographic hashing of user credentials and `Flask-Mail` for secure, tokenized password reset workflows.
* **Data Persistence & ORM:** Uses `Flask-SQLAlchemy` with SQLite for relational data management, dynamically generating schema and establishing foreign-key constraints between Users, Transactions, and Budgets.

---

## 🚀 Installation & Local Deployment

### 1. Clone the Repository
```bash
git clone [https://github.com/baldyachty/FinTrack-AI.git](https://github.com/baldyachty/FinTrack-AI.git)
cd FinTrack-AI
